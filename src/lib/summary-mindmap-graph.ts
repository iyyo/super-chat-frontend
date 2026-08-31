export type MindmapNodeKind = 'root' | 'chapter' | 'leaf'

export interface MindmapGraphNode {
  id: string
  label: string
  kind: MindmapNodeKind
  startMs?: number
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}

export interface MindmapGraphLink {
  source: string
  target: string
}

export interface MindmapGraph {
  nodes: MindmapGraphNode[]
  links: MindmapGraphLink[]
}

function clip(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function buildMindmapGraph(
  title: string,
  chapters: Array<{ title: string; summary: string; startMs: number }>,
  bullets: string[],
  width: number,
  height: number,
): MindmapGraph {
  const cx = width / 2
  const cy = height / 2
  const nodes: MindmapGraphNode[] = [
    {
      id: 'root',
      label: clip(title || '未命名', 18),
      kind: 'root',
      startMs: 0,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    },
  ]
  const links: MindmapGraphLink[] = []

  const chapterCount = Math.max(chapters.length, 1)
  chapters.forEach((chapter, index) => {
    const angle = -Math.PI / 2 + (index / chapterCount) * Math.PI * 2
    const radius = Math.min(width, height) * 0.28
    const id = `c-${index}`
    nodes.push({
      id,
      label: clip(chapter.title, 16),
      kind: 'chapter',
      startMs: chapter.startMs,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    })
    links.push({ source: 'root', target: id })

    const kids =
      index === 0 && bullets.length > 0
        ? bullets.slice(0, 3)
        : chapter.summary
          ? [chapter.summary]
          : []

    kids.forEach((kid, kidIndex) => {
      const kidId = `${id}-k-${kidIndex}`
      const kidAngle = angle + (kidIndex - (kids.length - 1) / 2) * 0.35
      const kidRadius = radius + 90
      nodes.push({
        id: kidId,
        label: clip(kid, 14),
        kind: 'leaf',
        startMs: chapter.startMs,
        x: cx + Math.cos(kidAngle) * kidRadius,
        y: cy + Math.sin(kidAngle) * kidRadius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      })
      links.push({ source: id, target: kidId })
    })
  })

  return { nodes, links }
}

/** 一步简易力导向（类 Obsidian 图谱） */
export function stepForce(graph: MindmapGraph, width: number, height: number): void {
  const { nodes, links } = graph
  const byId = new Map(nodes.map((n) => [n.id, n]))

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.hypot(dx, dy) || 0.01
      const minDist = a.kind === 'leaf' || b.kind === 'leaf' ? 70 : 100
      if (dist < minDist) {
        const force = ((minDist - dist) / dist) * 0.08
        dx *= force
        dy *= force
        if (a.fx === null) {
          a.vx -= dx
          a.vy -= dy
        }
        if (b.fx === null) {
          b.vx += dx
          b.vy += dy
        }
      } else {
        const force = 120 / (dist * dist)
        dx *= force
        dy *= force
        if (a.fx === null) {
          a.vx -= dx
          a.vy -= dy
        }
        if (b.fx === null) {
          b.vx += dx
          b.vy += dy
        }
      }
    }
  }

  for (const link of links) {
    const a = byId.get(link.source)
    const b = byId.get(link.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.hypot(dx, dy) || 0.01
    const ideal = a.kind === 'root' || b.kind === 'root' ? 140 : 100
    const force = ((dist - ideal) / dist) * 0.05
    const fx = dx * force
    const fy = dy * force
    if (a.fx === null) {
      a.vx += fx
      a.vy += fy
    }
    if (b.fx === null) {
      b.vx -= fx
      b.vy -= fy
    }
  }

  const root = byId.get('root')
  if (root && root.fx === null) {
    root.vx += (width / 2 - root.x) * 0.01
    root.vy += (height / 2 - root.y) * 0.01
  }

  for (const node of nodes) {
    if (node.fx !== null && node.fy !== null) {
      node.x = node.fx
      node.y = node.fy
      node.vx = 0
      node.vy = 0
      continue
    }
    node.vx *= 0.85
    node.vy *= 0.85
    node.x += node.vx
    node.y += node.vy
    node.x = Math.max(40, Math.min(width - 40, node.x))
    node.y = Math.max(28, Math.min(height - 28, node.y))
  }
}

