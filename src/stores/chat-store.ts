import { create } from 'zustand'
import { streamRequest } from '@/lib/api/stream'
import { generateId } from '@/lib/utils'
import type { ChatMessage, Conversation, SendMessagePayload } from '@/types/chat'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  setActiveConversation: (id: string | null) => void
  createConversation: () => string
  sendMessage: (payload: SendMessagePayload) => Promise<void>
  abortStream: () => void
}

let abortController: AbortController | null = null

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  createConversation: () => {
    const id = generateId()
    const conversation: Conversation = {
      id,
      title: '新对话',
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
    }))
    return id
  },

  sendMessage: async ({ conversationId, content, model }) => {
    const state = get()
    let targetId = conversationId ?? state.activeConversationId

    if (!targetId) {
      targetId = get().createConversation()
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      status: 'done',
      createdAt: new Date().toISOString(),
    }

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    }

    set((s) => ({
      isStreaming: true,
      activeConversationId: targetId,
      conversations: upsertConversation(s.conversations, targetId!, userMessage, assistantMessage),
    }))

    abortController = new AbortController()

    try {
      await streamRequest(
        '/chat/stream',
        { conversationId: targetId, content, model },
        {
          signal: abortController.signal,
          onChunk: (chunk) => {
            if (!chunk.content) return
            set((s) => ({
              conversations: updateAssistantContent(
                s.conversations,
                targetId!,
                assistantMessage.id,
                chunk.content!,
              ),
            }))
          },
          onDone: () => {
            set((s) => ({
              isStreaming: false,
              conversations: finalizeMessage(s.conversations, targetId!, assistantMessage.id),
            }))
          },
          onError: () => {
            set((s) => ({
              isStreaming: false,
              conversations: markMessageError(s.conversations, targetId!, assistantMessage.id),
            }))
          },
        },
      )
    } catch {
      set((s) => ({
        isStreaming: false,
        conversations: markMessageError(s.conversations, targetId!, assistantMessage.id),
      }))
    }
  },

  abortStream: () => {
    abortController?.abort()
    abortController = null
    set({ isStreaming: false })
  },
}))

function upsertConversation(
  conversations: Conversation[],
  id: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
): Conversation[] {
  const existing = conversations.find((c) => c.id === id)
  if (existing) {
    return conversations.map((c) =>
      c.id === id
        ? {
            ...c,
            title: c.messages.length === 0 ? userMessage.content.slice(0, 20) : c.title,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMessage, assistantMessage],
          }
        : c,
    )
  }
  return [
    {
      id,
      title: userMessage.content.slice(0, 20),
      updatedAt: new Date().toISOString(),
      messages: [userMessage, assistantMessage],
    },
    ...conversations,
  ]
}

function updateAssistantContent(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  appendContent: string,
): Conversation[] {
  return conversations.map((c) =>
    c.id === conversationId
      ? {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, content: m.content + appendContent } : m,
          ),
        }
      : c,
  )
}

function finalizeMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
): Conversation[] {
  return conversations.map((c) =>
    c.id === conversationId
      ? {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, status: 'done' as const } : m,
          ),
        }
      : c,
  )
}

function markMessageError(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
): Conversation[] {
  return conversations.map((c) =>
    c.id === conversationId
      ? {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId
              ? { ...m, status: 'error' as const, content: m.content || '回复失败，请重试' }
              : m,
          ),
        }
      : c,
  )
}
