import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { ChatList } from '@/components/chat/chat-list'
import {
  WorkspaceChatHeader,
  WorkspaceChatInput,
} from '@/components/workspace/workspace-chat-ui'
import {
  ROUTES,
  WORKSPACE_CHAT_AI_NOTE,
  WORKSPACE_CHAT_GREETING,
  WORKSPACE_CHAT_SUBTITLE,
  WORKSPACE_CHAT_SUGGESTIONS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'

export function ChatPage() {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [draft, setDraft] = useState('')
  const {
    conversations,
    activeConversationId,
    isStreaming,
    setActiveConversation,
    createConversation,
    sendMessage,
    abortStream,
  } = useChatStore()

  useEffect(() => {
    setActiveConversation(conversationId ?? null)
  }, [conversationId, setActiveConversation])

  const activeConversation = conversations.find(
    (c) => c.id === (conversationId ?? activeConversationId),
  )
  const messages = activeConversation?.messages ?? []
  const isEmpty = messages.length === 0

  const handleSend = (content?: string) => {
    const text = (content ?? draft).trim()
    if (!text || isStreaming) return
    void sendMessage({ conversationId: activeConversation?.id, content: text })
    setDraft('')
  }

  const handleNewChat = () => {
    const id = createConversation()
    navigate(`${ROUTES.chat}/${id}`)
  }

  const handleSuggestion = (text: string) => {
    setDraft(text)
  }

  return (
    <div className="workspace-chat">
      <WorkspaceChatHeader onNewChat={handleNewChat} showIme={isEmpty} />

      <div className={cn('workspace-chat-body', isEmpty && 'is-empty', !isEmpty && 'has-messages')}>
        {isEmpty ? (
          <>
            <div className="workspace-chat-welcome-bg" aria-hidden="true" />
            <div className="workspace-chat-welcome">
              <span className="workspace-chat-bot" aria-hidden="true">
                <Bot className="workspace-chat-bot-icon" strokeWidth={1.5} />
              </span>
              <p className="workspace-chat-greeting">{WORKSPACE_CHAT_GREETING}</p>
              <p className="workspace-chat-subtitle">{WORKSPACE_CHAT_SUBTITLE}</p>
            </div>
          </>
        ) : (
          <ChatList messages={messages} className="workspace-chat-messages" variant="workspace" />
        )}
      </div>

      <div className={cn('workspace-chat-footer', !isEmpty && 'has-messages')}>
        {isEmpty && (
          <div className="workspace-chat-suggestions">
            {WORKSPACE_CHAT_SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                className="workspace-chat-suggestion"
                onClick={() => handleSuggestion(text)}
              >
                <span>{text}</span>
                <span className="workspace-chat-suggestion-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        <WorkspaceChatInput
          value={draft}
          onChange={setDraft}
          onSend={() => handleSend()}
          onAbort={abortStream}
          isStreaming={isStreaming}
        />

        <p className="workspace-chat-note">{WORKSPACE_CHAT_AI_NOTE}</p>
      </div>
    </div>
  )
}
