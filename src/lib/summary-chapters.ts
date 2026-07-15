import { segmentPlainText, type EditableSegment } from '@/lib/file-editor'

export interface SummaryChapter {
  startMs: number
  title: string
  summary: string
}

export function buildFallbackChapters(
  segments: EditableSegment[],
  plainFallback: string,
): SummaryChapter[] {
  const lines = segments
    .map((segment) => ({ ...segment, text: segmentPlainText(segment.html) }))
    .filter((segment) => segment.text.length > 0)

  if (lines.length === 0) {
    const text = plainFallback.trim()
    return text ? [{ startMs: 0, title: '内容概览', summary: clip(text, 90) }] : []
  }

  const chapterCount = Math.min(5, Math.max(1, Math.ceil(lines.length / 4)))
  const chunkSize = Math.ceil(lines.length / chapterCount)
  const chapters: SummaryChapter[] = []

  for (let index = 0; index < lines.length; index += chunkSize) {
    const group = lines.slice(index, index + chunkSize)
    const first = group[0]
    if (!first) continue
    const combined = group.map((line) => line.text).join(' ')
    chapters.push({
      startMs: first.beginMs,
      title: chapterTitle(first.text, chapters.length + 1),
      summary: clip(combined, 90),
    })
  }
  return chapters
}

function chapterTitle(text: string, index: number): string {
  const phrase = text.split(/[。！？.!?，,；;]/)[0]?.trim() ?? ''
  return phrase ? clip(phrase, 20) : `章节 ${index}`
}

function clip(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized
}
