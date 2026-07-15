import { Loader2, Upload } from 'lucide-react'
import { useImportTaskStore } from '@/stores/import-task-store'

export function ImportTaskCapsule() {
  const { phase, fileName, uploadProgress, modalOpen, setModalOpen, batchTotal, batchCurrent } =
    useImportTaskStore()

  const show =
    !modalOpen &&
    (phase === 'uploading' || phase === 'upload_paused' || phase === 'transcribing')

  if (!show || !fileName) return null

  const label =
    phase === 'transcribing'
      ? '转写中'
      : phase === 'upload_paused'
        ? '已暂停'
        : '上传中'

  const batchPrefix = batchTotal > 1 ? `${batchCurrent}/${batchTotal} · ` : ''

  return (
    <button
      type="button"
      className="import-task-capsule"
      onClick={() => setModalOpen(true)}
      aria-label={`${label} ${fileName}`}
    >
      <Upload className="h-3.5 w-3.5 shrink-0" />
      <span className="import-task-capsule-label">{label}</span>
      <span className="import-task-capsule-name">
        {batchPrefix}
        {fileName}
      </span>
      <span className="import-task-capsule-progress">
        {phase === 'transcribing' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          `${uploadProgress}%`
        )}
      </span>
    </button>
  )
}
