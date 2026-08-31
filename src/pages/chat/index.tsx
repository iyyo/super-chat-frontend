import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ChatAvatar } from '@/components/chat/chat-avatar'
import { ChatList } from '@/components/chat/chat-list'
import { SelectFileModal } from '@/components/workspace/select-file-modal'
import {
  WorkspaceChatHeader,
  WorkspaceChatInput,
} from '@/components/workspace/workspace-chat-ui'
import { LlmProviderPicker } from '@/components/workspace/llm-provider-picker'
import {
  ROUTES,
  WORKSPACE_CHAT_AI_NOTE,
  WORKSPACE_CHAT_GREETING,
  WORKSPACE_CHAT_SUBTITLE,
  WORKSPACE_CHAT_SUGGESTIONS,
} from '@/lib/constants'
import type { WorkspaceFileDto } from '@/lib/api/files'
import type { ChatLaunchState } from '@/lib/import-chat'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'
import type { ChatAttachment } from '@/types/chat'

type FilePickerMode = 'suggestion' | 'attach'

function toAttachments(files: WorkspaceFileDto[]): ChatAttachment[] {
  return files.map((file) => ({
    id: file.id,
    title: file.title,
    duration: file.duration,
  }))
}

export function ChatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [draft, setDraft] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<ChatAttachment[]>([])
  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [filePickerMode, setFilePickerMode] = useState<FilePickerMode>('attach')
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null)
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

  useEffect(() => {
    const state = location.state as ChatLaunchState | null
    if (!state?.attachments?.length) return
    setDraftAttachments(state.attachments)
    if (state.draft) setDraft(state.draft)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const activeConversation = conversations.find(
    (c) => c.id === (conversationId ?? activeConversationId),
  )
  const messages = activeConversation?.messages ?? []
  const isEmpty = messages.length === 0
  const insertFileId =
    activeConversation?.contextFileIds?.length === 1
      ? activeConversation.contextFileIds[0]
      : null

  const closeFilePicker = () => {
    setFilePickerOpen(false)
    if (filePickerMode === 'suggestion') setPendingSuggestion(null)
  }

  const handleSend = (content?: string) => {
    const text = (content ?? draft).trim()
    if (!text || isStreaming) return
    void sendMessage({
      conversationId: activeConversation?.id,
      content: text,
      attachments: draftAttachments.length ? draftAttachments : undefined,
    })
    setDraft('')
    setDraftAttachments([])
  }

  const handleNewChat = () => {
    const id = createConversation()
    navigate(`${ROUTES.chat}/${id}`)
  }

  const handleSuggestion = (text: string) => {
    setPendingSuggestion(text)
    setFilePickerMode('suggestion')
    setFilePickerOpen(true)
  }

  const handleAttachClick = () => {
    setPendingSuggestion(null)
    setFilePickerMode('attach')
    setFilePickerOpen(true)
  }

  const handleFileConfirm = (files: WorkspaceFileDto[]) => {
    const attachments = toAttachments(files)
    setFilePickerOpen(false)

    if (filePickerMode === 'suggestion' && pendingSuggestion) {
      void sendMessage({
        conversationId: activeConversation?.id,
        content: pendingSuggestion,
        attachments,
      })
      setPendingSuggestion(null)
      setDraft('')
      setDraftAttachments([])
      return
    }

    setDraftAttachments(attachments)
  }

  return (
    <div className="workspace-chat">
      <WorkspaceChatHeader onNewChat={handleNewChat} showIme={isEmpty} />

      <div className={cn('workspace-chat-body', isEmpty && 'is-empty', !isEmpty && 'has-messages')}>
        {isEmpty ? (
          <>
            <div className="workspace-chat-welcome-bg" aria-hidden="true" />
            <div className="workspace-chat-welcome">
              <ChatAvatar role="assistant" className="workspace-chat-welcome-avatar" />
              <p className="workspace-chat-greeting">{WORKSPACE_CHAT_GREETING}</p>
              <p className="workspace-chat-subtitle">{WORKSPACE_CHAT_SUBTITLE}</p>
            </div>
          </>
        ) : (
          <ChatList
            messages={messages}
            className="workspace-chat-messages"
            variant="workspace"
            insertFileId={insertFileId}
          />
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

        <LlmProviderPicker disabled={isStreaming} className="workspace-chat-llm-picker" />
        <WorkspaceChatInput
          value={draft}
          attachments={draftAttachments}
          onChange={setDraft}
          onSend={() => handleSend()}
          onAbort={abortStream}
          onAttachClick={handleAttachClick}
          onRemoveAttachment={(id) =>
            setDraftAttachments((prev) => prev.filter((file) => file.id !== id))
          }
          isStreaming={isStreaming}
        />

        <p className="workspace-chat-note">{WORKSPACE_CHAT_AI_NOTE}</p>
      </div>

      <SelectFileModal
        open={filePickerOpen}
        onClose={closeFilePicker}
        onConfirm={handleFileConfirm}
        initialSelectedIds={
          filePickerMode === 'attach'
            ? draftAttachments.map((f) => f.id)
            : []
        }
      />
    </div>
  )
}
