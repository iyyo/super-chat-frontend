import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Mic, Search, Subtitles, Upload, X } from 'lucide-react'
import { WorkspaceActionCard } from '@/components/workspace/workspace-action-card'
import { FileSummaryPreview } from '@/components/workspace/file-summary-preview'
import { EmptyState } from '@/components/ui/empty-state'
import {
  APP_ACTIONS,
  ROUTES,
  WORKSPACE_ACTIONS,
} from '@/lib/constants'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useDisplayFiles, useFilesStore, useRecentFiles } from '@/stores/files-store'
import { useAuthStore } from '@/stores/auth-store'

const ACTION_ICONS = {
  record: Mic,
  import: Upload,
  subtitle: Subtitles,
} as const

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const setModalOpen = useImportTaskStore((s) => s.setModalOpen)
  const fetchFiles = useFilesStore((s) => s.fetchFiles)
  const allFiles = useDisplayFiles()
  const filesLoaded = useFilesStore((s) => s.loaded)
  const filesLoading = useFilesStore((s) => s.loading)
  const recentFiles = useRecentFiles(5)
  const { user, isAuthenticated } = useAuthStore()
  const avatarInitial = (user?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (searchParams.get('action') === APP_ACTIONS.import) {
      setModalOpen(true)
      setSearchParams({}, { replace: true })
      return
    }
    if (searchParams.get('action') === APP_ACTIONS.record) {
      setSearchParams({}, { replace: true })
      navigate(ROUTES.record)
    }
  }, [searchParams, setSearchParams, setModalOpen, navigate])

  const normalized = query.trim().toLowerCase()
  const searchHits = useMemo(() => {
    if (!normalized) return []
    return allFiles
      .filter((f) => {
        const hay = `${f.title} ${f.subtitle ?? ''} ${f.summaryPreview?.join(' ') ?? ''}`.toLowerCase()
        return hay.includes(normalized)
      })
      .slice(0, 8)
  }, [allFiles, normalized])

  const listFiles = searchOpen && normalized ? searchHits : recentFiles

  return (
    <>
      <div className="workspace-home">
        <div className="workspace-home-hero">
          <header className="workspace-home-header">
            <div>
              <p className="workspace-home-eyebrow">IYY 工作台</p>
              <h1 className="workspace-home-greeting">{getGreeting()}</h1>
              <p className="workspace-home-subline">正在发生的，值得被记录</p>
            </div>
            <div className="workspace-home-tools">
              {searchOpen ? (
                <div className="workspace-home-search">
                  <Search className="h-4 w-4 shrink-0" aria-hidden />
                  <input
                    type="search"
                    autoFocus
                    value={query}
                    placeholder="搜索文件标题 / 摘要"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchOpen(false)
                        setQuery('')
                      }
                      if (e.key === 'Enter' && query.trim()) {
                        navigate(`${ROUTES.files}?q=${encodeURIComponent(query.trim())}`)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="workspace-home-tool-btn"
                    aria-label="关闭搜索"
                    onClick={() => {
                      setSearchOpen(false)
                      setQuery('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="workspace-home-tool-btn"
                  aria-label="搜索"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
              <Link
                to={ROUTES.profile}
                className="workspace-home-avatar"
                aria-label="个人中心"
              >
                {isAuthenticated ? avatarInitial : null}
              </Link>
            </div>
          </header>

          <div className="workspace-actions">
            {WORKSPACE_ACTIONS.map((action) => {
              const Icon = ACTION_ICONS[action.id]

              if ('opensImportModal' in action && action.opensImportModal) {
                return (
                  <WorkspaceActionCard
                    key={action.id}
                    id={action.id}
                    title={action.title}
                    desc={action.desc}
                    icon={Icon}
                    onClick={() => setModalOpen(true)}
                  />
                )
              }

              return (
                <WorkspaceActionCard
                  key={action.id}
                  id={action.id}
                  title={action.title}
                  desc={action.desc}
                  icon={Icon}
                  href={'href' in action ? action.href : '#'}
                />
              )
            })}
          </div>
        </div>

        <section id="files" className="workspace-recent">
          <div className="workspace-recent-head">
            <h2 className="workspace-recent-title">
              {searchOpen && normalized ? `搜索结果（${searchHits.length}）` : '最近文件'}
            </h2>
            <Link
              to={normalized ? `${ROUTES.files}?q=${encodeURIComponent(query.trim())}` : ROUTES.files}
              className="workspace-recent-more"
            >
              {normalized ? '在文件库查看全部' : '查看全部'}
            </Link>
          </div>
          {!filesLoaded && filesLoading ? (
            <ul className="workspace-recent-list" aria-hidden>
              {Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="workspace-recent-item workspace-recent-item--skeleton">
                  <div className="workspace-recent-main">
                    <div className="workspace-recent-skeleton-line is-title" />
                    <div className="workspace-recent-skeleton-line is-subtitle" />
                  </div>
                  <div className="workspace-recent-meta">
                    <div className="workspace-recent-skeleton-line is-meta" />
                  </div>
                </li>
              ))}
            </ul>
          ) : listFiles.length === 0 ? (
            <EmptyState
              title={normalized ? '没有匹配的文件' : '还没有最近文件'}
              description={
                normalized
                  ? '试试换个关键词，或到文件库浏览全部'
                  : '导入音视频，开始整理你的第一份内容'
              }
              actionLabel={normalized ? undefined : '导入音视频'}
              onAction={normalized ? undefined : () => setModalOpen(true)}
            />
          ) : (
            <ul className="workspace-recent-list">
              {listFiles.map((file) => (
                <li key={file.id}>
                  <Link to={ROUTES.fileDetail(file.id)} className="workspace-recent-item w-full text-left">
                    <span className="workspace-recent-icon" aria-hidden>
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="workspace-recent-main">
                      <p className="workspace-recent-name">{file.title}</p>
                      <FileSummaryPreview
                        subtitle={file.subtitle}
                        summaryPreview={file.summaryPreview}
                        summaryStatus={file.summaryStatus}
                      />
                    </div>
                    <div className="workspace-recent-meta">
                      <span>{file.duration}</span>
                      <span>{file.date}</span>
                      <span className="workspace-recent-tag">{file.source}</span>
                      {file.wordCount > 0 && <span>{file.wordCount} 字</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
