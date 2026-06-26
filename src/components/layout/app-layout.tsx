import { Outlet, useLocation } from 'react-router-dom'
import { WorkspaceMobileHeader } from '@/components/layout/workspace-mobile-header'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import '@/styles/app-workspace.css'

export function AppLayout() {
  const { pathname } = useLocation()
  const isManualPage = pathname === ROUTES.manual

  return (
    <div className={cn('app-workspace', isManualPage && 'app-workspace-standalone')}>
      {!isManualPage && <WorkspaceSidebar />}
      <div className="app-workspace-main">
        {!isManualPage && <WorkspaceMobileHeader />}
        <Outlet />
      </div>
    </div>
  )
}
