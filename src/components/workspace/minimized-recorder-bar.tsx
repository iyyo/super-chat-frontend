import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Loader2, Maximize2, Pause, Play, Square } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { formatMs } from '@/lib/parse-transcript'
import { useRecordingStore } from '@/stores/recording-store'
import { cn } from '@/lib/utils'

export function MinimizedRecorderBar() {
  const navigate = useNavigate()
  const phase = useRecordingStore((s) => s.phase)
  const minimized = useRecordingStore((s) => s.minimized)
  const title = useRecordingStore((s) => s.title)
  const elapsedMs = useRecordingStore((s) => s.elapsedMs)
  const pause = useRecordingStore((s) => s.pause)
  const resume = useRecordingStore((s) => s.resume)
  const expand = useRecordingStore((s) => s.expand)
  const stopAndSave = useRecordingStore((s) => s.stopAndSave)

  const active = phase === 'recording' || phase === 'paused' || phase === 'connecting' || phase === 'saving'
  if (!active || !minimized) return null

  const handleEnd = async () => {
    const ok = window.confirm('确定结束录音并保存到文件库？')
    if (!ok) return
    const result = await stopAndSave()
    if (result) navigate(ROUTES.fileDetail(result.fileId))
  }

  return createPortal(
    <div className="recorder-float-bar" role="region" aria-label="录音悬浮条">
      <span className={cn('recorder-float-dot', phase === 'recording' && 'is-live')} />
      <span className="recorder-float-time">{formatMs(elapsedMs)}</span>
      <span className="recorder-float-title">{title || '录音中'}</span>
      <div className="recorder-float-actions">
        {phase === 'saving' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : phase === 'paused' ? (
          <button type="button" className="recorder-float-btn" aria-label="继续" onClick={() => void resume()}>
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
        <button type="button" className="recorder-float-btn is-danger" aria-label="结束" onClick={() => void handleEnd()}>
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
