import { createPortal } from 'react-dom'
import { formatMs } from '@/lib/parse-transcript'
import type { RtAsrInterruptNotice } from '@/lib/api/rtasr'

interface RecordingInterruptModalProps {
  notice: RtAsrInterruptNotice
  onContinue: () => void
  onDismiss: () => void
  onOpenFile?: () => void
}

export function RecordingInterruptModal({
  notice,
  onContinue,
  onDismiss,
  onOpenFile,
}: RecordingInterruptModalProps) {
  return createPortal(
    <div className="record-modal-overlay" role="presentation">
      <div className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-interrupt-title">
        <h2 id="record-interrupt-title">录音异常中断</h2>
        <p>
          账号下检测到录音「{notice.title || '未命名'}」因网络异常中断，已录 {formatMs(notice.elapsedMs)}，
          共 {notice.segmentCount} 句转写
          {notice.fileId ? '，并已自动保存到文件库' : ''}。
          是否需要追录后续内容？
        </p>
        <div className="record-modal-actions">
          <button type="button" className="record-modal-cancel" onClick={onDismiss}>
            不用了
          </button>
          {notice.fileId && onOpenFile ? (
            <button type="button" className="record-modal-cancel" onClick={onOpenFile}>
              查看已保存
            </button>
          ) : null}
          <button type="button" className="record-modal-confirm" onClick={onContinue}>
            追录
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
