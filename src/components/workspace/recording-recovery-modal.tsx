import { createPortal } from 'react-dom'
import { formatMs } from '@/lib/parse-transcript'
import type { RecordingRecoverySnapshot } from '@/lib/rtasr/recording-recovery'

interface RecordingRecoveryModalProps {
  snapshot: RecordingRecoverySnapshot
  onResume: () => void
  onDiscard: () => void
}

export function RecordingRecoveryModal({ snapshot, onResume, onDiscard }: RecordingRecoveryModalProps) {
  return createPortal(
    <div className="record-modal-overlay" role="presentation">
      <div className="record-modal" role="dialog" aria-modal="true">
        <h2>恢复录音</h2>
        <p>
          检测到未完成的录音「{snapshot.title || '未命名'}」，已录 {formatMs(snapshot.elapsedMs)}，
          共 {snapshot.segments.length} 句转写。是否继续？
        </p>
        <div className="record-modal-actions">
          <button type="button" className="record-modal-cancel" onClick={onDiscard}>
            放弃
          </button>
          <button type="button" className="record-modal-confirm" onClick={onResume}>
            继续录音
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
