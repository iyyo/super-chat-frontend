import { useMemo } from 'react'
import { FileText, Star } from 'lucide-react'
import type { WorkspaceFileDto } from '@/lib/api/files'
import { FileSummaryPreview } from './file-summary-preview'

interface FileTimelineProps {
  files: WorkspaceFileDto[]
  onOpen: (file: WorkspaceFileDto) => void
}

interface TimelineGroup {
  key: string
  label: string
  items: Array<{ file: WorkspaceFileDto; time: string }>
}

function parseDate(value: string) {
  const match = value.trim().match(/^(?:(\d{4})-)?(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?$/)
  if (!match) return { key: value, label: value, time: '' }

  const [, year, month, day, time = ''] = match
  return {
    key: `${year ?? ''}-${month}-${day}`,
    label: `${year ? `${year}年` : ''}${month}月${day}日`,
    time,
  }
}

function groupByDay(files: WorkspaceFileDto[]): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>()
  for (const file of files) {
    const parsed = parseDate(file.date)
    const group = groups.get(parsed.key) ?? { key: parsed.key, label: parsed.label, items: [] }
    group.items.push({ file, time: parsed.time })
    groups.set(parsed.key, group)
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => {
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(':').map(Number)
        return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1
      }
      return toMinutes(b.time) - toMinutes(a.time)
    }),
  }))
}

export function FileTimeline({ files, onOpen }: FileTimelineProps) {
  const groups = useMemo(() => groupByDay(files), [files])

  return (
    <div className="files-timeline" aria-label="按时间排列的文件">
      <div className="files-timeline-axis" aria-hidden="true" />
      {groups.map((group) => (
        <section className="files-timeline-day" key={group.key}>
          <div className="files-timeline-date">
            <strong>{group.label}</strong>
            <span>{group.items.length} 条记录</span>
          </div>
          <ol className="files-timeline-events">
            {group.items.map(({ file, time }) => (
              <li className="files-timeline-event" key={file.id}>
                <time className="files-timeline-time">{time}</time>
                <button
                  type="button"
                  className="files-timeline-card"
                  aria-label={`打开 ${file.title}`}
                  onClick={() => onOpen(file)}
                >
                  <span className="files-timeline-card-head">
                    <span className="files-timeline-icon" aria-hidden="true">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="files-timeline-title-wrap">
                      <span className="files-timeline-title">
                        {file.starred && (
                          <Star className="files-item-star" fill="currentColor" aria-hidden />
                        )}
                        {file.title}
                      </span>
                      <FileSummaryPreview
                        className="files-timeline-preview"
                        subtitle={file.subtitle}
                        summaryPreview={file.summaryPreview}
                        summaryStatus={file.summaryStatus}
                      />
                    </span>
                  </span>
                  <span className="files-timeline-meta">
                    <span>{file.source || '文件'}</span>
                    {file.duration && <span>{file.duration}</span>}
                    {file.wordCount > 0 && <span>{file.wordCount} 字</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
