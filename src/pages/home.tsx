import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mic, Search, Subtitles, Upload } from 'lucide-react'
import { ImportMediaModal } from '@/components/workspace/import-media-modal'
import { WorkspaceActionCard } from '@/components/workspace/workspace-action-card'
import {
  APP_ACTIONS,
  WORKSPACE_ACTIONS,
  WORKSPACE_RECENT_FILES,
} from '@/lib/constants'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') !== APP_ACTIONS.import) return
    setImportOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

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
            <div className="workspace-home-avatar" aria-hidden="true" />
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
                  onClick={() => setImportOpen(true)}
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
          <h2 className="workspace-recent-title">最近文件</h2>
          <ul className="workspace-recent-list">
            {WORKSPACE_RECENT_FILES.map((file) => (
              <li key={file.id}>
                <button type="button" className="workspace-recent-item w-full text-left">
                  <div className="workspace-recent-main">
                    <p className="workspace-recent-name">
                      {file.live && <span className="workspace-recent-live" aria-hidden="true" />}
                      {file.title}
                    </p>
                    {file.subtitle && (
                      <p className="workspace-recent-subtitle">{file.subtitle}</p>
                    )}
                  </div>
                  <div className="workspace-recent-meta">
                    <span>{file.duration}</span>
                    <span>{file.date}</span>
                    <span>{file.source}</span>
                    {file.tag && <span className="workspace-recent-tag">{file.tag}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ImportMediaModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
