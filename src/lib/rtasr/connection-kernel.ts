import { buildRtAsrWsUrl, rtasrApi } from '@/lib/api/rtasr'
import {
  RTASR_RECONNECT_GIVE_UP_MS,
  RTASR_RECONNECT_INITIAL_DELAY_MS,
  RTASR_RECONNECT_ROUND_GAP_MS,
  RTASR_RECONNECT_TICKET_INTERVAL_MS,
  RTASR_RECONNECT_TICKETS_PER_ROUND,
  RTASR_RECONNECT_WS_TIMEOUT_MS,
} from '@/lib/rtasr/constants'

export type KernelEvent =
  | { type: 'manage_ready' }
  | { type: 'audio_ready' }
  | { type: 'asr_message'; data: string }
  | { type: 'audio_reconnect'; reason: string }
  | { type: 'failed'; reason: string; code?: string }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'stopped' }
  | { type: 'network'; online: boolean }
  | { type: 'reconnecting'; attempt: number; round: number; ticket: number }
  | { type: 'reconnected' }

type Listener = (event: KernelEvent) => void
type ReconnectMode = 'audio' | 'full'

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 双 WS 连接内核（唯一重连权威）
 * - 管理 WS：心跳 / PAUSE·RESUME·STOP / audio_reconnect·failed
 * - 音频 WS：PCM 推流 + 转写结果
 * - 重连：3s 起、每轮 4 票/间隔 5s、单连 10s、整段 600s
 */
export class RtAsrConnectionKernel {
  private manageWs: WebSocket | null = null
  private audioWs: WebSocket | null = null
  private sessionId: string | null = null
  private managePath: string | null = null
  private audioPath: string | null = null

  private sendGateOpen = false
  private paused = false
  private stopping = false
  private intentionalAudioClose = false
  private intentionalManageClose = false
  private audioReady = false
  private manageReady = false
  private browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine

  private reconnectLoopToken = 0
  private reconnectAttempt = 0
  private reconnectStartedAt: number | null = null
  private reconnecting = false

