import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceSidebarState {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

export const useWorkspaceSidebarStore = create<WorkspaceSidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set({ collapsed: !get().collapsed }),
    }),
    { name: 'iyy-workspace-sidebar' },
  ),
)
