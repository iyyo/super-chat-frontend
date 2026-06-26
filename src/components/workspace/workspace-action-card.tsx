import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type WorkspaceActionId = 'record' | 'import' | 'subtitle'

interface WorkspaceActionCardProps {
  id: WorkspaceActionId
  title: string
  desc: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
}

function ActionCardVisual({ id, icon: Icon }: { id: WorkspaceActionId; icon: LucideIcon }) {
  return (
    <div className="workspace-action-visual" aria-hidden="true">
      {id === 'record' && (
        <div className="workspace-action-deco workspace-action-deco--waves">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {id === 'import' && (
        <div className="workspace-action-deco workspace-action-deco--files">
          <span />
          <span />
        </div>
      )}
      {id === 'subtitle' && (
        <div className="workspace-action-deco workspace-action-deco--lines">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="workspace-action-icon-shell">
        <Icon className="workspace-action-icon" strokeWidth={1.65} />
      </div>
    </div>
  )
}

function ActionCardContent({
  id,
  title,
  desc,
  icon,
}: Pick<WorkspaceActionCardProps, 'id' | 'title' | 'desc' | 'icon'>) {
  return (
    <div className="workspace-action-card-inner">
      <div className="workspace-action-copy">
        <h3 className="workspace-action-title">{title}</h3>
        <p className="workspace-action-desc">{desc}</p>
        <span className="workspace-action-cta">立即使用</span>
      </div>
      <ActionCardVisual id={id} icon={icon} />
    </div>
  )
}

export function WorkspaceActionCard({
  id,
  title,
  desc,
  icon,
  href,
  onClick,
}: WorkspaceActionCardProps) {
  const className = cn('workspace-action-card', `workspace-action-card--${id}`)

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <ActionCardContent id={id} title={title} desc={desc} icon={icon} />
      </button>
    )
  }

  return (
    <Link to={href ?? '#'} className={className}>
      <ActionCardContent id={id} title={title} desc={desc} icon={icon} />
    </Link>
  )
}
