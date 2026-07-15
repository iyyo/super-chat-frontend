import { AlertCircle, FileInput, Square } from 'lucide-react'
import { useState } from 'react'
import { ChatAvatar } from '@/components/chat/chat-avatar'
import { ChatStreamCursor } from '@/components/chat/chat-stream-cursor'
import { ChatThinkingIndicator } from '@/components/chat/chat-thinking'
import { MarkdownContent } from '@/components/chat/markdown-content'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { cn } from '@/lib/utils'
import { insertChatSummaryToFile } from '@/lib/insert-chat-summary'
import { useSummarySyncStore } from '@/stores/summary-sync-store'
import { toast } from '@/stores/toast-store'

interface ChatMessageProps {
  message: ChatMessageType
  variant?: 'app' | 'workspace'
  insertFileId?: string | null
}

function WorkspaceChatMessage({
  message,
  insertFileId,
}: {
  message: ChatMessageType
  insertFileId?: string | null
}) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStopped = message.status === 'stopped'
  const isStreaming = message.status === 'streaming'
  const canInsert =
    !isUser && message.status === 'done' && !!message.content.trim() && !!insertFileId
  const [inserting, setInserting] = useState(false)
  const notifyInserted = useSummarySyncStore((s) => s.notifyInserted)

  const handleInsert = async () => {
    if (!insertFileId || !message.content.trim() || inserting) return
    setInserting(true)
    try {
      await insertChatSummaryToFile(insertFileId, message.content)
      notifyInserted(insertFileId)
      toast.success('已插入到全文总结')
    } catch {
      toast.error('插入失败，请稍后重试')
    } finally {
      setInserting(false)
    }
  }

  return (
    <div
      className={cn(
        'workspace-msg',
        isUser ? 'workspace-msg--user' : 'workspace-msg--assistant',
      )}
    >
      <ChatAvatar role={isUser ? 'user' : 'assistant'} active={isStreaming} />

      <div className={cn('workspace-msg-bubble', isError && 'is-error')}>
        {isError && (
          <span className="workspace-msg-error-label">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
            回复失败
          </span>
        )}
        {isStopped && (
          <span className="workspace-msg-stopped-label">
            <Square className="h-3 w-3 fill-current" />
            已停止
          </span>
        )}
        {message.content ? (
          <div className="workspace-msg-text">
            <MarkdownContent content={message.content} />
            {isStreaming && <ChatStreamCursor />}
          </div>
        ) : isStreaming ? (
          <ChatThinkingIndicator />
        ) : null}
        {message.attachments && message.attachments.length > 0 && (
          <div className="workspace-msg-attachments">
            {message.attachments.map((file) => (
              <span key={file.id} className="workspace-msg-attachment">
                {file.title}
              </span>
            ))}
          </div>
        )}
        {canInsert && (
          <div className="workspace-msg-actions">
            <button
              type="button"
              className="workspace-msg-insert-btn"
              disabled={inserting}
              onClick={() => void handleInsert()}
            >
              <FileInput className="h-3.5 w-3.5" />
              {inserting ? '插入中…' : '插入全文总结'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatMessage({ message, variant = 'app', insertFileId }: ChatMessageProps) {
  if (variant === 'workspace') {
    return <WorkspaceChatMessage message={message} insertFileId={insertFileId} />
  }

  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <ChatAvatar role={isUser ? 'user' : 'assistant'} active={isStreaming} className="workspace-msg-avatar--compact" />

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground',
          message.status === 'error' && 'border border-red-500/30 text-red-300',
        )}
      >
        {message.content ? (
          <div className="flex items-end gap-0.5">
            <MarkdownContent content={message.content} />
            {isStreaming && <ChatStreamCursor />}
          </div>
        ) : isStreaming ? (
          <ChatThinkingIndicator />
        ) : null}
      </div>
    </div>
  )
}
