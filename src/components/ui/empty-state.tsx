import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
  icon?: LucideIcon
  compact?: boolean
  className?: string
}
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('app-empty-state', compact && 'app-empty-state--compact', className)}
      role="status"
      aria-live="polite"
    >
      <span className="app-empty-state__visual" aria-hidden="true">
        <Icon />
      </span>
      <h3 className="app-empty-state__title">{title}</h3>
      {description ? <p className="app-empty-state__description">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="app-empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
