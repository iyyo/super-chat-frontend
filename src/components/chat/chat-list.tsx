import { useEffect, useRef } from 'react'
import { ChatMessage } from '@/components/chat/chat-message'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

import { cn } from '@/lib/utils'

interface ChatListProps {
  messages: ChatMessageType[]
  emptyHint?: string
  className?: string
  variant?: 'app' | 'workspace'
}

export function ChatList({
  messages,
  emptyHint = '开始一段新对话吧',
  className,
  variant = 'app',
}: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-muted">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        variant === 'workspace'
          ? 'workspace-chat-thread'
          : 'flex flex-1 flex-col overflow-y-auto py-4',
        className,
      )}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} variant={variant} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
