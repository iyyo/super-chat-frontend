import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

/** Chat Markdown → 富文本纪要 HTML */
export function markdownToSummaryHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  return marked.parse(trimmed, { async: false }) as string
}
