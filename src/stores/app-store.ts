import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  /** 工作台阅读外观：light 默认，dark 对齐「暗黑阅读模式」 */
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'iyy-app' },
  ),
)

export function applyAppearanceTheme(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.appearance = theme
  document.documentElement.style.colorScheme = theme
}

/** 旧版默认误写成 dark，首次升级到 light，避免工作台被暗色打穿 */
export function migrateAppearanceThemeOnce() {
  if (typeof window === 'undefined') return
  const key = 'iyy-appearance-migrated-v1'
  if (window.localStorage.getItem(key)) return
  try {
    const raw = window.localStorage.getItem('iyy-app')
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: string } }
      if (parsed?.state?.theme === 'dark') {
        useAppStore.getState().setTheme('light')
      }
    }
  } catch {
    // ignore
  }
  window.localStorage.setItem(key, '1')
}
