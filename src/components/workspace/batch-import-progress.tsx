import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import type { BatchImportItem } from '@/stores/import-task-store'
import { cn } from '@/lib/utils'
import '@/styles/import-batch.css'

interface BatchImportProgressProps {
  items: BatchImportItem[]
  overallProgress: number
  succeeded: number
  failed: number
}
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function phaseLabel(item: BatchImportItem) {
  switch (item.phase) {
    case 'uploading':
      return `上传中 ${item.progress}%`
    case 'transcribing':
      return '转写中'
    case 'success':
      return '已完成'
    case 'error':
      return '失败'
  }
}

export function BatchImportProgress({
  items,
  overallProgress,
  succeeded,
  failed,
}: BatchImportProgressProps) {
  const completed = succeeded + failed
  const active = Math.max(0, items.length - completed)

  return (
    <div className="import-progress-panel import-batch-progress">
      <header className="import-batch-summary">
        <div>
          <h3>全部文件处理中</h3>
          <p>
            {active > 0 ? `${active} 个进行中` : '正在汇总结果'}
            {completed > 0 ? ` · ${completed}/${items.length} 已结束` : ''}
          </p>
        </div>
        <strong>{overallProgress}%</strong>
      </header>

      <div className="import-batch-overall" aria-label={`批量导入总进度 ${overallProgress}%`}>
        <span style={{ width: `${overallProgress}%` }} />
      </div>

      <ul className="import-batch-list">
        {items.map((item) => (
          <li key={item.id} className={cn('import-batch-item', `is-${item.phase}`)}>
            <span className="import-batch-status-icon" aria-hidden="true">
              {item.phase === 'success' ? (
                <Check />
              ) : item.phase === 'error' ? (
                <AlertTriangle />
              ) : (
                <Loader2 className="animate-spin" />
              )}
            </span>
            <div className="import-batch-item-main">
              <div className="import-batch-item-head">
                <strong title={item.fileName}>{item.fileName}</strong>
                <span>{phaseLabel(item)}</span>
              </div>
              <div className="import-batch-item-meta">
                <span>{formatSize(item.fileSize)}</span>
                {item.errorMessage ? <span className="is-error">{item.errorMessage}</span> : null}
              </div>
              <div className="import-batch-item-track" aria-hidden="true">
                <span style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
