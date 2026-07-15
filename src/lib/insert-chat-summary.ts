import { filesApi } from '@/lib/api/files'
import { hasRichTextContent } from '@/lib/file-editor'
import { markdownToSummaryHtml } from '@/lib/markdown-to-html'

export async function insertChatSummaryToFile(fileId: string, markdown: string): Promise<string> {
  const detail = await filesApi.get(fileId)
  const currentFull =
    detail.editorState?.summaries?.full ?? detail.editorState?.summaryHtml ?? ''
  const inserted = markdownToSummaryHtml(markdown)
  if (!inserted) {
    throw new Error('empty')
  }

  const separator = hasRichTextContent(currentFull)
    ? '<hr/><p><strong>Chat 补充</strong></p>'
    : ''
  const nextFull = `${currentFull}${separator}${inserted}`

  await filesApi.updateEditor(fileId, {
    summaries: { full: nextFull },
    summaryHtml: nextFull,
  })

  return nextFull
}
