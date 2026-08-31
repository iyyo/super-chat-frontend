import { api } from '@/lib/api/client'
import { streamRequest } from '@/lib/api/stream'
import { API_BASE_URL } from '@/lib/constants'
import type { FileEditorState, EditableSegment } from '@/lib/file-editor'
import type { SummaryCards } from '@/lib/transcript-summaries'
import type { StructuredSummaryDocument, SummaryStatus } from '@/lib/structured-summary-document'

/** 与后端 SummaryStreamEvent 对齐 */
type SummaryStreamChunk = {
  type?: 'status' | 'delta' | 'done' | 'error'
  message?: string
  content?: string
  summaryTemplateId?: string
  summary?: StructuredSummaryDocument
  error?: string
  done?: boolean
}

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

export type AiLearnMode =
  | 'read-extend'
  | 'critical'
  | 'study-plan'
  | 'quick-review'
  | 'self-qa'
  | 'meeting-summary'

export interface AiLearnModeEntry {
  content: string
  updatedAt: string
}

/** v2：按模式分槽缓存；兼容旧版单槽 `{ mode, content, updatedAt }` */
export interface AiLearnCache {
  version: 2
  activeMode: AiLearnMode
  byMode: Partial<Record<AiLearnMode, AiLearnModeEntry>>
}

type AiLearnCacheRaw =
  | AiLearnCache
  | {
      mode?: AiLearnMode
      content?: string
      updatedAt?: string
      version?: number
      activeMode?: AiLearnMode
      byMode?: Partial<Record<AiLearnMode, AiLearnModeEntry>>
    }
  | null
  | undefined

export function normalizeAiLearnCache(raw: AiLearnCacheRaw): AiLearnCache | null {
  if (!raw || typeof raw !== 'object') return null

  if (raw.version === 2 && raw.byMode && typeof raw.byMode === 'object') {
    const activeMode = ('activeMode' in raw && raw.activeMode) || 'quick-review'
    return {
      version: 2,
      activeMode,
      byMode: { ...raw.byMode },
    }
  }

  const legacyMode = 'mode' in raw ? raw.mode : undefined
  const legacyContent = 'content' in raw ? raw.content : undefined
  const legacyUpdatedAt = 'updatedAt' in raw ? raw.updatedAt : undefined
  if (legacyMode && typeof legacyContent === 'string' && legacyContent.trim()) {
    return {
      version: 2,
      activeMode: legacyMode,
      byMode: {
        [legacyMode]: {
          content: legacyContent,
          updatedAt: legacyUpdatedAt ?? new Date().toISOString(),
        },
      },
    }
  }

  return null
}

export function getAiLearnModeContent(
  cache: AiLearnCache | null | undefined,
  mode: AiLearnMode,
): AiLearnModeEntry | null {
  const entry = cache?.byMode?.[mode]
  if (!entry?.content?.trim()) return null
  return entry
}

export interface SummaryTemplateCard {
  id: string
  categoryId: string
  categoryLabel: string
  title: string
  description: string
  accent: 'yellow' | 'teal' | 'green' | 'blue' | 'purple' | 'orange'
}

export interface SummaryTemplatesPayload {
  categories: Array<{ id: string; label: string }>
  templates: SummaryTemplateCard[]
  defaultTemplateId: string
}

export interface WorkspaceFileDetailDto extends WorkspaceFileDto {
  resultText: string | null
  resultRaw: string | null
  editorState: FileEditorState | null
  hasMedia: boolean
  mimeType: string | null
  mediaFileName: string | null
  hasSummaryImage: boolean
  transcribeStatus?: string | null
  sourceType: 'upload' | 'url'
  refreshPending?: boolean
  shareEnabled: boolean
  shareToken: string | null
  structuredSummary: StructuredSummaryDocument | null
  summaryTemplateId: string | null
  aiLearnCache: AiLearnCache | null
}

