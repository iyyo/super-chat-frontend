import { useLayoutEffect, type ReactNode } from 'react'
import { applyBrandTheme } from '@/lib/theme'
import { useThemeStore } from '@/stores/theme-store'

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const brandColor = useThemeStore((s) => s.brandColor)

  useLayoutEffect(() => {
    applyBrandTheme(brandColor)
  }, [brandColor])

  return children
}
