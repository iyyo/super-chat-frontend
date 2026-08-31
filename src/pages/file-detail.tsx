import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  Copy,
  Expand,
  Loader2,
  MessageSquare,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import {
  FileDetailWorkspace,
  type SummaryToolId,
} from '@/components/workspace/file-detail-workspace'
import { AiLearnPanel } from '@/components/workspace/ai-learn-panel'
import { PracticePanel } from '@/components/workspace/practice-panel'
import { FileDetailChatPanel } from '@/components/workspace/file-detail-chat-panel'
import { ExportTranscriptMenu } from '@/components/workspace/export-transcript-menu'
import { FileDetailMedia } from '@/components/workspace/file-detail-media'
import { ShareNoteModal } from '@/components/workspace/share-note-modal'
import { SpeakerSharePanel } from '@/components/workspace/speaker-share-panel'
import { SummaryEssencePanel } from '@/components/workspace/summary-essence-panel'
import { SummaryMindmapPanel } from '@/components/workspace/summary-mindmap-panel'
import { SummaryOutlinePanel } from '@/components/workspace/summary-outline-panel'
import { SummaryTemplateLibraryModal } from '@/components/workspace/summary-template-library-modal'
import { LlmProviderPicker } from '@/components/workspace/llm-provider-picker'
import { SummaryVisualCard } from '@/components/workspace/summary-visual-card'
import { TranscriptSegmentRow } from '@/components/workspace/transcript-segment-row'
import {
  filesApi,
  getFileMediaUrl,
  getFileSummaryImageUrl,
  normalizeAiLearnCache,
  shouldRefreshFileDetail,
  type AiLearnCache,
  type FileEditorPatch,
  type SummaryTemplatesPayload,
} from '@/lib/api/files'
import {
  buildEditorState,
  segmentFromPlainText,
  segmentPlainText,
  type EditableSegment,
  type FileEditorState,
} from '@/lib/file-editor'
import {
  formatMs,
  parseDurationLabel,
  parseTranscriptSegments,
} from '@/lib/parse-transcript'
import { ROUTES } from '@/lib/constants'
import { buildSpeakerColorMap } from '@/lib/speaker-colors'
import { buildSpeakerShares } from '@/lib/speaker-insights'
import { useImportTaskStore } from '@/stores/import-task-store'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'
import {
  buildStructuredSummaryDocument,
  resolveStructuredSummaryDocument,
  type StructuredSummaryDocument,
  type SummaryStatus,
} from '@/lib/structured-summary-document'
import { extractSummaryStreamDraft } from '@/lib/summary-stream-draft'
import { isApiClientError } from '@/lib/errors/api-client-error'
import { useAiLearnStore } from '@/stores/ai-learn-store'
import { useLlmPreferenceStore } from '@/stores/llm-preference-store'
import { useFilesStore } from '@/stores/files-store'
import { useSummarySyncStore } from '@/stores/summary-sync-store'
import '@/styles/file-detail-insights.css'