export function shouldRefreshFileDetail(detail: WorkspaceFileDetailDto): boolean {
  return (
    detail.refreshPending ??
    (detail.summaryStatus === 'generating' ||
      detail.transcribeStatus === 'queued' ||
      detail.transcribeStatus === 'uploading_to_xfyun' ||
      detail.transcribeStatus === 'transcribing')
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

export interface FileEditorPatch {
  summaryHtml?: string
  summaries?: Partial<SummaryCards>
  segment?: EditableSegment
  segments?: EditableSegment[]
}

export type LlmRequestOptions = {
  provider?: string
  model?: string
}

export const filesApi = {
  list: (params?: { starred?: boolean }) => {
    const qs =
      params?.starred !== undefined ? `?starred=${params.starred ? 'true' : 'false'}` : ''
    return api.get<WorkspaceFileDto[]>(`/files${qs}`)
  },
  get: (id: string) => api.get<WorkspaceFileDetailDto>(`/files/${id}`),
  listSummaryTemplates: () =>
    api.get<SummaryTemplatesPayload>('/files/summary-templates', { skipToast: true }),
  /** 异步受理：立即返回 generating，结果靠详情轮询（后台/恢复用） */
  generateSummary: (id: string, body?: { templateId?: string; skipQuick?: boolean } & LlmRequestOptions) =>
    api.post<{ summaryStatus: 'generating'; summaryTemplateId: string }>(
      `/files/${id}/summary/generate`,
      body ?? {},
      {
        skipToast: true,
        timeout: 30_000,
      },
    ),
  /** 流式生成：边出字边展示，结束时带回完整结构化纪要 */
  streamGenerateSummary: (
    id: string,
    body: ({ templateId?: string } & LlmRequestOptions) | undefined,
    handlers: {
      signal?: AbortSignal
      onStatus?: (message: string, templateId?: string) => void
      onDelta?: (content: string) => void
      onDone?: (summary: StructuredSummaryDocument) => void
      onError?: (message: string) => void
    },
  ) =>
    streamRequest(`/files/${id}/summary/generate/stream`, body ?? {}, {
      signal: handlers.signal,
      onChunk: (chunk) => {
        const event = chunk as SummaryStreamChunk
        if (event.type === 'status') {
          handlers.onStatus?.(event.message ?? '', event.summaryTemplateId)
          return
        }
        if (event.type === 'delta' && event.content) {
          handlers.onDelta?.(event.content)
          return
        }
        if (event.type === 'done' && event.summary) {
          handlers.onDone?.(event.summary)
          return
        }
        if (event.type === 'error' || event.error) {
          handlers.onError?.(event.message || event.error || '生成失败')
        }
      },
      onError: (err) => handlers.onError?.(err.message),
    }),
  generateAiLearn: (id: string, mode: AiLearnMode, options?: LlmRequestOptions) =>
    api.post<AiLearnCache>(`/files/${id}/ai-learn`, { mode, ...options }, {
      skipToast: true,
      timeout: 180_000,
    }),
  /** 流式 AI 学习：边出字边展示，结束带回按模式缓存 */
  streamAiLearn: (
    id: string,
    mode: AiLearnMode,
    handlers: {
      signal?: AbortSignal
      onStatus?: (message: string) => void
      onDelta?: (content: string) => void
      onDone?: (cache: AiLearnCache) => void
      onError?: (message: string) => void
    },
    options?: LlmRequestOptions,
  ) =>
    streamRequest(`/files/${id}/ai-learn/stream`, { mode, ...options }, {
      signal: handlers.signal,
      onChunk: (chunk) => {
        const event = chunk as {
          type?: 'status' | 'delta' | 'done' | 'error'
          message?: string
          content?: string
          cache?: AiLearnCache
          error?: string
        }
        if (event.type === 'status') {
          handlers.onStatus?.(event.message ?? '')
          return
        }
        if (event.type === 'delta' && event.content) {
          handlers.onDelta?.(event.content)
          return
        }
        if (event.type === 'done' && event.cache) {
          handlers.onDone?.(event.cache)
          return
        }
        if (event.type === 'error' || event.error) {
          handlers.onError?.(event.message || event.error || '生成失败')
        }
      },
      onError: (err) => handlers.onError?.(err.message),
    }),
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
