import { create } from 'zustand'
import {
  filesApi,
  normalizeAiLearnCache,
  type AiLearnCache,
  type AiLearnMode,
} from '@/lib/api/files'
import { toast } from '@/stores/toast-store'
import { useLlmPreferenceStore } from '@/stores/llm-preference-store'

export const AI_LEARN_ALL_MODES: AiLearnMode[] = [
  'quick-review',
  'read-extend',
  'critical',
  'study-plan',
  'self-qa',
  'meeting-summary',
]

export const AI_LEARN_MODE_LABELS: Record<AiLearnMode, string> = {
  'quick-review': '快速复习',
  'read-extend': '阅读扩展',
  critical: '批判性思考',
  'study-plan': '学习计划',
  'self-qa': '自问自答',
  'meeting-summary': '会议总结',
}

export type AiLearnJobStatus = 'idle' | 'streaming' | 'error'

export interface AiLearnBatch {
  /** 本轮全部要跑的模式 */
  modes: AiLearnMode[]
  /** 当前项之后还剩的 */
  remaining: AiLearnMode[]
  total: number
  /** 已成功完成数 */
  succeeded: number
  /** 已失败数 */
  failed: number
}

export interface AiLearnJob {
  fileId: string
  mode: AiLearnMode
  label: string
  status: AiLearnJobStatus
  streamText: string
  streamStatus: string | null
  error: string | null
  batch: AiLearnBatch | null
}

type StartOptions = { onCacheChange?: (cache: AiLearnCache) => void }

interface AiLearnState {
  jobs: Record<string, AiLearnJob>
  caches: Record<string, AiLearnCache | null>
  hydrateCache: (fileId: string, cache: AiLearnCache | null) => void
  start: (fileId: string, mode: AiLearnMode, options?: StartOptions) => void
  /** 一键串行生成全部模式（可只补缺） */
  startAll: (
    fileId: string,
    options?: StartOptions & { onlyMissing?: boolean },
  ) => void
  cancel: (fileId: string) => void
}

const abortMap = new Map<string, AbortController>()
/** 取消后阻止队列继续 */
const batchTokenMap = new Map<string, number>()

function emptyJob(fileId: string, mode: AiLearnMode = 'quick-review'): AiLearnJob {
  return {
    fileId,
    mode,
    label: AI_LEARN_MODE_LABELS[mode],
    status: 'idle',
    streamText: '',
    streamStatus: null,
    error: null,
    batch: null,
  }
}

function patchJob(fileId: string, patch: Partial<AiLearnJob>) {
  useAiLearnStore.setState((s) => {
    const prev = s.jobs[fileId] ?? emptyJob(fileId)
    return { jobs: { ...s.jobs, [fileId]: { ...prev, ...patch } } }
  })
}

function streamOne(
  fileId: string,
  mode: AiLearnMode,
  controller: AbortController,
  batch: AiLearnBatch | null,
): Promise<'done' | 'empty' | 'error' | 'aborted'> {
  const label = AI_LEARN_MODE_LABELS[mode]
  const progressPrefix = batch
    ? `全部生成 ${batch.succeeded + batch.failed + 1}/${batch.total} · `
    : ''

  patchJob(fileId, {
    fileId,
    mode,
    label,
    status: 'streaming',
    streamText: '',
    streamStatus: `${progressPrefix}正在生成「${label}」…`,
    error: null,
    batch,
  })

  return new Promise((resolve) => {
    let finished = false
    let raw = ''
    const llm = useLlmPreferenceStore.getState().getSelection()

    void filesApi
      .streamAiLearn(
        fileId,
        mode,
        {
          signal: controller.signal,
          onStatus: (message) => {
            const job = useAiLearnStore.getState().jobs[fileId]
            if (!job || job.status !== 'streaming') return
            patchJob(fileId, {
              streamStatus: progressPrefix ? `${progressPrefix}${message}` : message,
            })
          },
          onDelta: (content) => {
            raw += content
            const job = useAiLearnStore.getState().jobs[fileId]
            if (!job || job.status !== 'streaming') return
            patchJob(fileId, { streamText: raw })
          },
          onDone: (nextRaw) => {
            finished = true
            if (controller.signal.aborted) {
              resolve('aborted')
              return
            }
            const next = normalizeAiLearnCache(nextRaw)
            if (!next) {
              resolve('empty')
              return
            }
            useAiLearnStore.setState((s) => ({
              caches: { ...s.caches, [fileId]: next },
            }))
            resolve('done')
          },
          onError: (message) => {
            if (controller.signal.aborted) {
              resolve('aborted')
              return
            }
            finished = true
            patchJob(fileId, { error: message })
            resolve('error')
          },
        },
        llm,
      )
      .then(() => {
        if (!finished && !controller.signal.aborted) resolve('error')
        else if (!finished && controller.signal.aborted) resolve('aborted')
      })
      .catch(() => {
        if (controller.signal.aborted) resolve('aborted')
        else if (!finished) resolve('error')
      })
  })
}

