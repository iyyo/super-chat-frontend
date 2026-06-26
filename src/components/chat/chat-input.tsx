import { Send, Square } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  onAbort?: () => void
  isStreaming?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({
  onSend,
  onAbort,
  isStreaming = false,
  placeholder = '输入你的问题...',
  className,
}: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-end gap-2 border-t border-border bg-background p-4',
        className,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={isStreaming}
        className={cn(
          'max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-border bg-surface',
          'px-4 py-2.5 text-sm text-foreground placeholder:text-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          'disabled:opacity-50',
        )}
      />

      {isStreaming ? (
        <Button type="button" variant="secondary" size="icon" onClick={onAbort} aria-label="停止生成">
          <Square className="h-4 w-4 fill-current" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!value.trim()} aria-label="发送">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  )
}
