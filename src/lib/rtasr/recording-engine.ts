import { generateId } from '@/lib/utils'
import { buildRtAsrWsUrl, rtasrApi, type FinishRecordingResult } from '@/lib/api/rtasr'
import { isApiClientError } from '@/lib/errors/api-client-error'
import {
  AudioCapture,
  listAudioInputDevices,
  pcmToWavBlob,
  type AudioInputDevice,
} from '@/lib/rtasr/audio-capture'
import { defaultSpeakerLabel, parseRtAsrMessage } from '@/lib/rtasr/parse-result'
import {
  RTASR_PAUSE_RECONNECT_MS,
  RTASR_RENEW_AT_MS,
} from '@/lib/rtasr/constants'
import {
  clearRecordingRecovery,
  saveRecordingRecovery,
  type RecordingRecoverySnapshot,
} from '@/lib/rtasr/recording-recovery'

export type RecordingPhase =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'recording'
  | 'paused'
  | 'saving'
  | 'error'

export interface LiveSegment {
  id: string
  rl: number
  speakerDisplay: string
  speakerOverride: boolean
  beginMs: number
  endMs: number
  text: string
  isFinal: boolean
}

export interface RecordingMarker {
  id: string
  atMs: number
  label?: string
}

export type RecordingEngineListener = () => void

export class RecordingEngine {
  private phase: RecordingPhase = 'idle'
  private sessionId: string | null = null
  private title = ''
  private minimized = false
  private elapsedMs = 0
  private chunkOffsetMs = 0
  private chunkIndex = 0
  private segments: LiveSegment[] = []
  private draftLine = ''
  private draftRl = 0
  private speakerAliasMap: Record<number, string> = {}
  private segmentOverrides: Record<string, number> = {}
  private markers: RecordingMarker[] = []
  private errorMessage: string | null = null
  private level = 0
  private domain = 'general'
  private deviceId: string | null = null
  private featureIds: string[] = []
  private renewNotice: string | null = null
  private pausedAt: number | null = null

  private ws: WebSocket | null = null
  private capture = new AudioCapture()
  private timer: ReturnType<typeof setInterval> | null = null
  private recoveryTimer: ReturnType<typeof setInterval> | null = null
  private pcmParts: ArrayBuffer[] = []
  private listeners = new Set<RecordingEngineListener>()
  private currentRl = 1
  private renewInProgress = false
  private renewTriggered = false

