import { create } from 'zustand'
import {
  isTranscribeDetailReady,
  transcribeApi,
  type TranscribeJobDto,
  type UploadSessionDto,
} from '@/lib/api/transcribe'
import {
  runImportTask,
  uploadFileChunks,
  type ImportTaskSettings,
  type ImportMode,
} from '@/lib/import-task-runner'
import { toast } from '@/stores/toast-store'
import { useFilesStore } from '@/stores/files-store'

export type ImportPhase =
  | 'idle'
  | 'uploading'
  | 'upload_paused'
  | 'transcribing'
  | 'success'
  | 'error'

export type ImportSettings = ImportTaskSettings

export type BatchImportItemPhase = 'uploading' | 'transcribing' | 'success' | 'error'

export interface BatchImportItem {
  id: string
  fileName: string
  fileSize: number
  phase: BatchImportItemPhase
  progress: number
  errorMessage: string | null
}

export const MAX_FILE_SIZE = 500 * 1024 * 1024
export const MAX_BATCH_FILES = 100

const STORAGE_KEY = 'iyy_import_manifest'

interface StoredManifest {
  uploadId: string
  fileName: string
  fileSize: number
  settings: ImportSettings
}

interface ImportTaskState {
  phase: ImportPhase
  fileName: string | null
  session: UploadSessionDto | null
  job: TranscribeJobDto | null
  errorMessage: string | null
  uploadProgress: number
  recordsOpen: boolean
  modalOpen: boolean
  jobHistory: TranscribeJobDto[]
  historyLoading: boolean
  batchTotal: number
  batchSucceeded: number
  batchFailed: number
  batchItems: BatchImportItem[]
  completedJobs: TranscribeJobDto[]
  mergedFileId: string | null

  setModalOpen: (open: boolean) => void
  setRecordsOpen: (open: boolean) => void
  fetchJobHistory: () => Promise<void>
  startImport: (file: File, settings: ImportSettings) => Promise<void>
  startBatchImport: (files: File[], settings: ImportSettings, mode?: ImportMode) => Promise<void>
  startUrlImport: (audioUrl: string, settings: ImportSettings) => Promise<void>
  resumeUpload: (file: File) => Promise<void>
  retryTranscribe: () => Promise<void>
  reset: () => void
  minimize: () => void
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let abortUpload = false
let batchRunVersion = 0

function loadManifest(): StoredManifest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredManifest) : null
  } catch {
    return null
  }
}

