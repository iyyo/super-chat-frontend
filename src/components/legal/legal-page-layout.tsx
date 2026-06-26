import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BrandThemeTrigger } from '@/components/theme/brand-theme-trigger'
import { LegalDocumentBody } from '@/components/legal/legal-document-body'
import type { LegalDocument } from '@/content/legal/types'
import { ROUTES } from '@/lib/constants'
import '@/styles/legal.css'

interface LegalPageLayoutProps {
  doc: LegalDocument
}

export function LegalPageLayout({ doc }: LegalPageLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <button type="button" className="legal-back" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回
          </button>
          <BrandThemeTrigger variant="official" />
        </div>
      </header>

      <main className="legal-body">
        <h1 className="legal-doc-title">{doc.title}</h1>
        <LegalDocumentBody doc={doc} />
        <p className="mt-8 text-center text-sm text-[var(--ifly-text-muted)]">
          <Link to={ROUTES.official} className="text-[var(--ifly-blue)] hover:underline">
            返回首页
          </Link>
        </p>
      </main>
    </div>
  )
}
