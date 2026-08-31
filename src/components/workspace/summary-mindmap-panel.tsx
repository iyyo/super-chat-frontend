import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Focus,
  GitMerge,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import type { SummaryChapter } from '@/lib/summary-chapters'
import {
  buildMindmapGraph,
  findMergeDropTarget,
  mergeMindmapNodes,
  nodeRadius,
  stepForce,
  type MindmapGraph,
  type MindmapGraphLink,
  type MindmapGraphNode,
  type MindmapNodeKind,
} from '@/lib/summary-mindmap-graph'
import { EmptyState } from '@/components/ui/empty-state'
import { MindmapMergeTitleModal } from '@/components/workspace/mindmap-merge-title-modal'
import { cn } from '@/lib/utils'

interface SummaryMindmapPanelProps {
  title: string
  chapters: SummaryChapter[]
  bullets?: string[]
  onSeek?: (startMs: number) => void
}

type NodeMeta = {
  id: string
  label: string
  kind: MindmapNodeKind
  startMs?: number
}

const VIEW_W = 720
const VIEW_H = 480

function cloneGraph(seed: MindmapGraph): MindmapGraph {
  return {
    nodes: seed.nodes.map((n) => ({ ...n })),
    links: seed.links.map((l) => ({ ...l })),
  }
}

function toMeta(nodes: MindmapGraphNode[]): NodeMeta[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.label,
    kind: n.kind,
    startMs: n.startMs,
  }))
}

