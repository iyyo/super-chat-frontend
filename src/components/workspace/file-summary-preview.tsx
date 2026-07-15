import type { SummaryStatus } from '@/lib/structured-summary-document'
import { cn } from '@/lib/utils'

interface FileSummaryPreviewProps {
  subtitle?: string | null
  summaryPreview?: string[] | null
  summaryStatus?: SummaryStatus
  className?: string
}

export function FileSummaryPreview({
  subtitle,
  summaryPreview,
  summaryStatus,
  className,
}: FileSummaryPreviewProps) {
  if (summaryStatus === 'generating') {
    return <p className={cn('workspace-recent-subtitle is-generating', className)}>AI 纪要生成中…</p>
  }

  const bullets = summaryPreview?.filter(Boolean) ?? []
  if (bullets.length > 0) {
    return (
      <ul className={cn('workspace-recent-preview', className)}>
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    )
  }

  if (subtitle) {
    return <p className={cn('workspace-recent-subtitle', className)}>{subtitle}</p>
  }

  return null
}
