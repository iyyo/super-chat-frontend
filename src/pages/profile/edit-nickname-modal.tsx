import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/modal'

interface EditNicknameModalProps {
  open: boolean
  initialNickname: string
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (nickname: string) => void
}

export function EditNicknameModal({
  open,
  initialNickname,
  saving,
  error,
  onClose,
  onSave,
}: EditNicknameModalProps) {
  const [nickname, setNickname] = useState(initialNickname)

  useEffect(() => {
    if (open) setNickname(initialNickname)
  }, [open, initialNickname])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="编辑昵称"
      footer={
        <div className="profile-modal-footer">
          <button type="button" className="profile-modal-btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="profile-modal-btn-primary"
            disabled={saving || !nickname.trim()}
            onClick={() => onSave(nickname.trim())}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      }
    >
      <label className="profile-modal-field">
        <span className="profile-modal-label">昵称</span>
        <input
          type="text"
          className="profile-modal-input"
          value={nickname}
          maxLength={20}
          placeholder="2-20 个字符"
          onChange={(e) => setNickname(e.target.value)}
        />
        <span className="profile-modal-hint">支持中文、英文、数字和下划线</span>
        {error && <span className="profile-modal-error">{error}</span>}
      </label>
    </Modal>
  )
}
