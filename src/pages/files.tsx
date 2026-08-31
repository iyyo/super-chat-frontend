import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import type { WorkspaceFileDto } from '@/lib/api/files'
import {
  isTranscribeDetailReady,
  isTranscribeJobActive,
  transcribeApi,
  type TranscribeJobDto,
} from '@/lib/api/transcribe'
import { WORKSPACE_FILE_TABS, ROUTES } from '@/lib/constants'
import { useDisplayFiles, useFilesStore, useFilesSummaryPolling } from '@/stores/files-store'
import { FileTimeline } from '@/components/workspace/file-timeline'
import { EmptyState } from '@/components/ui/empty-state'
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
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [searchOpen, setSearchOpen] = useState(() => Boolean(searchParams.get('q')))
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

  const normalizedQuery = query.trim().toLowerCase()
  const filteredMine = useMemo(() => {
    if (!normalizedQuery) return allFiles
    return allFiles.filter((f) => {
      const hay = `${f.title} ${f.subtitle ?? ''} ${f.summaryPreview?.join(' ') ?? ''}`.toLowerCase()
      return hay.includes(normalizedQuery)
    })
  }, [allFiles, normalizedQuery])
  const filteredStar = useMemo(() => {
    if (!normalizedQuery) return starredFiles
    return starredFiles.filter((f) => {
      const hay = `${f.title} ${f.subtitle ?? ''} ${f.summaryPreview?.join(' ') ?? ''}`.toLowerCase()
      return hay.includes(normalizedQuery)
    })
  }, [starredFiles, normalizedQuery])

  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (tabParam === 'imports') setActiveTab('imports')
  }, [tabParam])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      setSearchOpen(true)
    }
  }, [searchParams])

  const onTabChange = (id: (typeof WORKSPACE_FILE_TABS)[number]['id']) => {
    setActiveTab(id)
    const next = new URLSearchParams()
    if (id === 'imports') next.set('tab', 'imports')
    if (query.trim()) next.set('q', query.trim())
    setSearchParams(next)
  }

  const syncQueryToUrl = (value: string) => {
    setQuery(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    if (activeTab === 'imports') next.set('tab', 'imports')
    setSearchParams(next, { replace: true })
  }

  const openFile = (file: WorkspaceFileDto) => {
    navigate(ROUTES.fileDetail(file.id))
  }

  const renderFileList = (
    files: WorkspaceFileDto[],
    emptyTitle: string,
    emptyDescription: string,
    showImportCta = false,
  ) => {
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
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={showImportCta ? '导入音视频' : undefined}
          onAction={showImportCta ? () => setModalOpen(true) : undefined}
        />
      )
    }
    return <FileTimeline files={files} onOpen={openFile} />
  }

  return (
    <div className="workspace-home files-page">
      <header className="files-page-head">
        <div className="files-page-copy">
          <p className="files-page-eyebrow">内容库</p>
          <h1 className="files-page-title">文件</h1>
          <p className="files-page-subtitle">录音、导入与收藏，集中整理可检索的知识资产</p>
        </div>
        <div className="files-head-actions">
          {searchOpen ? (
            <div className="files-search-field">
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <input
                type="search"
                autoFocus
                value={query}
                placeholder="搜索标题 / 摘要"
                onChange={(e) => syncQueryToUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false)
                    syncQueryToUrl('')
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="files-search-btn"
              aria-label="搜索文件"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </button>
          )}
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
        renderFileList(
          filteredMine,
          normalizedQuery ? '没有匹配的文件' : '这里还没有文件',
          normalizedQuery ? '试试换个关键词' : '导入音视频后，文件会出现在这里',
          !normalizedQuery,
        )
      ) : activeTab === 'star' ? (
        renderFileList(
          filteredStar,
          normalizedQuery ? '没有匹配的收藏' : '还没有收藏',
          normalizedQuery ? '试试换个关键词' : '在文件详情页点击星标，重要内容会集中在这里',
        )
      ) : activeTab === 'imports' ? (
        jobsLoading ? (
          <p className="files-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载导入记录…
          </p>
        ) : importJobs.length === 0 ? (
          <EmptyState
            title="还没有导入记录"
            description="已导入的音视频和处理进度会显示在这里"
            actionLabel="导入音视频"
            onAction={() => setModalOpen(true)}
          />
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
        <EmptyState title="回收站为空" description="删除的文件会暂时保存在这里" />
      )}

      <p className="files-ai-note">以上内容由人工智能生成</p>
    </div>
  )
}