function saveManifest(m: StoredManifest | null) {
  if (!m) localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function isActivePhase(phase: ImportPhase) {
  return phase === 'uploading' || phase === 'upload_paused' || phase === 'transcribing'
}

type SetState = (
  partial:
    | Partial<ImportTaskState>
    | ((state: ImportTaskState) => Partial<ImportTaskState>),
) => void
type GetState = () => ImportTaskState

function batchItemId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`
}

function updateBatchItem(
  set: SetState,
  id: string,
  patch:
    | Partial<BatchImportItem>
    | ((item: BatchImportItem) => Partial<BatchImportItem>),
) {
  set((state) => {
    const batchItems = state.batchItems.map((item) => {
      if (item.id !== id) return item
      const next = typeof patch === 'function' ? patch(item) : patch
      return { ...item, ...next }
    })
    const totalProgress = batchItems.reduce((sum, item) => sum + item.progress, 0)
    const hasUploading = batchItems.some((item) => item.phase === 'uploading')
    const hasTranscribing = batchItems.some((item) => item.phase === 'transcribing')

    return {
      batchItems,
      uploadProgress: batchItems.length === 0 ? 0 : Math.round(totalProgress / batchItems.length),
      phase: hasUploading ? 'uploading' : hasTranscribing ? 'transcribing' : state.phase,
    }
  })
}

function startJobPoll(jobId: string, set: SetState, get: GetState) {
  stopPoll()
  pollTimer = setInterval(async () => {
    try {
      const j = await transcribeApi.getJob(jobId)
      set({ job: j })
      if (j.status === 'transcribing') {
        set((s) => ({
          uploadProgress: Math.max(s.uploadProgress, j.progress),
        }))
      }
      if (isTranscribeDetailReady(j)) {
        stopPoll()
        saveManifest(null)
        set({ phase: 'success', uploadProgress: 100 })
        toast.success('内容已生成，可以查看')
        void useFilesStore.getState().fetchFiles()
        void get().fetchJobHistory()
        return
      }
      if (j.status === 'failed') {
        stopPoll()
        set({
          phase: 'error',
          errorMessage: j.errorMessage ?? '转写失败',
        })
        void get().fetchJobHistory()
      }
    } catch {
      // silent
    }
  }, 3000)
}

export const useImportTaskStore = create<ImportTaskState>((set, get) => ({
  phase: 'idle',
  fileName: null,
  session: null,
  job: null,
  errorMessage: null,
  uploadProgress: 0,
  recordsOpen: false,
  modalOpen: false,
  jobHistory: [],
  historyLoading: false,
  batchTotal: 0,
  batchSucceeded: 0,
  batchFailed: 0,
  batchItems: [],
  completedJobs: [],
  mergedFileId: null,

  setModalOpen: (open) => set({ modalOpen: open }),
  setRecordsOpen: (open) => set({ recordsOpen: open }),

  fetchJobHistory: async () => {
    if (!localStorage.getItem('access_token')) return
    set({ historyLoading: true })
    try {
      const jobs = await transcribeApi.listJobs()
      set({ jobHistory: jobs })
    } catch {
      // ignore
    } finally {
      set({ historyLoading: false })
    }
  },

  minimize: () => set({ modalOpen: false }),

  reset: () => {
    abortUpload = true
    batchRunVersion++
    stopPoll()
    set({
      phase: 'idle',
      fileName: null,
      session: null,
      job: null,
      errorMessage: null,
      uploadProgress: 0,
      batchTotal: 0,
      batchSucceeded: 0,
      batchFailed: 0,
      batchItems: [],
      completedJobs: [],
      mergedFileId: null,
    })
    saveManifest(null)
  },

  startImport: async (file, settings) => {
    if (isActivePhase(get().phase)) return
    if (file.size > MAX_FILE_SIZE) {
      set({ phase: 'error', errorMessage: '文件超过 500MB 上限', fileName: file.name })
      return
    }

    abortUpload = false
    batchRunVersion++
    set({
      phase: 'uploading',
      fileName: file.name,
      errorMessage: null,
      uploadProgress: 0,
      job: null,
      modalOpen: true,
      batchTotal: 1,
      batchSucceeded: 0,
      batchFailed: 0,
      batchItems: [],
      completedJobs: [],
      mergedFileId: null,
    })

    try {
      const nextJob = await runImportTask(
        file,
        settings,
        {
          shouldAbort: () => abortUpload,
          onSession: (nextSession) => {
            set({ session: nextSession, uploadProgress: 0 })
            saveManifest({
              uploadId: nextSession.id,
              fileName: file.name,
              fileSize: file.size,
              settings,
            })
          },
          onUploadProgress: (nextSession) =>
            set({ session: nextSession, uploadProgress: nextSession.progress }),
          onPaused: (message) => set({ phase: 'upload_paused', errorMessage: message }),
          onTranscribing: () => set({ phase: 'transcribing' }),
          onJob: (nextJobState) => set({ job: nextJobState }),
        },
        { awaitComplete: false },
      )
      if (!nextJob) return
      startJobPoll(nextJob.id, set, get)
      void get().fetchJobHistory()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入失败，请重试'
      set({ phase: 'error', errorMessage: msg })
    }
  },

  startUrlImport: async (audioUrl, settings) => {
    if (isActivePhase(get().phase)) return
    abortUpload = false
    batchRunVersion++
    saveManifest(null)
    set({
      phase: 'transcribing',
      fileName: '音频链接',
      session: null,
      job: null,
      errorMessage: null,
      uploadProgress: 0,
      modalOpen: true,
      batchTotal: 1,
      batchSucceeded: 0,
      batchFailed: 0,
      batchItems: [],
      completedJobs: [],
      mergedFileId: null,
    })

    try {
      const nextJob = await transcribeApi.importUrl({ audioUrl, ...settings })
      set({ job: nextJob, fileName: nextJob.fileName })
      startJobPoll(nextJob.id, set, get)
      void get().fetchJobHistory()
    } catch (error) {
      const message = error instanceof Error ? error.message : '音频链接导入失败'
      set({ phase: 'error', errorMessage: message })
    }
  },

  startBatchImport: async (files, settings, mode = 'separate') => {
    if (isActivePhase(get().phase)) return
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (valid.length === 0) {
      set({ phase: 'error', errorMessage: '没有可导入的文件' })
      return
    }
    if (valid.length > MAX_BATCH_FILES) {
      set({ phase: 'error', errorMessage: `单次最多导入 ${MAX_BATCH_FILES} 个文件` })
      return
    }

    abortUpload = false
    const runVersion = ++batchRunVersion
    const batchId = crypto.randomUUID()
    const batchItems: BatchImportItem[] = valid.map((file, index) => ({
      id: batchItemId(file, index),
      fileName: file.name,
      fileSize: file.size,
      phase: 'uploading',
      progress: 0,
      errorMessage: null,
    }))
    saveManifest(null)

    set({
      phase: 'uploading',
      fileName: null,
      session: null,
      errorMessage: null,
      uploadProgress: 0,
      job: null,
      modalOpen: true,
      batchTotal: valid.length,
      batchSucceeded: 0,
      batchFailed: 0,
      batchItems,
      completedJobs: [],
      mergedFileId: null,
    })

    const results = await Promise.all(
      valid.map(
        async (
          file,
          index,
        ): Promise<{
          job: TranscribeJobDto | null
          errorMessage: string | null
          aborted: boolean
        }> => {
          const id = batchItemId(file, index)
          try {
            const job = await runImportTask(file, { ...settings, importMode: mode, batchId }, {
              shouldAbort: () => abortUpload || batchRunVersion !== runVersion,
              onSession: () => {
                if (batchRunVersion !== runVersion) return
                updateBatchItem(set, id, { phase: 'uploading', progress: 0 })
              },
              onUploadProgress: (session) => {
                if (batchRunVersion !== runVersion) return
                updateBatchItem(set, id, {
                  phase: 'uploading',
                  progress: Math.round(session.progress * 0.55),
                })
              },
              onPaused: () => {
                if (batchRunVersion !== runVersion) return
                updateBatchItem(set, id, {
                  phase: 'error',
                  errorMessage: '网络中断，请重新导入该文件',
                })
              },
              onTranscribing: () => {
                if (batchRunVersion !== runVersion) return
                updateBatchItem(set, id, (item) => ({
                  phase: 'transcribing',
                  progress: Math.max(item.progress, 55),
                }))
              },
              onJob: (nextJob) => {
                if (batchRunVersion !== runVersion) return
                const ready = isTranscribeDetailReady(nextJob)
                updateBatchItem(set, id, (item) => ({
                  phase: ready ? 'success' : 'transcribing',
                  progress: ready
                    ? 100
                    : Math.max(item.progress, Math.min(99, 55 + Math.round(nextJob.progress * 0.45))),
                }))
              },
            }, { awaitComplete: true })

            if (batchRunVersion !== runVersion || abortUpload) {
              return { job: null, errorMessage: null, aborted: true }
            }
            if (!job) {
              const message =
                get().batchItems.find((item) => item.id === id)?.errorMessage ?? '导入未完成'
              updateBatchItem(set, id, { phase: 'error', errorMessage: message })
              set((state) => ({ batchFailed: state.batchFailed + 1 }))
              return { job: null, errorMessage: message, aborted: false }
            }

            updateBatchItem(set, id, { phase: 'success', progress: 100, errorMessage: null })
            set((state) => ({
              batchSucceeded: state.batchSucceeded + 1,
              completedJobs: [...state.completedJobs, job],
              job,
            }))
            return { job, errorMessage: null, aborted: false }
          } catch (err) {
            if (batchRunVersion !== runVersion || abortUpload) {
              return { job: null, errorMessage: null, aborted: true }
            }
            const message = err instanceof Error ? err.message : '导入失败'
            updateBatchItem(set, id, { phase: 'error', errorMessage: message })
            set((state) => ({ batchFailed: state.batchFailed + 1 }))
            return { job: null, errorMessage: message, aborted: false }
          }
        },
      ),
    )

    if (batchRunVersion !== runVersion || abortUpload) return

    const completedJobs = results.flatMap((result) => (result.job ? [result.job] : []))
    const failures = results.filter((result) => !result.aborted && result.errorMessage)
    const succeeded = completedJobs.length
    const failed = failures.length

    saveManifest(null)
    void get().fetchJobHistory()
    if (succeeded === 0) {
      set({
        phase: 'error',
        errorMessage: failures[0]?.errorMessage ?? '批量导入失败',
      })
      return
    }

    if (mode === 'merge' && failed > 0) {
      set({
        phase: 'error',
        errorMessage: `有 ${failed} 个文件转写失败，未创建合并笔记`,
        batchSucceeded: succeeded,
        batchFailed: failed,
        completedJobs,
        job: completedJobs[completedJobs.length - 1] ?? null,
      })
      void get().fetchJobHistory()
      return
    }

    if (mode === 'merge') {
      try {
        const { fileId } = await transcribeApi.mergeTranscripts({
          jobIds: completedJobs.map((item) => item.id),
        })
        const linkedJobs = completedJobs.map((item) => ({
          ...item,
          workspaceFileId: fileId,
          detailReady: true,
        }))
        void useFilesStore.getState().fetchFiles()
        void get().fetchJobHistory()
        toast.success('已合并为 1 篇笔记')
        set({
          phase: 'success',
          uploadProgress: 100,
          batchSucceeded: succeeded,
          batchFailed: 0,
          completedJobs: linkedJobs,
          job: linkedJobs[linkedJobs.length - 1] ?? null,
          mergedFileId: fileId,
        })
        return
      } catch (error) {
        set({
          phase: 'error',
          errorMessage: error instanceof Error ? error.message : '合并笔记失败，请重试',
          batchSucceeded: succeeded,
          batchFailed: failed,
          completedJobs,
          job: completedJobs[completedJobs.length - 1] ?? null,
        })
        return
      }
    }

    void useFilesStore.getState().fetchFiles()

    if (failed > 0) {
      toast.warning(`完成 ${succeeded} 个，失败 ${failed} 个`)
    } else {
      toast.success(`已成功导入 ${succeeded} 个文件`)
    }

    set({
      phase: 'success',
      uploadProgress: 100,
      batchSucceeded: succeeded,
      batchFailed: failed,
      completedJobs,
      job: completedJobs[completedJobs.length - 1] ?? null,
    })
  },

  resumeUpload: async (file) => {
    const manifest = loadManifest()
    if (!manifest) {
      toast.warning('没有可恢复的上传任务')
      return
    }

    abortUpload = false
    set({
      phase: 'uploading',
      fileName: file.name,
      errorMessage: null,
      modalOpen: true,
      batchTotal: 1,
      batchItems: [],
    })

    try {
      const s = await transcribeApi.getUpload(manifest.uploadId)
      set({ session: s, uploadProgress: s.progress })
      const uploadResult = await uploadFileChunks(file, s, {
        shouldAbort: () => abortUpload,
        onUploadProgress: (session) => set({ session, uploadProgress: session.progress }),
        onPaused: (message) => set({ phase: 'upload_paused', errorMessage: message }),
      })
      if (uploadResult !== 'done' || abortUpload) return

      set({ phase: 'transcribing' })
      const j = await transcribeApi.completeUpload(s.id)
      set({ job: j })
      startJobPoll(j.id, set, get)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '续传失败'
      set({ phase: 'error', errorMessage: msg })
    }
  },

  retryTranscribe: async () => {
    const { job } = get()
    if (!job?.id) return
    set({ phase: 'transcribing', errorMessage: null })
    try {
      const j = await transcribeApi.retryJob(job.id)
      set({ job: j })
      startJobPoll(j.id, set, get)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '重试失败'
      set({ phase: 'error', errorMessage: msg })
    }
  },
}))

export function useImportJob() {
  const store = useImportTaskStore()
  return {
    ...store,
    maxFileSize: MAX_FILE_SIZE,
    maxBatchFiles: MAX_BATCH_FILES,
    storedManifest: loadManifest(),
    isBackgroundActive: isActivePhase(store.phase),
  }
}
