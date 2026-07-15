/** 发言人颜色枚举（最多 20 种，按首次出现顺序分配） */
export const SPEAKER_COLORS = [
  { fg: '#b45309', bg: 'rgba(180, 83, 9, 0.12)' },
  { fg: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  { fg: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
  { fg: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
  { fg: '#db2777', bg: 'rgba(219, 39, 119, 0.12)' },
  { fg: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)' },
  { fg: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)' },
  { fg: '#65a30d', bg: 'rgba(101, 163, 13, 0.12)' },
  { fg: '#c026d3', bg: 'rgba(192, 38, 211, 0.12)' },
  { fg: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
  { fg: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)' },
  { fg: '#0d9488', bg: 'rgba(13, 148, 136, 0.12)' },
  { fg: '#ca8a04', bg: 'rgba(202, 138, 4, 0.12)' },
  { fg: '#9333ea', bg: 'rgba(147, 51, 234, 0.12)' },
  { fg: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
  { fg: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  { fg: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  { fg: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },
  { fg: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  { fg: '#be185d', bg: 'rgba(190, 24, 93, 0.12)' },
] as const

export const SPEAKER_COLOR_COUNT = SPEAKER_COLORS.length

export function buildSpeakerColorMap(speakers: string[]): Map<string, number> {
  const map = new Map<string, number>()
  let next = 0
  for (const raw of speakers) {
    const key = raw.trim() || '说话人1'
    if (map.has(key)) continue
    map.set(key, next % SPEAKER_COLOR_COUNT)
    next += 1
  }
  return map
}

export function getSpeakerColor(index: number) {
  return SPEAKER_COLORS[((index % SPEAKER_COLOR_COUNT) + SPEAKER_COLOR_COUNT) % SPEAKER_COLOR_COUNT]!
}
