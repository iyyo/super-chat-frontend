export interface TranscriptSegment {
  beginMs: number
  endMs: number
  role?: string
  text: string
}

interface StNode {
  bg?: string | number
  ed?: string | number
  rl?: string
  rt?: Array<{ ws?: WsNode[] }>
  ws?: WsNode[]
}

interface WsNode {
  cw?: Array<{ w?: string; wp?: string }>
}

function extractTextFromSt(st: StNode): string {
  const parts: string[] = []
  const wsLists = [...(st.rt?.map((r) => r.ws ?? []) ?? []), st.ws ?? []].flat()
  for (const ws of wsLists) {
    for (const cw of ws.cw ?? []) {
      if (!cw.w) continue
      if (cw.wp === 'g') {
        parts.push('\n')
        continue
      }
      parts.push(cw.w)
    }
  }
  return parts.join('').replace(/\n+/g, '\n').trim()
}

export function parseTranscriptSegments(resultRaw: string | null, resultText: string | null): TranscriptSegment[] {
  if (resultRaw) {
    try {
      const payload = JSON.parse(resultRaw) as {
        lattice?: Array<{ json_1best?: string }>
        lattice2?: Array<{ json_1best?: string }>
      }
      const items = payload.lattice?.length ? payload.lattice : (payload.lattice2 ?? [])
      const segments: TranscriptSegment[] = []
      for (const item of items) {
        if (!item.json_1best) continue
        const inner = JSON.parse(item.json_1best) as { st?: StNode }
        const st = inner.st
        if (!st) continue
        const text = extractTextFromSt(st)
        if (!text) continue
        segments.push({
          beginMs: Number(st.bg) || 0,
          endMs: Number(st.ed) || 0,
          role: st.rl,
          text,
        })
      }
      if (segments.length > 0) return segments
    } catch {
      // fallback below
    }
  }

  if (!resultText?.trim()) return []

  return resultText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, i) => ({
      beginMs: i * 3000,
      endMs: (i + 1) * 3000,
      role: '1',
      text,
    }))
}

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function parseDurationLabel(label: string): number {
  const parts = label.split(':').map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) {
    return ((parts[0]! * 60 + parts[1]!) * 60 + parts[2]!) * 1000
  }
  if (parts.length === 2) {
    return (parts[0]! * 60 + parts[1]!) * 1000
  }
  return 0
}

export function speakerLabel(role?: string): string {
  return role ? `说话人${role}` : '说话人1'
}
