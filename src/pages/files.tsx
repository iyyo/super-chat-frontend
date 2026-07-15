import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Loader2, Search, Star } from 'lucide-react'
import type { WorkspaceFileDto } from '@/lib/api/files'
import {
  isTranscribeDetailReady,
  isTranscribeJobActive,
  transcribeApi,
  type TranscribeJobDto,
} from '@/lib/api/transcribe'
import { WORKSPACE_FILE_TABS, ROUTES } from '@/lib/constants'
import { useDisplayFiles, useFilesStore, useFilesSummaryPolling } from '@/stores/files-store'
import { FileSummaryPreview } from '@/components/workspace/file-summary-preview'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useImportJobs } from '@/hooks/use-import-jobs'
import { cn } from '@/lib/utils'

function jobStatusBadge(job: TranscribeJobDto) {
  if (isTranscribeDetailReady(job)) {
    return { label: job.status === 'completed' ? '已完成' : '可查看', className: 'is-success' }
  }
  switch (job.status) {
    case 'completed':
      return { label: '已完成', className: 'is-success' }
    case 'failed':
      return { label: '失败', className: 'is-error' }
    case 'transcribing':
    case 'uploading_to_xfyun':
      return { label: '转写中', className: 'is-active' }
    default:
      return { label: job.status, className: '' }
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function FilesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab =
    tabParam === 'imports' ? 'imports' : (WORKSPACE_FILE_TABS[0].id as typeof WORKSPACE_FILE_TABS[number]['id'])
  const [activeTab, setActiveTab] = useState(initialTab)
  const { importJobs, jobsLoading, refreshJobs } = useImportJobs(activeTab === 'imports')

  const fetchFiles = useFilesStore((s) => s.fetchFiles)
  const allFiles = useDisplayFiles()
  const starredFiles = useMemo(() => allFiles.filter((f) => f.starred), [allFiles])
  const filesLoading = useFilesStore((s) => s.loading)
  useFilesSummaryPolling()
  const setModalOpen = useImportTaskStore((s) => s.setModalOpen)
  const tabCounts = {
    mine: allFiles.length,
    imports: importJobs.length,
    star: starredFiles.length,
    trash: 0,
  } as const
  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (tabParam === 'imports') setActiveTab('imports')
  }, [tabParam])


  const onTabChange = (id: (typeof WORKSPACE_FILE_TABS)[number]['id']) => {
    setActiveTab(id)
    if (id === 'imports') {
      setSearchParams({ tab: 'imports' })
    } else {
      setSearchParams({})
    }
  }

  const openFile = (file: WorkspaceFileDto) => {
    navigate(ROUTES.fileDetail(file.id))
  }

  const renderFileList = (files: WorkspaceFileDto[], emptyText: string, showImportCta = false) => {
    if (filesLoading) {
      return (
        <p className="files-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载文件…
        </p>
      )
    }
    if (files.length === 0) {
      return (
        <div className="files-empty">
          <p>{emptyText}</p>
          {showImportCta && (
            <button type="button" className="files-import-new-cta" onClick={() => setModalOpen(true)}>
              去导入音视频
            </button>
          )}
        </div>
      )
    }
    return (
      <ul className="workspace-recent-list files-list">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              className="workspace-recent-item files-row w-full text-left"
              onClick={() => openFile(file)}
            >
              <span className="files-row-icon" aria-hidden="true">
                <FileText className="h-4 w-4" />
              </span>
              <div className="workspace-recent-main">
                <p className="workspace-recent-name">
                  {file.starred && (
                    <Star className="files-item-star" fill="currentColor" aria-hidden />
                  )}
                  {file.title}
                </p>
                <FileSummaryPreview
                  subtitle={file.subtitle}
                  summaryPreview={file.summaryPreview}
                  summaryStatus={file.summaryStatus}
                />
              </div>
              <div className="workspace-recent-meta">
                <span>{file.duration}</span>
                <span>{file.date}</span>
                <span>{file.source}</span>
                {file.wordCount > 0 && <span>{file.wordCount} 字</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="workspace-home files-page">
      <header className="files-page-head">
        <div>
          <h1 className="files-page-title">文件</h1>
          <p className="files-page-subtitle">录音、导入和收藏内容集中管理</p>
        </div>
        <div className="files-head-actions">
          <button type="button" className="files-search-btn" aria-label="搜索文件">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" className="files-import-new" onClick={() => setModalOpen(true)}>
            新建导入
          </button>
        </div>
      </header>

      <div className="files-toolbar">
        <div className="files-tabs" role="tablist" aria-label="文件分类">
          {WORKSPACE_FILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn('files-tab', activeTab === tab.id && 'is-active')}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="files-tab-count">{tabCounts[tab.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'mine' ? (
        renderFileList(allFiles, '暂无文件，导入音视频后将出现在这里', true)
      ) : activeTab === 'star' ? (
        renderFileList(starredFiles, '暂无收藏文件，在文件详情页点击星标即可收藏')
      ) : activeTab === 'imports' ? (
        jobsLoading ? (
          <p className="files-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载导入记录…
          </p>
        ) : importJobs.length === 0 ? (
          <div className="files-empty">
            <p>暂无导入记录</p>
            <button type="button" className="files-import-new-cta" onClick={() => setModalOpen(true)}>
              去导入音视频
            </button>
          </div>
        ) : (
          <ul className="import-jobs-list">
            {importJobs.map((job) => {
              const badge = jobStatusBadge(job)
              const viewFileId = isTranscribeDetailReady(job) ? job.workspaceFileId : null
              return (
                <li key={job.id} className="import-jobs-row">
                  <div className="import-jobs-main">
                    <p className="import-jobs-name">{job.fileName}</p>
                    <p className="import-jobs-meta">
                      <span className={cn('import-jobs-badge', badge.className)}>{badge.label}</span>
                      <span>{formatTime(job.createdAt)}</span>
                      {isTranscribeJobActive(job) && <span>{job.progress}%</span>}
                      {job.resultText && <span>{job.resultText.length} 字</span>}
                    </p>
                  </div>
                  <div className="import-jobs-actions">
                    {viewFileId && (
                      <button
                        type="button"
                        className="import-jobs-action"
                        onClick={() => navigate(ROUTES.fileDetail(viewFileId))}
                      >
                        查看
                      </button>
                    )}
                    {job.canRetryTranscribe && (
                      <button
                        type="button"
                        className="import-jobs-action"
                        onClick={() => void transcribeApi.retryJob(job.id).then(() => refreshJobs())}
                      >
                        重新转写
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )
      ) : (
        <div className="files-empty">
          <p>回收站为空</p>
        </div>
      )}

      <p className="files-ai-note">以上内容由人工智能生成</p>
    </div>
  )
}
