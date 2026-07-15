import { useEffect, useRef } from 'react'
import { ChatMessage } from '@/components/chat/chat-message'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

import { cn } from '@/lib/utils'

interface ChatListProps {
  messages: ChatMessageType[]
  emptyHint?: string
  className?: string
  variant?: 'app' | 'workspace'
  insertFileId?: string | null
}

export function ChatList({
  messages,
  emptyHint = '开始一段新对话吧',
  className,
  variant = 'app',
  insertFileId,
}: ChatListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)
  const prevContentLenRef = useRef(0)

  const lastMessage = messages[messages.length - 1]
  const lastContentLen = lastMessage?.content.length ?? 0
  const isStreaming = lastMessage?.status === 'streaming'

  useEffect(() => {
    const container = containerRef.current
    if (!container || messages.length === 0) return

    const isNewMessage = messages.length !== prevLengthRef.current
    prevLengthRef.current = messages.length

    const contentGrew = lastContentLen !== prevContentLenRef.current
    prevContentLenRef.current = lastContentLen

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const stickToBottom = isNewMessage || distanceFromBottom < 120

    if (!stickToBottom) return
    if (!isNewMessage && isStreaming && !contentGrew) return

    container.scrollTop = container.scrollHeight
  }, [messages.length, lastContentLen, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-muted">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        variant === 'workspace'
          ? 'workspace-chat-thread'
          : 'flex flex-1 flex-col overflow-y-auto py-4',
        className,
      )}
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          variant={variant}
          insertFileId={insertFileId}
        />
      ))}
    </div>
  )
}
