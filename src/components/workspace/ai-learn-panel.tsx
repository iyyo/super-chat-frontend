import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Layers, Loader2, Sparkles, X } from 'lucide-react'
import { MarkdownContent } from '@/components/chat/markdown-content'
import {
  getAiLearnModeContent,
  normalizeAiLearnCache,
  type AiLearnCache,
  type AiLearnMode,
} from '@/lib/api/files'
import { cn } from '@/lib/utils'
import {
  AI_LEARN_ALL_MODES,
  AI_LEARN_MODE_LABELS,
  useAiLearnStore,
} from '@/stores/ai-learn-store'
import { LlmProviderPicker } from '@/components/workspace/llm-provider-picker'

const LEARN_MODES: Array<{ id: AiLearnMode; label: string; hint: string }> = [
  { id: 'quick-review', label: '快速复习', hint: '提炼可背诵的核心清单' },
  { id: 'read-extend', label: '阅读扩展', hint: '延伸阅读与知识联想' },
  { id: 'critical', label: '批判性思考', hint: '质疑、边界与反例' },
  { id: 'study-plan', label: '学习计划', hint: '分阶段复习路径' },
  { id: 'self-qa', label: '自问自答', hint: '自测题与参考答' },
  { id: 'meeting-summary', label: '会议总结', hint: '决议与行动项视角' },
]

interface AiLearnPanelProps {
  fileId: string
  initialCache: AiLearnCache | null
  hasTranscript?: boolean
  onCacheChange?: (cache: AiLearnCache) => void
}

