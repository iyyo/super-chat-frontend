import type { ReactNode } from 'react'
import { FileText, MessageSquare, PlaySquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BlockId = 'summary' | 'notes' | 'player' | 'chat'

export const BLOCK_LABELS: Record<BlockId, string> = {
  summary: '纪要',
  notes: '原文',
  player: '音视频',
  chat: 'Chat',
}

const WORKSPACE_VIEWS = [
  { id: 'summary', icon: Sparkles },
  { id: 'notes', icon: FileText },
  { id: 'player', icon: PlaySquare },
  { id: 'chat', icon: MessageSquare },
] as const

interface FileDetailWorkspaceProps {
  blocks: Record<BlockId, ReactNode>
  backControl: ReactNode
  activeView: BlockId
  onActiveViewChange: (view: BlockId) => void
}

export function FileDetailWorkspace({
  blocks,
  backControl,
  activeView,
  onActiveViewChange,
}: FileDetailWorkspaceProps) {
  return (
    <div className="file-detail-workspace-shell">
      <div className="file-detail-focus-toolbar">
        {backControl}
        <div className="file-detail-focus-bar" role="tablist" aria-label="详情视图">
          {WORKSPACE_VIEWS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`file-detail-tab-${id}`}
              className={cn('file-detail-focus-tab', activeView === id && 'is-active')}
              role="tab"
              aria-selected={activeView === id}
              aria-controls={`file-detail-panel-${id}`}
              onClick={() => onActiveViewChange(id)}
            >
              <Icon className="h-4 w-4" />
              {BLOCK_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="file-detail-page-inner file-detail-focus-layout">
        {(Object.keys(blocks) as BlockId[]).map((id) => (
          <div
            key={id}
            id={`file-detail-panel-${id}`}
            className={cn('file-detail-block', `is-${id}`)}
            role="tabpanel"
            aria-labelledby={`file-detail-tab-${id}`}
            hidden={activeView !== id}
          >
            {blocks[id]}
          </div>
        ))}
      </div>
    </div>
  )
}
