import { createContext, useCallback, useContext, type ReactNode } from 'react'

export const OFFICIAL_EXPLORER_ANCHORS = ['#products', '#enterprise'] as const
export type OfficialExplorerAnchor = (typeof OFFICIAL_EXPLORER_ANCHORS)[number]

export const OFFICIAL_EXPLORER_ANCHOR_EVENT = 'official-explorer-anchor'

interface ScrollToOptions {
  offset?: number
}

interface OfficialScrollContextValue {
  scrollTo: (target: string, options?: ScrollToOptions) => void
}

const OfficialScrollContext = createContext<OfficialScrollContextValue | null>(null)

function isExplorerAnchor(target: string): target is OfficialExplorerAnchor {
  return (OFFICIAL_EXPLORER_ANCHORS as readonly string[]).includes(target)
}

/** 官网专用：原生滚动 + 锚点平滑，避免 Lenis 带来的卡顿感 */
export function OfficialScrollProvider({ children }: { children: ReactNode }) {
  const scrollTo = useCallback((target: string, options?: ScrollToOptions) => {
    if (isExplorerAnchor(target)) {
      window.history.replaceState(null, '', target)
      window.dispatchEvent(
        new CustomEvent(OFFICIAL_EXPLORER_ANCHOR_EVENT, { detail: { target } }),
      )
      return
    }

    const el = document.querySelector(target)
    if (!el) return
    const offset = options?.offset ?? -64
    const top = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top, behavior: 'smooth' })
  }, [])

  return (
    <OfficialScrollContext.Provider value={{ scrollTo }}>
      {children}
    </OfficialScrollContext.Provider>
  )
}

export function useOfficialScroll() {
  const ctx = useContext(OfficialScrollContext)
  if (!ctx) {
    throw new Error('useOfficialScroll must be used within OfficialScrollProvider')
  }
  return ctx
}
