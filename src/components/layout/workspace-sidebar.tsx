import { ArrowLeft, Download, FolderOpen, Home, Sparkles } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { APP_NAME, ROUTES, WORKSPACE_SIDEBAR_NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ICONS = {
  home: Home,
  files: FolderOpen,
  message: Sparkles,
} as const

export function WorkspaceSidebar() {
  return (
    <aside className="workspace-sidebar" aria-label="工作台导航">
      <div className="workspace-sidebar-top">
        <Link to={ROUTES.official} className="workspace-sidebar-back">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          <span>返回官网</span>
        </Link>
        <Link to={ROUTES.app} className="workspace-sidebar-brand">
          {APP_NAME}
        </Link>
      </div>

      <nav className="workspace-sidebar-nav">
        {WORKSPACE_SIDEBAR_NAV.map((item) => {
          const Icon = ICONS[item.icon]

          return (
            <NavLink
              key={`${item.label}-${item.path}`}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn('workspace-sidebar-link', isActive && 'is-active')
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="workspace-sidebar-footer">
        <div className="workspace-sidebar-promo">
          <p className="workspace-sidebar-promo-title">下载客户端</p>
          <p className="workspace-sidebar-promo-desc">桌面端录音更稳定，离线也能用</p>
        </div>
        <button type="button" className="workspace-sidebar-upgrade">
          <span>权益升级</span>
          <span className="workspace-sidebar-upgrade-tag">购买</span>
        </button>
        <button
          type="button"
          className="workspace-sidebar-download"
          aria-label="下载客户端"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