export function FileDetailPage() {
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [metaDate, setMetaDate] = useState('')
  const [metaDuration, setMetaDuration] = useState('--:--')
  const [resultText, setResultText] = useState<string | null>(null)
  const [editor, setEditor] = useState<FileEditorState | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playheadMs, setPlayheadMs] = useState(0)
  const [hasMedia, setHasMedia] = useState(false)
  const [sourceType, setSourceType] = useState<'upload' | 'url'>('upload')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null)
  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  const [starred, setStarred] = useState(false)
  const [starToggling, setStarToggling] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [structuredSummary, setStructuredSummary] = useState<StructuredSummaryDocument | null>(null)
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>(null)
  const [detailRefreshPending, setDetailRefreshPending] = useState(false)
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryStreamStatus, setSummaryStreamStatus] = useState<string | null>(null)
  const [summaryStreamDraft, setSummaryStreamDraft] = useState<{
    title?: string
    abstract?: string
    bullets?: string[]
  } | null>(null)
  const [activeTool, setActiveTool] = useState<SummaryToolId>('essence')
  const [rightFocus, setRightFocus] = useState(false)
  const [transcriptQuery, setTranscriptQuery] = useState('')
  const [transcriptSearchOpen, setTranscriptSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [summaryTemplateId, setSummaryTemplateId] = useState<string | null>(null)
  const [aiLearnCache, setAiLearnCache] = useState<AiLearnCache | null>(null)
  const [templateCatalog, setTemplateCatalog] = useState<SummaryTemplatesPayload | null>(null)
  const prevSummaryStatusRef = useRef<SummaryStatus>(null)
  const summaryAbortRef = useRef<AbortController | null>(null)
  const setFileStarred = useFilesStore((s) => s.setFileStarred)
  const setRecordsOpen = useImportTaskStore((s) => s.setRecordsOpen)
  const [fallbackEditing, setFallbackEditing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSegmentIdsRef = useRef<Set<string>>(new Set())
  const editorRef = useRef<FileEditorState | null>(null)
  const mediaRef = useRef<HTMLVideoElement>(null)
  const seekingRef = useRef(false)
  const hydratedRef = useRef(false)

  const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const
  const isSummaryBusy = summaryGenerating || summaryStatus === 'generating'
  const aiLearnJob = useAiLearnStore((s) => (fileId ? s.jobs[fileId] : undefined))
  const isAiLearnBusy = aiLearnJob?.status === 'streaming'
  const hydrateAiLearnCache = useAiLearnStore((s) => s.hydrateCache)

  useEffect(() => {
    filesApi
      .listSummaryTemplates()
      .then(setTemplateCatalog)
      .catch(() => {
        /* 模板名仅作展示，失败可忽略 */
      })
  }, [])

  useEffect(() => {
    return () => summaryAbortRef.current?.abort()
  }, [fileId])

  useEffect(() => {
    if (!fileId) return
    setActiveTool('essence')
    setRightFocus(false)
    setTranscriptQuery('')
    setTranscriptSearchOpen(false)
    setMoreOpen(false)
    setTemplateModalOpen(false)
    summaryAbortRef.current?.abort()
    setSummaryStreamStatus(null)
    setSummaryStreamDraft(null)
    hydratedRef.current = false
    setLoading(true)
    filesApi
      .get(fileId)
      .then((detail) => {
        setTitle(detail.title)
        setMetaDate(detail.date)
        setMetaDuration(detail.duration)
        setStarred(detail.starred)
        setShareEnabled(detail.shareEnabled)
        setShareToken(detail.shareToken)
        setStructuredSummary(detail.structuredSummary)
        setSummaryStatus(detail.summaryStatus)
        setSummaryTemplateId(detail.summaryTemplateId)
        setSummaryError(detail.summaryStatus === 'failed' ? '上次生成未完成，可重新生成' : null)
        {
          const nextLearn = normalizeAiLearnCache(detail.aiLearnCache)
          setAiLearnCache(nextLearn)
          hydrateAiLearnCache(fileId, nextLearn)
        }
        setDetailRefreshPending(shouldRefreshFileDetail(detail))
        prevSummaryStatusRef.current = detail.summaryStatus
        setResultText(detail.resultText)
        setHasMedia(detail.hasMedia)
        setSourceType(detail.sourceType)
        setMediaMimeType(detail.mimeType)
        setMediaUrl(detail.hasMedia ? getFileMediaUrl(fileId) : null)
        setSummaryImageUrl(detail.hasSummaryImage ? getFileSummaryImageUrl(fileId) : null)
        setPlayheadMs(0)
        setPlaying(false)
        setDurationMs(0)
        const segments = parseTranscriptSegments(detail.resultRaw, detail.resultText)
        const state = buildEditorState(detail.editorState, segments, {
          fileTitle: detail.title,
          plainText: detail.resultText,
        })
        setEditor(state)
        editorRef.current = state
        setActiveSegmentId(null)
        hydratedRef.current = true
      })
      .catch(() => {
        toast.error('加载文件失败')
        navigate(ROUTES.files)
      })
      .finally(() => setLoading(false))
  }, [fileId, navigate])

  const summarySyncVersion = useSummarySyncStore((s) => (fileId ? s.versions[fileId] ?? 0 : 0))

  useEffect(() => {
    if (!fileId || !hydratedRef.current || summarySyncVersion === 0) return
    filesApi
      .get(fileId)
      .then((detail) => {
        const segments = parseTranscriptSegments(detail.resultRaw, detail.resultText)
        const state = buildEditorState(detail.editorState, segments, {
          fileTitle: detail.title,
          plainText: detail.resultText,
        })
        setEditor(state)
        editorRef.current = state
      })
      .catch(() => {
        /* 静默失败，用户仍可手动刷新 */
      })
  }, [fileId, summarySyncVersion])

  useEffect(() => {
    if (!fileId || !detailRefreshPending) return
    const timer = setInterval(() => {
      filesApi
        .get(fileId)
        .then((detail) => {
          const prev = prevSummaryStatusRef.current
          setStructuredSummary(detail.structuredSummary)
          setSummaryStatus(detail.summaryStatus)
          setSummaryTemplateId(detail.summaryTemplateId)
          {
            const nextLearn = normalizeAiLearnCache(detail.aiLearnCache)
            setAiLearnCache(nextLearn)
            if (useAiLearnStore.getState().jobs[fileId]?.status !== 'streaming') {
              hydrateAiLearnCache(fileId, nextLearn)
            }
          }
          setDetailRefreshPending(shouldRefreshFileDetail(detail))
          setMetaDuration(detail.duration)
          setTitle(detail.title)
          setHasMedia(detail.hasMedia)
          setSourceType(detail.sourceType)
          setMediaMimeType(detail.mimeType)
          setMediaUrl(detail.hasMedia ? getFileMediaUrl(fileId) : null)
          setSummaryImageUrl(detail.hasSummaryImage ? getFileSummaryImageUrl(fileId) : null)

          if (prev === 'generating' && detail.summaryStatus === 'done') {
            setSummaryError(null)
            toast.success('AI 纪要已更新')
          } else if (prev === 'generating' && detail.summaryStatus === 'failed') {
            setSummaryError('生成超时或模型繁忙，请稍后重试')
            toast.error('AI 纪要生成失败，请稍后重试')
          }
          prevSummaryStatusRef.current = detail.summaryStatus

          if (
            detail.resultText !== resultText &&
            pendingSegmentIdsRef.current.size === 0
          ) {
            const segments = parseTranscriptSegments(detail.resultRaw, detail.resultText)
            const state = buildEditorState(detail.editorState, segments, {
              fileTitle: detail.title,
              plainText: detail.resultText,
            })
            setResultText(detail.resultText)
            setEditor(state)
            editorRef.current = state
          }
        })
        .catch(() => {
          /* 轮询失败时静默，下次继续 */
        })
    }, 3000)
    return () => clearInterval(timer)
  }, [detailRefreshPending, fileId, resultText])

  const applyLocal = useCallback((next: FileEditorState) => {
    editorRef.current = next
    setEditor(next)
  }, [])

  const flushSave = useCallback(() => {
    if (!fileId || !hydratedRef.current) return
    const patch: FileEditorPatch = {}

    const segmentIds = [...pendingSegmentIdsRef.current]
    pendingSegmentIdsRef.current.clear()
    if (segmentIds.length === 1) {
      const seg = editorRef.current?.segments.find((s) => s.id === segmentIds[0])
      if (seg) patch.segment = seg
    } else if (segmentIds.length > 1) {
      const segs = segmentIds
        .map((id) => editorRef.current?.segments.find((s) => s.id === id))
        .filter((s): s is EditableSegment => !!s)
      if (segs.length > 0) patch.segments = segs
    }

    if (!patch.segment && !patch.segments) return

    setSaving(true)
    void filesApi
      .updateEditor(fileId, patch)
      .catch(() => toast.warning('保存失败，请检查网络'))
      .finally(() => setSaving(false))
  }, [fileId])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => flushSave(), 700)
  }, [flushSave])

  const updateSegment = (id: string, patch: Partial<EditableSegment>) => {
    const current = editorRef.current
    if (!current) return
    const exists = current.segments.some((s) => s.id === id)
    const segments = exists
      ? current.segments.map((s) => (s.id === id ? { ...s, ...patch } : s))
      : [
          ...current.segments,
          {
            id,
            beginMs: 0,
            endMs: 0,
            speaker: '说话人1',
            html: '',
            ...patch,
          } as EditableSegment,
        ]
    applyLocal({ ...current, segments })
    pendingSegmentIdsRef.current.add(id)
    scheduleSave()
  }

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      flushSave()
    },
    [flushSave],
  )

  useEffect(() => {
    const el = mediaRef.current
    if (!el || !mediaUrl) return

    const syncDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDurationMs(el.duration * 1000)
      }
    }
    const onTimeUpdate = () => {
      if (!seekingRef.current) setPlayheadMs(el.currentTime * 1000)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    el.addEventListener('loadedmetadata', syncDuration)
    el.addEventListener('durationchange', syncDuration)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)

    return () => {
      el.removeEventListener('loadedmetadata', syncDuration)
      el.removeEventListener('durationchange', syncDuration)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [mediaUrl])

  useEffect(() => {
    const el = mediaRef.current
    if (el) el.playbackRate = playbackRate
  }, [playbackRate, mediaUrl])

  const seekTo = useCallback((ms: number) => {
    const clamped = Math.max(0, ms)
    setPlayheadMs(clamped)
    const el = mediaRef.current
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = Math.min(clamped, el.duration * 1000) / 1000
    } else if (el) {
      el.currentTime = clamped / 1000
    }
  }, [])

  const togglePlay = useCallback(() => {
    const el = mediaRef.current
    if (!el || !hasMedia) {
      toast.warning('暂无可用音视频')
      return
    }
    if (el.paused) {
      void el.play().catch(() => toast.error('播放失败，请确认已登录且文件存在'))
    } else {
      el.pause()
    }
  }, [hasMedia])

  const cyclePlaybackRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number])
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
    setPlaybackRate(next)
  }

  const totalMs = useMemo(() => {
    if (durationMs > 0) return durationMs
    if (!editor?.segments.length) return parseDurationLabel(metaDuration) || 30_000
    return Math.max(
      ...editor.segments.map((s) => s.endMs),
      parseDurationLabel(metaDuration),
    )
  }, [durationMs, editor?.segments, metaDuration])

  const isVideo = mediaMimeType?.startsWith('video/') ?? false
  const speakerShares = useMemo(
    () => buildSpeakerShares(editor?.segments ?? []),
    [editor?.segments],
  )

  const speakerColorMap = useMemo(() => {
    if (!editor?.segments.length) return new Map<string, number>()
    return buildSpeakerColorMap(editor.segments.map((s) => s.speaker))
  }, [editor?.segments])

  const visibleSegments = useMemo(() => {
    if (!editor?.segments.length) return []
    const q = transcriptQuery.trim().toLowerCase()
    if (!q) return editor.segments
    return editor.segments.filter((seg) => {
      const text = segmentPlainText(seg.html).toLowerCase()
      const speaker = seg.speaker.toLowerCase()
      return text.includes(q) || speaker.includes(q)
    })
  }, [editor?.segments, transcriptQuery])

  useEffect(() => {
    if (!moreOpen) return
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const templateSummaryDoc = useMemo(
    () => buildStructuredSummaryDocument(title, editor?.segments ?? [], resultText),
    [title, editor?.segments, resultText],
  )

  const structuredSummaryDoc = useMemo(
    () => resolveStructuredSummaryDocument(structuredSummary, templateSummaryDoc),
    [structuredSummary, templateSummaryDoc],
  )

  const templateHint = useMemo(() => {
    if (!templateCatalog) return null
    const hit =
      templateCatalog.templates.find((t) => t.id === summaryTemplateId) ??
      templateCatalog.templates.find((t) => t.id === templateCatalog.defaultTemplateId)
    return hit ? hit.title : null
  }, [summaryTemplateId, templateCatalog])

  const handleRegenerateSummary = useCallback(
    async (templateId?: string) => {
      if (!fileId || summaryGenerating || summaryStatus === 'generating') return

      summaryAbortRef.current?.abort()
      const controller = new AbortController()
      summaryAbortRef.current = controller

      const resolvedTemplateId = templateId ?? summaryTemplateId ?? undefined
      const llm = useLlmPreferenceStore.getState().getSelection()
      let raw = ''
      let finished = false

      setSummaryGenerating(true)
      setSummaryError(null)
      setSummaryStreamStatus('正在连接模型…')
      setSummaryStreamDraft(null)
      setSummaryStatus('generating')
      prevSummaryStatusRef.current = 'generating'
      setActiveTool('essence')
      if (resolvedTemplateId) setSummaryTemplateId(resolvedTemplateId)

      try {
        await filesApi.streamGenerateSummary(
          fileId,
          {
            ...(resolvedTemplateId ? { templateId: resolvedTemplateId } : {}),
            ...llm,
          },
          {
            signal: controller.signal,
            onStatus: (message, nextTemplateId) => {
              setSummaryStreamStatus(message)
              if (nextTemplateId) setSummaryTemplateId(nextTemplateId)
            },
            onDelta: (content) => {
              raw += content
              setSummaryStreamDraft(extractSummaryStreamDraft(raw))
            },
            onDone: (summary) => {
              finished = true
              setStructuredSummary(summary)
              setSummaryStatus('done')
              prevSummaryStatusRef.current = 'done'
              setSummaryStreamStatus(null)
              setSummaryStreamDraft(null)
              setSummaryError(null)
              setDetailRefreshPending(false)
              toast.success('AI 纪要已更新')
            },
            onError: (message) => {
              if (controller.signal.aborted) return
              finished = true
              setSummaryStatus('failed')
              prevSummaryStatusRef.current = 'failed'
              setSummaryError(message)
              setSummaryStreamStatus(null)
              toast.error(message)
            },
          },
        )
        if (!finished && !controller.signal.aborted) {
          setSummaryStatus('failed')
          setSummaryError('生成中断，请重试')
          setSummaryStreamStatus(null)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        setSummaryStatus('failed')
        prevSummaryStatusRef.current = 'failed'
        const message = isApiClientError(err)
          ? err.message
          : 'AI 纪要生成失败，请稍后重试'
        setSummaryError(message)
        setSummaryStreamStatus(null)
        toast.error(message)
      } finally {
        if (summaryAbortRef.current === controller) summaryAbortRef.current = null
        setSummaryGenerating(false)
      }
    },
    [fileId, summaryGenerating, summaryStatus, summaryTemplateId],
  )

  const handleActiveToolChange = useCallback((id: SummaryToolId) => {
    setActiveTool(id)
  }, [])

  const handleCopySummaryText = async () => {
    await navigator.clipboard.writeText(structuredSummaryDoc.copyText)
    toast.success('已复制文本纪要')
  }

  const handleToggleStar = useCallback(async () => {
    if (!fileId || starToggling) return
    const next = !starred
    setStarred(next)
    setFileStarred(fileId, next)
    setStarToggling(true)
    try {
      await filesApi.setStarred(fileId, next)
      toast.success(next ? '已收藏' : '已取消收藏')
    } catch {
      setStarred(!next)
      setFileStarred(fileId, !next)
      toast.error('收藏操作失败')
    } finally {
      setStarToggling(false)
    }
  }, [fileId, starred, starToggling, setFileStarred])

  const leftContent = (() => {
    switch (activeTool) {
      case 'essence':
        return (
          <>
            {summaryImageUrl ? (
              <SummaryVisualCard
                imageUrl={summaryImageUrl}
                title={structuredSummaryDoc.title || title}
              />
            ) : null}
            <SummaryEssencePanel
              document={structuredSummaryDoc}
              generating={isSummaryBusy}
              templateName={templateHint}
              streamStatus={summaryStreamStatus}
              streamDraft={summaryStreamDraft}
              errorMessage={summaryError}
              failed={summaryStatus === 'failed'}
              onOpenLibrary={() => setTemplateModalOpen(true)}
              onGenerate={() => void handleRegenerateSummary()}
            />
          </>
        )
      case 'outline':
        return (
          <SummaryOutlinePanel
            title={structuredSummaryDoc.title || title}
            chapters={structuredSummaryDoc.chapters}
            onSeek={hasMedia ? seekTo : undefined}
          />
        )
      case 'mindmap':
        return (
          <SummaryMindmapPanel
            title={structuredSummaryDoc.title || title}
            chapters={structuredSummaryDoc.chapters}
            bullets={structuredSummaryDoc.previewBullets}
            onSeek={hasMedia ? seekTo : undefined}
          />
        )
      case 'chat':
        return fileId ? (
          <FileDetailChatPanel fileId={fileId} title={title} duration={metaDuration} />
        ) : null
      case 'learn':
        return fileId ? (
          <AiLearnPanel
            key={fileId}
            fileId={fileId}
            initialCache={aiLearnCache}
            hasTranscript={Boolean(
              resultText?.trim() ||
                editor?.segments?.some((s) => segmentPlainText(s.html).trim()),
            )}
            onCacheChange={setAiLearnCache}
          />
        ) : null
      case 'practice':
        return fileId ? (
          <PracticePanel
            key={fileId}
            fileId={fileId}
            hasContent={Boolean(
              resultText?.trim() ||
                editor?.segments?.some((s) => segmentPlainText(s.html).trim()) ||
                (structuredSummaryDoc.previewBullets?.length ?? 0) > 0 ||
                structuredSummaryDoc.abstract?.trim(),
            )}
            onSeek={hasMedia ? seekTo : undefined}
          />
        ) : null
      default:
        return null
    }
  })()

  if (loading || !editor) {
    return (
      <div className="file-detail-page">
        <p className="file-detail-loading">
          <Loader2 className="h-5 w-5 animate-spin" />
          加载中…
        </p>
      </div>
    )
  }

  return (
    <div className="file-detail-page">
      <FileDetailWorkspace
        key={fileId}
        activeTool={activeTool}
        onActiveToolChange={handleActiveToolChange}
        templateHint={templateHint}
        onOpenTemplateLibrary={() => setTemplateModalOpen(true)}
        rightFocus={rightFocus}
        onRightFocusChange={setRightFocus}
        backControl={(
          <Link to={ROUTES.files} className="file-detail-home" aria-label="返回文件库">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        headerMeta={(
          <div className="file-detail-dual-meta">
            <h1 className="file-detail-dual-title" title={title}>
              {title}
            </h1>
            <span className="file-detail-dual-date">{metaDate}</span>
          </div>
        )}
        headerActions={(
          <div className="file-detail-toolbar">
            {saving ? <span className="file-detail-save-hint">保存中…</span> : null}
            {isSummaryBusy ? <span className="file-detail-save-hint">纪要生成中</span> : null}
            <LlmProviderPicker disabled={isSummaryBusy || isAiLearnBusy} className="file-detail-llm-picker" />
            {isAiLearnBusy && activeTool !== 'learn' && aiLearnJob ? (
              <button
                type="button"
                className="file-detail-job"
                onClick={() => setActiveTool('learn')}
                title="查看 AI 学习生成进度"
              >
                <Loader2 className="file-detail-job-spin h-3 w-3 animate-spin" aria-hidden />
                <span className="file-detail-job-text">
                  {aiLearnJob.batch ? 'AI 学习' : aiLearnJob.label}
                </span>
                {aiLearnJob.batch ? (
                  <>
                    <span className="file-detail-job-track" aria-hidden>
                      <span
                        className="file-detail-job-fill"
                        style={{
                          width: `${Math.round(
                            ((aiLearnJob.batch.succeeded +
                              aiLearnJob.batch.failed +
                              1) /
                              aiLearnJob.batch.total) *
                              100,
                          )}%`,
                        }}
                      />
                    </span>
                    <span className="file-detail-job-count">
                      {aiLearnJob.batch.succeeded + aiLearnJob.batch.failed + 1}/
                      {aiLearnJob.batch.total}
                    </span>
                  </>
                ) : (
                  <span className="file-detail-job-count">生成中</span>
                )}
              </button>
            ) : null}
            {(saving || isSummaryBusy || (isAiLearnBusy && activeTool !== 'learn')) ? (
              <span className="file-detail-toolbar-sep" aria-hidden />
            ) : null}
            <button
              type="button"
              className={cn('file-detail-tool', starred && 'is-starred')}
              aria-label={starred ? '取消收藏' : '收藏'}
              aria-pressed={starred}
              disabled={starToggling}
              onClick={() => void handleToggleStar()}
            >
              <Star className="h-4 w-4" fill={starred ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="file-detail-tool"
              aria-label="分享"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="file-detail-tool"
              aria-label="复制纪要"
              onClick={() => void handleCopySummaryText()}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="file-detail-tool"
              aria-label="AI 重新生成纪要"
              disabled={isSummaryBusy}
              onClick={() => void handleRegenerateSummary()}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        )}
        leftContent={leftContent}
        rightContent={(
          <>
            <header className="file-detail-panel-top is-actions-only">
              <div className="file-detail-panel-heading">
                <span className="file-detail-tab-dot is-green" />
                <h2>原文笔记</h2>
              </div>
              <div className="file-detail-toolbar">
                <ExportTranscriptMenu
                  title={title}
                  fileDate={metaDate}
                  duration={metaDuration}
                  segments={editor.segments}
                  fallbackText={resultText}
                />
                {transcriptSearchOpen ? (
                  <div className="file-detail-transcript-search">
                    <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <input
                      type="search"
                      autoFocus
                      value={transcriptQuery}
                      placeholder="搜索原文…"
                      onChange={(e) => setTranscriptQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setTranscriptSearchOpen(false)
                          setTranscriptQuery('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="file-detail-tool"
                      aria-label="关闭搜索"
                      onClick={() => {
                        setTranscriptSearchOpen(false)
                        setTranscriptQuery('')
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="file-detail-tool"
                    aria-label="搜索原文"
                    title="搜索原文"
                    onClick={() => setTranscriptSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="file-detail-tool"
                  aria-label="分享"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn('file-detail-tool', rightFocus && 'is-active')}
                  aria-label={rightFocus ? '退出原文全屏' : '原文全屏'}
                  title={rightFocus ? '展开总结栏' : '收起总结栏，原文全屏'}
                  aria-pressed={rightFocus}
                  onClick={() => setRightFocus((v) => !v)}
                >
                  {rightFocus ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                </button>
                <div className="file-detail-more" ref={moreRef}>
                  <button
                    type="button"
                    className={cn('file-detail-tool', moreOpen && 'is-open')}
                    aria-label="更多"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {moreOpen ? (
                    <div className="file-detail-more-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setRecordsOpen(true)
                          setMoreOpen(false)
                        }}
                      >
                        导入 / 录音记录
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setRightFocus(true)
                          setMoreOpen(false)
                        }}
                      >
                        收起总结栏
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          void handleCopySummaryText()
                          setMoreOpen(false)
                        }}
                      >
                        复制纪要
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          navigate(ROUTES.files)
                          setMoreOpen(false)
                        }}
                      >
                        返回文件库
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="file-detail-panel-scroll file-detail-notes-scroll">
              <div className="file-detail-notes-media">
                <div className={`file-detail-player-card${hasMedia ? '' : ' is-disabled'}`}>
                  <div className="file-detail-player-top">
                    <div className="file-detail-player-title-wrap">
                      <span className="file-detail-tab-dot is-green" />
                      <h3 className="file-detail-player-title" title={title}>
                        {title}
                      </h3>
                    </div>
                    <div className="file-detail-player-actions">
                      <span className="file-detail-player-date">{metaDate}</span>
                    </div>
                  </div>

                  {hasMedia && mediaUrl ? (
                    <FileDetailMedia
                      mediaRef={mediaRef}
                      src={mediaUrl}
                      title={title}
                      isVideo={isVideo}
                    />
                  ) : null}

                  {!isVideo && (
                    <>
                      <div className="file-detail-player-progress">
                        <span className="file-detail-player-time">{formatMs(playheadMs)}</span>
                        <input
                          type="range"
                          className="file-detail-player-range"
                          min={0}
                          max={totalMs}
                          value={Math.min(playheadMs, totalMs)}
                          disabled={!hasMedia}
                          onPointerDown={() => {
                            seekingRef.current = true
                          }}
                          onPointerUp={() => {
                            seekingRef.current = false
                          }}
                          onChange={(e) => seekTo(Number(e.target.value))}
                          aria-label="播放进度"
                        />
                        <span className="file-detail-player-time">{formatMs(totalMs)}</span>
                      </div>

                      <div className="file-detail-player-toolbar">
                        <button
                          type="button"
                          className="file-detail-player-skip"
                          aria-label="后退 5 秒"
                          disabled={!hasMedia}
                          onClick={() => seekTo(playheadMs - 5000)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>5</span>
                        </button>
                        <button
                          type="button"
                          className="file-detail-player-play"
                          aria-label={playing ? '暂停' : '播放'}
                          disabled={!hasMedia}
                          onClick={togglePlay}
                        >
                          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="file-detail-player-skip"
                          aria-label="前进 5 秒"
                          disabled={!hasMedia}
                          onClick={() => seekTo(playheadMs + 5000)}
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          <span>5</span>
                        </button>
                        <button
                          type="button"
                          className="file-detail-player-rate"
                          disabled={!hasMedia}
                          onClick={cyclePlaybackRate}
                        >
                          {playbackRate}x
                        </button>
                      </div>
                    </>
                  )}

                  <SpeakerSharePanel shares={speakerShares} timelineMs={totalMs} />

                  {!hasMedia && (
                    <p className="file-detail-player-hint">
                      {sourceType === 'url'
                        ? '原音频未保存，链接导入仅保留转写内容'
                        : '原始音视频不可用（可能尚未上传或已被清理）'}
                    </p>
                  )}
                </div>
              </div>
              <div className="file-detail-transcript">
                {editor.segments.length > 0 ? (
                  visibleSegments.length > 0 ? (
                    visibleSegments.map((seg) => (
                      <TranscriptSegmentRow
                        key={seg.id}
                        segment={seg}
                        colorIndex={speakerColorMap.get(seg.speaker.trim() || '说话人1') ?? 0}
                        active={activeSegmentId === seg.id}
                        onActivate={() => {
                          setActiveSegmentId(seg.id)
                          seekTo(seg.beginMs)
                        }}
                        onDeactivate={() => {
                          if (saveTimer.current) {
                            clearTimeout(saveTimer.current)
                            flushSave()
                          }
                          setActiveSegmentId(null)
                        }}
                        onUpdate={(patch) => updateSegment(seg.id, patch)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      compact
                      title="没有匹配的原文"
                      description="试试换个关键词，或清空搜索"
                    />
                  )
                ) : resultText ? (
                  fallbackEditing ? (
                    <textarea
                      className="file-detail-segment-textarea file-detail-fallback-textarea"
                      value={
                        editor.segments[0]?.html
                          ? segmentPlainText(editor.segments[0].html)
                          : resultText
                      }
                      rows={8}
                      autoFocus
                      onChange={(e) => {
                        updateSegment('fallback-0', {
                          beginMs: 0,
                          endMs: totalMs,
                          speaker: '说话人1',
                          html: segmentFromPlainText(e.target.value),
                        })
                      }}
                      onBlur={() => setFallbackEditing(false)}
                      placeholder="在此编辑转写内容…"
                    />
                  ) : (
                    <button
                      type="button"
                      className="file-detail-fallback-preview"
                      onClick={() => setFallbackEditing(true)}
                    >
                      <p className="file-detail-utterance-text">{resultText}</p>
                      <span className="file-detail-utterance-placeholder">点击编辑</span>
                    </button>
                  )
                ) : (
                  <EmptyState
                    compact
                    title="暂无转写原文"
                    description="转写完成后，原文和时间轴会显示在这里"
                  />
                )}
              </div>
            </div>

            <div className="file-detail-notes-foot">
              <button
                type="button"
                className="file-detail-suggest-chip"
                onClick={() => setActiveTool('chat')}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                基于当前内容开始 Chat
              </button>
              <p className="file-detail-ai-foot">转写原文可编辑，修改会自动保存</p>
            </div>
          </>
        )}
      />

      {fileId ? (
        <ShareNoteModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          fileId={fileId}
          fileTitle={title}
          initialEnabled={shareEnabled}
          initialToken={shareToken}
          onShareChange={(enabled, token) => {
            setShareEnabled(enabled)
            setShareToken(token)
          }}
        />
      ) : null}

      <SummaryTemplateLibraryModal
        open={templateModalOpen}
        currentTemplateId={summaryTemplateId}
        generating={isSummaryBusy}
        onClose={() => setTemplateModalOpen(false)}
        onSelect={(id) => {
          setSummaryTemplateId(id)
          setSummaryError(null)
          if (summaryStatus === 'failed') setSummaryStatus(structuredSummary ? 'done' : null)
          setTemplateModalOpen(false)
          setActiveTool('essence')
          toast.success('已切换模板，可生成纪要')
        }}
        onSelectAndGenerate={(id) => {
          setSummaryTemplateId(id)
          setSummaryError(null)
          setTemplateModalOpen(false)
          setActiveTool('essence')
          void handleRegenerateSummary(id)
        }}
      />
    </div>
  )
}
