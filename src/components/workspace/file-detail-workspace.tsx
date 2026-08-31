import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  GitBranch,
  GraduationCap,
  MessageSquare,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type SummaryToolId =
  | 'mindmap'
  | 'essence'
  | 'chat'
  | 'learn'
  | 'outline'
  | 'practice'

export const SUMMARY_TOOL_LABELS: Record<SummaryToolId, string> = {
  mindmap: '思维导图',
  essence: '精华速览',
  chat: 'AI问答',
  learn: 'AI学习',
  outline: '文字大纲',
  practice: '练习',
}

const SUMMARY_TOOLS: Array<{
  id: SummaryToolId
  icon: typeof Sparkles
}> = [
  { id: 'essence', icon: Sparkles },
  { id: 'outline', icon: FileText },
  { id: 'mindmap', icon: GitBranch },
  { id: 'chat', icon: MessageSquare },
  { id: 'learn', icon: GraduationCap },
  { id: 'practice', icon: ClipboardList },
]

const LEFT_PCT_MIN = 28
const LEFT_PCT_MAX = 72
const LEFT_PCT_DEFAULT = 45
const LEFT_PX_MIN = 320
const RIGHT_PX_MIN = 300
/** 拖过阈值则吸附为「原文全屏」 */
const COLLAPSE_LEFT_PCT = 18

interface FileDetailWorkspaceProps {
  backControl: ReactNode
  headerMeta: ReactNode
  headerActions: ReactNode
  activeTool: SummaryToolId
  onActiveToolChange: (tool: SummaryToolId) => void
  leftContent: ReactNode
  rightContent: ReactNode
  templateHint?: string | null
  onOpenTemplateLibrary?: () => void
  /** 原文全屏（收起左栏） */
  rightFocus?: boolean
  onRightFocusChange?: (focus: boolean) => void
}

export function FileDetailWorkspace({
  backControl,
  headerMeta,
  headerActions,
  activeTool,
  onActiveToolChange,
  leftContent,
  rightContent,
  templateHint,
  onOpenTemplateLibrary,
  rightFocus = false,
  onRightFocusChange,
}: FileDetailWorkspaceProps) {
  const layoutRef = useRef<HTMLDivElement>(null)
  const [leftPct, setLeftPct] = useState(LEFT_PCT_DEFAULT)
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    if (!resizing || rightFocus) return

    const onMove = (event: PointerEvent) => {
      const layout = layoutRef.current
      if (!layout) return
      const rect = layout.getBoundingClientRect()
      if (rect.width <= 40) return

      const resizer = 10
      const usable = rect.width - resizer
      const leftPx = event.clientX - rect.left
      const pct = (leftPx / rect.width) * 100

      // 拖到很左 → 吸附收起左栏（合并到右侧原文）
      if (pct < COLLAPSE_LEFT_PCT || leftPx < 120) {
        onRightFocusChange?.(true)
        setResizing(false)
        return
      }

      const minPct = Math.max(LEFT_PCT_MIN, (LEFT_PX_MIN / usable) * 100)
      const maxPct = Math.min(LEFT_PCT_MAX, 100 - (RIGHT_PX_MIN / usable) * 100)
      if (minPct >= maxPct) {
        // 视口太窄：直接原文全屏，避免挤成细条
        onRightFocusChange?.(true)
        setResizing(false)
        return
      }
      setLeftPct(Math.min(maxPct, Math.max(minPct, pct)))
    }

    const onUp = () => setResizing(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    const prevCursor = document.body.style.cursor
    const prevUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevUserSelect
    }
  }, [resizing, rightFocus, onRightFocusChange])

  useEffect(() => {
    const root = layoutRef.current
    if (!root || rightFocus) return
    const active = root.querySelector<HTMLElement>(
      '.file-detail-tool-tab[aria-selected="true"]',
    )
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTool, leftPct, rightFocus])

  return (
    <div className="file-detail-workspace-shell file-detail-dual-shell">
      <header className="file-detail-dual-top">
        <div className="file-detail-dual-top-left">
          {backControl}
          {headerMeta}
        </div>
        <div className="file-detail-dual-top-actions">{headerActions}</div>
      </header>

      <div
        ref={layoutRef}
        className={cn(
          'file-detail-dual-layout',
          resizing && 'is-resizing',
          rightFocus && 'is-right-focus',
        )}
        style={{ ['--file-detail-left-pct' as string]: `${leftPct}%` }}
      >
        {!rightFocus ? (
          <>
            <section className="file-detail-panel file-detail-dual-left" aria-label="总结拓展">
              <header className="file-detail-dual-left-head">
                <div className="file-detail-dual-left-title">
                  <div className="file-detail-dual-left-heading">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    <h2>总结拓展</h2>
                  </div>
                  <button
                    type="button"
                    className="file-detail-tpl-chip"
                    title="更换总结模板"
                    onClick={onOpenTemplateLibrary}
                  >
                    <span>{templateHint ?? '默认模板'}</span>
                    <ChevronDown className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <nav className="file-detail-tool-tabs" role="tablist" aria-label="总结工具">
                  {SUMMARY_TOOLS.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeTool === id}
                      aria-label={SUMMARY_TOOL_LABELS[id]}
                      title={SUMMARY_TOOL_LABELS[id]}
                      className={cn('file-detail-tool-tab', activeTool === id && 'is-active')}
                      onClick={() => onActiveToolChange(id)}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <span className="file-detail-tool-tab-label">{SUMMARY_TOOL_LABELS[id]}</span>
                    </button>
                  ))}
                </nav>
              </header>
              <div className="file-detail-dual-left-body" role="tabpanel">
                {leftContent}
              </div>
            </section>

            <div
              className="file-detail-dual-resizer"
              role="separator"
              aria-orientation="vertical"
              aria-label="拖拽调整左右面板；拖到最左可收起总结栏"
              aria-valuemin={LEFT_PCT_MIN}
              aria-valuemax={LEFT_PCT_MAX}
              aria-valuenow={Math.round(leftPct)}
              tabIndex={0}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                setResizing(true)
              }}
              onDoubleClick={() => {
                setLeftPct(LEFT_PCT_DEFAULT)
                onRightFocusChange?.(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  setLeftPct((v) => Math.max(LEFT_PCT_MIN, v - 2))
                } else if (event.key === 'ArrowRight') {
                  event.preventDefault()
                  setLeftPct((v) => Math.min(LEFT_PCT_MAX, v + 2))
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  onRightFocusChange?.(true)
                }
              }}
            />
          </>
        ) : (
          <button
            type="button"
            className="file-detail-restore-left"
            onClick={() => onRightFocusChange?.(false)}
            title="展开总结拓展"
            aria-label="展开总结拓展"
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span>总结</span>
          </button>
        )}

        <section className="file-detail-panel file-detail-dual-right" aria-label="原文">
          {rightContent}
        </section>
      </div>
    </div>
  )
}
