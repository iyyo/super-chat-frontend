import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, FileText, Loader2, Subtitles } from 'lucide-react'
import { segmentPlainText } from '@/lib/file-editor'
import type { TranscriptDocxInput } from '@/lib/export/transcript-docx'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

type ExportKind = 'docx' | 'markdown' | 'srt'

const POPOVER_MIN_WIDTH = 200

export function ExportTranscriptMenu(input: TranscriptDocxInput) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const trigger = rootRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(POPOVER_MIN_WIDTH, popoverRef.current?.offsetWidth ?? POPOVER_MIN_WIDTH)
    const maxLeft = window.innerWidth - width - 8
    const left = Math.min(Math.max(8, rect.left), maxLeft)
    setCoords({ top: rect.bottom + 6, left })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updatePosition()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const hasContent =
    input.segments.some((segment) => segmentPlainText(segment.html).trim()) ||
    Boolean(input.fallbackText?.trim())

  const runExport = async (kind: ExportKind) => {
    if (exporting) return
    if (!hasContent) {
      toast.warning('暂无转写内容可导出')
      return
    }
    setExporting(true)
    setOpen(false)
    try {
      if (kind === 'docx') {
        const { exportTranscriptDocx } = await import('@/lib/export/transcript-docx')
        await exportTranscriptDocx(input)
        toast.success('Word 原文已下载')
      } else if (kind === 'markdown') {
        const { exportTranscriptMarkdown } = await import('@/lib/export/transcript-text')
        exportTranscriptMarkdown({
          title: input.title,
          segments: input.segments,
          fallbackText: input.fallbackText,
          includeTimestamps,
        })
        toast.success(includeTimestamps ? 'Markdown 已下载（含时间戳）' : 'Markdown 已下载（无时间戳）')
      } else {
        const { exportTranscriptSrt } = await import('@/lib/export/transcript-text')
        exportTranscriptSrt({
          title: input.title,
          segments: input.segments,
          fallbackText: input.fallbackText,
        })
        toast.success('字幕 SRT 已下载')
      }
    } catch {
      toast.error('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="file-export-menu" ref={rootRef}>
      <button
        type="button"
        className={cn('file-detail-tool', open && 'is-open')}
        aria-label="导出"
        title="导出原文 / Markdown / 字幕"
        aria-expanded={open}
        disabled={exporting}
        onClick={() => setOpen((v) => !v)}
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <ChevronDown className="file-export-caret" />
      </button>

      {open && coords
        ? createPortal(
            <div
              ref={popoverRef}
              className="file-export-popover is-portaled"
              role="menu"
              style={{ top: coords.top, left: coords.left }}
            >
              <label className="file-export-option-check">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                />
                <span>Markdown 含时间戳</span>
              </label>
              <button type="button" role="menuitem" onClick={() => void runExport('docx')}>
                <FileText className="h-4 w-4" />
                导出 Word
              </button>
              <button type="button" role="menuitem" onClick={() => void runExport('markdown')}>
                <FileText className="h-4 w-4" />
                导出 Markdown
              </button>
              <button type="button" role="menuitem" onClick={() => void runExport('srt')}>
                <Subtitles className="h-4 w-4" />
                导出字幕 SRT
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
