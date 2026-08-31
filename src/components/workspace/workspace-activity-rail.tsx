import { createPortal } from 'react-dom'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Loader2, Maximize2, Mic, Pause, Play, Square, Upload } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { formatMs } from '@/lib/parse-transcript'
import { RTASR_RECONNECT_GIVE_UP_MS } from '@/lib/rtasr/constants'
import type { LiveSegment } from '@/lib/rtasr/recording-engine'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useRecordingStore } from '@/stores/recording-store'
import { cn } from '@/lib/utils'

const FLOAT_POS_KEY = 'iyy-recorder-float-pos'

type FloatPos = { x: number; y: number }

function loadFloatPos(): FloatPos | null {
  try {
    const raw = localStorage.getItem(FLOAT_POS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FloatPos
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function saveFloatPos(pos: FloatPos) {
  localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(pos))
}

function clampPos(x: number, y: number, width: number, height: number): FloatPos {
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  }
}

function latestTranscriptPreview(segments: LiveSegment[], draftLine: string, max = 64) {
  const joined = [...segments.slice(-5).map((s) => s.text), draftLine]
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  if (!joined) return '等待转写内容…'
  return joined.length > max ? `…${joined.slice(-max)}` : joined
}

function formatRemain(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m <= 0) return `${s}s`
  return `${m}分${s.toString().padStart(2, '0')}秒`
}

