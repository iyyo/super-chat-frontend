import { create } from 'zustand'
import { streamRequest } from '@/lib/api/stream'
import { generateId } from '@/lib/utils'
import type {
  ChatHistoryMessage,
  ChatMessage,
  Conversation,
  SendMessagePayload,
} from '@/types/chat'

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
let activeStream: { conversationId: string; messageId: string } | null = null

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
      contextFileIds: [],
    }
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
    }))
    return id
  },

  sendMessage: async ({ conversationId, content, model, attachments }) => {
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
      attachments: attachments?.length ? attachments : undefined,
    }

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    }
    const existingConversation = state.conversations.find((item) => item.id === targetId)
    const history = buildRequestHistory(existingConversation)
    const fileIds = [
      ...new Set([
        ...(existingConversation?.contextFileIds ?? []),
        ...(attachments?.map((file) => file.id) ?? []),
      ]),
    ]

    set((s) => ({
      isStreaming: true,
      activeConversationId: targetId,
      conversations: upsertConversation(s.conversations, targetId!, userMessage, assistantMessage),
    }))

    const controller = new AbortController()
    abortController = controller
    activeStream = { conversationId: targetId, messageId: assistantMessage.id }

    try {
      await streamRequest(
        '/chat/stream',
        {
          conversationId: targetId,
          content,
          model,
          fileIds: fileIds.length ? fileIds : undefined,
          history: history.length ? history : undefined,
        },
        {
          signal: controller.signal,
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
            if (controller.signal.aborted) return
            abortController = null
            activeStream = null
            set((s) => ({
              isStreaming: false,
              conversations: finalizeMessage(s.conversations, targetId!, assistantMessage.id),
            }))
          },
          onError: () => {
            if (controller.signal.aborted) return
            abortController = null
            activeStream = null
            set((s) => ({
              isStreaming: false,
              conversations: markMessageError(s.conversations, targetId!, assistantMessage.id),
            }))
          },
        },
      )
    } catch {
      if (controller.signal.aborted) return
      abortController = null
      activeStream = null
      set((s) => ({
        isStreaming: false,
        conversations: markMessageError(s.conversations, targetId!, assistantMessage.id),
      }))
    }
  },

  abortStream: () => {
    abortController?.abort()
    abortController = null
    const stream = activeStream
    activeStream = null
    set((state) => ({
      isStreaming: false,
      conversations: stream
        ? stopMessage(state.conversations, stream.conversationId, stream.messageId)
        : state.conversations,
    }))
  },
}))

function buildRequestHistory(conversation?: Conversation): ChatHistoryMessage[] {
  if (!conversation) return []
  return conversation.messages
    .filter(
      (message): message is ChatMessage & { role: 'user' | 'assistant' } =>
        (message.role === 'user' || message.role === 'assistant') &&
        message.status === 'done' &&
        Boolean(message.content.trim()),
    )
    .slice(-12)
    .map(({ role, content }) => ({ role, content }))
}

function upsertConversation(
  conversations: Conversation[],
  id: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
): Conversation[] {
  const attachmentIds = userMessage.attachments?.map((f) => f.id) ?? []
  const existing = conversations.find((c) => c.id === id)
  if (existing) {
    const contextFileIds = [
      ...new Set([...(existing.contextFileIds ?? []), ...attachmentIds]),
    ]
    return conversations.map((c) =>
      c.id === id
        ? {
            ...c,
            title: c.messages.length === 0 ? userMessage.content.slice(0, 20) : c.title,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMessage, assistantMessage],
            contextFileIds,
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
      contextFileIds: attachmentIds,
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

function stopMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? {
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  status: 'stopped' as const,
                  content: message.content,
                }
              : message,
          ),
        }
      : conversation,
  )
}
