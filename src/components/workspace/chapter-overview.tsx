import { Clock3, Play } from 'lucide-react'
import { formatMs } from '@/lib/parse-transcript'
import type { SummaryChapter } from '@/lib/summary-chapters'

interface ChapterOverviewProps {
  chapters: SummaryChapter[]
  onSeek?: (startMs: number) => void
}

export function ChapterOverview({ chapters, onSeek }: ChapterOverviewProps) {
  if (chapters.length === 0) return null

  return (
    <section id="summary-chapters" className="file-detail-summary-section chapter-overview">
      <div className="chapter-overview-heading">
        <div className="summary-section-heading">
          <span>章节</span>
          <h3>章节路线</h3>
        </div>
        <span>{chapters.length} 个章节</span>
      </div>
      <ol className="chapter-overview-list">
        {chapters.map((chapter, index) => (
          <li key={`${chapter.startMs}-${chapter.title}`}>
            <button type="button" onClick={() => onSeek?.(chapter.startMs)} disabled={!onSeek}>
              <span className="chapter-overview-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="chapter-overview-time">
                <Clock3 className="h-3.5 w-3.5" />
                {formatMs(chapter.startMs)}
              </span>
              <span className="chapter-overview-copy">
                <strong>{chapter.title}</strong>
                <span>{chapter.summary}</span>
              </span>
              {onSeek ? <Play className="chapter-overview-play h-4 w-4" /> : null}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
