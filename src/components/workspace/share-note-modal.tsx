import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { buildShareUrl } from '@/lib/constants'
import { filesApi } from '@/lib/api/files'
import { toast } from '@/stores/toast-store'
import '@/styles/legal.css'
import '@/styles/share.css'

interface ShareNoteModalProps {
  open: boolean
  onClose: () => void
  fileId: string
  fileTitle: string
  initialEnabled?: boolean
  initialToken?: string | null
  onShareChange?: (enabled: boolean, token: string | null) => void
}

export function ShareNoteModal({
  open,
  onClose,
  fileId,
  fileTitle,
  initialEnabled = false,
  initialToken = null,
  onShareChange,
}: ShareNoteModalProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [token, setToken] = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setEnabled(initialEnabled)
    setToken(initialToken)
    setCopied(false)
  }, [open, initialEnabled, initialToken])

  const shareUrl = token ? buildShareUrl(token) : ''

  const handleEnable = async () => {
    setLoading(true)
    try {
      const result = await filesApi.enableShare(fileId)
      setEnabled(result.enabled)
      setToken(result.token)
      onShareChange?.(result.enabled, result.token)
      toast.success('分享链接已生成')
    } catch {
      toast.error('开启分享失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    setLoading(true)
    try {
      await filesApi.disableShare(fileId)
      setEnabled(false)
      setToken(null)
      onShareChange?.(false, null)
      toast.success('已关闭分享')
    } catch {
      toast.error('关闭分享失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('链接已复制')
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="分享笔记"
      className="share-note-modal"
      footer={
        <div className="share-note-modal-footer">
          {enabled ? (
            <button
              type="button"
              className="share-note-btn share-note-btn-danger"
              disabled={loading}
              onClick={() => void handleDisable()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '关闭分享'}
            </button>
          ) : (
            <button
              type="button"
              className="share-note-btn share-note-btn-primary"
              disabled={loading}
              onClick={() => void handleEnable()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '生成分享链接'}
            </button>
          )}
        </div>
      }
    >
      <div className="share-note-modal-body">
        <p className="share-note-desc">
          为「<strong>{fileTitle}</strong>」生成公开链接，持有链接的人可查看纪要与转写笔记（不含原始音频）。
        </p>

        {enabled && token ? (
          <div className="share-note-link-box">
            <div className="share-note-link-icon" aria-hidden>
              <Link2 className="h-4 w-4" />
            </div>
            <input
              type="text"
              className="share-note-link-input"
              value={shareUrl}
              readOnly
              aria-label="分享链接"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="share-note-copy-btn"
              aria-label="复制链接"
              onClick={() => void handleCopy()}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="share-note-empty">
            <Link2 className="share-note-empty-icon" />
            <p>尚未开启分享，点击「生成分享链接」即可创建</p>
          </div>
        )}

        <ul className="share-note-tips">
          <li>链接长期有效，直到你手动关闭分享</li>
          <li>关闭分享后，已有链接将无法访问</li>
        </ul>
      </div>
    </Modal>
  )
}
