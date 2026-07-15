import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { filesApi, type WorkspaceFileDto } from '@/lib/api/files'
import { WORKSPACE_ALL_FILES } from '@/lib/constants'

const MOCK_FILES: WorkspaceFileDto[] = WORKSPACE_ALL_FILES.map((f) => ({
  id: f.id,
  title: f.title,
  subtitle: f.subtitle,
  duration: f.duration,
  date: f.date,
  source: f.source,
  tag: f.tag,
  live: f.live,
  transcribeJobId: null,
  wordCount: 0,
  starred: false,
  summaryStatus: null,
  summaryPreview: null,
}))

let summaryPollTimer: ReturnType<typeof setInterval> | null = null

function syncSummaryPolling(files: WorkspaceFileDto[]) {
  const needsPoll = files.some((f) => f.summaryStatus === 'generating')

  if (needsPoll && !summaryPollTimer) {
    summaryPollTimer = setInterval(() => {
      void useFilesStore.getState().fetchFiles({ silent: true })
    }, 4000)
  } else if (!needsPoll && summaryPollTimer) {
    clearInterval(summaryPollTimer)
    summaryPollTimer = null
  }
}

interface FilesState {
  apiFiles: WorkspaceFileDto[]
  loading: boolean
  loaded: boolean
  fetchFiles: (options?: { silent?: boolean }) => Promise<void>
  setFileStarred: (id: string, starred: boolean) => void
}

export const useFilesStore = create<FilesState>((set) => ({
  apiFiles: [],
  loading: false,
  loaded: false,

  fetchFiles: async (options) => {
    if (!localStorage.getItem('access_token')) return
    if (!options?.silent) set({ loading: true })
    try {
      const files = await filesApi.list()
      set({ apiFiles: files, loaded: true })
      syncSummaryPolling(files)
    } catch {
      // 未登录或网络错误时保留 mock
    } finally {
      if (!options?.silent) set({ loading: false })
    }
  },

  setFileStarred: (id, starred) => {
    set((state) => {
      const apiFiles = state.apiFiles.map((f) => (f.id === id ? { ...f, starred } : f))
      syncSummaryPolling(apiFiles)
      return { apiFiles }
    })
  },
}))

function getDisplayFiles(apiFiles: WorkspaceFileDto[], loaded: boolean): WorkspaceFileDto[] {
  const authed = Boolean(localStorage.getItem('access_token'))
  if (authed) {
    return loaded ? apiFiles : []
  }
  if (loaded && apiFiles.length > 0) return apiFiles
  return MOCK_FILES
}

/** 展示用文件列表（登录走 API，否则 mock），引用在 apiFiles/loaded 不变时稳定 */
export function useDisplayFiles(): WorkspaceFileDto[] {
  const apiFiles = useFilesStore((s) => s.apiFiles)
  const loaded = useFilesStore((s) => s.loaded)
  return useMemo(() => getDisplayFiles(apiFiles, loaded), [apiFiles, loaded])
}

export function useRecentFiles(limit = 5): WorkspaceFileDto[] {
  const files = useDisplayFiles()
  return useMemo(() => files.slice(0, limit), [files, limit])
}

export function useFilesSummaryPolling(): void {
  const apiFiles = useFilesStore((s) => s.apiFiles)
  useEffect(() => {
    syncSummaryPolling(apiFiles)
  }, [apiFiles])
}
