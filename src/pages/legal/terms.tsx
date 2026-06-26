import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { termsOfService } from '@/content/legal/terms'

export function TermsPage() {
  return <LegalPageLayout doc={termsOfService} />
}
