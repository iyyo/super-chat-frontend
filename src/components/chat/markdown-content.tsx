import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

/** 去掉流式输出开头多余空行，避免气泡顶部大块空白 */
function normalizeStreamingContent(content: string): string {
  return content.replace(/^\n+/, '')
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const normalized = normalizeStreamingContent(content)
  if (!normalized) return null

  return (
    <div className={cn('workspace-msg-markdown', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  )
}
