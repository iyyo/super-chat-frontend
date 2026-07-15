import {
  FolderOpen,
  History,
  Keyboard,
  MessageSquarePlus,
  Mic,
  Send,
  Square,
  X,
} from 'lucide-react'
import { type FormEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/types/chat'

interface WorkspaceChatInputProps {
  value: string
  attachments?: ChatAttachment[]
  onChange: (value: string) => void
  onSend: () => void
  onAbort?: () => void
  onAttachClick?: () => void
  onRemoveAttachment?: (id: string) => void
  isStreaming?: boolean
  placeholder?: string
}

export function WorkspaceChatInput({
  value,
  attachments = [],
  onChange,
  onSend,
  onAbort,
  onAttachClick,
  onRemoveAttachment,
  isStreaming = false,
  placeholder = '直接发送消息或者添加更多文件',
}: WorkspaceChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <form className="workspace-chat-input-wrap" onSubmit={handleSubmit}>
      {attachments.length > 0 && (
        <div className="workspace-chat-attachments">
          {attachments.map((file) => (
            <span key={file.id} className="workspace-chat-attachment-chip">
              <span className="workspace-chat-attachment-title">{file.title}</span>
              <span className="workspace-chat-attachment-meta">{file.duration}</span>
              {onRemoveAttachment && (
                <button
                  type="button"
                  className="workspace-chat-attachment-remove"
                  aria-label={`移除 ${file.title}`}
                  onClick={() => onRemoveAttachment(file.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="workspace-chat-input-box">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="workspace-chat-input-field"
        />
        <div className="workspace-chat-input-actions">
          {onAttachClick ? (
            <button
              type="button"
              className="workspace-chat-input-attach"
              aria-label="添加文件"
              onClick={onAttachClick}
            >
              <FolderOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          ) : null}
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
