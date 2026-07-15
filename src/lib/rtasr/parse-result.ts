export interface ParsedRtAsrLine {
  text: string
  rl: number
  beginMs: number
  endMs: number
  isFinal: boolean
  segId?: number
}

function extractWords(rt: unknown): Array<{ w: string; rl?: number }> {
  if (!rt || !Array.isArray(rt)) return []
  const words: Array<{ w: string; rl?: number }> = []
  for (const block of rt) {
    const ws = (block as { ws?: unknown[] }).ws
    if (!Array.isArray(ws)) continue
    for (const w of ws) {
      const cw = (w as { cw?: unknown[] }).cw
      if (!Array.isArray(cw)) continue
      for (const c of cw) {
        const item = c as { w?: string; rl?: number; wp?: string }
        if (item.w && item.wp !== 'p') {
          words.push({ w: item.w, rl: item.rl })
        }
      }
    }
  }
  return words
}

export function parseRtAsrMessage(raw: string): ParsedRtAsrLine | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>

    if (json.action === 'error' || json.code) {
      return null
    }

    const data = json.data as Record<string, unknown> | undefined
    if (!data?.cn) return null

    const st = (data.cn as { st?: Record<string, unknown> }).st
    if (!st?.rt) return null

    const words = extractWords(st.rt)
    const text = words.map((w) => w.w).join('')
    if (!text.trim()) return null

    const rlFromWords = words.find((w) => w.rl && w.rl > 0)?.rl ?? 0
    const type = String(st.type ?? '0')
    const isFinal = type === '0'

    return {
      text,
      rl: rlFromWords,
      beginMs: Number(st.bg ?? 0),
      endMs: Number(st.ed ?? 0),
      isFinal,
      segId: typeof data.seg_id === 'number' ? data.seg_id : undefined,
    }
  } catch {
    return null
  }
}

export function defaultSpeakerLabel(rl: number): string {
  if (rl <= 0) return '说话人1'
  return `说话人${rl}`
}
