import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { segmentPlainText } from '@/lib/file-editor'
import type { TranscriptDocxInput } from '@/lib/export/transcript-docx'
import { toast } from '@/stores/toast-store'

export function ExportTranscriptWordButton(input: TranscriptDocxInput) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    const hasSegmentText = input.segments.some((segment) => segmentPlainText(segment.html).trim())
    if (!hasSegmentText && !input.fallbackText?.trim()) {
      toast.warning('暂无转写内容可导出')
      return
    }

    setExporting(true)
    try {
      const { exportTranscriptDocx } = await import('@/lib/export/transcript-docx')
      await exportTranscriptDocx(input)
      toast.success('Word 原文已下载')
    } catch {
      toast.error('Word 导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      className="file-detail-tool"
      aria-label="导出 Word"
      title="导出 Word"
      disabled={exporting}
      onClick={() => void handleExport()}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  )
}
