import {
  isTranscribeDetailReady,
  transcribeApi,
  type TranscribeJobDto,
  type UploadSessionDto,
} from '@/lib/api/transcribe'

const CHUNK_RETRY = 3

export type ImportMode = 'separate' | 'merge'

export interface ImportTaskSettings {
  language: string
  domain: string
  speakerCount: string
  hotwords: string[]
  importMode?: ImportMode
  batchId?: string
}

export interface ImportTaskHandlers {
  shouldAbort: () => boolean
  onSession: (session: UploadSessionDto) => void
  onUploadProgress: (session: UploadSessionDto) => void
  onPaused: (message: string) => void
  onTranscribing: () => void
  onJob: (job: TranscribeJobDto) => void
}

export async function uploadFileChunks(
  file: File,
  session: UploadSessionDto,
  handlers: Pick<
    ImportTaskHandlers,
    'shouldAbort' | 'onUploadProgress' | 'onPaused'
  >,
): Promise<'done' | 'paused' | 'aborted'> {
  const done = new Set(session.uploadedChunks)

  for (let index = 0; index < session.totalChunks; index++) {
    if (handlers.shouldAbort()) return 'aborted'
    if (done.has(index)) continue

    const start = index * session.chunkSize
    const end = Math.min(file.size, start + session.chunkSize)
    const blob = file.slice(start, end)
    let lastError: unknown

    for (let attempt = 0; attempt < CHUNK_RETRY; attempt++) {
      try {
        const nextSession = await transcribeApi.uploadChunk(session.id, index, blob)
        handlers.onUploadProgress(nextSession)
        done.add(index)
        lastError = null
        break
      } catch (error) {
        lastError = error
        if (!navigator.onLine) {
          handlers.onPaused('网络中断，已保存进度，恢复后将自动续传')
          return 'paused'
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }

    if (lastError) throw lastError
  }

  return 'done'
}

async function waitForJobComplete(
  jobId: string,
  handlers: Pick<ImportTaskHandlers, 'shouldAbort' | 'onJob'>,
): Promise<TranscribeJobDto | null> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (handlers.shouldAbort()) {
        clearInterval(timer)
        resolve(null)
        return
      }

      try {
        const job = await transcribeApi.getJob(jobId)
        handlers.onJob(job)
        if (isTranscribeDetailReady(job)) {
          clearInterval(timer)
          resolve(job)
          return
        }
        if (job.status === 'failed') {
          clearInterval(timer)
          reject(new Error(job.errorMessage ?? '转写失败'))
        }
      } catch (error) {
        clearInterval(timer)
        reject(error instanceof Error ? error : new Error('查询任务失败'))
      }
    }

    const timer = setInterval(() => void tick(), 3000)
    void tick()
  })
}

export async function runImportTask(
  file: File,
  settings: ImportTaskSettings,
  handlers: ImportTaskHandlers,
  options: { awaitComplete: boolean },
): Promise<TranscribeJobDto | null> {
  const session = await transcribeApi.initUpload({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || undefined,
    ...settings,
  })
  handlers.onSession(session)

  const uploadResult = await uploadFileChunks(file, session, handlers)
  if (uploadResult !== 'done' || handlers.shouldAbort()) return null

  handlers.onTranscribing()
  const job = await transcribeApi.completeUpload(session.id)
  handlers.onJob(job)

  if (options.awaitComplete) {
    return await waitForJobComplete(job.id, handlers)
  }

  return job
}
