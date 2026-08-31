import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { WorkspaceMobileHeader } from '@/components/layout/workspace-mobile-header'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { ImportMediaModal } from '@/components/workspace/import-media-modal'
import { ImportRecordsDrawer } from '@/components/workspace/import-records-drawer'
import { WorkspaceActivityRail } from '@/components/workspace/workspace-activity-rail'
import { ROUTES } from '@/lib/constants'
import { isFileDetailPath } from '@/lib/workspace-routes'
import { useImportTaskStore } from '@/stores/import-task-store'
import { useWorkspaceSidebarStore } from '@/stores/workspace-sidebar-store'
import { cn } from '@/lib/utils'
import '@/styles/official.css'
import '@/styles/app-workspace.css'

export function AppLayout() {
  const { pathname } = useLocation()
  const isManualPage = pathname === ROUTES.manual
  const isFileDetail = isFileDetailPath(pathname)
  const collapsed = useWorkspaceSidebarStore((s) => s.collapsed)
  const setCollapsed = useWorkspaceSidebarStore((s) => s.setCollapsed)
  const sidebarBeforeDetailRef = useRef<boolean | null>(null)
  const recordsOpen = useImportTaskStore((s) => s.recordsOpen)
  const setRecordsOpen = useImportTaskStore((s) => s.setRecordsOpen)
  const modalOpen = useImportTaskStore((s) => s.modalOpen)
  const setModalOpen = useImportTaskStore((s) => s.setModalOpen)

  useEffect(() => {
    if (isFileDetail) {
      if (sidebarBeforeDetailRef.current === null) {
        sidebarBeforeDetailRef.current = useWorkspaceSidebarStore.getState().collapsed
      }
      setCollapsed(true)
      return
    }
    if (sidebarBeforeDetailRef.current !== null) {
      setCollapsed(sidebarBeforeDetailRef.current)
      sidebarBeforeDetailRef.current = null
    }
  }, [isFileDetail, setCollapsed])

  return (
    <div
      className={cn(
        'app-workspace',
        isManualPage && 'app-workspace-standalone',
        collapsed && 'is-sidebar-collapsed',
        isFileDetail && 'is-file-detail-view',
      )}
    >
      {!isManualPage && <WorkspaceSidebar />}
      <div className="app-workspace-main">
        {!isManualPage && <WorkspaceMobileHeader />}
        <Outlet />
      </div>
      {!isManualPage && <WorkspaceActivityRail />}
      <ImportRecordsDrawer
        open={recordsOpen}
        onClose={() => setRecordsOpen(false)}
        onReopenImport={() => setModalOpen(true)}
      />
      <ImportMediaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
