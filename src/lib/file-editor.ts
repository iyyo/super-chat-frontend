import type { FileSummaryView } from '@/lib/file-summary'
import type { SummaryCards } from '@/lib/transcript-summaries'
import { buildSummaryCards, mergeSummaryCards } from '@/lib/transcript-summaries'
import { speakerLabel } from '@/lib/parse-transcript'
import type { TranscriptSegment } from '@/lib/parse-transcript'

export interface EditableSegment {
  id: string
  beginMs: number
  endMs: number
  role?: string
  speaker: string
  html: string
}

export interface FileEditorState {
  summaryHtml: string
  summaries: SummaryCards
  segments: EditableSegment[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

/** 转写分段：HTML 存储 → 纯文本展示/编辑 */
export function segmentPlainText(html: string): string {
  if (!html?.trim()) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/** 转写分段：纯文本 → HTML 存储 */
export function segmentFromPlainText(text: string): string {
  return textToHtml(text)
}

export function hasSegmentText(html: string | null | undefined): boolean {
  return segmentPlainText(html ?? '').length > 0
}

export function segmentsToEditable(segments: TranscriptSegment[]): EditableSegment[] {
  return segments.map((seg, i) => ({
    id: `${seg.beginMs}-${seg.endMs}-${i}`,
    beginMs: seg.beginMs,
    endMs: seg.endMs,
    role: seg.role,
    speaker: speakerLabel(seg.role),
    html: textToHtml(seg.text),
  }))
}

export function summaryToInitialHtml(summary: FileSummaryView): string {
  const speech = summary.speechRecords
    .map(
      (r) =>
        `<p><strong>${escapeHtml(r.speaker)}</strong> ${escapeHtml(r.quote)}${r.tag ? ` <em>（${escapeHtml(r.tag)}）</em>` : ''}</p>`,
    )
    .join('')

  const extract = summary.extractable.map((line) => `<li>${escapeHtml(line)}</li>`).join('')

  return `<h2>${escapeHtml(summary.title)}</h2><p>${escapeHtml(summary.description)}</p><h3>发言记录</h3>${speech}<h3>可提取信息</h3><ul>${extract}</ul>`
}

/** 判断富文本是否有实质文字（空标签、仅 br 不算） */
export function hasRichTextContent(html: string | null | undefined): boolean {
  if (!html?.trim()) return false
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return text.length > 0
}

function mergeSavedSegments(
  saved: EditableSegment[],
  parsed: EditableSegment[],
): EditableSegment[] {
  return saved.map((seg, index) => {
    if (hasSegmentText(seg.html)) return seg
    const byTime = parsed.find(
      (p) => p.beginMs === seg.beginMs && p.endMs === seg.endMs,
    )
    const fallback = byTime ?? parsed[index]
    if (!fallback?.html) return seg
    return { ...seg, html: fallback.html, role: seg.role ?? fallback.role }
  })
}

export function buildEditorState(
  saved: FileEditorState | null | undefined,
  segments: TranscriptSegment[],
  options: { fileTitle: string; plainText: string | null },
): FileEditorState {
  const parsedSegments = segmentsToEditable(segments)
  const generatedCards = buildSummaryCards(
    options.fileTitle,
    parsedSegments,
    options.plainText,
  )

  const savedSummaryOk =
    hasRichTextContent(saved?.summaryHtml) || hasRichTextContent(saved?.summaries?.full)
  const savedSegmentsOk = saved?.segments?.some((s) => hasSegmentText(s.html)) ?? false
  const summaries = mergeSummaryCards(saved?.summaries, saved?.summaryHtml, generatedCards)

  if (!savedSummaryOk && !savedSegmentsOk) {
    return {
      summaryHtml: summaries.full,
      summaries,
      segments: parsedSegments,
    }
  }

  return {
    summaryHtml: summaries.full,
    summaries,
    segments: savedSegmentsOk
      ? mergeSavedSegments(saved!.segments, parsedSegments)
      : parsedSegments.length > 0
        ? parsedSegments
        : (saved?.segments ?? []),
  }
}

export function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').trim()
}
