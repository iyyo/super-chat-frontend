import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mic, Search, Subtitles, Upload } from 'lucide-react'
import { WorkspaceActionCard } from '@/components/workspace/workspace-action-card'
import {
  APP_ACTIONS,
  ROUTES,
  WORKSPACE_ACTIONS,
} from '@/lib/constants'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useFilesStore, useRecentFiles } from '@/stores/files-store'
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
  const filesLoaded = useFilesStore((s) => s.loaded)
  const filesLoading = useFilesStore((s) => s.loading)
  const recentFiles = useRecentFiles(5)
  const { user, isAuthenticated } = useAuthStore()
  const avatarInitial = (user?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()

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

  return (
    <>
      <div className="workspace-home">
        <header className="workspace-home-header">
          <div>
            <h1 className="workspace-home-greeting">{getGreeting()} ☀️</h1>
            <p className="workspace-home-subline">正在发生的，值得被记录</p>
          </div>
          <div className="workspace-home-tools">
            <button type="button" className="workspace-home-tool-btn" aria-label="搜索">
              <Search className="h-4 w-4" />
            </button>
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

        <section id="files" className="workspace-recent">
          <div className="workspace-recent-head">
            <h2 className="workspace-recent-title">最近文件</h2>
            <Link to={ROUTES.files} className="workspace-recent-more">
              查看全部
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
          ) : recentFiles.length === 0 ? (
            <p className="workspace-recent-empty">
              暂无文件，
              <button type="button" className="workspace-recent-import" onClick={() => setModalOpen(true)}>
                去导入
              </button>
            </p>
          ) : (
            <ul className="workspace-recent-list">
              {recentFiles.map((file) => (
                <li key={file.id}>
                  <Link to={ROUTES.fileDetail(file.id)} className="workspace-recent-item w-full text-left">
                    <div className="workspace-recent-main">
                      <p className="workspace-recent-name">{file.title}</p>
                      <p className="workspace-recent-subtitle">
                        {file.subtitle || '\u00a0'}
                      </p>
                    </div>
                    <div className="workspace-recent-meta">
                      <span>{file.duration}</span>
                      <span>{file.date}</span>
                      <span>{file.source}</span>
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
