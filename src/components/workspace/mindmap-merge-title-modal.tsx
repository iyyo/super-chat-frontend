import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/modal'

interface MindmapMergeTitleModalProps {
  open: boolean
  labels: string[]
  onClose: () => void
  onConfirm: (title: string) => void
}

/** 本地即时标题：不打 AI，打开弹窗零等待 */
export function buildMindmapMergeTitle(labels: string[]): string {
  const parts = labels
    .map((l) =>
      l
        .trim()
        .replace(/[…．.]+$/g, '')
        .replace(/\s+/g, ''),
    )
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 2) {
    const [a, b] = parts
    if (a.includes(b)) return a.slice(0, 24)
    if (b.includes(a)) return b.slice(0, 24)
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1
    if (i >= 2) {
      const head = a.slice(0, i)
      const tails = [a.slice(i), b.slice(i)].filter(Boolean).join('·')
      return `${head}${tails}`.slice(0, 24)
    }
    return `${a}·${b}`.slice(0, 24)
  }
  return `${parts[0]}等${parts.length}项`.slice(0, 24)
}

export function MindmapMergeTitleModal({
  open,
  labels,
  onClose,
  onConfirm,
}: MindmapMergeTitleModalProps) {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(buildMindmapMergeTitle(labels))
  }, [open, labels])

  const canSubmit = title.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="合并知识点"
      className="summary-mindmap-merge-modal"
      footer={
        <>
          <button type="button" className="legal-modal-btn legal-modal-btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="legal-modal-btn legal-modal-btn-primary"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return
              onConfirm(title.trim())
            }}
          >
            确认合并
          </button>
        </>
      }
    >
      <p className="summary-mindmap-merge-lead">将以下知识点合并为一个节点，并设置新标题：</p>
      <ul className="summary-mindmap-merge-list">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>

      <label className="summary-mindmap-merge-field">
        <span className="summary-mindmap-merge-field-label">新标题</span>
        <input
          type="text"
          value={title}
          maxLength={24}
          autoFocus
          placeholder="输入合并后的标题"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) {
              e.preventDefault()
              onConfirm(title.trim())
            }
          }}
        />
      </label>
    </Modal>
  )
}