export function nodeRadius(kind: MindmapNodeKind): number {
  if (kind === 'root') return 22
  if (kind === 'chapter') return 16
  return 11
}

function kindRank(kind: MindmapNodeKind): number {
  if (kind === 'root') return 3
  if (kind === 'chapter') return 2
  return 1
}

/** 将多个非 root 节点合并为一个知识点节点 */
export function mergeMindmapNodes(
  graph: MindmapGraph,
  sourceIds: string[],
  newLabel: string,
): { graph: MindmapGraph; mergedId: string } | null {
  const uniqueIds = [...new Set(sourceIds)].filter((id) => id !== 'root')
  if (uniqueIds.length < 2) return null

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const sources = uniqueIds.map((id) => byId.get(id)).filter(Boolean) as MindmapGraphNode[]
  if (sources.length < 2) return null

  const removeSet = new Set(sources.map((n) => n.id))
  const mergedId = `m-${Date.now().toString(36)}`
  const label = clip(newLabel.trim() || '合并知识点', 20)

  let kind: MindmapNodeKind = 'leaf'
  for (const n of sources) {
    if (kindRank(n.kind) > kindRank(kind)) kind = n.kind
  }
  if (kind === 'root') kind = 'chapter'

  const x = sources.reduce((s, n) => s + n.x, 0) / sources.length
  const y = sources.reduce((s, n) => s + n.y, 0) / sources.length
  const startMs = sources
    .map((n) => n.startMs)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b)[0]

  const merged: MindmapGraphNode = {
    id: mergedId,
    label,
    kind,
    startMs,
    x,
    y,
    vx: 0,
    vy: 0,
    fx: x,
    fy: y,
  }

  const nextNodes = graph.nodes.filter((n) => !removeSet.has(n.id)).concat(merged)
  const nextLinks: MindmapGraphLink[] = []
  const seen = new Set<string>()

  const pushLink = (source: string, target: string) => {
    if (source === target) return
    const key = `${source}->${target}`
    if (seen.has(key)) return
    seen.add(key)
    nextLinks.push({ source, target })
  }

  for (const link of graph.links) {
    const srcRemoved = removeSet.has(link.source)
    const tgtRemoved = removeSet.has(link.target)
    if (srcRemoved && tgtRemoved) continue
    if (srcRemoved) {
      pushLink(mergedId, link.target)
      continue
    }
    if (tgtRemoved) {
      pushLink(link.source, mergedId)
      continue
    }
    pushLink(link.source, link.target)
  }

  // 若合并后没有任何父边，挂到 root
  const hasParent = nextLinks.some((l) => l.target === mergedId)
  if (!hasParent && byId.has('root')) {
    pushLink('root', mergedId)
  }

  return {
    graph: { nodes: nextNodes, links: nextLinks },
    mergedId,
  }
}

/** 在附近查找可合并的投放目标（排除自身与 root） */
export function findMergeDropTarget(
  graph: MindmapGraph,
  draggedId: string,
  x: number,
  y: number,
  pad = 10,
): MindmapGraphNode | null {
  let best: MindmapGraphNode | null = null
  let bestDist = Infinity
  const dragged = graph.nodes.find((n) => n.id === draggedId)
  if (!dragged || dragged.kind === 'root') return null

  for (const node of graph.nodes) {
    if (node.id === draggedId || node.kind === 'root') continue
    const dist = Math.hypot(node.x - x, node.y - y)
    const threshold = nodeRadius(node.kind) + nodeRadius(dragged.kind) + pad
    if (dist <= threshold && dist < bestDist) {
      best = node
      bestDist = dist
    }
  }
  return best
}
