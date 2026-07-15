import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Mic, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import {
  isTranscribeDetailReady,
  isTranscribeJobActive,
  transcribeApi,
  type TranscribeJobDto,
  type UploadSessionDto,
} from '@/lib/api/transcribe'
import { rtasrApi, type RtAsrLiveSession } from '@/lib/api/rtasr'
import { formatMs } from '@/lib/parse-transcript'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useRecordingStore } from '@/stores/recording-store'
import { cn } from '@/lib/utils'

function jobStatusLabel(job: TranscribeJobDto) {
  if (isTranscribeDetailReady(job)) {
    return {
      text: job.status === 'completed' ? '已完成' : '可查看',
      tone: 'success' as const,
    }
  }
  switch (job.status) {
    case 'completed':
      return { text: '已完成', tone: 'success' as const }
    case 'failed':
      return { text: '失败', tone: 'error' as const }
    case 'transcribing':
    case 'uploading_to_xfyun':
      return { text: '转写中', tone: 'active' as const }
    case 'queued':
      return { text: '处理中', tone: 'active' as const }
    default:
      return { text: job.status, tone: 'muted' as const }
  }
}

function formatJobTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface ImportRecordsDrawerProps {
  open: boolean
  onClose: () => void
  onReopenImport: () => void
}

export function ImportRecordsDrawer({ open, onClose, onReopenImport }: ImportRecordsDrawerProps) {
  const navigate = useNavigate()
  const { jobHistory, historyLoading, fetchJobHistory, setModalOpen, phase, uploadProgress } =
    useImportTaskStore()
  const [uploadSessions, setUploadSessions] = useState<UploadSessionDto[]>([])
  const [liveRecording, setLiveRecording] = useState<RtAsrLiveSession | null>(null)
  const recordingPhase = useRecordingStore((s) => s.phase)
  const recordingTitle = useRecordingStore((s) => s.title)
  const recordingElapsed = useRecordingStore((s) => s.elapsedMs)

  useEffect(() => {
    if (!open) return
    void fetchJobHistory()
    transcribeApi
      .listUploads()
      .then(setUploadSessions)
      .catch(() => setUploadSessions([]))
    rtasrApi
      .getLiveSession()
      .then(setLiveRecording)
      .catch(() => setLiveRecording(null))
  }, [open, fetchJobHistory, recordingPhase])

  if (!open) return null

  const activeJobs = jobHistory.filter(isTranscribeJobActive)
  const rest = jobHistory.filter((job) => !isTranscribeJobActive(job))
  const showLocalUpload =
    (phase === 'uploading' || phase === 'upload_paused') && uploadSessions.length === 0
  const showLiveRecording =
    liveRecording &&
    (recordingPhase === 'recording' ||
      recordingPhase === 'paused' ||
      recordingPhase === 'connecting')

  const activeCount =
    uploadSessions.length + activeJobs.length + (showLocalUpload ? 1 : 0) + (showLiveRecording ? 1 : 0)

  const handleRetry = async (jobId: string) => {
    try {
      await transcribeApi.retryJob(jobId)
      void fetchJobHistory()
      setModalOpen(true)
      onReopenImport()
    } catch {
      // toast from api client
    }
  }

  return createPortal(
    <>
      <div className="import-drawer-backdrop" role="presentation" onClick={onClose} />
      <aside className="import-records-drawer" aria-label="导入记录">
        <header className="import-drawer-header">
          <h3>导入记录</h3>
          <div className="import-drawer-header-actions">
            <Link to={`${ROUTES.files}?tab=imports`} className="import-drawer-link" onClick={onClose}>
              全部 →
            </Link>
            <button type="button" className="import-drawer-close" onClick={onClose} aria-label="关闭">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="import-drawer-body">
          {historyLoading && (
            <p className="import-drawer-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </p>
          )}

          {(uploadSessions.length > 0 || showLocalUpload || activeJobs.length > 0 || showLiveRecording) && (
            <section className="import-drawer-section">
              <p className="import-drawer-section-title">进行中 ({activeCount})</p>
              {showLiveRecording && liveRecording && (
                <div className="import-drawer-card">
                  <p className="import-drawer-card-title">{recordingTitle || liveRecording.title || '录音中'}</p>
                  <p className="import-drawer-card-meta">
                    <span className="import-drawer-badge is-active">
                      <Mic className="h-3 w-3" />
                      {recordingPhase === 'paused' ? '已暂停' : '录音中'}
                    </span>
                    <span>{formatMs(recordingElapsed)}</span>
                  </p>
                  <button
                    type="button"
                    className="import-drawer-card-action"
                    onClick={() => {
                      navigate(ROUTES.record)
                      onClose()
                    }}
                  >
                    返回录音
                  </button>
                </div>
              )}
              {uploadSessions.map((session) => (
                <div key={session.id} className="import-drawer-card">
                  <p className="import-drawer-card-title">{session.fileName}</p>
                  <p className="import-drawer-card-meta">
                    <span className="import-drawer-badge is-active">上传中</span>
                    <span>{session.progress}%</span>
                    <span>
                      分片 {session.uploadedChunks.length}/{session.totalChunks}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="import-drawer-card-action"
                    onClick={() => {
                      setModalOpen(true)
                      onReopenImport()
                      onClose()
                    }}
                  >
                    继续上传
                  </button>
                </div>
              ))}
              {showLocalUpload && (
                <div className="import-drawer-card">
                  <p className="import-drawer-card-title">当前上传任务</p>
                  <p className="import-drawer-card-meta">
                    <span className="import-drawer-badge is-active">
                      {phase === 'upload_paused' ? '已暂停' : '上传中'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </p>
                  <button
                    type="button"
                    className="import-drawer-card-action"
                    onClick={() => {
                      setModalOpen(true)
                      onReopenImport()
                      onClose()
                    }}
                  >
                    查看进度
                  </button>
                </div>
              )}
              {activeJobs.map((job) => {
                const st = jobStatusLabel(job)
                return (
                  <div key={job.id} className="import-drawer-card">
                    <p className="import-drawer-card-title">{job.fileName}</p>
                    <p className="import-drawer-card-meta">
                      <span className={cn('import-drawer-badge', `is-${st.tone}`)}>{st.text}</span>
                      {job.progress > 0 && <span>{job.progress}%</span>}
                    </p>
                    <button
                      type="button"
                      className="import-drawer-card-action"
                      onClick={() => {
                        setModalOpen(true)
                        onReopenImport()
                        onClose()
                      }}
                    >
                      查看进度
                    </button>
                  </div>
                )
              })}
            </section>
          )}

          <section className="import-drawer-section">
            <p className="import-drawer-section-title">最近</p>
            {rest.length === 0 && !historyLoading && (
              <p className="import-drawer-empty">暂无导入记录</p>
            )}
            {rest.map((job) => {
              const st = jobStatusLabel(job)
              return (
                <div key={job.id} className="import-drawer-card">
                  <p className="import-drawer-card-title">{job.fileName}</p>
                  <p className="import-drawer-card-meta">
                    <span className={cn('import-drawer-badge', `is-${st.tone}`)}>{st.text}</span>
                    <span>{formatJobTime(job.createdAt)}</span>
                  </p>
                  <div className="import-drawer-card-actions">
                    {isTranscribeDetailReady(job) && job.workspaceFileId && (
                      <Link
                        to={ROUTES.fileDetail(job.workspaceFileId)}
                        className="import-drawer-card-action"
                        onClick={onClose}
                      >
                        查看文件
                      </Link>
                    )}
                    {job.canRetryTranscribe && (
                      <button
                        type="button"
                        className="import-drawer-card-action"
                        onClick={() => void handleRetry(job.id)}
                      >
                        重新转写
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        </div>
      </aside>
    </>,
    document.body,
  )
}
