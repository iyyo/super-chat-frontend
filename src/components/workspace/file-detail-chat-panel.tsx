import { useMemo, useState } from 'react'
import { ArrowUpRight, FileText, MessageSquarePlus } from 'lucide-react'
import { ChatAvatar } from '@/components/chat/chat-avatar'
import { ChatList } from '@/components/chat/chat-list'
import { WorkspaceChatInput } from '@/components/workspace/workspace-chat-ui'
import { useChatStore } from '@/stores/chat-store'
import type { ChatAttachment } from '@/types/chat'

const DETAIL_CHAT_SUGGESTIONS = [
  '用三句话概括核心内容',
  '列出关键结论和对应依据',
  '整理可以直接执行的下一步',
] as const

interface FileDetailChatPanelProps {
  fileId: string
  title: string
  duration: string
}

export function FileDetailChatPanel({ fileId, title, duration }: FileDetailChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [session, setSession] = useState(0)
  const conversationId = `file-detail:${fileId}:${session}`
  const conversation = useChatStore((state) =>
    state.conversations.find((item) => item.id === conversationId),
  )
  const isStreaming = useChatStore((state) => state.isStreaming)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const abortStream = useChatStore((state) => state.abortStream)
  const messages = conversation?.messages ?? []
  const displayDuration = duration === '--:--' ? '' : duration
  const hasFileContext = conversation?.contextFileIds?.includes(fileId) ?? false
  const attachment = useMemo<ChatAttachment>(
    () => ({ id: fileId, title, duration: displayDuration }),
    [displayDuration, fileId, title],
  )

  const handleSend = (content = draft) => {
    const text = content.trim()
    if (!text || isStreaming) return
    void sendMessage({
      conversationId,
      content: text,
      attachments: hasFileContext ? undefined : [attachment],
    })
    setDraft('')
  }

  const handleNewChat = () => {
    if (isStreaming) abortStream()
    setDraft('')
    setSession((current) => current + 1)
  }

  return (
    <div className="file-detail-inline-chat">
      <header className="file-detail-inline-chat-head">
        <div className="file-detail-chat-context">
          <FileText className="h-4 w-4" />
          <div>
            <span>当前文件</span>
            <strong title={title}>{title}</strong>
          </div>
          {displayDuration ? <time>{displayDuration}</time> : null}
        </div>
        <button
          type="button"
          className="file-detail-chat-new"
          aria-label="新建对话"
          title="新建对话"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </header>

      <div className="file-detail-inline-chat-body">
        {messages.length > 0 ? (
          <ChatList
            messages={messages}
            className="file-detail-inline-chat-messages"
            variant="workspace"
            insertFileId={fileId}
          />
        ) : (
          <div className="file-detail-chat-empty">
            <ChatAvatar role="assistant" className="file-detail-chat-empty-avatar" />
            <h3>你想进一步确认什么？</h3>
            <div className="file-detail-chat-prompts">
              {DETAIL_CHAT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => handleSend(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="file-detail-inline-chat-foot">
        <WorkspaceChatInput
          value={draft}
          attachments={[attachment]}
          placeholder="问这份内容，例如：哪一段提到了预算？"
          onChange={setDraft}
          onSend={() => handleSend()}
          onAbort={abortStream}
          isStreaming={isStreaming}
        />
        <p>以上内容由人工智能生成，仅供参考</p>
      </footer>
    </div>
  )
}
