import { api } from '@/lib/api/client'

export interface UploadSessionDto {
  id: string
  sourceType: 'upload' | 'url'
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: number[]
  status: string
  progress: number
  settings: {
    language: string
    domain: string
    speakerCount: string
    hotwords: string[]
  }
  expiresAt: string
}

export interface TranscribeJobDto {
  id: string
  sourceType: 'upload' | 'url'
  uploadSessionId: string
  fileName: string
  status: string
  progress: number
  xfyunOrderId: string | null
  workspaceFileId: string | null
  detailReady?: boolean
  errorCode: string | null
  errorMessage: string | null
  resultText: string | null
  canRetryTranscribe: boolean
  createdAt: string
  updatedAt: string
}

export function isTranscribeDetailReady(job: TranscribeJobDto): boolean {
  return job.detailReady ?? (Boolean(job.workspaceFileId) || job.status === 'completed')
}

export function isTranscribeJobActive(job: TranscribeJobDto): boolean {
  return (
    !isTranscribeDetailReady(job) &&
    (job.status === 'queued' ||
      job.status === 'uploading_to_xfyun' ||
      job.status === 'transcribing')
  )
}

export interface InitUploadPayload {
  fileName: string
  fileSize: number
  mimeType?: string
  language: string
  domain: string
  speakerCount: string
  hotwords?: string[]
  durationMs?: number
  importMode?: 'separate' | 'merge'
  batchId?: string
}

export interface ImportUrlPayload {
  audioUrl: string
  language: string
  domain: string
  speakerCount: string
  hotwords?: string[]
}

export const transcribeApi = {
  importUrl: (body: ImportUrlPayload) =>
    api.post<TranscribeJobDto>('/transcribe/url-imports', body, { timeout: 30000 }),

  initUpload: (body: InitUploadPayload) =>
    api.post<UploadSessionDto>('/transcribe/uploads', body),

  getUpload: (id: string) => api.get<UploadSessionDto>(`/transcribe/uploads/${id}`),

  uploadChunk: (sessionId: string, index: number, blob: Blob) => {
    const form = new FormData()
    form.append('chunk', blob, `chunk-${index}`)
    return api.put<UploadSessionDto>(
      `/transcribe/uploads/${sessionId}/chunks/${index}`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        skipToast: true,
      },
    )
  },

  completeUpload: (sessionId: string) =>
    api.post<TranscribeJobDto>(`/transcribe/uploads/${sessionId}/complete`, undefined, {
      timeout: 180000,
    }),

  getJob: (id: string) =>
    api.get<TranscribeJobDto>(`/transcribe/jobs/${id}`, { skipToast: true }),

  listJobs: () => api.get<TranscribeJobDto[]>('/transcribe/jobs'),

  listUploads: () => api.get<UploadSessionDto[]>('/transcribe/uploads'),

  retryJob: (id: string) => api.post<TranscribeJobDto>(`/transcribe/jobs/${id}/retry`),

  mergeTranscripts: (body: { jobIds: string[]; title?: string }) =>
    api.post<{ fileId: string }>('/files/merge-transcripts', body, { timeout: 30000 }),
}
