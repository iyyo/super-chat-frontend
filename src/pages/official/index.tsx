import { useLayoutEffect } from 'react'
import { OfficialNavbar } from '@/components/official/navbar'
import { HeroBanner } from '@/components/official/hero-banner'
import { TrustStrip } from '@/components/official/trust-strip'
import { LogoWallSection } from '@/components/official/logo-wall-section'
import { ScenarioExplorerSection } from '@/components/official/scenario-explorer-section'
import { UserStoriesSection } from '@/components/official/user-stories-section'
import { CtaSection } from '@/components/official/cta-section'
import { OfficialFooter } from '@/components/official/footer'
import { FloatingTrialButton } from '@/components/official/floating-trial-button'
import { OfficialScrollProvider } from '@/hooks/use-official-scroll'
import '@/styles/official.css'
import '@/styles/official-illustrations.css'

export function OfficialHomePage() {
  useLayoutEffect(() => {
    document.documentElement.classList.add('official-route-active')
    return () => document.documentElement.classList.remove('official-route-active')
  }, [])

  return (
    <OfficialScrollProvider>
      <div className="official-site min-h-full">
        <OfficialNavbar />
        <main>
          <HeroBanner />
          <TrustStrip />
          <LogoWallSection />
          <ScenarioExplorerSection />
          <UserStoriesSection />
          <CtaSection />
        </main>
        <OfficialFooter />
        <FloatingTrialButton />
      </div>
    </OfficialScrollProvider>
  )
}
