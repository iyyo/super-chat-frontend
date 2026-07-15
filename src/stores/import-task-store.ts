import { create } from 'zustand'
import {
  isTranscribeDetailReady,
  transcribeApi,
  type TranscribeJobDto,
  type UploadSessionDto,
} from '@/lib/api/transcribe'
import { toast } from '@/stores/toast-store'
import { useFilesStore } from '@/stores/files-store'

export type ImportPhase =
  | 'idle'
  | 'uploading'
  | 'upload_paused'
  | 'transcribing'
  | 'success'
  | 'error'

export interface ImportSettings {
  language: string
  domain: string
  speakerCount: string
  hotwords: string[]
}

export const MAX_FILE_SIZE = 500 * 1024 * 1024
export const MAX_BATCH_FILES = 100

const STORAGE_KEY = 'iyy_import_manifest'
const CHUNK_RETRY = 3

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
  batchCurrent: number
  batchSucceeded: number
  batchFailed: number
  completedJobs: TranscribeJobDto[]

  setModalOpen: (open: boolean) => void
  setRecordsOpen: (open: boolean) => void
  fetchJobHistory: () => Promise<void>
  startImport: (file: File, settings: ImportSettings) => Promise<void>
  startBatchImport: (files: File[], settings: ImportSettings) => Promise<void>
  resumeUpload: (file: File) => Promise<void>
  retryTranscribe: () => Promise<void>
  reset: () => void
  minimize: () => void
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let abortUpload = false

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

async function uploadChunks(
  file: File,
  uploadId: string,
  chunkSize: number,
  uploaded: number[],
  set: SetState,
): Promise<'done' | 'paused' | 'aborted'> {
  const totalChunks = Math.ceil(file.size / chunkSize)
  const done = new Set(uploaded)

  for (let i = 0; i < totalChunks; i++) {
    if (abortUpload) return 'aborted'
    if (done.has(i)) continue

    const start = i * chunkSize
    const end = Math.min(file.size, start + chunkSize)
    const blob = file.slice(start, end)

    let lastErr: unknown
    for (let attempt = 0; attempt < CHUNK_RETRY; attempt++) {
      try {
        const s = await transcribeApi.uploadChunk(uploadId, i, blob)
        set({ session: s, uploadProgress: s.progress })
        done.add(i)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        if (!navigator.onLine) {
          set({
            phase: 'upload_paused',
            errorMessage: '网络中断，已保存进度，恢复后将自动续传',
          })
          return 'paused'
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    if (lastErr) throw lastErr
  }
  return 'done'
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

async function waitForJobComplete(jobId: string, set: SetState): Promise<TranscribeJobDto> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const j = await transcribeApi.getJob(jobId)
        set({ job: j })
        if (j.status === 'transcribing') {
          set((s) => ({
            uploadProgress: Math.max(s.uploadProgress, j.progress),
          }))
        }
        if (isTranscribeDetailReady(j)) {
          clearInterval(timer)
          resolve(j)
          return
        }
        if (j.status === 'failed') {
          clearInterval(timer)
          reject(new Error(j.errorMessage ?? '转写失败'))
        }
      } catch (err) {
        clearInterval(timer)
        reject(err instanceof Error ? err : new Error('查询任务失败'))
      }
    }
    const timer = setInterval(() => void tick(), 3000)
    void tick()
  })
}

async function runSingleImport(
  file: File,
  settings: ImportSettings,
  set: SetState,
  get: GetState,
  options: { awaitComplete: boolean },
): Promise<TranscribeJobDto | null> {
  const s = await transcribeApi.initUpload({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || undefined,
    ...settings,
  })
  set({ session: s, uploadProgress: 0 })
  saveManifest({
    uploadId: s.id,
    fileName: file.name,
    fileSize: file.size,
    settings,
  })

  const uploadResult = await uploadChunks(file, s.id, s.chunkSize, s.uploadedChunks, set)
  if (uploadResult === 'aborted') return null
  if (uploadResult === 'paused') return null
  if (abortUpload) return null

  set({ phase: 'transcribing' })
  const j = await transcribeApi.completeUpload(s.id)
  set({ job: j })

  if (options.awaitComplete) {
    return await waitForJobComplete(j.id, set)
  }

  startJobPoll(j.id, set, get)
  void get().fetchJobHistory()
  return j
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
  batchCurrent: 0,
  batchSucceeded: 0,
  batchFailed: 0,
  completedJobs: [],

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
    stopPoll()
    set({
      phase: 'idle',
      fileName: null,
      session: null,
      job: null,
      errorMessage: null,
      uploadProgress: 0,
      batchTotal: 0,
      batchCurrent: 0,
      batchSucceeded: 0,
      batchFailed: 0,
      completedJobs: [],
    })
    saveManifest(null)
  },

  startImport: async (file, settings) => {
    if (file.size > MAX_FILE_SIZE) {
      set({ phase: 'error', errorMessage: '文件超过 500MB 上限', fileName: file.name })
      return
    }

    abortUpload = false
    set({
      phase: 'uploading',
      fileName: file.name,
      errorMessage: null,
      uploadProgress: 0,
      job: null,
      modalOpen: true,
      batchTotal: 1,
      batchCurrent: 1,
      batchSucceeded: 0,
      batchFailed: 0,
      completedJobs: [],
    })

    try {
      await runSingleImport(file, settings, set, get, { awaitComplete: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入失败，请重试'
      set({ phase: 'error', errorMessage: msg })
    }
  },

  startBatchImport: async (files, settings) => {
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
    const completedJobs: TranscribeJobDto[] = []
    let succeeded = 0
    let failed = 0

    set({
      phase: 'uploading',
      errorMessage: null,
      uploadProgress: 0,
      job: null,
      modalOpen: true,
      batchTotal: valid.length,
      batchCurrent: 0,
      batchSucceeded: 0,
      batchFailed: 0,
      completedJobs: [],
    })

    for (let i = 0; i < valid.length; i++) {
      if (abortUpload) return

      const file = valid[i]!
      set({
        batchCurrent: i + 1,
        fileName: file.name,
        phase: 'uploading',
        uploadProgress: 0,
        errorMessage: null,
      })

      try {
        const job = await runSingleImport(file, settings, set, get, { awaitComplete: true })
        if (!job) {
          if (get().phase === 'upload_paused') return
          if (abortUpload) return
          continue
        }
        succeeded++
        completedJobs.push(job)
        set({ batchSucceeded: succeeded, completedJobs: [...completedJobs], job })
      } catch (err) {
        failed++
        const msg = err instanceof Error ? err.message : '导入失败'
        set({ batchFailed: failed, errorMessage: `${file.name}：${msg}` })
        if (i < valid.length - 1) {
          toast.warning(`${file.name} 失败，继续处理下一个`)
        }
      }
    }

    saveManifest(null)
    void get().fetchJobHistory()
    void useFilesStore.getState().fetchFiles()

    if (succeeded === 0) {
      set({ phase: 'error' })
      return
    }

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
      batchCurrent: 1,
    })

    try {
      const s = await transcribeApi.getUpload(manifest.uploadId)
      set({ session: s, uploadProgress: s.progress })
      const uploadResult = await uploadChunks(
        file,
        s.id,
        s.chunkSize,
        s.uploadedChunks,
        set,
      )
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
