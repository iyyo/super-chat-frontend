import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, ShieldCheck, X } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import type { WorkspaceFileDto } from '@/lib/api/files'
import { useDisplayFiles, useFilesStore } from '@/stores/files-store'
import { useImportTaskStore } from '@/stores/import-task-store'
import { cn } from '@/lib/utils'

interface SelectFileModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (files: WorkspaceFileDto[]) => void
  initialSelectedIds?: string[]
}

function formatDuration(duration: string) {
  const parts = duration.split(':')
  if (parts.length === 2) {
    return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  }
  return duration
}

export function SelectFileModal({
  open,
  onClose,
  onConfirm,
  initialSelectedIds = [],
}: SelectFileModalProps) {
  const titleId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fetchFiles = useFilesStore((s) => s.fetchFiles)
  const allFiles = useDisplayFiles()
  const setModalOpen = useImportTaskStore((s) => s.setModalOpen)

  useEffect(() => {
    if (open) void fetchFiles()
  }, [open, fetchFiles])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    setSelectedIds(new Set(initialSelectedIds))
  }, [open, initialSelectedIds])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allFiles
    return allFiles.filter((file) => file.title.toLowerCase().includes(q))
  }, [query, allFiles])

  if (!open) return null

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(filteredFiles.map((f) => f.id)))
  }

  const handleConfirm = () => {
    const files = allFiles.filter((f) => selectedIds.has(f.id))
    onConfirm(files)
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="select-file-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="select-file-modal"
      >
        <header className="select-file-header">
          <div className="select-file-header-main">
            <h2 id={titleId} className="select-file-title">
              选择文件
            </h2>
            <span className="select-file-safe">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              数据安全保护中
            </span>
          </div>
          <button type="button" className="select-file-close" onClick={onClose} aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="select-file-toolbar">
          <div className="select-file-tabs">
            <button type="button" className="select-file-tab is-active">
              {APP_NAME}文件
            </button>
          </div>
          <label className="select-file-search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="搜索"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="select-file-table-wrap">
          <table className="select-file-table">
            <thead>
              <tr>
                <th className="select-file-col-check">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={
                      filteredFiles.length > 0 && selectedIds.size === filteredFiles.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th>名称</th>
                <th>创建时间</th>
                <th>时长</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="select-file-empty">
                    {query ? (
                      '没有匹配的文件'
                    ) : (
                      <span className="select-file-empty-cta">
                        暂无文件，
                        <button
                          type="button"
                          className="select-file-import-link"
                          onClick={() => {
                            onClose()
                            setModalOpen(true)
                          }}
                        >
                          去导入音视频
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={cn(selectedIds.has(file.id) && 'is-selected')}
                    onClick={() => toggleFile(file.id)}
                  >
                    <td className="select-file-col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={() => toggleFile(file.id)}
                        aria-label={`选择 ${file.title}`}
                      />
                    </td>
                    <td className="select-file-name">{file.title}</td>
                    <td>{file.date}</td>
                    <td>{formatDuration(file.duration)}</td>
                    <td>{file.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="select-file-footer">
          <button type="button" className="select-file-btn-cancel" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="select-file-btn-confirm"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
          >
            确定
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
