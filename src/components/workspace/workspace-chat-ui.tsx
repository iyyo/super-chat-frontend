import {
  FolderOpen,
  History,
  Keyboard,
  MessageSquarePlus,
  Mic,
  Send,
  Square,
} from 'lucide-react'
import { type FormEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface WorkspaceChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAbort?: () => void
  isStreaming?: boolean
}

export function WorkspaceChatInput({
  value,
  onChange,
  onSend,
  onAbort,
  isStreaming = false,
}: WorkspaceChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <form className="workspace-chat-input-wrap" onSubmit={handleSubmit}>
      <div className="workspace-chat-input-box">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="直接发送消息或者添加更多文件"
          rows={1}
          disabled={isStreaming}
          className="workspace-chat-input-field"
        />
        <div className="workspace-chat-input-actions">
          <button type="button" className="workspace-chat-input-attach" aria-label="添加文件">
            <FolderOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          {isStreaming ? (
            <button
              type="button"
              className="workspace-chat-input-send is-ready"
              onClick={onAbort}
              aria-label="停止生成"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              className={cn('workspace-chat-input-send', value.trim() && 'is-ready')}
              disabled={!value.trim()}
              aria-label="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

interface WorkspaceChatHeaderProps {
  onNewChat: () => void
  showIme?: boolean
}

export function WorkspaceChatHeader({ onNewChat, showIme = true }: WorkspaceChatHeaderProps) {
  return (
    <>
      <header className="workspace-chat-header">
        <div className="workspace-chat-header-actions">
          <button type="button" className="workspace-chat-icon-btn" onClick={onNewChat} aria-label="新建对话">
            <MessageSquarePlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button type="button" className="workspace-chat-icon-btn" aria-label="历史记录">
            <History className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {showIme && (
        <div className="workspace-chat-ime-wrap" aria-hidden="true">
        <div className="workspace-chat-ime">
          <span className="workspace-chat-ime-logo">S</span>
          <span className="workspace-chat-ime-item">中</span>
          <Mic className="workspace-chat-ime-icon" strokeWidth={1.75} />
          <Keyboard className="workspace-chat-ime-icon" strokeWidth={1.75} />
          <span className="workspace-chat-ime-item workspace-chat-ime-doc">文</span>
          <span className="workspace-chat-ime-ai">Ai</span>
        </div>
      </div>
      )}
    </>
  )
}
