import { api } from '@/lib/api/client'
import type { WorkspaceFileDto } from '@/lib/api/files'
import type { SummaryStatus } from '@/lib/structured-summary-document'

export type RtAsrProvider = 'xfyun' | 'aliyun'

export interface RtAsrSessionCreated {
  sessionId: string
  provider: RtAsrProvider
  wsPath: string
  manageWsPath?: string
  audioWsPath?: string
}

export interface RtAsrLiveSession {
  sessionId: string
  provider: RtAsrProvider
  title: string | null
  chunkIndex: number
  chunkOffsetMs: number
  elapsedMs?: number
  wsPath: string
  manageWsPath?: string
  audioWsPath?: string
  startedAt: string
  featureIds: string[] | null
  domain?: string | null
  deviceId?: string | null
  checkpoint?: {
    segments: Array<{
      id: string
      rl: number
      speakerDisplay: string
      speakerOverride: boolean
      beginMs: number
      endMs: number
      text: string
      isFinal: boolean
    }>
    speakerAliasMap: Record<number, string>
    segmentOverrides: Record<string, number>
    markers: Array<{ id: string; atMs: number; label?: string }>
    domain?: string
    deviceId?: string | null
    featureIds?: string[]
  } | null
}

export interface RtAsrInterruptNotice {
  sessionId: string
  title: string
  elapsedMs: number
  segmentCount: number
  fileId: string | null
  savePending: boolean
  reason: 'reconnect_failed'
  savedAt: string
}

export interface RtAsrRecoveryState {
  live: RtAsrLiveSession | null
  interrupt: RtAsrInterruptNotice | null
}

export interface RtAsrCheckpointPayload {
  elapsedMs: number
  title?: string
  chunkIndex?: number
  chunkOffsetMs?: number
  domain?: string
  deviceId?: string | null
  featureIds?: string[]
  segments: NonNullable<RtAsrLiveSession['checkpoint']>['segments']
  speakerAliasMap: Record<string, string>
  segmentOverrides: Record<string, number>
  markers: NonNullable<RtAsrLiveSession['checkpoint']>['markers']
}

export interface RtAsrRenewResult {
  chunkIndex: number
  chunkOffsetMs: number
  provider: RtAsrProvider
  wsPath: string
  manageWsPath?: string
  audioWsPath?: string
}

export interface VoiceprintDto {
  id: string
  name: string
  featureId: string
  createdAt: string
}

export interface FinishSegmentPayload {
  id: string
  beginMs: number
  endMs: number
  speaker: string
  text: string
}

export interface FinishMarkerPayload {
  id: string
  atMs: number
  label?: string
}

export interface FinishRecordingPayload {
  title: string
  durationMs: number
  segments: FinishSegmentPayload[]
  markers?: FinishMarkerPayload[]
  saveAudio?: boolean
  interrupted?: boolean
}

export interface FinishRecordingResult {
  fileId: string
  summaryPreview: string[]
  summaryStatus: SummaryStatus
  file: WorkspaceFileDto
}

export const rtasrApi = {
  createSession: (body?: {
    provider?: RtAsrProvider
    lang?: string
    domain?: string
    title?: string
    featureIds?: string[]
  }) => api.post<RtAsrSessionCreated>('/rtasr/sessions', body ?? {}),

  getLiveSession: () => api.get<RtAsrLiveSession | null>('/rtasr/sessions/live'),

  getRecovery: () => api.get<RtAsrRecoveryState>('/rtasr/sessions/recovery'),

  saveCheckpoint: (sessionId: string, body: RtAsrCheckpointPayload) =>
    api.put<{ ok: boolean; updatedAt: string }>(`/rtasr/sessions/${sessionId}/checkpoint`, body, {
      skipToast: true,
    }),

  ackInterrupt: (sessionId: string) =>
    api.post<{ ok: boolean }>(`/rtasr/sessions/${sessionId}/ack-interrupt`, {}),

  abandonLiveSession: () =>
    api.post<{ abandoned: boolean; sessionId?: string }>('/rtasr/sessions/live/abandon', {}),

  renewSession: (sessionId: string, chunkElapsedMs: number) =>
    api.post<RtAsrRenewResult>(`/rtasr/sessions/${sessionId}/renew`, { chunkElapsedMs }),

  finishSession: (sessionId: string, payload: FinishRecordingPayload, wavBlob?: Blob) => {
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    if (wavBlob) {
      form.append('audio', wavBlob, 'recording.wav')
    }
    return api.post<FinishRecordingResult>(`/rtasr/sessions/${sessionId}/finish`, form, {
      timeout: 120000,
    })
  },

  listVoiceprints: () => api.get<VoiceprintDto[]>('/rtasr/voiceprints'),

  registerVoiceprint: (name: string, audioBlob?: Blob) => {
    const form = new FormData()
    form.append('name', name)
    if (audioBlob) form.append('audio', audioBlob, 'voice.wav')
    return api.post<VoiceprintDto>('/rtasr/voiceprints', form)
  },
}

export function buildRtAsrWsUrl(wsPath: string): string {
  const token = localStorage.getItem('access_token')
  const sep = wsPath.includes('?') ? '&' : '?'
  const tokenPart = token ? `${sep}access_token=${encodeURIComponent(token)}` : ''

  if (wsPath.startsWith('ws')) return `${wsPath}${tokenPart}`

  const envBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(/\/$/, '')
  const isLocalFrontend =
    typeof window !== 'undefined' &&
    (window.location.port === '3000' || window.location.port === '5173')
  const useDirectBackend = Boolean(envBase) || import.meta.env.DEV || isLocalFrontend

  if (useDirectBackend) {
    const base = envBase ?? 'ws://127.0.0.1:3344'
    const path = wsPath.startsWith('/') ? wsPath : `/${wsPath}`
    return `${base}${path}${tokenPart}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${wsPath}${tokenPart}`
}