  private listeners = new Set<Listener>()
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: KernelEvent) {
    this.listeners.forEach((l) => l(event))
  }

  get isAudioReady() {
    return this.audioReady && this.audioWs?.readyState === WebSocket.OPEN
  }

  get isManageReady() {
    return this.manageReady && this.manageWs?.readyState === WebSocket.OPEN
  }

  get isPaused() {
    return this.paused
  }

  get isReconnecting() {
    return this.reconnecting
  }

  get reconnectTries() {
    return this.reconnectAttempt
  }

  async open(options: {
    sessionId: string
    manageWsPath: string
    audioWsPath: string
  }): Promise<void> {
    this.stopping = false
    this.paused = false
    this.sessionId = options.sessionId
    this.managePath = options.manageWsPath
    this.audioPath = options.audioWsPath
    this.browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
    this.bindNetwork()

    await this.connectManage()
    await this.connectAudio()
  }

  async pause(): Promise<void> {
    this.paused = true
    this.sendGateOpen = false
    this.sendManage({ cmd: 'PAUSE' })
  }

  async resume(): Promise<void> {
    this.paused = false
    this.sendManage({ cmd: 'RESUME' })
    await this.ensureAudioReady()
  }

  async stop(): Promise<void> {
    this.stopping = true
    this.sendGateOpen = false
    this.sendManage({ cmd: 'STOP' })
    await this.closeAudioIntentional()
    await this.closeManageIntentional()
    this.unbindNetwork()
  }

  /**
   * PCM 发帧门禁（对齐白板）：
   * 浏览器 offline / 管理 WS 未恢复 / 音频 WS 非 OPEN → 丢弃当前帧（不 send）
   */
  sendPcm(chunk: ArrayBuffer): boolean {
    if (!this.browserOnline) return false
    if (this.paused || this.stopping || !this.sendGateOpen) return false
    if (!this.isManageReady) return false
    if (!this.audioWs || this.audioWs.readyState !== WebSocket.OPEN) return false
    this.audioWs.send(chunk)
    return true
  }

  sendAudioEnd(): void {
    if (!this.sessionId || !this.audioWs || this.audioWs.readyState !== WebSocket.OPEN) return
    try {
      this.audioWs.send(JSON.stringify({ end: true, sessionId: this.sessionId }))
    } catch {
      // ignore
    }
  }

  async rebuildAudioOnly(reason = 'client_rebuild'): Promise<void> {
    this.emit({ type: 'audio_reconnect', reason })
    await this.runReconnectSchedule('audio', reason)
  }

  requestAudioReconnect(): void {
    this.sendManage({ cmd: 'REQUEST_AUDIO_RECONNECT' })
  }

  dispose(): void {
    this.stopping = true
    this.sendGateOpen = false
    void this.closeAudioIntentional()
    void this.closeManageIntentional()
    this.unbindNetwork()
    this.reconnectLoopToken += 1
    this.reconnecting = false
    this.sessionId = null
  }

  private async ensureAudioReady(): Promise<void> {
    if (this.isAudioReady && this.isManageReady) {
      this.sendGateOpen = true
      return
    }
    await this.runReconnectSchedule(this.isManageReady ? 'audio' : 'full', 'resume_ensure')
  }

  private async connectManage(): Promise<void> {
    if (!this.managePath) throw new Error('缺少管理通道地址')
    await this.closeManageIntentional()

    const url = buildRtAsrWsUrl(this.managePath)
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      this.manageWs = ws
      this.manageReady = false

      const timeout = window.setTimeout(() => {
        reject(new Error('管理通道连接超时'))
        this.intentionalManageClose = true
        ws.close()
        this.intentionalManageClose = false
      }, RTASR_RECONNECT_WS_TIMEOUT_MS)

      ws.onmessage = (event) => {
        this.onManageMessage(String(event.data), resolve, reject, timeout)
      }

      ws.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('管理通道连接失败'))
      }

      ws.onclose = () => {
        if (this.manageWs === ws) this.manageWs = null
        this.manageReady = false
        this.sendGateOpen = false
        if (this.intentionalManageClose || this.stopping || this.paused) return
        if (this.reconnecting) return
        void this.runReconnectSchedule('full', 'manage_closed')
      }
    })
  }

  private onManageMessage(
    raw: string,
    resolveOpen?: (value: void) => void,
    rejectOpen?: (err: Error) => void,
    timeout?: number,
  ) {
    let json: Record<string, unknown>
    try {
      json = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }

    const event = String(json.event ?? '')

    if (event === 'ready') {
      this.manageReady = true
      this.emit({ type: 'manage_ready' })
      if (timeout) window.clearTimeout(timeout)
      resolveOpen?.()
      return
    }

    if (event === 'ping') {
      this.sendManage({ cmd: 'pong' })
      return
    }

    if (event === 'pong') return

    if (event === 'paused') {
      this.paused = true
      this.sendGateOpen = false
      this.audioReady = false
      this.emit({ type: 'paused' })
      return
    }

    if (event === 'resumed') {
      this.paused = false
      this.emit({ type: 'resumed' })
      return
    }

    if (event === 'stopped') {
      this.emit({ type: 'stopped' })
      return
    }

    if (event === 'audio_ready') {
      this.audioReady = true
      if (!this.paused && this.isManageReady) this.sendGateOpen = true
      this.emit({ type: 'audio_ready' })
      return
    }

    if (event === 'audio_reconnect') {
      const reason = String(json.reason ?? 'unknown')
      this.emit({ type: 'audio_reconnect', reason })
      if (!this.paused && !this.stopping && !this.reconnecting) {
        void this.runReconnectSchedule('audio', reason)
      }
      return
    }

    if (event === 'failed') {
      this.emit({
        type: 'failed',
        reason: String(json.reason ?? 'failed'),
        code: json.code != null ? String(json.code) : undefined,
      })
      if (!this.paused && !this.stopping && !this.reconnecting) {
        void this.runReconnectSchedule('full', String(json.reason ?? 'failed'))
      }
      return
    }

    void rejectOpen
  }

  private async connectAudio(): Promise<void> {
    if (!this.audioPath) throw new Error('缺少音频通道地址')
    await this.closeAudioIntentional()

    const url = buildRtAsrWsUrl(this.audioPath)
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'
      this.audioWs = ws
      this.audioReady = false
      this.sendGateOpen = false

      const timeout = window.setTimeout(() => {
        reject(new Error('音频通道连接超时'))
        this.intentionalAudioClose = true
        ws.close()
        this.intentionalAudioClose = false
      }, RTASR_RECONNECT_WS_TIMEOUT_MS)

      let opened = false

      ws.onopen = () => {
        opened = true
        this.audioReady = true
        if (!this.paused && this.isManageReady) this.sendGateOpen = true
        window.clearTimeout(timeout)
        this.emit({ type: 'audio_ready' })
        resolve()
      }

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : ''
        if (!data) return
        this.emit({ type: 'asr_message', data })
      }

      ws.onerror = () => {
        if (!opened) {
          window.clearTimeout(timeout)
          reject(new Error('音频通道连接失败'))
        }
      }

      ws.onclose = () => {
        if (this.audioWs === ws) this.audioWs = null
        this.audioReady = false
        this.sendGateOpen = false
        if (this.intentionalAudioClose || this.stopping || this.paused) return
        if (this.reconnecting) return
        this.emit({ type: 'audio_reconnect', reason: 'audio_closed' })
        void this.runReconnectSchedule('audio', 'audio_closed')
      }
    })
  }

  /**
   * 白板重连调度：
   * t=0 进入 → t=3 第 1 票 → 每 5s 一票，每轮 4 票 → 轮间隙 3s → 直到成功或 600s
   */
  private async runReconnectSchedule(mode: ReconnectMode, reason: string): Promise<void> {
    if (this.stopping || this.paused) return
    if (this.reconnecting) return

    this.reconnecting = true
    this.sendGateOpen = false
    this.reconnectLoopToken += 1
    const token = this.reconnectLoopToken
    this.reconnectAttempt = 0
    this.reconnectStartedAt = Date.now()
    this.emit({ type: 'audio_reconnect', reason })

    // 进入重连后先等 3s 再首次拉票
    await sleep(RTASR_RECONNECT_INITIAL_DELAY_MS)
    if (token !== this.reconnectLoopToken || this.stopping || this.paused) {
      this.reconnecting = false
      return
    }

    let round = 0
    while (!this.stopping && !this.paused && token === this.reconnectLoopToken) {
      if (Date.now() - (this.reconnectStartedAt ?? Date.now()) >= RTASR_RECONNECT_GIVE_UP_MS) {
        this.reconnecting = false
        this.emit({
          type: 'failed',
          reason: mode === 'audio' ? 'audio_reconnect_give_up' : 'full_reconnect_give_up',
        })
        return
      }

      round += 1
      for (let ticket = 1; ticket <= RTASR_RECONNECT_TICKETS_PER_ROUND; ticket++) {
        if (token !== this.reconnectLoopToken || this.stopping || this.paused) {
          this.reconnecting = false
          return
        }
        if (Date.now() - (this.reconnectStartedAt ?? Date.now()) >= RTASR_RECONNECT_GIVE_UP_MS) {
          this.reconnecting = false
          this.emit({
            type: 'failed',
            reason: mode === 'audio' ? 'audio_reconnect_give_up' : 'full_reconnect_give_up',
          })
          return
        }

        this.reconnectAttempt += 1
        this.emit({
          type: 'reconnecting',
          attempt: this.reconnectAttempt,
          round,
          ticket,
        })

        try {
          await this.pullTicketAndConnect(mode)
          if (token !== this.reconnectLoopToken) return
          this.reconnecting = false
          this.reconnectAttempt = 0
          this.reconnectStartedAt = null
          this.sendGateOpen = true
          this.emit({ type: 'reconnected' })
          return
        } catch {
          if (ticket < RTASR_RECONNECT_TICKETS_PER_ROUND) {
            await sleep(RTASR_RECONNECT_TICKET_INTERVAL_MS)
          }
        }
      }

      // 本轮 4 票用尽 → 再等 3s 开下一轮
      await sleep(RTASR_RECONNECT_ROUND_GAP_MS)
    }

    this.reconnecting = false
  }

  /** 拉票（live session）+ 按模式建连 */
  private async pullTicketAndConnect(mode: ReconnectMode): Promise<void> {
    if (!this.browserOnline) {
      throw new Error('browser offline')
    }

    const live = await rtasrApi.getLiveSession()
    if (!live || (this.sessionId && live.sessionId !== this.sessionId)) {
      throw new Error('服务端会话已失效')
    }

    this.sessionId = live.sessionId
    this.managePath =
      live.manageWsPath ?? `/api/rtasr/ws/manage?sessionId=${live.sessionId}`
    this.audioPath = live.audioWsPath ?? live.wsPath

    const needManage = mode === 'full' || !this.isManageReady
    if (needManage) {
      await this.connectManage()
    }
    await this.connectAudio()
  }

  private sendManage(payload: Record<string, unknown>) {
    if (!this.manageWs || this.manageWs.readyState !== WebSocket.OPEN) return
    try {
      this.manageWs.send(JSON.stringify(payload))
    } catch {
      // ignore
    }
  }

  private async closeAudioIntentional() {
    if (!this.audioWs) return
    this.intentionalAudioClose = true
    try {
      this.sendAudioEnd()
      this.audioWs.close()
    } catch {
      // ignore
    }
    this.audioWs = null
    this.audioReady = false
    this.sendGateOpen = false
    this.intentionalAudioClose = false
  }

  private async closeManageIntentional() {
    if (!this.manageWs) return
    this.intentionalManageClose = true
    try {
      this.manageWs.close()
    } catch {
      // ignore
    }
    this.manageWs = null
    this.manageReady = false
    this.intentionalManageClose = false
  }

  private bindNetwork() {
    this.unbindNetwork()
    this.onlineHandler = () => {
      this.browserOnline = true
      this.emit({ type: 'network', online: true })
      // 内核内部已有 3s 首次拉票等待，这里直接进入调度
      if (!this.stopping && !this.paused && !this.isAudioReady && !this.reconnecting) {
        void this.runReconnectSchedule('full', 'network_online')
      }
    }
    this.offlineHandler = () => {
      this.browserOnline = false
      this.sendGateOpen = false
      this.emit({ type: 'network', online: false })
    }
    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
  }

  private unbindNetwork() {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler)
      this.onlineHandler = null
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler)
      this.offlineHandler = null
    }
  }
}
