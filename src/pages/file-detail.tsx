import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Download,
  Expand,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react'
import {
  FileDetailWorkspace,
  type BlockId,
} from '@/components/workspace/file-detail-workspace'
import { FileDetailChatPanel } from '@/components/workspace/file-detail-chat-panel'
import { FileDetailMedia } from '@/components/workspace/file-detail-media'
import { ShareNoteModal } from '@/components/workspace/share-note-modal'
import { SpeakerSharePanel } from '@/components/workspace/speaker-share-panel'
import { StructuredSummaryPanel } from '@/components/workspace/structured-summary-panel'
import { TranscriptSegmentRow } from '@/components/workspace/transcript-segment-row'
import {
  filesApi,
  getFileMediaUrl,
  getFileSummaryImageUrl,
  shouldRefreshFileDetail,
  type FileEditorPatch,
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
import { downloadTextFile, segmentsToSrt } from '@/lib/export/srt'
import { cn } from '@/lib/utils'
import {
  buildStructuredSummaryDocument,
  resolveStructuredSummaryDocument,
  type StructuredSummaryDocument,
  type SummaryStatus,
} from '@/lib/structured-summary-document'
import { toast } from '@/stores/toast-store'
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
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<BlockId>('summary')
  const setFileStarred = useFilesStore((s) => s.setFileStarred)
  const [fallbackEditing, setFallbackEditing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSegmentIdsRef = useRef<Set<string>>(new Set())
  const editorRef = useRef<FileEditorState | null>(null)
  const mediaRef = useRef<HTMLVideoElement>(null)
  const seekingRef = useRef(false)
  const hydratedRef = useRef(false)

  const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const

  useEffect(() => {
    if (!fileId) return
    setActiveWorkspaceView('summary')
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
        setDetailRefreshPending(shouldRefreshFileDetail(detail))
        setResultText(detail.resultText)
        setHasMedia(detail.hasMedia)
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
          setStructuredSummary(detail.structuredSummary)
          setSummaryStatus(detail.summaryStatus)
          setDetailRefreshPending(shouldRefreshFileDetail(detail))
          setMetaDuration(detail.duration)
          setHasMedia(detail.hasMedia)
          setMediaMimeType(detail.mimeType)
          setMediaUrl(detail.hasMedia ? getFileMediaUrl(fileId) : null)
          setSummaryImageUrl(detail.hasSummaryImage ? getFileSummaryImageUrl(fileId) : null)

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

  const templateSummaryDoc = useMemo(
    () => buildStructuredSummaryDocument(title, editor?.segments ?? [], resultText),
    [title, editor?.segments, resultText],
  )

  const structuredSummaryDoc = useMemo(
    () => resolveStructuredSummaryDocument(structuredSummary, templateSummaryDoc),
    [structuredSummary, templateSummaryDoc],
  )

  const handleRegenerateSummary = useCallback(async () => {
    if (!fileId || summaryGenerating) return
    setSummaryGenerating(true)
    setSummaryStatus('generating')
    try {
      const doc = await filesApi.generateSummary(fileId)
      setStructuredSummary(doc)
      setSummaryStatus('done')
      toast.success('AI 纪要已更新')
    } catch {
      setSummaryStatus('failed')
      toast.error('AI 纪要生成失败，请检查 ARK_API_KEY / ARK_MODEL 配置')
    } finally {
      setSummaryGenerating(false)
    }
  }, [fileId, summaryGenerating])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(structuredSummaryDoc.copyText)
    toast.success('已复制到剪贴板')
  }

  const handleCopySummaryText = async () => {
    await navigator.clipboard.writeText(structuredSummaryDoc.copyText)
    toast.success('已复制文本纪要')
  }

  const handleExportSrt = () => {
    if (!editor?.segments.length) {
      toast.warning('暂无转写内容可导出')
      return
    }
    const safeName = (title || 'transcript').replace(/[\\/:*?"<>|]/g, '_')
    downloadTextFile(`${safeName}.srt`, segmentsToSrt(editor.segments), 'application/x-subrip;charset=utf-8')
    toast.success('SRT 字幕已下载')
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
        activeView={activeWorkspaceView}
        onActiveViewChange={setActiveWorkspaceView}
        backControl={(
          <Link to={ROUTES.files} className="file-detail-home" aria-label="返回文件库">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        blocks={{
          summary: (
            <section className="file-detail-panel file-detail-summary">
              <header className="file-detail-panel-top is-actions-only">
                <div className="file-detail-toolbar">
                  {saving && <span className="file-detail-save-hint">保存中…</span>}
                  {(summaryGenerating || summaryStatus === 'generating') && (
                    <span className="file-detail-save-hint">AI 纪要生成中…</span>
                  )}
                  <button
                    type="button"
                    className="file-detail-tool"
                    aria-label="AI 重新生成纪要"
                    disabled={summaryGenerating || summaryStatus === 'generating'}
                    onClick={() => void handleRegenerateSummary()}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <button type="button" className="file-detail-tool" aria-label="复制" onClick={() => void handleCopy()}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" className="file-detail-tool" aria-label="导出 SRT" onClick={handleExportSrt}>
                    <Download className="h-4 w-4" />
                  </button>
                  <button type="button" className="file-detail-tool" aria-label="分享" onClick={() => setShareOpen(true)}>
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="file-detail-panel-scroll">
                <StructuredSummaryPanel
                  document={structuredSummaryDoc}
                  onCopy={() => void handleCopySummaryText()}
                  onSeekChapter={hasMedia ? seekTo : undefined}
                  summaryImageUrl={summaryImageUrl}
                />
              </div>
              <p className="file-detail-ai-foot">以上内容由人工智能生成，仅供参考</p>
            </section>
          ),
          notes: (
            <section className="file-detail-panel file-detail-notes">
              <header className="file-detail-panel-top is-actions-only">
                <div className="file-detail-toolbar">
                  <button type="button" className="file-detail-tool" aria-label="搜索">
                    <Search className="h-4 w-4" />
                  </button>
                  <button type="button" className="file-detail-tool" aria-label="全屏">
                    <Expand className="h-4 w-4" />
                  </button>
                  <button type="button" className="file-detail-tool" aria-label="更多">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="file-detail-panel-scroll file-detail-notes-scroll">
                <div className="file-detail-transcript">
                {editor.segments.length > 0 ? (
                  editor.segments.map((seg) => (
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
                  <div className="file-detail-notes-empty">
                    <p>留下点声音的痕迹吧</p>
                    <span>完成转写后，原文会显示在这里</span>
                  </div>
                )}
                </div>
              </div>

              <div className="file-detail-notes-foot">
              <button
                type="button"
                className="file-detail-suggest-chip"
                onClick={() => setActiveWorkspaceView('chat')}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                基于当前内容开始 Chat
              </button>
              <p className="file-detail-ai-foot">转写原文可编辑，修改会自动保存</p>
              </div>
            </section>
          ),
          chat: (
            <section className="file-detail-panel file-detail-chat-panel">
              {fileId ? (
                <FileDetailChatPanel fileId={fileId} title={title} duration={metaDuration} />
              ) : null}
            </section>
          ),
          player: (
            <section className="file-detail-panel file-detail-player-panel">
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
                    <button
                      type="button"
                      className={cn('file-detail-star-btn', starred && 'is-starred')}
                      aria-label={starred ? '取消收藏' : '收藏'}
                      aria-pressed={starred}
                      disabled={starToggling}
                      onClick={() => void handleToggleStar()}
                    >
                      <Star className="h-3.5 w-3.5" fill={starred ? 'currentColor' : 'none'} />
                    </button>
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
                  <p className="file-detail-player-hint">原始音视频不可用（可能尚未上传或已被清理）</p>
                )}
              </div>
            </section>
          ),
        }}
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
    </div>
  )
}