export function SummaryMindmapPanel({
  title,
  chapters,
  bullets = [],
  onSeek,
}: SummaryMindmapPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const [nodeMeta, setNodeMeta] = useState<NodeMeta[]>([])
  const [links, setLinks] = useState<MindmapGraphLink[]>([])
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeLabels, setMergeLabels] = useState<string[]>([])
  const mergeIdsRef = useRef<string[]>([])

  const graphRef = useRef<MindmapGraph | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const dragRef = useRef<{
    mode: 'node' | 'pan'
    id?: string
    pointerId: number
    startClientX: number
    startClientY: number
    startGraphX: number
    startGraphY: number
    origPanX: number
    origPanY: number
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)
  const settleRafRef = useRef(0)
  const dropTargetIdRef = useRef<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<SVGGElement>(null)
  const nodeElsRef = useRef(new Map<string, SVGGElement>())
  const edgeElsRef = useRef(new Map<string, SVGLineElement>())
  const searchRef = useRef<HTMLInputElement>(null)

  const seed = useMemo(
    () => buildMindmapGraph(title, chapters, bullets, VIEW_W, VIEW_H),
    [title, chapters, bullets],
  )

  const syncStructure = (graph: MindmapGraph) => {
    setNodeMeta(toMeta(graph.nodes))
    setLinks(graph.links.map((l) => ({ ...l })))
    setLayoutEpoch((e) => e + 1)
  }

  const setDropTarget = (id: string | null) => {
    if (dropTargetIdRef.current === id) return
    if (dropTargetIdRef.current) {
      nodeElsRef.current.get(dropTargetIdRef.current)?.classList.remove('is-drop-target')
    }
    dropTargetIdRef.current = id
    if (id) nodeElsRef.current.get(id)?.classList.add('is-drop-target')
  }

  const paintViewport = () => {
    const el = viewportRef.current
    if (!el) return
    const { x, y } = panRef.current
    const s = scaleRef.current
    el.setAttribute('transform', `translate(${x} ${y}) scale(${s})`)
  }

  const paintGraph = () => {
    const graph = graphRef.current
    if (!graph) return
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    for (const node of graph.nodes) {
      const el = nodeElsRef.current.get(node.id)
      if (el) el.setAttribute('transform', `translate(${node.x} ${node.y})`)
    }
    for (const link of graph.links) {
      const a = byId.get(link.source)
      const b = byId.get(link.target)
      const el = edgeElsRef.current.get(`${link.source}-${link.target}`)
      if (!a || !b || !el) continue
      el.setAttribute('x1', String(a.x))
      el.setAttribute('y1', String(a.y))
      el.setAttribute('x2', String(b.x))
      el.setAttribute('y2', String(b.y))
    }
  }

  const stopSettle = () => {
    if (settleRafRef.current) {
      cancelAnimationFrame(settleRafRef.current)
      settleRafRef.current = 0
    }
  }

  const runSettle = (steps: number) => {
    stopSettle()
    let left = steps
    const loop = () => {
      const graph = graphRef.current
      if (!graph || left <= 0 || dragRef.current) {
        settleRafRef.current = 0
        return
      }
      stepForce(graph, VIEW_W, VIEW_H)
      paintGraph()
      left -= 1
      settleRafRef.current = requestAnimationFrame(loop)
    }
    settleRafRef.current = requestAnimationFrame(loop)
  }

  const resetView = (graph = cloneGraph(seed)) => {
    stopSettle()
    graphRef.current = graph
    panRef.current = { x: 0, y: 0 }
    scaleRef.current = 1
    setSelectedIds([])
    setDropTarget(null)
    setMatchIndex(0)
    syncStructure(graph)
    requestAnimationFrame(() => {
      paintViewport()
      paintGraph()
      runSettle(80)
    })
  }

  useEffect(() => {
    resetView(cloneGraph(seed))
    return () => stopSettle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  useLayoutEffect(() => {
    paintViewport()
    paintGraph()
  })

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const clientToGraph = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const s = scaleRef.current || 1
    return {
      x: (clientX - rect.left - panRef.current.x) / s,
      y: (clientY - rect.top - panRef.current.y) / s,
    }
  }

  const focusNode = (node: MindmapGraphNode, nextScale = Math.max(scaleRef.current, 1.15)) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    scaleRef.current = nextScale
    panRef.current = {
      x: rect.width / 2 - node.x * nextScale,
      y: rect.height / 2 - node.y * nextScale,
    }
    paintViewport()
    setSelectedIds([node.id])
  }

  const normalizedQuery = query.trim().toLowerCase()
  const matchIds = useMemo(() => {
    if (!normalizedQuery) return [] as string[]
    return nodeMeta
      .filter((n) => n.label.toLowerCase().includes(normalizedQuery))
      .map((n) => n.id)
  }, [nodeMeta, normalizedQuery])

  useEffect(() => {
    setMatchIndex(0)
    if (matchIds.length === 0) return
    const node = graphRef.current?.nodes.find((n) => n.id === matchIds[0])
    if (node) focusNode(node)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery, matchIds.join('|')])

  const jumpMatch = (dir: 1 | -1) => {
    if (matchIds.length === 0) return
    const next = (matchIndex + dir + matchIds.length) % matchIds.length
    setMatchIndex(next)
    const node = graphRef.current?.nodes.find((n) => n.id === matchIds[next])
    if (node) focusNode(node)
  }

  const setZoom = (next: number, focal?: { x: number; y: number }) => {
    const svg = svgRef.current
    const clamped = Math.max(0.5, Math.min(2.5, next))
    if (!svg) {
      scaleRef.current = clamped
      paintViewport()
      return
    }
    const rect = svg.getBoundingClientRect()
    const cx = focal?.x ?? rect.width / 2
    const cy = focal?.y ?? rect.height / 2
    const prev = scaleRef.current || 1
    const gx = (cx - panRef.current.x) / prev
    const gy = (cy - panRef.current.y) / prev
    scaleRef.current = clamped
    panRef.current = {
      x: cx - gx * clamped,
      y: cy - gy * clamped,
    }
    paintViewport()
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * 0.0015)
      setZoom(scaleRef.current * factor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [layoutEpoch])

  const openMergeDialog = (ids: string[]) => {
    const graph = graphRef.current
    if (!graph) return
    const unique = [...new Set(ids)].filter((id) => id !== 'root')
    if (unique.length < 2) return
    const labels = unique
      .map((id) => graph.nodes.find((n) => n.id === id)?.label)
      .filter(Boolean) as string[]
    if (labels.length < 2) return
    mergeIdsRef.current = unique
    setMergeLabels(labels)
    setMergeOpen(true)
  }

  const applyMerge = (newTitle: string) => {
    const graph = graphRef.current
    if (!graph) return
    const result = mergeMindmapNodes(graph, mergeIdsRef.current, newTitle)
    if (!result) return
    graphRef.current = result.graph
    setMergeOpen(false)
    setSelectedIds([result.mergedId])
    setDropTarget(null)
    syncStructure(result.graph)
    requestAnimationFrame(() => {
      paintViewport()
      paintGraph()
      runSettle(36)
      const merged = result.graph.nodes.find((n) => n.id === result.mergedId)
      if (merged) focusNode(merged, Math.max(scaleRef.current, 1.05))
    })
  }

  const onPointerDownNode = (event: React.PointerEvent, nodeId: string) => {
    event.stopPropagation()
    event.preventDefault()
    const graph = graphRef.current
    const node = graph?.nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Ctrl/⌘ 多选
    if (event.ctrlKey || event.metaKey) {
      if (node.kind === 'root') return
      setSelectedIds((prev) =>
        prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev.filter((id) => id !== 'root'), nodeId],
      )
      return
    }

    stopSettle()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = clientToGraph(event.clientX, event.clientY)
    node.fx = node.x
    node.fy = node.y
    node.vx = 0
    node.vy = 0
    dragRef.current = {
      mode: 'node',
      id: nodeId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGraphX: node.x,
      startGraphY: node.y,
      origPanX: panRef.current.x,
      origPanY: panRef.current.y,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      moved: false,
    }
    setSelectedIds([nodeId])
    setDropTarget(null)
  }

  const onPointerDownCanvas = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode: 'pan',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGraphX: 0,
      startGraphY: 0,
      origPanX: panRef.current.x,
      origPanY: panRef.current.y,
      offsetX: 0,
      offsetY: 0,
      moved: false,
    }
    setSelectedIds([])
    setDropTarget(null)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.mode === 'pan') {
      const dx = event.clientX - drag.startClientX
      const dy = event.clientY - drag.startClientY
      if (Math.hypot(dx, dy) > 2) drag.moved = true
      panRef.current = { x: drag.origPanX + dx, y: drag.origPanY + dy }
      paintViewport()
      return
    }

    const graph = graphRef.current
    const node = graph?.nodes.find((n) => n.id === drag.id)
    if (!node || !graph) return

    const point = clientToGraph(event.clientX, event.clientY)
    const x = point.x - drag.offsetX
    const y = point.y - drag.offsetY
    if (Math.hypot(x - drag.startGraphX, y - drag.startGraphY) > 2) drag.moved = true

    node.x = x
    node.y = y
    node.fx = x
    node.fy = y
    node.vx = 0
    node.vy = 0

    const nodeEl = nodeElsRef.current.get(node.id)
    if (nodeEl) nodeEl.setAttribute('transform', `translate(${x} ${y})`)
    for (const link of graph.links) {
      if (link.source !== node.id && link.target !== node.id) continue
      const otherId = link.source === node.id ? link.target : link.source
      const other = graph.nodes.find((n) => n.id === otherId)
      const el = edgeElsRef.current.get(`${link.source}-${link.target}`)
      if (!other || !el) continue
      if (link.source === node.id) {
        el.setAttribute('x1', String(x))
        el.setAttribute('y1', String(y))
        el.setAttribute('x2', String(other.x))
        el.setAttribute('y2', String(other.y))
      } else {
        el.setAttribute('x1', String(other.x))
        el.setAttribute('y1', String(other.y))
        el.setAttribute('x2', String(x))
        el.setAttribute('y2', String(y))
      }
    }

    if (node.kind !== 'root' && drag.moved) {
      const target = findMergeDropTarget(graph, node.id, x, y)
      setDropTarget(target?.id ?? null)
    } else {
      setDropTarget(null)
    }
  }

  const endDrag = (event: React.PointerEvent, nodeId?: string) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }

    if (drag.mode === 'pan') return

    const graph = graphRef.current
    const node = graph?.nodes.find((n) => n.id === (nodeId ?? drag.id))
    if (!node || !graph) return

    if (drag.moved) {
      const target = findMergeDropTarget(graph, node.id, node.x, node.y)
      setDropTarget(null)
      if (target && node.kind !== 'root') {
        // 回到起点，避免“半合并”视觉；真正合并在弹窗确认后发生
        node.x = drag.startGraphX
        node.y = drag.startGraphY
        node.fx = drag.startGraphX
        node.fy = drag.startGraphY
        paintGraph()
        openMergeDialog([node.id, target.id])
        return
      }

      node.fx = node.x
      node.fy = node.y
      node.vx = 0
      node.vy = 0
      runSettle(40)
    } else {
      node.fx = null
      node.fy = null
      setDropTarget(null)
      if (node.startMs !== undefined) onSeek?.(node.startMs)
    }
  }

  const mergeableSelected = selectedIds.filter((id) => id !== 'root')
  const canMerge = mergeableSelected.length >= 2

  if (chapters.length === 0 && bullets.length === 0) {
    return (
      <EmptyState
        compact
        title="暂无思维导图"
        description="生成纪要后，将按章节构建可拖拽拓扑图"
      />
    )
  }

  const searching = normalizedQuery.length > 0

  return (
    <div className={cn('summary-mindmap', fullscreen && 'is-fullscreen')}>
      <div className="summary-mindmap-toolbar">
        <label className="summary-mindmap-search">
          <Search className="summary-mindmap-search-icon" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="搜索节点…"
            aria-label="搜索节点"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                jumpMatch(e.shiftKey ? -1 : 1)
              }
              if (e.key === 'Escape' && query) {
                e.preventDefault()
                setQuery('')
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="summary-mindmap-search-clear"
              aria-label="清除搜索"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </label>

        {searching ? (
          <span className="summary-mindmap-match-count" aria-live="polite">
            {matchIds.length === 0
              ? '无匹配'
              : `${Math.min(matchIndex + 1, matchIds.length)}/${matchIds.length}`}
          </span>
        ) : null}

        <button
          type="button"
          className={cn('summary-mindmap-merge-trigger', canMerge && 'is-ready')}
          disabled={!canMerge}
          title={canMerge ? '合并选中知识点' : 'Ctrl/⌘ 多选至少两个节点后再合并'}
          onClick={() => openMergeDialog(mergeableSelected)}
        >
          <GitMerge className="h-3.5 w-3.5" />
          合并{canMerge ? ` (${mergeableSelected.length})` : ''}
        </button>

        <div className="summary-mindmap-toolbar-spacer" />

        <button type="button" aria-label="缩小" onClick={() => setZoom(scaleRef.current - 0.1)}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label="放大" onClick={() => setZoom(scaleRef.current + 0.1)}>
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="适应视图"
          onClick={() => {
            panRef.current = { x: 0, y: 0 }
            scaleRef.current = 1
            paintViewport()
          }}
        >
          <Focus className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label="重置布局" title="重置布局" onClick={() => resetView()}>
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={fullscreen ? '退出全屏' : '全屏查看'}
          title={fullscreen ? '退出全屏 (Esc)' : '全屏查看'}
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="summary-mindmap-hint-line">
        滚轮缩放 · Ctrl/⌘ 多选后点合并 · 或把节点拖到另一个节点上合并
      </p>

      <div className="summary-mindmap-stage">
        <svg
          key={layoutEpoch}
          ref={svgRef}
          className="summary-mindmap-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="思维导图拓扑"
          onPointerDown={onPointerDownCanvas}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e)}
          onPointerCancel={(e) => endDrag(e)}
        >
          <g ref={viewportRef} transform="translate(0 0) scale(1)">
            {links.map((link) => (
              <line
                key={`${link.source}-${link.target}`}
                ref={(el) => {
                  const key = `${link.source}-${link.target}`
                  if (el) edgeElsRef.current.set(key, el)
                  else edgeElsRef.current.delete(key)
                }}
                className={cn(
                  'summary-mindmap-edge',
                  searching &&
                    (matchIds.includes(link.source) || matchIds.includes(link.target)
                      ? 'is-match'
                      : 'is-dimmed'),
                )}
                x1={0}
                y1={0}
                x2={0}
                y2={0}
              />
            ))}

            {nodeMeta.map((node) => {
              const r = nodeRadius(node.kind)
              const isMatch = searching && matchIds.includes(node.id)
              const isActiveMatch = isMatch && matchIds[matchIndex] === node.id
              const isSelected = selectedIds.includes(node.id)
              return (
                <g
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeElsRef.current.set(node.id, el)
                    else nodeElsRef.current.delete(node.id)
                  }}
                  className={cn(
                    'summary-mindmap-node-g',
                    `is-${node.kind}`,
                    isSelected && 'is-selected',
                    searching && (isMatch ? 'is-match' : 'is-dimmed'),
                    isActiveMatch && 'is-active-match',
                  )}
                  transform="translate(0 0)"
                  onPointerDown={(e) => onPointerDownNode(e, node.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => endDrag(e, node.id)}
                  onPointerCancel={(e) => endDrag(e, node.id)}
                >
                  <circle r={r + 6} className="summary-mindmap-halo" />
                  <circle r={r} className="summary-mindmap-dot" />
                  <text className="summary-mindmap-label" y={r + 14} textAnchor="middle">
                    {node.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {fullscreen ? (
        <p className="summary-mindmap-fullscreen-hint">
          Esc 退出全屏 · Enter 下一项匹配 · Shift+Enter 上一项
        </p>
      ) : null}

      <MindmapMergeTitleModal
        open={mergeOpen}
        labels={mergeLabels}
        onClose={() => setMergeOpen(false)}
        onConfirm={applyMerge}
      />
    </div>
  )
}
