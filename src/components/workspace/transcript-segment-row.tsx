import { useEffect, useRef } from 'react'
import type { EditableSegment } from '@/lib/file-editor'
import { hasSegmentText, segmentFromPlainText, segmentPlainText } from '@/lib/file-editor'
import { getSpeakerColor } from '@/lib/speaker-colors'
import { formatMs } from '@/lib/parse-transcript'
import { cn } from '@/lib/utils'

interface TranscriptSegmentRowProps {
  segment: EditableSegment
  colorIndex: number
  active: boolean
  onActivate: () => void
  onDeactivate: () => void
  onUpdate: (patch: Partial<EditableSegment>) => void
}

export function TranscriptSegmentRow({
  segment,
  colorIndex,
  active,
  onActivate,
  onDeactivate,
  onUpdate,
}: TranscriptSegmentRowProps) {
  const rowRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onDeactivateRef = useRef(onDeactivate)
  const color = getSpeakerColor(colorIndex)
  const plainText = segmentPlainText(segment.html)

  useEffect(() => {
    onDeactivateRef.current = onDeactivate
  }, [onDeactivate])

  useEffect(() => {
    if (!active) return
    textareaRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDeactivateRef.current()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (rowRef.current?.contains(e.target as Node)) return
      onDeactivateRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [active])

  const handleRowClick = () => {
    if (!active) onActivate()
  }

  return (
    <article
      ref={rowRef}
      className={cn('file-detail-utterance', active && 'is-editing')}
      onClick={handleRowClick}
    >
      <header className="file-detail-utterance-head">
        {active ? (
          <input
            type="text"
            className="file-detail-speaker-input"
            style={{ color: color.fg }}
            value={segment.speaker}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate({ speaker: e.target.value })}
            aria-label="说话人"
          />
        ) : (
          <span
            className="file-detail-speaker-badge"
            style={{ color: color.fg, backgroundColor: color.bg }}
          >
            {segment.speaker}
          </span>
        )}
        <button
          type="button"
          className="file-detail-time-btn"
          onClick={(e) => {
            e.stopPropagation()
            onActivate()
          }}
        >
          {formatMs(segment.beginMs)}
        </button>
      </header>

      {active ? (
        <textarea
          ref={textareaRef}
          className="file-detail-segment-textarea"
          value={plainText}
          rows={Math.max(2, plainText.split('\n').length)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate({ html: segmentFromPlainText(e.target.value) })}
          placeholder="在此编辑转写内容…"
          aria-label="转写内容"
        />
      ) : (
        <div
          className={cn(
            'file-detail-utterance-preview',
            !hasSegmentText(segment.html) && 'is-empty',
          )}
        >
          {hasSegmentText(segment.html) ? (
            <p className="file-detail-utterance-text">{plainText}</p>
          ) : (
            <p className="file-detail-utterance-placeholder">点击编辑转写内容…</p>
          )}
        </div>
      )}
    </article>
  )
}
