import { AlertCircle, Bot, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  variant?: 'app' | 'workspace'
}

function WorkspaceChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'

  return (
    <div
      className={cn(
        'workspace-msg',
        isUser ? 'workspace-msg--user' : 'workspace-msg--assistant',
      )}
    >
      <div className="workspace-msg-avatar" aria-hidden="true">
        {isUser ? <User className="h-4 w-4" strokeWidth={1.75} /> : <Bot className="h-4 w-4" strokeWidth={1.75} />}
      </div>

      <div className={cn('workspace-msg-bubble', isError && 'is-error')}>
        {isError && (
          <span className="workspace-msg-error-label">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
            回复失败
          </span>
        )}
        <p className="workspace-msg-text">
          {message.content || (isStreaming ? '正在思考…' : '')}
          {isStreaming && message.content && (
            <span className="workspace-msg-cursor" aria-hidden="true" />
          )}
        </p>
      </div>
    </div>
  )
}

export function ChatMessage({ message, variant = 'app' }: ChatMessageProps) {
  if (variant === 'workspace') {
    return <WorkspaceChatMessage message={message} />
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary/20 text-accent' : 'bg-surface-hover text-muted',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground',
          message.status === 'error' && 'border border-red-500/30 text-red-300',
        )}
      >
        {message.content || (message.status === 'streaming' ? '...' : '')}
        {message.status === 'streaming' && message.content && (
          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-accent" />
        )}
      </div>
    </div>
  )
}
