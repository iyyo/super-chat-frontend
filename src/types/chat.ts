export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error' | 'stopped'

export interface ChatAttachment {
  id: string
  title: string
  duration: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: string
  attachments?: ChatAttachment[]
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
  /** 对话关联的文件 ID（来自附件），用于插入全文总结 */
  contextFileIds?: string[]
}

export interface SendMessagePayload {
  conversationId?: string
  content: string
  provider?: string
  model?: string
  attachments?: ChatAttachment[]
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  content?: string
  done?: boolean
  error?: string
}
