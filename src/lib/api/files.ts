import { api } from '@/lib/api/client'
import { API_BASE_URL } from '@/lib/constants'

export interface WorkspaceFileDto {
  id: string
  title: string
  subtitle: string | null
  duration: string
  date: string
  source: string
  tag: string | null
  live: boolean
  transcribeJobId: string | null
  wordCount: number
  starred: boolean
  summaryStatus: SummaryStatus
  summaryPreview: string[] | null
}

import type { FileEditorState, EditableSegment } from '@/lib/file-editor'
import type { SummaryCards } from '@/lib/transcript-summaries'
import type { StructuredSummaryDocument, SummaryStatus } from '@/lib/structured-summary-document'

export interface WorkspaceFileDetailDto extends WorkspaceFileDto {
  resultText: string | null
  resultRaw: string | null
  editorState: FileEditorState | null
  hasMedia: boolean
  mimeType: string | null
  mediaFileName: string | null
  hasSummaryImage: boolean
  transcribeStatus?: string | null
  refreshPending?: boolean
  shareEnabled: boolean
  shareToken: string | null
  structuredSummary: StructuredSummaryDocument | null
}

export function shouldRefreshFileDetail(detail: WorkspaceFileDetailDto): boolean {
  return detail.refreshPending ?? (
    detail.summaryStatus === 'generating' ||
    detail.transcribeStatus === 'queued' ||
    detail.transcribeStatus === 'uploading_to_xfyun' ||
    detail.transcribeStatus === 'transcribing'
  )
}

export interface FileShareStatusDto {
  enabled: boolean
  token: string | null
}

export interface PublicShareDto {
  title: string
  date: string
  duration: string
  resultText: string | null
  editorState: FileEditorState | null
  structuredSummary: StructuredSummaryDocument | null
}

const ACCESS_TOKEN_KEY = 'access_token'

export function getFileMediaUrl(fileId: string): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return null
  return `${API_BASE_URL}/files/${encodeURIComponent(fileId)}/media?access_token=${encodeURIComponent(token)}&format=browser-v1`
}

export function getFileSummaryImageUrl(fileId: string): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return null
  return `${API_BASE_URL}/files/${encodeURIComponent(fileId)}/summary-image?access_token=${encodeURIComponent(token)}`
}

/** 增量保存：单条转写或单个纪要卡片 */
export interface FileEditorPatch {
  summaryHtml?: string
  summaries?: Partial<SummaryCards>
  /** 单条转写增量更新 */
  segment?: EditableSegment
  /** 多条转写增量更新（按 id 合并，非全量替换） */
  segments?: EditableSegment[]
}

export const filesApi = {
  list: (params?: { starred?: boolean }) => {
    const qs =
      params?.starred !== undefined ? `?starred=${params.starred ? 'true' : 'false'}` : ''
    return api.get<WorkspaceFileDto[]>(`/files${qs}`)
  },
  get: (id: string) => api.get<WorkspaceFileDetailDto>(`/files/${id}`),
  generateSummary: (id: string) =>
    api.post<StructuredSummaryDocument>(`/files/${id}/summary/generate`, {}, { skipToast: true }),
  setStarred: (id: string, starred: boolean) =>
    api.patch<WorkspaceFileDto>(`/files/${id}/star`, { starred }, { skipToast: true }),
  updateEditor: (id: string, body: FileEditorPatch) =>
    api.patch<FileEditorState>(`/files/${id}/editor`, body, {
      skipToast: true,
    }),
  enableShare: (id: string) => api.post<FileShareStatusDto>(`/files/${id}/share`),
  disableShare: (id: string) => api.delete<FileShareStatusDto>(`/files/${id}/share`),
  getPublicShare: (token: string) =>
    api.get<PublicShareDto>(`/share/${encodeURIComponent(token)}`, { skipToast: true }),
}
