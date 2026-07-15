/** 讯飞 RTASR：16kHz / 16bit / mono，每帧 1280 字节 */
const TARGET_SAMPLE_RATE = 16000
const FRAME_SAMPLES = 640
const CHUNK_BYTES = FRAME_SAMPLES * 2

export type AudioCaptureCallbacks = {
  onPcmChunk: (chunk: ArrayBuffer) => void
  onLevel?: (level: number) => void
  onError?: (message: string) => void
}

export interface AudioCaptureOptions extends AudioCaptureCallbacks {
  deviceId?: string
}

export interface AudioInputDevice {
  deviceId: string
  label: string
}

const PCM_WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._bytes = []
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel || !channel.length) return true

    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]))
      const int16 = s < 0
        ? Math.max(-32768, Math.round(s * 32768))
        : Math.min(32767, Math.round(s * 32768))
      this._bytes.push(int16 & 0xff, (int16 >> 8) & 0xff)
    }

    // 凑满一帧立即上报
    while (this._bytes.length >= ${CHUNK_BYTES}) {
      const frame = new Uint8Array(this._bytes.splice(0, ${CHUNK_BYTES}))
      this.port.postMessage(frame.buffer, [frame.buffer])
    }
    return true
  }
}
registerProcessor('iyy-pcm-capture', PcmCaptureProcessor)
`

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `麦克风 ${d.deviceId.slice(0, 6)}`,
      }))
  } catch {
    return []
  }
}

function floatToInt16(s: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(s * 32768)))
}

function downsampleToPcm16(input: Float32Array, sourceRate: number): number[] {
  if (sourceRate === TARGET_SAMPLE_RATE) {
    const out: number[] = []
    for (let i = 0; i < input.length; i++) {
      const int16 = floatToInt16(input[i])
      out.push(int16 & 0xff, (int16 >> 8) & 0xff)
    }
    return out
  }

  const ratio = sourceRate / TARGET_SAMPLE_RATE
  const out: number[] = []
  let pos = 0
  while (pos < input.length) {
    const int16 = floatToInt16(input[Math.floor(pos)])
    out.push(int16 & 0xff, (int16 >> 8) & 0xff)
    pos += ratio
  }
  return out
}

function appendPcmBytes(buffer: number[], input: Float32Array, sourceRate: number) {
  const bytes = downsampleToPcm16(input, sourceRate)
  buffer.push(...bytes)
}

function createAudioContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
  } catch {
    return new AudioContext()
  }
}

export class AudioCapture {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private worklet: AudioWorkletNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private silentGain: GainNode | null = null
  private pcmBuffer: number[] = []
  private sentByteCount = 0
  private resumeTimer: ReturnType<typeof setInterval> | null = null
  private collecting = false
  private sending = false
  private pipelineReady = false
  private callbacks: AudioCaptureCallbacks | null = null
  private sourceSampleRate = TARGET_SAMPLE_RATE
  private workletUrl: string | null = null

  /**
   * 在用户点击后立即调用：申请麦克风 + 建立音频图（必须在 await 网络请求之前）。
   */
  async openMic(options: Pick<AudioCaptureOptions, 'deviceId' | 'onError'>): Promise<void> {
    if (this.pipelineReady) return

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      }
      if (options.deviceId) {
        audioConstraints.deviceId = options.deviceId
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
    } catch {
      options.onError?.('无法访问麦克风，请检查浏览器权限或更换设备')
      throw new Error('mic-denied')
    }

    this.audioContext = createAudioContext()
    this.sourceSampleRate = this.audioContext.sampleRate

    await this.ensureContextRunning(options.onError)

    this.source = this.audioContext.createMediaStreamSource(this.stream)
    this.silentGain = this.audioContext.createGain()
    this.silentGain.gain.value = 0

    const onSamples = (input: Float32Array) => {
      if (!this.collecting) return
      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      this.callbacks?.onLevel?.(Math.sqrt(sum / input.length))
      appendPcmBytes(this.pcmBuffer, input, this.sourceSampleRate)
      this.flushPendingFrames()
    }

    const graphReady = await this.setupCaptureNode(onSamples, options.onError)
    if (!graphReady) {
      this.release()
      throw new Error('audio-pipeline-failed')
    }

    this.source.connect(this.processor ?? this.worklet!)
    ;(this.processor ?? this.worklet)!.connect(this.silentGain)
    this.silentGain.connect(this.audioContext.destination)

    this.collecting = true
    this.pipelineReady = true
    this.startResumeWatchdog(options.onError)
  }

  /** WS 就绪后立即按帧发包（采集到就发） */
  async start(options: AudioCaptureOptions): Promise<void> {
    if (this.sending) return
    if (!this.pipelineReady || !this.stream || !this.audioContext) {
      throw new Error('mic-not-open')
    }

    await this.ensureContextRunning(options.onError)

    this.callbacks = options
    this.sending = true
    this.flushPendingFrames()
  }

  pause(): void {
    this.sending = false
    this.collecting = false
  }

  resume(callbacks: AudioCaptureCallbacks): void {
    if (!this.pipelineReady) return
    this.callbacks = callbacks
    this.collecting = true
    this.sending = true
    void this.ensureContextRunning(callbacks.onError)
    this.flushPendingFrames()
  }

  stop(): ArrayBuffer {
    this.sending = false
    this.collecting = false
    this.stopResumeWatchdog()

    const pcm = new Uint8Array(this.pcmBuffer)
    this.pcmBuffer = []
    this.sentByteCount = 0
    this.callbacks = null

    this.release()

    return pcm.buffer
  }

  release(): void {
    this.sending = false
    this.collecting = false
    this.pipelineReady = false
    this.stopResumeWatchdog()
    this.processor?.disconnect()
    this.worklet?.disconnect()
    this.source?.disconnect()
    this.silentGain?.disconnect()
    void this.audioContext?.close()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.processor = null
    this.worklet = null
    this.source = null
    this.silentGain = null
    this.audioContext = null
    this.stream = null
    this.pcmBuffer = []
    this.sentByteCount = 0
    this.callbacks = null
    if (this.workletUrl) {
      URL.revokeObjectURL(this.workletUrl)
      this.workletUrl = null
    }
  }

  isActive(): boolean {
    return this.sending
  }

  private async setupCaptureNode(
    onSamples: (input: Float32Array) => void,
    onError?: (msg: string) => void,
  ): Promise<boolean> {
    const ctx = this.audioContext
    if (!ctx) return false

    if (typeof ctx.audioWorklet?.addModule === 'function') {
      try {
        this.workletUrl = URL.createObjectURL(
          new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' }),
        )
        await ctx.audioWorklet.addModule(this.workletUrl)
        this.worklet = new AudioWorkletNode(ctx, 'iyy-pcm-capture', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
        })
        this.worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (!this.collecting || !event.data) return
          const frame = new Uint8Array(event.data)
          this.pcmBuffer.push(...frame)

          let sum = 0
          const sampleCount = frame.length / 2
          for (let i = 0; i < frame.length; i += 2) {
            const raw = frame[i] | (frame[i + 1] << 8)
            const signed = raw > 32767 ? raw - 65536 : raw
            const norm = signed / 32768
            sum += norm * norm
          }
          if (sampleCount > 0) {
            this.callbacks?.onLevel?.(Math.sqrt(sum / sampleCount))
          }

          if (this.sending) {
            this.callbacks?.onPcmChunk(frame.slice().buffer)
            this.sentByteCount += frame.length
          }
        }
        return true
      } catch {
        this.worklet?.disconnect()
        this.worklet = null
        if (this.workletUrl) {
          URL.revokeObjectURL(this.workletUrl)
          this.workletUrl = null
        }
      }
    }

    try {
      this.processor = ctx.createScriptProcessor(4096, 1, 1)
      this.processor.onaudioprocess = (event) => {
        onSamples(event.inputBuffer.getChannelData(0))
      }
      return true
    } catch {
      onError?.('当前浏览器不支持音频采集，请更换 Chrome / Edge 最新版')
      return false
    }
  }

  private flushPendingFrames() {
    if (!this.sending) return

    while (this.pcmBuffer.length - this.sentByteCount >= CHUNK_BYTES) {
      const chunk = this.pcmBuffer.slice(this.sentByteCount, this.sentByteCount + CHUNK_BYTES)
      this.sentByteCount += CHUNK_BYTES
      this.callbacks?.onPcmChunk(new Uint8Array(chunk).buffer)
    }
  }

  private startResumeWatchdog(onError?: (msg: string) => void) {
    this.stopResumeWatchdog()
    this.resumeTimer = setInterval(() => {
      if (!this.collecting || !this.audioContext) return
      if (this.audioContext.state === 'suspended') {
        void this.ensureContextRunning(onError).catch(() => {
          onError?.('音频引擎已暂停，请重新点击开始录音')
        })
      }
    }, 1500)
  }

  private stopResumeWatchdog() {
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer)
      this.resumeTimer = null
    }
  }

  private async ensureContextRunning(onError?: (msg: string) => void): Promise<void> {
    if (!this.audioContext) return
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    if (this.audioContext.state !== 'running') {
      onError?.('音频引擎未启动，请重新点击开始录音')
      throw new Error('audio-context-suspended')
    }
  }
}

export function pcmToWavBlob(pcm: ArrayBuffer): Blob {
  const dataLength = pcm.byteLength
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_SAMPLE_RATE, true)
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)
  return new Blob([header, pcm], { type: 'audio/wav' })
}
