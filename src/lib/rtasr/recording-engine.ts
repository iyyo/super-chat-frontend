import { generateId } from '@/lib/utils'
import {
  rtasrApi,
  type FinishRecordingPayload,
  type FinishRecordingResult,
  type RtAsrProvider,
  type RtAsrLiveSession,
} from '@/lib/api/rtasr'
import { isApiClientError } from '@/lib/errors/api-client-error'
import {
  AudioCapture,
  listAudioInputDevices,
  pcmToWavBlob,
  type AudioInputDevice,
} from '@/lib/rtasr/audio-capture'
import { RtAsrConnectionKernel, type KernelEvent } from '@/lib/rtasr/connection-kernel'
import { defaultSpeakerLabel, parseRtAsrMessage } from '@/lib/rtasr/parse-result'
import {
  RTASR_CHECKPOINT_INTERVAL_MS,
  RTASR_RENEW_AT_MS,
  RTASR_SAVE_RETRY_BASE_DELAY_MS,
  RTASR_SAVE_RETRY_MAX_ATTEMPTS,
} from '@/lib/rtasr/constants'

export type RecordingPhase =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'recording'
  | 'reconnecting'
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
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
  /** 右侧合并后，后续 ASR 原始 rl 映射到目标 rl */
  private speakerRlRemap: Record<number, number> = {}
  private markers: RecordingMarker[] = []
  private errorMessage: string | null = null
  private level = 0
  private domain = 'general'
  private provider: RtAsrProvider = 'xfyun'
  private deviceId: string | null = null
  private featureIds: string[] = []
  private renewNotice: string | null = null
  private pausedAt: number | null = null
  private reconnectAttempt = 0
  private reconnectStartedAt: number | null = null
  private autoFinishResult: FinishRecordingResult | null = null
  private saveQueuePending = false

  /** 双 WS 连接内核：管理通道 + 音频通道，唯一重连权威 */
  private kernel = new RtAsrConnectionKernel()
  private kernelUnsub: (() => void) | null = null
  private capture = new AudioCapture()
  private timer: ReturnType<typeof setInterval> | null = null
  private recoveryTimer: ReturnType<typeof setInterval> | null = null
  private pcmParts: ArrayBuffer[] = []
  private listeners = new Set<RecordingEngineListener>()
  private currentRl = 1
  private renewInProgress = false
  private renewTriggered = false
  private networkOnline = typeof navigator === 'undefined' ? true : navigator.onLine
  private timerFrozenByNetwork = false

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
      provider: this.provider,
      deviceId: this.deviceId,
      featureIds: this.featureIds,
      renewNotice: this.renewNotice,
      reconnectAttempt: this.reconnectAttempt,
      reconnectStartedAt: this.reconnectStartedAt,
      autoFinishResult: this.autoFinishResult,
      saveQueuePending: this.saveQueuePending,
    }
  }

  clearAutoFinishResult() {
    this.autoFinishResult = null
    this.emit()
  }

  setSaveQueuePending(pending: boolean) {
    this.saveQueuePending = pending
    this.emit()
  }

  setTitle(title: string) {
    this.title = title
    this.emit()
  }

  setDomain(domain: string) {
    this.domain = domain
    this.emit()
  }

  setProvider(provider: RtAsrProvider) {
    this.provider = provider
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
    const target = this.resolveRl(toRl)
    if (fromRl === target) return

    const toName = this.speakerAliasMap[target] ?? defaultSpeakerLabel(target)
    delete this.speakerAliasMap[fromRl]

    // 先按合并前的 raw rl 改写段落，再写入 remap（否则 resolve 后已等于 target，条件失效）
    this.segments = this.segments.map((s) => {
      const override = this.segmentOverrides[s.id]
      const rawRl = override !== undefined ? override : s.rl > 0 ? s.rl : this.currentRl
      if (rawRl === fromRl) {
        this.segmentOverrides[s.id] = target
        return { ...s, rl: target, speakerDisplay: toName, speakerOverride: true }
      }
      return s
    })

    this.speakerRlRemap[fromRl] = target
    for (const [key, value] of Object.entries(this.speakerRlRemap)) {
      if (Number(value) === fromRl) this.speakerRlRemap[Number(key)] = target
    }

    this.segments = this.coalesceAdjacentSegments(this.segments)

    if (this.draftRl === fromRl) this.draftRl = target
    if (this.currentRl === fromRl) this.currentRl = target

    this.emit()
  }

  reassignSegment(segmentId: string, rl: number) {
    const target = this.resolveRl(rl)
    const name = this.speakerAliasMap[target] ?? defaultSpeakerLabel(target)
    this.segmentOverrides[segmentId] = target
    this.segments = this.segments.map((s) =>
      s.id === segmentId ? { ...s, rl: target, speakerDisplay: name, speakerOverride: true } : s,
    )
    this.segments = this.coalesceAdjacentSegments(this.segments)
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

  private resolveRl(rl: number): number {
    let cur = rl > 0 ? rl : this.currentRl
    const seen = new Set<number>()
    while (this.speakerRlRemap[cur] !== undefined && !seen.has(cur)) {
      seen.add(cur)
      cur = this.speakerRlRemap[cur]
    }
    return cur
  }

  private speakerName(rl: number): string {
    const effective = this.resolveRl(rl > 0 ? rl : this.currentRl)
    return this.speakerAliasMap[effective] ?? defaultSpeakerLabel(effective)
  }

  private effectiveSegmentRl(seg: LiveSegment): number {
    const override = this.segmentOverrides[seg.id]
    if (override !== undefined) return this.resolveRl(override)
    return this.resolveRl(seg.rl > 0 ? seg.rl : this.currentRl)
  }

  /** 合并后把相邻同发言人块拼成一块，左右展示一致 */
  private coalesceAdjacentSegments(segs: LiveSegment[]): LiveSegment[] {
    if (segs.length <= 1) return segs
    const out: LiveSegment[] = []
    for (const seg of segs) {
      const rl = this.effectiveSegmentRl(seg)
      const prev = out[out.length - 1]
      if (prev && this.effectiveSegmentRl(prev) === rl) {
        out[out.length - 1] = {
          ...prev,
          text: prev.text + seg.text,
          endMs: seg.endMs,
          speakerDisplay: this.speakerName(rl),
        }
        continue
      }
      out.push({
        ...seg,
        rl,
        speakerDisplay: this.speakerName(rl),
      })
    }
    return out
  }

  /** 同一说话人连续出句时合并为一块，避免每句 VAD 切分都换行 */
  private appendFinalSegment(parsed: {
    text: string
    rl: number
    beginMs: number
    endMs: number
  }) {
    const rl = this.resolveRl(parsed.rl > 0 ? parsed.rl : this.currentRl)
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
      provider: this.provider,
      domain: this.domain,
      title,
      featureIds:
        this.provider === 'xfyun' && this.featureIds.length ? this.featureIds : undefined,
    })
  }

  private async abandonCurrentSession() {
    if (!this.sessionId) return
    await rtasrApi.abandonLiveSession().catch(() => null)
    this.sessionId = null
  }

  async start(title?: string): Promise<void> {
    if (this.phase === 'recording' || this.phase === 'connecting') return

    this.kernel.dispose()
    this.unbindKernelEvents()

    this.phase = 'requesting'
    this.errorMessage = null
    this.segments = []
    this.draftLine = ''
    this.draftRl = 0
    this.currentRl = 1
    this.speakerAliasMap = {}
    this.segmentOverrides = {}
    this.speakerRlRemap = {}
    this.pcmParts = []
    this.elapsedMs = 0
    this.chunkOffsetMs = 0
    this.chunkIndex = 0
    this.markers = []
    this.renewTriggered = false
    this.renewNotice = null
    this.minimized = false
    this.reconnectAttempt = 0
    this.reconnectStartedAt = null
    this.timerFrozenByNetwork = false
    this.networkOnline = typeof navigator === 'undefined' ? true : navigator.onLine
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

      const session = await this.createSessionWithRetry(this.title)
      this.sessionId = session.sessionId
      this.phase = 'connecting'
      this.emit()

      this.bindKernelEvents()
      await this.kernel.open(this.resolveWsPaths(session))
      await this.startCapture()
      this.phase = 'recording'
      this.startTimer()
      this.startRecoveryPersist()
      this.emit()
    } catch (err) {
      this.capture.release()
      this.kernel.dispose()
      this.unbindKernelEvents()
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

  async resumeLive(live: RtAsrLiveSession): Promise<void> {
    if (this.isActive()) return

    this.kernel.dispose()
    this.unbindKernelEvents()

    const checkpoint = live.checkpoint
    this.phase = 'connecting'
    this.errorMessage = null
    this.sessionId = live.sessionId
    this.title = live.title?.trim() || this.defaultTitle()
    this.provider = live.provider
    this.domain = checkpoint?.domain ?? live.domain ?? this.domain
    this.deviceId = checkpoint?.deviceId ?? live.deviceId ?? this.deviceId
    this.featureIds = checkpoint?.featureIds ?? live.featureIds ?? []
    this.chunkOffsetMs = live.chunkOffsetMs
    this.chunkIndex = live.chunkIndex
    this.elapsedMs = live.elapsedMs ?? 0
    this.segments = checkpoint?.segments ?? []
    this.speakerAliasMap = checkpoint?.speakerAliasMap ?? {}
    this.segmentOverrides = checkpoint?.segmentOverrides ?? {}
    this.markers = checkpoint?.markers ?? []
    this.draftLine = ''
    this.pcmParts = []
    this.renewTriggered = false
    this.reconnectAttempt = 0
    this.reconnectStartedAt = null
    this.timerFrozenByNetwork = false
    this.networkOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    this.emit()

    try {
      await this.capture.openMic({
        deviceId: this.deviceId ?? undefined,
        onError: (msg) => {
          this.errorMessage = msg
        },
      })

      const latest = await rtasrApi.getLiveSession()
      if (!latest || latest.sessionId !== live.sessionId) {
        this.capture.release()
        throw new Error('服务端无进行中的录音会话')
      }
      this.chunkOffsetMs = latest.chunkOffsetMs
      this.chunkIndex = latest.chunkIndex
      if (latest.elapsedMs != null) this.elapsedMs = latest.elapsedMs

      this.bindKernelEvents()
      await this.kernel.open(this.resolveWsPaths(latest))
      await this.startCapture()
      this.phase = 'recording'
      this.startTimer()
      this.startRecoveryPersist()
      this.emit()
    } catch (err) {
      this.capture.release()
      this.kernel.dispose()
      this.unbindKernelEvents()
      await this.abandonCurrentSession()
      this.errorMessage = err instanceof Error ? err.message : '恢复录音失败'
      this.phase = 'error'
      this.emit()
    }
  }

  private resolveWsPaths(session: {
    sessionId: string
    wsPath: string
    manageWsPath?: string
    audioWsPath?: string
  }): { sessionId: string; manageWsPath: string; audioWsPath: string } {
    return {
      sessionId: session.sessionId,
      manageWsPath:
        session.manageWsPath ?? `/api/rtasr/ws/manage?sessionId=${session.sessionId}`,
      audioWsPath: session.audioWsPath ?? session.wsPath,
    }
  }

  private bindKernelEvents() {
    this.unbindKernelEvents()
    this.kernelUnsub = this.kernel.subscribe((event) => this.onKernelEvent(event))
  }

  private unbindKernelEvents() {
    if (this.kernelUnsub) {
      this.kernelUnsub()
      this.kernelUnsub = null
    }
  }

  private onKernelEvent(event: KernelEvent) {
    switch (event.type) {
      case 'asr_message':
        this.handleAsrMessage(event.data)
        break
      case 'reconnecting':
        this.phase = 'reconnecting'
        this.stopTimer()
        this.reconnectAttempt = event.attempt
        if (this.reconnectStartedAt == null) this.reconnectStartedAt = Date.now()
        this.errorMessage = `重连中 第${event.round}轮·第${event.ticket}次拉票…`
        this.emit()
        break
      case 'reconnected':
        this.phase = 'recording'
        this.reconnectAttempt = 0
        this.reconnectStartedAt = null
        this.errorMessage = null
        if (this.timerFrozenByNetwork || !this.timer) this.startTimer()
        this.timerFrozenByNetwork = false
        this.emit()
        break
      case 'network':
        this.networkOnline = event.online
        if (!event.online && (this.phase === 'recording' || this.phase === 'reconnecting')) {
          this.phase = 'reconnecting'
          this.stopTimer()
          this.timerFrozenByNetwork = true
          if (this.reconnectStartedAt == null) this.reconnectStartedAt = Date.now()
          this.errorMessage = '网络已断开，已停表；恢复后最多重连 10 分钟'
          this.emit()
        }
        break
      case 'failed':
        if (event.reason.includes('give_up')) {
          void this.timeoutProtectAndSummarize()
        }
        break
      default:
        break
    }
  }

  private handleAsrMessage(raw: string) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>
      const data = json.data as Record<string, unknown> | undefined
      const action = json.action ?? data?.action

      if (action === 'error') {
        // 上游瞬时错误交给内核重连，避免直接打成 error 中断 10 分钟窗口
        if (
          this.phase !== 'saving' &&
          this.phase !== 'idle' &&
          this.phase !== 'reconnecting'
        ) {
          this.errorMessage = String(json.desc ?? '转写引擎错误')
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

    const parsed = parseRtAsrMessage(raw)
    if (!parsed) return

    if (parsed.rl > 0) this.currentRl = this.resolveRl(parsed.rl)

    if (parsed.isFinal) {
      this.appendFinalSegment(parsed)
    } else {
      this.draftLine = parsed.text
      this.draftRl = this.resolveRl(parsed.rl > 0 ? parsed.rl : this.currentRl)
    }
    this.emit()
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
    this.kernel.sendPcm(chunk)
  }

  private buildFinishPayload(interrupted = false): FinishRecordingPayload {
    return {
      title: this.title,
      durationMs: this.elapsedMs,
      saveAudio: true,
      interrupted: interrupted || undefined,
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
  }

  /** 内存内重试 finish，不落本地盘；归属以当前登录 token 为准 */
  private async finishWithServerRetry(
    sessionId: string,
    payload: FinishRecordingPayload,
    wavBlob: Blob,
  ): Promise<FinishRecordingResult> {
    let lastError: unknown
    for (let attempt = 1; attempt <= RTASR_SAVE_RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        this.saveQueuePending = attempt > 1
        this.emit()
        return await rtasrApi.finishSession(sessionId, payload, wavBlob)
      } catch (err) {
        lastError = err
        this.saveQueuePending = true
        this.errorMessage = `保存失败，正在重试（${attempt}/${RTASR_SAVE_RETRY_MAX_ATTEMPTS}）…`
        this.emit()
        await sleep(Math.min(12_000, RTASR_SAVE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)))
      }
    }
    throw lastError instanceof Error ? lastError : new Error('保存录音失败')
  }

  /** 重连超时：停止采集并尽量保存到服务端，由后端挂起追录确认 */
  private async timeoutProtectAndSummarize() {
    if (!this.sessionId) {
      this.phase = 'error'
      this.errorMessage = '转写连接已断开，无法恢复'
      this.emit()
      return
    }

    this.phase = 'saving'
    this.errorMessage = '网络恢复失败，正在自动保存已录内容…'
    this.stopTimer()
    this.stopRecoveryPersist()
    this.emit()

    this.kernel.dispose()
    this.unbindKernelEvents()

    const leftover = this.capture.stop()
    this.pcmParts.push(leftover)
    this.capture.release()

    const sessionId = this.sessionId
    const payload = this.buildFinishPayload(true)
    const wavBlob = pcmToWavBlob(this.mergePcm(this.pcmParts))

    try {
      // 先把检查点推到服务端，即使 finish 失败也能按账号恢复转写
      await this.persistRecovery(true)
      const result = await this.finishWithServerRetry(sessionId, payload, wavBlob)
      this.autoFinishResult = result
      this.saveQueuePending = false
      this.reset({ keepAutoFinish: true })
    } catch {
      this.saveQueuePending = false
      this.errorMessage = '自动保存失败，请检查网络后重试结束保存；转写检查点已同步到当前账号'
      this.sessionId = null
      this.pcmParts = []
      this.phase = 'error'
      this.emit()
    }
  }

  pause(): void {
    if (this.phase !== 'recording') return
    this.capture.pause()
    void this.kernel.pause()
    this.pausedAt = Date.now()
    this.phase = 'paused'
    this.stopTimer()
    this.emit()
  }

  async resume(): Promise<void> {
    if (this.phase !== 'paused') return

    if (this.pausedAt != null) this.pausedAt = null

    try {
      await this.kernel.resume()
    } catch {
      this.errorMessage = '恢复转写连接失败'
      this.phase = 'error'
      this.emit()
      return
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
    if (
      !this.sessionId ||
      (this.phase !== 'recording' &&
        this.phase !== 'paused' &&
        this.phase !== 'reconnecting')
    ) {
      return null
    }

    this.phase = 'saving'
    this.stopTimer()
    this.stopRecoveryPersist()
    this.emit()

    const pcm = this.capture.stop()
    this.pcmParts.push(pcm)
    this.kernel.sendAudioEnd()
    await this.kernel.stop()

    const sessionId = this.sessionId
    const payload = this.buildFinishPayload(false)
    const merged = this.mergePcm(this.pcmParts)
    const wavBlob = pcmToWavBlob(merged)

    try {
      await this.persistRecovery(true)
      const result = await this.finishWithServerRetry(sessionId, payload, wavBlob)
      this.saveQueuePending = false
      this.reset()
      return result
    } catch {
      this.saveQueuePending = false
      this.errorMessage = '保存录音失败，请检查网络后重试；转写检查点已同步到当前账号'
      this.sessionId = null
      this.pcmParts = []
      this.phase = 'error'
      this.emit()
      return null
    }
  }

  reset(options?: { keepAutoFinish?: boolean }): void {
    this.kernel.dispose()
    this.unbindKernelEvents()
    this.phase = 'idle'
    this.sessionId = null
    this.minimized = false
    this.segments = []
    this.draftLine = ''
    this.draftRl = 0
    this.currentRl = 1
    this.speakerAliasMap = {}
    this.segmentOverrides = {}
    this.speakerRlRemap = {}
    this.pcmParts = []
    this.markers = []
    this.errorMessage = null
    this.renewNotice = null
    this.pausedAt = null
    this.renewTriggered = false
    this.reconnectAttempt = 0
    this.reconnectStartedAt = null
    this.timerFrozenByNetwork = false
    this.saveQueuePending = false
    if (!options?.keepAutoFinish) {
      this.autoFinishResult = null
    }
    this.emit()
  }

  discardRecovery(): void {
    void rtasrApi.abandonLiveSession().catch(() => null)
  }

  isActive(): boolean {
    return (
      this.phase === 'recording' ||
      this.phase === 'reconnecting' ||
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
    this.recoveryTimer = setInterval(() => {
      void this.persistRecovery()
    }, RTASR_CHECKPOINT_INTERVAL_MS)
  }

  private stopRecoveryPersist() {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }
  }

  private async persistRecovery(force = false) {
    if (!this.sessionId) return
    if (!force && !this.isActive()) return
    try {
      const speakerAliasMap: Record<string, string> = {}
      for (const [k, v] of Object.entries(this.speakerAliasMap)) {
        speakerAliasMap[String(k)] = v
      }
      await rtasrApi.saveCheckpoint(this.sessionId, {
        elapsedMs: this.elapsedMs,
        title: this.title,
        chunkIndex: this.chunkIndex,
        chunkOffsetMs: this.chunkOffsetMs,
        domain: this.domain,
        deviceId: this.deviceId,
        featureIds: this.featureIds,
        segments: this.segments,
        speakerAliasMap,
        segmentOverrides: this.segmentOverrides,
        markers: this.markers,
      })
    } catch {
      // 心跳失败不打断录音；下次间隔再试
    }
  }

  private async checkRenew() {
    if (this.renewTriggered || this.renewInProgress || !this.sessionId) return
    if (!this.networkOnline || this.timerFrozenByNetwork) return
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

      await this.kernel.rebuildAudioOnly('renew')

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