export function AiLearnPanel({
  fileId,
  initialCache,
  hasTranscript = true,
  onCacheChange,
}: AiLearnPanelProps) {
  const hydrateCache = useAiLearnStore((s) => s.hydrateCache)
  const start = useAiLearnStore((s) => s.start)
  const startAll = useAiLearnStore((s) => s.startAll)
  const cancel = useAiLearnStore((s) => s.cancel)
  const job = useAiLearnStore((s) => s.jobs[fileId])
  const storeCache = useAiLearnStore((s) => s.caches[fileId])
  const pickerRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<AiLearnMode>(() => {
    const current = useAiLearnStore.getState().jobs[fileId]
    if (current?.status === 'streaming') return current.mode
    return normalizeAiLearnCache(initialCache)?.activeMode ?? 'quick-review'
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    hydrateCache(fileId, initialCache)
  }, [fileId, initialCache, hydrateCache])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const cache = storeCache ?? normalizeAiLearnCache(initialCache)
  const activeMeta = LEARN_MODES.find((item) => item.id === mode)
  const activeLabel = activeMeta?.label ?? '学习'
  const modeEntry = getAiLearnModeContent(cache, mode)
  const showingCached = Boolean(modeEntry)

  const streaming = job?.status === 'streaming'
  const batch = job?.batch ?? null
  const isBatch = Boolean(batch)
  const streamingThisMode = streaming && job.mode === mode
  const streamingOtherMode = streaming && job.mode !== mode
  const liveContent = streamingThisMode
    ? job.streamText
    : modeEntry?.content ?? ''

  const doneCount = AI_LEARN_ALL_MODES.filter((m) =>
    Boolean(getAiLearnModeContent(cache, m)?.content?.trim()),
  ).length
  const missingCount = AI_LEARN_ALL_MODES.length - doneCount
  const allFilled = missingCount === 0
  const batchIndex = batch
    ? batch.succeeded + batch.failed + (streaming ? 1 : 0)
    : null
  const batchProgress =
    batch && batchIndex != null ? `${batchIndex}/${batch.total}` : null

  const handleGenerate = () => {
    if (!hasTranscript || streamingThisMode) return
    start(fileId, mode, { onCacheChange })
  }

  const handleGenerateAll = () => {
    if (!hasTranscript || streaming) return
    startAll(fileId, { onCacheChange, onlyMissing: !allFilled })
  }

  const handleSelectMode = (next: AiLearnMode) => {
    setMode(next)
    setMenuOpen(false)
  }

  return (
    <div className="ai-learn-panel">
      <div className="ai-learn-toolbar">
        <LlmProviderPicker disabled={streaming} className="ai-learn-llm-picker" />
        <div className="ai-learn-picker" ref={pickerRef}>
          <button
            type="button"
            className={cn('ai-learn-picker-trigger', menuOpen && 'is-open')}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="ai-learn-picker-kicker">模式</span>
            <span className="ai-learn-picker-value">{activeLabel}</span>
            {showingCached ? <span className="ai-learn-picker-dot" aria-hidden /> : null}
            <ChevronDown className="ai-learn-picker-chevron h-3.5 w-3.5" aria-hidden />
          </button>

          {menuOpen ? (
            <div className="ai-learn-picker-menu" role="listbox" aria-label="学习模式">
              {LEARN_MODES.map((item) => {
                const cached = Boolean(getAiLearnModeContent(cache, item.id))
                const itemStreaming = streaming && job.mode === item.id
                const selected = mode === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'ai-learn-picker-option',
                      selected && 'is-selected',
                      itemStreaming && 'is-streaming',
                    )}
                    onClick={() => handleSelectMode(item.id)}
                  >
                    <span className="ai-learn-picker-option-main">
                      <strong>{item.label}</strong>
                      <em>{item.hint}</em>
                    </span>
                    {itemStreaming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : cached ? (
                      <Check className="ai-learn-picker-check h-3.5 w-3.5" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <p className="ai-learn-progress" aria-live="polite">
          {streaming && isBatch
            ? `生成中 ${batchProgress}`
            : streaming
              ? `正在生成「${job.label}」`
              : `${doneCount}/6 已生成`}
        </p>

        <div className="ai-learn-actions">
          {streaming ? (
            <button type="button" className="ai-learn-btn is-ghost" onClick={() => cancel(fileId)}>
              <X className="h-3.5 w-3.5" />
              取消
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ai-learn-btn is-ghost"
                disabled={!hasTranscript}
                onClick={handleGenerateAll}
                title={
                  allFilled
                    ? '按顺序重新生成全部模式'
                    : `补全未生成的 ${missingCount} 个模式`
                }
              >
                <Layers className="h-3.5 w-3.5" />
                {allFilled ? '全部重做' : '全部生成'}
              </button>
              <button
                type="button"
                className="ai-learn-btn is-primary"
                disabled={!hasTranscript}
                onClick={handleGenerate}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {showingCached ? '重新生成' : '生成'}
              </button>
            </>
          )}
        </div>
      </div>

      {streamingOtherMode ? (
        <div className="ai-learn-status" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <p>
            正在生成「{job.label}」
            {isBatch && batchProgress ? `（${batchProgress}）` : ''}
            <button type="button" onClick={() => setMode(job.mode)}>
              切过去看
            </button>
          </p>
        </div>
      ) : null}

      {streamingThisMode && isBatch ? (
        <div className="ai-learn-status" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <p>
            全部进度 {batchProgress}
            {batch!.remaining.length > 0
              ? `，下一项「${AI_LEARN_MODE_LABELS[batch!.remaining[0]!]}」`
              : '，本项最后'}
            。可切走，后台继续。
          </p>
        </div>
      ) : null}

      <div className="ai-learn-body">
        {!hasTranscript ? (
          <div className="ai-learn-empty">
            <p className="ai-learn-empty-title">暂无转写内容</p>
            <p className="ai-learn-empty-desc">完成录音或转写后，才能生成 AI 学习内容</p>
          </div>
        ) : streamingThisMode && !liveContent.trim() ? (
          <div className="ai-learn-empty">
            <Loader2 className="ai-learn-loading-icon h-5 w-5 animate-spin" />
            <p className="ai-learn-empty-title">
              {job.streamStatus || `正在生成「${activeLabel}」…`}
            </p>
            <p className="ai-learn-empty-desc">可留在这里看输出，也可切走，任务会继续跑</p>
          </div>
        ) : liveContent.trim() ? (
          <article className={cn('ai-learn-markdown', streamingThisMode && 'is-streaming')}>
            {streamingThisMode ? (
              <div className="ai-learn-refresh-banner">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {job.streamStatus || '正在写出…'}
              </div>
            ) : null}
            <MarkdownContent content={liveContent} />
            {streamingThisMode ? <span className="ai-learn-stream-caret" aria-hidden /> : null}
          </article>
        ) : (
          <div className="ai-learn-empty">
            <p className="ai-learn-empty-title">「{activeLabel}」还没有内容</p>
            <p className="ai-learn-empty-desc">
              {activeMeta?.hint ?? '各模式结果分开保存'}
              。用右上角生成当前模式，或一次全部生成。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