export function WorkspaceActivityRail() {
  const navigate = useNavigate()
  const {
    phase: importPhase,
    fileName,
    uploadProgress,
    modalOpen,
    setModalOpen,
    setRecordsOpen,
    batchTotal,
    batchSucceeded,
    batchFailed,
    batchItems,
  } = useImportTaskStore()

  const recordingPhase = useRecordingStore((s) => s.phase)
  const minimized = useRecordingStore((s) => s.minimized)
  const title = useRecordingStore((s) => s.title)
  const elapsedMs = useRecordingStore((s) => s.elapsedMs)
  const segments = useRecordingStore((s) => s.segments)
  const draftLine = useRecordingStore((s) => s.draftLine)
  const reconnectAttempt = useRecordingStore((s) => s.reconnectAttempt)
  const reconnectStartedAt = useRecordingStore((s) => s.reconnectStartedAt)
  const errorMessage = useRecordingStore((s) => s.errorMessage)
  const pause = useRecordingStore((s) => s.pause)
  const resume = useRecordingStore((s) => s.resume)
  const expand = useRecordingStore((s) => s.expand)
  const stopAndSave = useRecordingStore((s) => s.stopAndSave)

  const showRecording =
    minimized &&
    (recordingPhase === 'recording' ||
      recordingPhase === 'paused' ||
      recordingPhase === 'connecting' ||
      recordingPhase === 'reconnecting' ||
      recordingPhase === 'saving')

  const isBatch = batchTotal > 1
  const showImport =
    !modalOpen &&
    (importPhase === 'uploading' || importPhase === 'upload_paused' || importPhase === 'transcribing') &&
    (isBatch || Boolean(fileName))

  const [pos, setPos] = useState<FloatPos | null>(() => loadFloatPos())
  const [dragging, setDragging] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const railRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    if (recordingPhase !== 'reconnecting') return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [recordingPhase])

  const preview = useMemo(
    () => latestTranscriptPreview(segments, draftLine),
    [segments, draftLine],
  )

  const reconnectProgress = useMemo(() => {
    if (recordingPhase !== 'reconnecting' || reconnectStartedAt == null) return 0
    return Math.min(100, ((now - reconnectStartedAt) / RTASR_RECONNECT_GIVE_UP_MS) * 100)
  }, [recordingPhase, reconnectStartedAt, now])

  const reconnectRemainMs = useMemo(() => {
    if (recordingPhase !== 'reconnecting' || reconnectStartedAt == null) return 0
    return Math.max(0, RTASR_RECONNECT_GIVE_UP_MS - (now - reconnectStartedAt))
  }, [recordingPhase, reconnectStartedAt, now])

  const applyClampedPos = useCallback((next: FloatPos) => {
    const el = railRef.current
    const width = el?.offsetWidth ?? 360
    const height = el?.offsetHeight ?? 72
    const clamped = clampPos(next.x, next.y, width, height)
    setPos(clamped)
    saveFloatPos(clamped)
  }, [])

  useEffect(() => {
    if (!pos) return
    const onResize = () => applyClampedPos(pos)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos, applyClampedPos])

  const onDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button, a, input')) return
    const el = railRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const current: FloatPos = pos ?? { x: rect.left, y: rect.top }
    if (!pos) setPos(current)
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - current.x,
      offsetY: event.clientY - current.y,
      moved: false,
    }
    el.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const onDragPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.moved = true
    const next = {
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    }
    const el = railRef.current
    const width = el?.offsetWidth ?? 360
    const height = el?.offsetHeight ?? 72
    setPos(clampPos(next.x, next.y, width, height))
  }

  const onDragPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (pos) saveFloatPos(pos)
    try {
      railRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  if (!showRecording && !showImport) return null

  const completed = batchSucceeded + batchFailed
  const activeImport = Math.max(0, batchItems.length - completed)
  const importLabel =
    isBatch
      ? '批量处理中'
      : importPhase === 'transcribing'
        ? '转写中'
        : importPhase === 'upload_paused'
          ? '已暂停'
          : '上传中'
  const importName = isBatch
    ? `${activeImport} 个进行中 · ${completed}/${batchTotal} 已结束`
    : fileName ?? '文件'

  const recordingLabel =
    recordingPhase === 'paused'
      ? '已暂停'
      : recordingPhase === 'reconnecting'
        ? '重连中'
        : recordingPhase === 'saving'
          ? '保存中'
          : recordingPhase === 'connecting'
            ? '连接中'
            : '录音中'

  const handleEnd = async () => {
    const ok = window.confirm('确定结束录音并保存到文件库？')
    if (!ok) return
    const result = await stopAndSave()
    if (result) navigate(ROUTES.fileDetail(result.fileId))
  }

  const railStyle =
    pos != null
      ? ({ left: pos.x, top: pos.y, right: 'auto' } as const)
      : undefined

  return createPortal(
    <div
      ref={railRef}
      className={cn(
        'workspace-activity-rail',
        showRecording && 'is-draggable',
        dragging && 'is-dragging',
        recordingPhase === 'reconnecting' && 'is-reconnecting',
      )}
      style={railStyle}
      role="region"
      aria-label="进行中的任务"
      onPointerDown={showRecording ? onDragPointerDown : undefined}
      onPointerMove={showRecording ? onDragPointerMove : undefined}
      onPointerUp={showRecording ? onDragPointerUp : undefined}
      onPointerCancel={showRecording ? onDragPointerUp : undefined}
    >
      {showImport && (
        <button
          type="button"
          className="import-task-capsule"
          onClick={() => setModalOpen(true)}
          aria-label={`${importLabel} ${importName}`}
        >
          <Upload className="h-3.5 w-3.5 shrink-0" />
          <span className="import-task-capsule-label">{importLabel}</span>
          <span className="import-task-capsule-name">{importName}</span>
          <span className="import-task-capsule-progress">
            {!isBatch && importPhase === 'transcribing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              `${uploadProgress}%`
            )}
          </span>
        </button>
      )}

      {showRecording && (
        <div className="recorder-float-bar">
          <div className="recorder-float-top">
            <span className="recorder-float-grip" aria-hidden title="拖拽移动">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <span className={cn('recorder-float-dot', recordingPhase === 'recording' && 'is-live')} />
            <Mic className="recorder-float-mic" aria-hidden />
            <span className="recorder-float-label">{recordingLabel}</span>
            <span className="recorder-float-time">{formatMs(elapsedMs)}</span>
            <span className="recorder-float-title" title={title || undefined}>
              {title || '录音中'}
            </span>
            <div className="recorder-float-actions">
              {recordingPhase === 'saving' ||
              recordingPhase === 'reconnecting' ||
              recordingPhase === 'connecting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : recordingPhase === 'paused' ? (
                <button
                  type="button"
                  className="recorder-float-btn"
                  aria-label="继续"
                  onClick={() => void resume()}
                >
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" className="recorder-float-btn" aria-label="暂停" onClick={pause}>
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="recorder-float-btn"
                aria-label="展开"
                onClick={() => {
                  expand()
                  navigate(ROUTES.record)
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="recorder-float-btn is-danger"
                aria-label="结束"
                onClick={() => void handleEnd()}
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="recorder-float-preview" title={preview}>
            {preview}
          </p>

          {recordingPhase === 'reconnecting' ? (
            <div className="recorder-float-reconnect" aria-live="polite">
              <div className="recorder-float-reconnect-meta">
                <span>
                  {errorMessage?.includes('网络已断开')
                    ? '网络已断开，等待恢复'
                    : reconnectAttempt > 0
                      ? `正在重连 · 第 ${reconnectAttempt} 次`
                      : '正在重连…'}
                </span>
                <span>剩余 {formatRemain(reconnectRemainMs)}</span>
              </div>
              <div
                className="recorder-float-reconnect-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(reconnectProgress)}
                aria-label="重连进度"
              >
                <div
                  className="recorder-float-reconnect-fill"
                  style={{ width: `${reconnectProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <button type="button" className="workspace-activity-more" onClick={() => setRecordsOpen(true)}>
        更多记录
      </button>
    </div>,
    document.body,
  )
}
