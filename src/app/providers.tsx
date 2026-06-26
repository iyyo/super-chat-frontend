import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BrandThemeProvider } from '@/components/theme/brand-theme-provider'
import { ToastContainer } from '@/components/ui/toast-container'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <BrandThemeProvider>
        {children}
        <ToastContainer />
      </BrandThemeProvider>
    </BrowserRouter>
  )
}
