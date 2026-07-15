import type { EditableSegment } from '@/lib/file-editor'
import { hasRichTextContent, segmentPlainText } from '@/lib/file-editor'

export type SummaryCardKey = 'full' | 'bySpeaker' | 'highlights'

export interface SummaryCards {
  full: string
  bySpeaker: string
  highlights: string
}

export const SUMMARY_CARD_META: Array<{
  id: SummaryCardKey
  label: string
  desc: string
}> = [
  { id: 'full', label: '全文总结', desc: '整段录音的核心议题与结论' },
  { id: 'bySpeaker', label: '分角色', desc: '按说话人归纳发言要点' },
  { id: 'highlights', label: '要点待办', desc: '关键信息与可跟进行动' },
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
}

function segmentLines(segments: EditableSegment[], plainFallback: string | null) {
  const lines = segments
    .map((s) => ({ speaker: s.speaker.trim() || '说话人1', text: segmentPlainText(s.html) }))
    .filter((l) => l.text.length > 0)

  const fullText =
    lines.length > 0 ? lines.map((l) => l.text).join('') : (plainFallback?.trim() ?? '')

  return { lines, fullText }
}

function buildFullSummaryHtml(
  title: string,
  fullText: string,
  lines: Array<{ speaker: string; text: string }>,
): string {
  const wordCount = fullText.length
  const speakerCount = new Set(lines.map((l) => l.speaker)).size
  const sentences = splitSentences(fullText)
  const overview =
    wordCount < 30
      ? '录音内容较短，以下为现有转写能提炼出的全文摘要。'
      : `围绕「${title}」共识别约 ${wordCount} 字、${lines.length} 段发言${speakerCount > 1 ? `、${speakerCount} 位说话人` : ''}。`
  const lead = sentences[0] ? `<blockquote>${escapeHtml(sentences[0]!)}</blockquote>` : ''
  const core = sentences.slice(0, 6).map((s) => `<li>${escapeHtml(s)}</li>`).join('')
  const conclusion =
    sentences.length > 0 ? escapeHtml(sentences[sentences.length - 1]!) : '待结合业务场景补充结论。'

  return `<h2>全文总结</h2><p>${escapeHtml(overview)}</p>${lead}<h3>本段主要在说什么</h3><ul>${core || '<li>暂无足够文本生成摘要</li>'}</ul><h3>当前结论</h3><p>${conclusion}</p>`
}

function buildBySpeakerSummaryHtml(lines: Array<{ speaker: string; text: string }>): string {
  const groups = new Map<string, string[]>()
  for (const line of lines) {
    const list = groups.get(line.speaker) ?? []
    list.push(line.text)
    groups.set(line.speaker, list)
  }

  if (groups.size === 0) {
    return '<h2>分角色摘要</h2><p>暂无分角色转写内容，请先在右侧查看转写结果。</p>'
  }

  const blocks = [...groups.entries()]
    .map(([speaker, texts]) => {
      const joined = texts.join('')
      const bullets = texts
        .slice(0, 5)
        .map((t) => {
          const snippet = t.slice(0, 56) + (t.length > 56 ? '…' : '')
          return `<li>${escapeHtml(snippet)}</li>`
        })
        .join('')
      return `<h3>${escapeHtml(speaker)}</h3><p><strong>发言字数：</strong>${joined.length} 字 · <strong>片段：</strong>${texts.length} 段</p><h4>发言要点</h4><ul>${bullets}</ul>`
    })
    .join('')

  return `<h2>分角色视图</h2><p>以下按说话人拆开看主要表达、信息量和原话片段。</p>${blocks}`
}

function buildHighlightsSummaryHtml(
  title: string,
  fullText: string,
  lines: Array<{ speaker: string; text: string }>,
): string {
  const sentences = splitSentences(fullText).filter((s) => s.length > 8)
  const keyPoints = sentences.slice(0, 5)
  const speakers = [...new Set(lines.map((l) => l.speaker))]

  const todos: string[] = []
  if (fullText.length > 0) {
    todos.push(`围绕「${title}」整理对外同步口径`)
  }
  if (speakers.length > 1) {
    todos.push(`分别跟进 ${speakers.slice(0, 3).join('、')} 等说话人的待确认事项`)
  }
  todos.push('在 Chat 中追问「提取待办」以生成更具体的行动项')

  const pointList = keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('') || '<li>暂无要点，请先完成转写</li>'
  return `<h2>要点待办</h2><h3>关键要点</h3><ol>${pointList}</ol><h3>建议跟进</h3><ul>${todos.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
}

export function buildSummaryCards(
  fileTitle: string,
  segments: EditableSegment[],
  plainFallback: string | null,
): SummaryCards {
  const { lines, fullText } = segmentLines(segments, plainFallback)
  return {
    full: buildFullSummaryHtml(fileTitle, fullText, lines),
    bySpeaker: buildBySpeakerSummaryHtml(lines),
    highlights: buildHighlightsSummaryHtml(fileTitle, fullText, lines),
  }
}

export function mergeSummaryCards(
  saved: SummaryCards | null | undefined,
  legacySummaryHtml: string | null | undefined,
  generated: SummaryCards,
): SummaryCards {
  return {
    full: hasRichTextContent(saved?.full)
      ? saved!.full
      : hasRichTextContent(legacySummaryHtml)
        ? legacySummaryHtml!
        : generated.full,
    bySpeaker: hasRichTextContent(saved?.bySpeaker) ? saved!.bySpeaker : generated.bySpeaker,
    highlights: hasRichTextContent(saved?.highlights) ? saved!.highlights : generated.highlights,
  }
}
