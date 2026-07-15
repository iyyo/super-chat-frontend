import { ArrowLeft, ChevronRight, Download, FolderOpen, Home, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { APP_NAME, ROUTES, WORKSPACE_SIDEBAR_NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSidebarStore } from '@/stores/workspace-sidebar-store'

const ICONS = {
  home: Home,
  files: FolderOpen,
  message: Sparkles,
} as const

export function WorkspaceSidebar() {
  const { user } = useAuthStore()
  const collapsed = useWorkspaceSidebarStore((s) => s.collapsed)
  const toggleCollapsed = useWorkspaceSidebarStore((s) => s.toggleCollapsed)
  const displayName = user?.nickname ?? user?.username ?? '未登录'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside
      className={cn('workspace-sidebar', collapsed && 'is-collapsed')}
      aria-label="工作台导航"
    >
      <div className="workspace-sidebar-top">
        <div className="workspace-sidebar-top-row">
          {!collapsed ? (
            <Link to={ROUTES.official} className="workspace-sidebar-back">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              <span>返回官网</span>
            </Link>
          ) : null}
          <button
            type="button"
            className="workspace-sidebar-toggle"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
        <Link to={ROUTES.app} className="workspace-sidebar-brand" title={APP_NAME}>
          {collapsed ? <span className="workspace-sidebar-brand-mark">{APP_NAME.charAt(0)}</span> : APP_NAME}
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
              <span className="workspace-sidebar-link-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="workspace-sidebar-footer">
        <NavLink
          to={ROUTES.profile}
          className={({ isActive }) =>
            cn('workspace-sidebar-profile', isActive && 'is-active')
          }
        >
          <span className="workspace-sidebar-profile-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="workspace-sidebar-profile-text">
            <span className="workspace-sidebar-profile-name">{displayName}</span>
            <span className="workspace-sidebar-profile-label">
              个人中心
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </span>
        </NavLink>
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
