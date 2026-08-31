import { createPortal } from 'react-dom'
import { formatMs } from '@/lib/parse-transcript'
import type { RtAsrLiveSession } from '@/lib/api/rtasr'

interface RecordingRecoveryModalProps {
  live: RtAsrLiveSession
  onResume: () => void
  onDiscard: () => void
}

export function RecordingRecoveryModal({ live, onResume, onDiscard }: RecordingRecoveryModalProps) {
  const segmentCount = live.checkpoint?.segments?.length ?? 0
  const elapsed = live.elapsedMs ?? 0

  return createPortal(
    <div className="record-modal-overlay" role="presentation">
      <div className="record-modal" role="dialog" aria-modal="true">
        <h2>恢复录音</h2>
        <p>
          当前账号有未完成的录音「{live.title || '未命名'}」，已录 {formatMs(elapsed)}，
          共 {segmentCount} 句转写。是否继续？
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
