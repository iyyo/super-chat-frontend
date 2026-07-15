import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { fileToAttachment, defaultImportChatDraft, type ChatLaunchState } from '@/lib/import-chat'
import type { WorkspaceFileDto } from '@/lib/api/files'
import { ROUTES } from '@/lib/constants'
import type { SummaryStatus } from '@/lib/structured-summary-document'
import { cn } from '@/lib/utils'

interface RecordingEndPreviewProps {
  file: WorkspaceFileDto
  summaryPreview: string[]
  summaryStatus?: SummaryStatus
  className?: string
}

export function RecordingEndPreview({
  file,
  summaryPreview,
  summaryStatus,
  className,
}: RecordingEndPreviewProps) {
  const bullets = summaryPreview.filter(Boolean).slice(0, 3)
  const chatState: ChatLaunchState = {
    attachments: [fileToAttachment(file)],
    draft: defaultImportChatDraft(),
  }

  return (
    <div className={cn('recording-end-preview', className)}>
      <p className="recording-end-preview-title">{file.title}</p>
      {summaryStatus === 'generating' && bullets.length === 0 ? (
        <p className="recording-end-preview-hint">完整纪要生成中，可先查看转写…</p>
      ) : null}
      {bullets.length > 0 ? (
        <ul className="recording-end-preview-list">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="recording-end-preview-actions">
        <Link to={ROUTES.fileDetail(file.id)} className="recording-end-preview-link">
          查看文件详情
        </Link>
        <Link to={ROUTES.chat} state={chatState} className="recording-end-preview-chat">
          <MessageSquare className="h-4 w-4" />
          去 Chat 追问
        </Link>
      </div>
    </div>
  )
}