  subscribe(listener: RecordingEngineListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  getState() {
    return {
      phase: this.phase,
      sessionId: this.sessionId,
      title: this.title,
      minimized: this.minimized,
      elapsedMs: this.elapsedMs,
      chunkOffsetMs: this.chunkOffsetMs,
      chunkIndex: this.chunkIndex,
      segments: this.segments,
      draftLine: this.draftLine,
      draftRl: this.draftRl,
      speakerAliasMap: this.speakerAliasMap,
      segmentOverrides: this.segmentOverrides,
      markers: this.markers,
      errorMessage: this.errorMessage,
      level: this.level,
      domain: this.domain,
      deviceId: this.deviceId,
      featureIds: this.featureIds,
      renewNotice: this.renewNotice,
    }
  }

  setTitle(title: string) {
    this.title = title
    this.emit()
  }

  setDomain(domain: string) {
    this.domain = domain
    this.emit()
  }

  setDeviceId(deviceId: string | null) {
    this.deviceId = deviceId
    this.emit()
  }

  setFeatureIds(ids: string[]) {
    this.featureIds = ids
    this.emit()
  }

  setMinimized(minimized: boolean) {
    this.minimized = minimized
    this.emit()
  }

  renameSpeaker(rl: number, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    this.speakerAliasMap[rl] = trimmed
    this.segments = this.segments.map((s) => {
      const effectiveRl = this.segmentOverrides[s.id] ?? (s.rl > 0 ? s.rl : this.currentRl)
      return effectiveRl === rl ? { ...s, speakerDisplay: trimmed } : s
    })
    this.emit()
  }

  mergeSpeakers(fromRl: number, toRl: number) {
    if (fromRl === toRl) return
    const toName = this.speakerAliasMap[toRl] ?? defaultSpeakerLabel(toRl)
    delete this.speakerAliasMap[fromRl]
    this.segments = this.segments.map((s) => {
      const effectiveRl = this.segmentOverrides[s.id] ?? (s.rl > 0 ? s.rl : this.currentRl)
      if (effectiveRl === fromRl) {
        this.segmentOverrides[s.id] = toRl
        return { ...s, rl: toRl, speakerDisplay: toName, speakerOverride: true }
      }
      return s
    })
    this.emit()
  }

  reassignSegment(segmentId: string, rl: number) {
    const name = this.speakerAliasMap[rl] ?? defaultSpeakerLabel(rl)
    this.segmentOverrides[segmentId] = rl
    this.segments = this.segments.map((s) =>
      s.id === segmentId ? { ...s, rl, speakerDisplay: name, speakerOverride: true } : s,
    )
    this.emit()
  }

  addMarker(label?: string) {
    if (this.phase !== 'recording' && this.phase !== 'paused') return
    this.markers = [
      ...this.markers,
      { id: generateId(), atMs: this.elapsedMs, label: label?.trim() || undefined },
    ]
    this.emit()
  }

  private speakerName(rl: number): string {
    const effective = rl > 0 ? rl : this.currentRl
    return this.speakerAliasMap[effective] ?? defaultSpeakerLabel(effective)
  }

  private effectiveSegmentRl(seg: LiveSegment): number {
    const override = this.segmentOverrides[seg.id]
    if (override !== undefined) return override
    return seg.rl > 0 ? seg.rl : this.currentRl
  }

  /** 同一说话人连续出句时合并为一块，避免每句 VAD 切分都换行 */
  private appendFinalSegment(parsed: {
    text: string
    rl: number
    beginMs: number
    endMs: number
  }) {
    const rl = parsed.rl > 0 ? parsed.rl : this.currentRl
    const beginMs = parsed.beginMs + this.chunkOffsetMs
    const endMs = parsed.endMs + this.chunkOffsetMs

    const last = this.segments[this.segments.length - 1]
    if (last && this.effectiveSegmentRl(last) === rl) {
      this.segments = [
        ...this.segments.slice(0, -1),
        {
          ...last,
          text: last.text + parsed.text,
          endMs,
          speakerDisplay: this.speakerName(rl),
        },
      ]
      this.draftLine = ''
      return
    }

    this.segments = [
      ...this.segments,
      {
        id: generateId(),
        rl,
        speakerDisplay: this.speakerName(rl),
        speakerOverride: false,
        beginMs,
        endMs,
        text: parsed.text,
        isFinal: true,
      },
    ]
    this.draftLine = ''
  }

  async listDevices(): Promise<AudioInputDevice[]> {
    return listAudioInputDevices()
  }

  private async createSessionWithRetry(title: string) {
    await rtasrApi.abandonLiveSession().catch(() => null)
    return rtasrApi.createSession({
      domain: this.domain,
      title,
      featureIds: this.featureIds.length ? this.featureIds : undefined,
    })
  }

  private async abandonCurrentSession() {
    if (!this.sessionId) return
    await rtasrApi.abandonLiveSession().catch(() => null)
    this.sessionId = null
  }

  async start(title?: string): Promise<void> {
    if (this.phase === 'recording' || this.phase === 'connecting') return

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.phase = 'requesting'
    this.errorMessage = null
    this.segments = []
    this.draftLine = ''
    this.pcmParts = []
    this.elapsedMs = 0
    this.chunkOffsetMs = 0
    this.chunkIndex = 0
    this.markers = []
    this.renewTriggered = false
    this.renewNotice = null
    this.title = title?.trim() || this.defaultTitle()
    this.emit()

    try {
      // 必须在 await 网络请求之前打开麦克风，否则 AudioContext 无法从用户手势唤醒
      await this.capture.openMic({
        deviceId: this.deviceId ?? undefined,
        onError: (msg) => {
          this.errorMessage = msg
        },
      })

      const { sessionId, wsPath } = await this.createSessionWithRetry(this.title)
      this.sessionId = sessionId
      this.phase = 'connecting'
      this.emit()

      await this.connectWs(buildRtAsrWsUrl(wsPath))
      await this.startCapture()
      this.phase = 'recording'
      this.startTimer()
      this.startRecoveryPersist()
      this.emit()
    } catch (err) {
      this.capture.release()
      await this.abandonCurrentSession()
      if (isApiClientError(err)) {
        this.errorMessage = err.message
      } else if (err instanceof Error && err.message === 'mic-denied') {
        this.errorMessage = this.errorMessage ?? '无法访问麦克风'
      } else {
        this.errorMessage = err instanceof Error ? err.message : '启动录音失败'
      }
      this.phase = 'error'
      this.emit()
    }
  }

  async resumeLive(snapshot: RecordingRecoverySnapshot): Promise<void> {
    if (this.isActive()) return

    this.phase = 'connecting'
    this.errorMessage = null
    this.sessionId = snapshot.sessionId
    this.title = snapshot.title
    this.domain = snapshot.domain
    this.deviceId = snapshot.deviceId
    this.featureIds = snapshot.featureIds
    this.chunkOffsetMs = snapshot.chunkOffsetMs
    this.chunkIndex = snapshot.chunkIndex
    this.elapsedMs = snapshot.elapsedMs
    this.segments = snapshot.segments
    this.speakerAliasMap = snapshot.speakerAliasMap
    this.segmentOverrides = snapshot.segmentOverrides
    this.markers = snapshot.markers
    this.draftLine = ''
    this.pcmParts = []
    this.renewTriggered = false
    this.emit()

    try {
      await this.capture.openMic({
        deviceId: this.deviceId ?? undefined,
        onError: (msg) => {
          this.errorMessage = msg
        },
      })

      const live = await rtasrApi.getLiveSession()
      if (!live || live.sessionId !== snapshot.sessionId) {
        clearRecordingRecovery()
        this.capture.release()
        throw new Error('服务端无进行中的录音会话')
      }
      this.chunkOffsetMs = live.chunkOffsetMs
      this.chunkIndex = live.chunkIndex

      await this.connectWs(buildRtAsrWsUrl(live.wsPath))
      await this.startCapture()
      this.phase = 'recording'
      this.startTimer()
      this.startRecoveryPersist()
      this.emit()
    } catch (err) {
      this.capture.release()
      await this.abandonCurrentSession()
      this.errorMessage = err instanceof Error ? err.message : '恢复录音失败'
      this.phase = 'error'
      this.emit()
    }
  }

  private async startCapture() {
    await this.capture.start({
      deviceId: this.deviceId ?? undefined,
      onPcmChunk: (chunk) => this.handlePcmChunk(chunk),
      onLevel: (lv) => {
        this.level = lv
        this.emit()
      },
      onError: (msg) => {
        this.errorMessage = msg
        this.phase = 'error'
        this.emit()
      },
    })
  }

  private handlePcmChunk(chunk: ArrayBuffer) {
    this.pcmParts.push(chunk.slice(0))
    const ws = this.ws
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(chunk)
    }
  }

