import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { privacyPolicy } from '@/content/legal/privacy'

export function PrivacyPage() {
  return <LegalPageLayout doc={privacyPolicy} />
}
