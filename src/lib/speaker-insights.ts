import type { EditableSegment } from '@/lib/file-editor'

export interface SpeakerShare {
  speaker: string
  durationMs: number
  percent: number
  segments: Array<{ beginMs: number; endMs: number }>
}

export function buildSpeakerShares(segments: EditableSegment[]): SpeakerShare[] {
  const grouped = new Map<string, Omit<SpeakerShare, 'percent'>>()

  segments.forEach((segment) => {
    const speaker = segment.speaker.trim() || '说话人1'
    const durationMs = Math.max(0, segment.endMs - segment.beginMs)
    const current = grouped.get(speaker) ?? { speaker, durationMs: 0, segments: [] }
    current.durationMs += durationMs
    current.segments.push({ beginMs: segment.beginMs, endMs: segment.endMs })
    grouped.set(speaker, current)
  })

  const shares = [...grouped.values()]
  const total = shares.reduce((sum, item) => sum + item.durationMs, 0)
  if (shares.length === 0) return []

  const weights = total > 0 ? shares.map((item) => item.durationMs / total) : shares.map(() => 1 / shares.length)
  const percentages = exactPercentages(weights)
  return shares
    .map((item, index) => ({ ...item, percent: percentages[index] ?? 0 }))
    .sort((a, b) => b.durationMs - a.durationMs)
}

function exactPercentages(weights: number[]): number[] {
  const raw = weights.map((weight) => weight * 100)
  const result = raw.map(Math.floor)
  const remainder = 100 - result.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  for (let i = 0; i < remainder; i++) {
    const target = order[i % order.length]
    if (target) result[target.index] = (result[target.index] ?? 0) + 1
  }
  return result
}
