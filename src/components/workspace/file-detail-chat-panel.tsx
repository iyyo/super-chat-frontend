import { useMemo, useState } from 'react'
import { ArrowUpRight, MessageSquarePlus } from 'lucide-react'
import { ChatList } from '@/components/chat/chat-list'
import { WorkspaceChatInput } from '@/components/workspace/workspace-chat-ui'
import { LlmProviderPicker } from '@/components/workspace/llm-provider-picker'
import { useChatStore } from '@/stores/chat-store'
import type { ChatAttachment } from '@/types/chat'

const DETAIL_CHAT_SUGGESTIONS = [
  { label: '三句话概括', prompt: '用三句话概括这份内容的核心要点' },
  { label: '结论与依据', prompt: '列出关键结论，并指出各自依据来自哪一段' },
  { label: '易错点提醒', prompt: '这份内容里有哪些容易混淆或做错的点？' },
  { label: '复习清单', prompt: '帮我整理一份可直接复习的要点清单' },
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
    <div className="fd-chat">
      <div className="fd-chat-bar">
        <p className="fd-chat-bar-hint" title={title}>
          结合转写与纪要回答
        </p>
        <button
          type="button"
          className="fd-chat-new"
          aria-label="新建对话"
          title="新建对话"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          新对话
        </button>
      </div>

      <div className="fd-chat-body">
        {messages.length > 0 ? (
          <ChatList
            messages={messages}
            className="fd-chat-messages"
            variant="workspace"
            insertFileId={fileId}
            hideAttachments
          />
        ) : (
          <div className="fd-chat-empty">
            <p className="fd-chat-empty-title">从下面选一个，或直接输入问题</p>
            <div className="fd-chat-suggestions" role="list">
              {DETAIL_CHAT_SUGGESTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="listitem"
                  className="fd-chat-suggestion"
                  disabled={isStreaming}
                  onClick={() => handleSend(item.prompt)}
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="fd-chat-foot">
        <LlmProviderPicker disabled={isStreaming} className="fd-chat-llm-picker" />
        <WorkspaceChatInput
          value={draft}
          placeholder="例如：最短路径和最小生成树有什么区别？"
          onChange={setDraft}
          onSend={() => handleSend()}
          onAbort={abortStream}
          isStreaming={isStreaming}
        />
        <p className="fd-chat-disclaimer">内容由 AI 生成，仅供参考</p>
      </footer>
    </div>
  )
}