async function runQueue(
  fileId: string,
  modes: AiLearnMode[],
  options?: StartOptions,
) {
  if (modes.length === 0) {
    toast.info('所选模式均已生成')
    return
  }

  abortMap.get(fileId)?.abort()
  const token = (batchTokenMap.get(fileId) ?? 0) + 1
  batchTokenMap.set(fileId, token)

  const controller = new AbortController()
  abortMap.set(fileId, controller)

  const isBatch = modes.length > 1
  let succeeded = 0
  let failed = 0
  const remaining = [...modes]

  for (let i = 0; i < modes.length; i++) {
    if (batchTokenMap.get(fileId) !== token || controller.signal.aborted) {
      patchJob(fileId, {
        status: 'idle',
        streamText: '',
        streamStatus: null,
        batch: null,
      })
      return
    }

    const mode = modes[i]!
    remaining.shift()
    const batch: AiLearnBatch | null = isBatch
      ? {
          modes,
          remaining: [...remaining],
          total: modes.length,
          succeeded,
          failed,
        }
      : null

    const result = await streamOne(fileId, mode, controller, batch)

    if (result === 'aborted' || batchTokenMap.get(fileId) !== token) {
      patchJob(fileId, {
        status: 'idle',
        streamText: '',
        streamStatus: null,
        batch: null,
      })
      return
    }

    if (result === 'done') {
      succeeded += 1
      const cache = useAiLearnStore.getState().caches[fileId]
      if (cache) options?.onCacheChange?.(cache)
      if (!isBatch) toast.success(`${AI_LEARN_MODE_LABELS[mode]}已生成`)
    } else {
      failed += 1
      if (!isBatch) {
        const msg =
          result === 'empty'
            ? '生成结果为空，请重试'
            : useAiLearnStore.getState().jobs[fileId]?.error || '生成失败，请重试'
        toast.error(msg)
        patchJob(fileId, {
          status: 'error',
          streamText: '',
          streamStatus: null,
          batch: null,
          error: msg,
        })
        if (abortMap.get(fileId) === controller) abortMap.delete(fileId)
        return
      }
    }
  }

  if (abortMap.get(fileId) === controller) abortMap.delete(fileId)

  patchJob(fileId, {
    status: 'idle',
    streamText: '',
    streamStatus: null,
    batch: null,
    error: failed > 0 && succeeded === 0 ? '全部生成失败' : null,
  })

  if (!isBatch) return

  if (failed === 0) {
    toast.success(`全部 ${succeeded} 项已生成`)
  } else if (succeeded === 0) {
    toast.error('全部生成失败，请重试')
  } else {
    toast.success(`已生成 ${succeeded}/${modes.length} 项，${failed} 项失败`)
  }
}

export const useAiLearnStore = create<AiLearnState>((set) => ({
  jobs: {},
  caches: {},

  hydrateCache: (fileId, cache) => {
    set((s) => ({
      caches: { ...s.caches, [fileId]: normalizeAiLearnCache(cache) },
    }))
  },

  cancel: (fileId) => {
    batchTokenMap.set(fileId, (batchTokenMap.get(fileId) ?? 0) + 1)
    abortMap.get(fileId)?.abort()
    abortMap.delete(fileId)
    set((s) => ({
      jobs: {
        ...s.jobs,
        [fileId]: {
          ...(s.jobs[fileId] ?? emptyJob(fileId)),
          status: 'idle',
          streamText: '',
          streamStatus: null,
          batch: null,
        },
      },
    }))
  },

  start: (fileId, mode, options) => {
    void runQueue(fileId, [mode], options)
  },

  startAll: (fileId, options) => {
    const onlyMissing = options?.onlyMissing ?? true
    const cache = useAiLearnStore.getState().caches[fileId]
    const modes = onlyMissing
      ? AI_LEARN_ALL_MODES.filter((m) => !cache?.byMode?.[m]?.content?.trim())
      : [...AI_LEARN_ALL_MODES]

    if (modes.length === 0) {
      // 全有缓存时，一键改为全部重生成
      void runQueue(fileId, [...AI_LEARN_ALL_MODES], options)
      return
    }
    void runQueue(fileId, modes, options)
  },
}))