  private connectWs(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'
      this.ws = ws

      const timeout = window.setTimeout(() => {
        reject(new Error('连接转写服务超时'))
        ws.close()
      }, 15000)

      ws.onopen = () => {
        window.clearTimeout(timeout)
        resolve()
      }

      ws.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('转写服务连接失败'))
      }

      ws.onclose = (ev) => {
        if (this.phase === 'recording' && !this.renewInProgress && ev.code !== 1000) {
          this.errorMessage = `转写连接已断开 (${ev.code})`
          this.phase = 'error'
          this.emit()
        }
      }

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return

        try {
          const json = JSON.parse(event.data) as Record<string, unknown>
          const data = json.data as Record<string, unknown> | undefined
          const action = json.action ?? data?.action

          if (action === 'error') {
            if (this.phase !== 'saving' && this.phase !== 'idle') {
              this.errorMessage = String(json.desc ?? '转写引擎错误')
              this.phase = 'error'
              this.emit()
            }
            return
          }

          if (action === 'started') {
            return
          }
        } catch {
          // 非 JSON，继续走 ASR 解析
        }

        const parsed = parseRtAsrMessage(event.data)
        if (!parsed) return

        if (parsed.rl > 0) this.currentRl = parsed.rl

        if (parsed.isFinal) {
          this.appendFinalSegment(parsed)
        } else {
          this.draftLine = parsed.text
          this.draftRl = parsed.rl > 0 ? parsed.rl : this.currentRl
        }
        this.emit()
      }
    })
  }

  private async reconnectWs() {
    if (!this.sessionId) return
    const live = await rtasrApi.getLiveSession()
    if (!live) return
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ end: true, sessionId: this.sessionId }))
      this.ws.close()
    }
    this.ws = null
    await this.connectWs(buildRtAsrWsUrl(live.wsPath))
  }

  pause(): void {
    if (this.phase !== 'recording') return
    this.capture.pause()
    this.pausedAt = Date.now()
    this.phase = 'paused'
    this.stopTimer()
    this.emit()
  }

  async resume(): Promise<void> {
    if (this.phase !== 'paused') return

    const pausedDuration = this.pausedAt ? Date.now() - this.pausedAt : 0
    this.pausedAt = null

    if (pausedDuration > RTASR_PAUSE_RECONNECT_MS) {
      try {
        await this.reconnectWs()
      } catch {
        this.errorMessage = '恢复转写连接失败'
        this.phase = 'error'
        this.emit()
        return
      }
    }

    this.capture.resume({
      onPcmChunk: (chunk) => this.handlePcmChunk(chunk),
      onLevel: (lv) => {
        this.level = lv
        this.emit()
      },
    })
    this.phase = 'recording'
    this.startTimer()
    this.emit()
  }

  async stopAndSave(): Promise<FinishRecordingResult | null> {
    if (!this.sessionId || (this.phase !== 'recording' && this.phase !== 'paused')) {
      return null
    }

    this.phase = 'saving'
    this.stopTimer()
    this.stopRecoveryPersist()
    this.emit()

    const pcm = this.capture.stop()
    this.pcmParts.push(pcm)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ end: true, sessionId: this.sessionId }))
      this.ws.close()
    }
    this.ws = null

    const merged = this.mergePcm(this.pcmParts)
    const wavBlob = pcmToWavBlob(merged)

    const payload = {
      title: this.title,
      durationMs: this.elapsedMs,
      saveAudio: true,
      segments: this.segments.map((s) => ({
        id: s.id,
        beginMs: s.beginMs,
        endMs: s.endMs,
        speaker: s.speakerDisplay,
        text: s.text,
      })),
      markers: this.markers.map((m) => ({
        id: m.id,
        atMs: m.atMs,
        label: m.label,
      })),
    }

    try {
      const result = await rtasrApi.finishSession(this.sessionId, payload, wavBlob)
      this.reset()
      return result
    } catch {
      this.errorMessage = '保存录音失败'
      this.phase = 'error'
      this.emit()
      return null
    }
  }

  reset(): void {
    this.phase = 'idle'
    this.sessionId = null
    this.minimized = false
    this.segments = []
    this.draftLine = ''
    this.pcmParts = []
    this.markers = []
    this.errorMessage = null
    this.renewNotice = null
    this.pausedAt = null
    this.renewTriggered = false
    clearRecordingRecovery()
    this.emit()
  }

  discardRecovery(): void {
    clearRecordingRecovery()
  }

  isActive(): boolean {
    return (
      this.phase === 'recording' ||
      this.phase === 'paused' ||
      this.phase === 'connecting' ||
      this.phase === 'saving'
    )
  }

  private mergePcm(parts: ArrayBuffer[]): ArrayBuffer {
    const total = parts.reduce((n, p) => n + p.byteLength, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const p of parts) {
      out.set(new Uint8Array(p), offset)
      offset += p.byteLength
    }
    return out.buffer
  }

  private startTimer() {
    this.stopTimer()
    const started = Date.now() - this.elapsedMs
    this.timer = setInterval(() => {
      this.elapsedMs = Date.now() - started
      void this.checkRenew()
      this.emit()
    }, 250)
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private startRecoveryPersist() {
    this.stopRecoveryPersist()
    this.recoveryTimer = setInterval(() => this.persistRecovery(), 3000)
  }

  private stopRecoveryPersist() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }
  }

  private persistRecovery() {
    if (!this.sessionId || !this.isActive()) return
    saveRecordingRecovery({
      sessionId: this.sessionId,
      title: this.title,
      domain: this.domain,
      deviceId: this.deviceId,
      featureIds: this.featureIds,
      chunkOffsetMs: this.chunkOffsetMs,
      chunkIndex: this.chunkIndex,
      elapsedMs: this.elapsedMs,
      segments: this.segments,
      speakerAliasMap: this.speakerAliasMap,
      segmentOverrides: this.segmentOverrides,
      markers: this.markers,
      savedAt: Date.now(),
    })
  }

  private async checkRenew() {
    if (this.renewTriggered || this.renewInProgress || !this.sessionId) return
    const chunkElapsed = this.elapsedMs - this.chunkOffsetMs
    if (chunkElapsed < RTASR_RENEW_AT_MS) return

    this.renewTriggered = true
    this.renewInProgress = true
    this.renewNotice = '正在自动续录…'
    this.emit()

    try {
      const result = await rtasrApi.renewSession(this.sessionId, chunkElapsed)
      this.chunkOffsetMs = result.chunkOffsetMs
      this.chunkIndex = result.chunkIndex

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ end: true, sessionId: this.sessionId }))
        this.ws.close()
      }
      this.ws = null
      await new Promise((r) => setTimeout(r, 500))
      await this.connectWs(buildRtAsrWsUrl(result.wsPath))

      const hours = Math.floor(this.elapsedMs / 3600000)
      this.renewNotice = hours > 0 ? `已连续转写 ${hours} 小时` : '续录成功'
      this.renewTriggered = false
      window.setTimeout(() => {
        this.renewNotice = null
        this.emit()
      }, 4000)
    } catch {
      this.errorMessage = '自动续录失败，请结束并保存后重新开始'
      this.phase = 'error'
    } finally {
      this.renewInProgress = false
      this.emit()
    }
  }

  private defaultTitle() {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `新录音-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  }
}

let singleton: RecordingEngine | null = null

export function getRecordingEngine(): RecordingEngine {
  if (!singleton) singleton = new RecordingEngine()
  return singleton
}
