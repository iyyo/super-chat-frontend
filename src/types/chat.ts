export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface SendMessagePayload {
  conversationId?: string
  content: string
  model?: string
}

export interface StreamChunk {
  content?: string
  done?: boolean
  error?: string
}
