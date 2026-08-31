import { segmentPlainText, type EditableSegment } from '@/lib/file-editor'
import { formatMs } from '@/lib/parse-transcript'
import type { SummaryChapter } from '@/lib/summary-chapters'

function safeFilename(title: string, ext: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'export'
  return `${base}.${ext}`
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function srtTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms))
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)
  const millis = total % 1000
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`
}

export interface TranscriptExportInput {
  title: string
  segments: EditableSegment[]
  fallbackText?: string | null
  /** 是否在 Markdown 中附带时间戳 */
  includeTimestamps?: boolean
}

export function buildTranscriptMarkdown(input: TranscriptExportInput): string {
  const includeTs = input.includeTimestamps !== false
  const lines: string[] = [`# ${input.title.trim() || '转写原文'}`, '']

  const entries = input.segments
    .map((segment) => {
      const text = segmentPlainText(segment.html).trim()
      if (!text) return null
      const speaker = segment.speaker.trim() || '说话人'
      const beginMs = Number.isFinite(segment.beginMs) ? Math.max(0, segment.beginMs) : 0
      const endMs = Number.isFinite(segment.endMs) ? Math.max(beginMs, segment.endMs) : beginMs
      return { speaker, beginMs, endMs, text }
    })
    .filter(Boolean) as Array<{ speaker: string; beginMs: number; endMs: number; text: string }>

  if (entries.length === 0) {
    const fallback = input.fallbackText?.trim()
    if (fallback) lines.push(fallback)
    return `${lines.join('\n').trim()}\n`
  }

  for (const entry of entries) {
    if (includeTs) {
      lines.push(`### ${entry.speaker} · ${formatMs(entry.beginMs)} - ${formatMs(entry.endMs)}`)
    } else {
      lines.push(`### ${entry.speaker}`)
    }
    lines.push('')
    lines.push(entry.text)
    lines.push('')
  }

  return `${lines.join('\n').trim()}\n`
}

export function buildTranscriptSrt(input: TranscriptExportInput): string {
  const blocks: string[] = []
  let index = 1

  for (const segment of input.segments) {
    const text = segmentPlainText(segment.html).trim()
    if (!text) continue
    const beginMs = Number.isFinite(segment.beginMs) ? Math.max(0, segment.beginMs) : 0
    const endMs = Number.isFinite(segment.endMs) ? Math.max(beginMs + 500, segment.endMs) : beginMs + 2000
    const speaker = segment.speaker.trim()
    const body = speaker ? `${speaker}: ${text}` : text
    blocks.push(`${index}`)
    blocks.push(`${srtTimestamp(beginMs)} --> ${srtTimestamp(endMs)}`)
    blocks.push(body)
    blocks.push('')
    index += 1
  }

  if (blocks.length === 0 && input.fallbackText?.trim()) {
    blocks.push('1')
    blocks.push('00:00:00,000 --> 00:00:05,000')
    blocks.push(input.fallbackText.trim())
    blocks.push('')
  }

  return blocks.join('\n')
}

export function exportTranscriptMarkdown(input: TranscriptExportInput): void {
  const md = buildTranscriptMarkdown(input)
  downloadText(safeFilename(input.title, 'md'), md, 'text/markdown;charset=utf-8')
}

export function exportTranscriptSrt(input: TranscriptExportInput): void {
  const srt = buildTranscriptSrt(input)
  downloadText(safeFilename(input.title, 'srt'), srt, 'application/x-subrip;charset=utf-8')
}

export interface OutlineExportInput {
  title: string
  chapters: SummaryChapter[]
  includeTimestamps?: boolean
}

export function buildOutlineMarkdown(input: OutlineExportInput): string {
  const includeTs = Boolean(input.includeTimestamps)
  const lines: string[] = [`# ${input.title.trim() || '文字大纲'}`, '']

  input.chapters.forEach((chapter, index) => {
    const n = String(index + 1).padStart(2, '0')
    if (includeTs) {
      lines.push(`## ${n}. ${chapter.title}（${formatMs(chapter.startMs)}）`)
    } else {
      lines.push(`## ${n}. ${chapter.title}`)
    }
    if (chapter.summary?.trim()) {
      lines.push('')
      lines.push(chapter.summary.trim())
    }
    lines.push('')
  })

  return `${lines.join('\n').trim()}\n`
}

export function exportOutlineMarkdown(input: OutlineExportInput): void {
  const md = buildOutlineMarkdown(input)
  downloadText(safeFilename(input.title || 'outline', 'md'), md, 'text/markdown;charset=utf-8')
}
