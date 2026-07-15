import { segmentPlainText } from '@/lib/file-editor'

export interface SrtSegment {
  beginMs: number
  endMs: number
  speaker: string
  html: string
}

function padSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const msPart = ms % 1000
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msPart, 3)}`
}

export function segmentsToSrt(segments: SrtSegment[]): string {
  const lines: string[] = []
  let index = 1
  for (const seg of segments) {
    const text = segmentPlainText(seg.html)
    if (!text.trim()) continue
    const label = seg.speaker ? `${seg.speaker}: ` : ''
    lines.push(String(index))
    lines.push(`${padSrtTime(seg.beginMs)} --> ${padSrtTime(Math.max(seg.endMs, seg.beginMs + 1))}`)
    lines.push(`${label}${text}`)
    lines.push('')
    index += 1
  }
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 1000)
}
