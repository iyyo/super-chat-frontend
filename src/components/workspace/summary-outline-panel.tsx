import { useState } from 'react'
import { Clock3, Download, Play } from 'lucide-react'
import { formatMs } from '@/lib/parse-transcript'
import type { SummaryChapter } from '@/lib/summary-chapters'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/stores/toast-store'

interface SummaryOutlinePanelProps {
  title?: string
  chapters: SummaryChapter[]
  onSeek?: (startMs: number) => void
}

export function SummaryOutlinePanel({ title = '文字大纲', chapters, onSeek }: SummaryOutlinePanelProps) {
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting || chapters.length === 0) return
    setExporting(true)
    try {
      const { exportOutlineMarkdown } = await import('@/lib/export/transcript-text')
      exportOutlineMarkdown({ title, chapters, includeTimestamps })
      toast.success(includeTimestamps ? '大纲已导出（含时间戳）' : '大纲已导出（无时间戳）')
    } catch {
      toast.error('大纲导出失败')
    } finally {
      setExporting(false)
    }
  }

  if (chapters.length === 0) {
    return (
      <EmptyState
        compact
        title="暂无文字大纲"
        description="纪要生成后会按章节展示大纲，可点击跳转播放"
      />
    )
  }

  return (
    <div className="summary-outline-panel">
      <div className="summary-outline-toolbar">
        <label className="summary-outline-ts-toggle">
          <input
            type="checkbox"
            checked={includeTimestamps}
            onChange={(e) => setIncludeTimestamps(e.target.checked)}
          />
          <span>导出含时间戳</span>
        </label>
        <button
          type="button"
          className="summary-outline-export"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="h-3.5 w-3.5" />
          导出 Markdown
        </button>
      </div>

      <ol className="summary-outline-list">
        {chapters.map((chapter, index) => (
          <li key={`${chapter.startMs}-${chapter.title}-${index}`}>
            <button
              type="button"
              className="summary-outline-item"
              onClick={() => onSeek?.(chapter.startMs)}
              disabled={!onSeek}
            >
              <span className="summary-outline-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="summary-outline-copy">
                <strong>{chapter.title}</strong>
                <span>{chapter.summary}</span>
              </span>
              <span className="summary-outline-meta">
                <Clock3 className="h-3.5 w-3.5" />
                {formatMs(chapter.startMs)}
                {onSeek ? <Play className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
