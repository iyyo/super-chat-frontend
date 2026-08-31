import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { applyBrandTheme } from '@/lib/theme'
import { applyAppearanceTheme, migrateAppearanceThemeOnce, useAppStore } from '@/stores/app-store'
import { useThemeStore } from '@/stores/theme-store'

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const brandColor = useThemeStore((s) => s.brandColor)
  const appearance = useAppStore((s) => s.theme)

  useLayoutEffect(() => {
    migrateAppearanceThemeOnce()
    applyBrandTheme(brandColor)
  }, [brandColor])

  useLayoutEffect(() => {
    applyAppearanceTheme(appearance)
  }, [appearance])

  useEffect(() => {
    const unsubBrand = useThemeStore.persist.onFinishHydration((state) => {
      applyBrandTheme(state.brandColor)
    })
    const unsubApp = useAppStore.persist.onFinishHydration((state) => {
      applyAppearanceTheme(state.theme)
    })
    return () => {
      unsubBrand?.()
      unsubApp?.()
    }
  }, [])

  return children
}
