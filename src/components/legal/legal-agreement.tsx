import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/modal'
import { LegalDocumentBody } from '@/components/legal/legal-document-body'
import { privacyPolicy } from '@/content/legal/privacy'
import { termsOfService } from '@/content/legal/terms'
import { ROUTES } from '@/lib/constants'
import '@/styles/legal.css'

type LegalType = 'terms' | 'privacy'

interface LegalAgreementProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function LegalAgreement({ checked, onChange, disabled }: LegalAgreementProps) {
  const [modal, setModal] = useState<LegalType | null>(null)

  const doc = modal === 'terms' ? termsOfService : modal === 'privacy' ? privacyPolicy : null

  const openModal = (type: LegalType) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModal(type)
  }

  return (
    <>
      <label className="auth-checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span>
          我已阅读并同意
          <button type="button" className="auth-link auth-link-inline" onClick={openModal('terms')}>
            用户协议
          </button>
          与
          <button type="button" className="auth-link auth-link-inline" onClick={openModal('privacy')}>
            隐私政策
          </button>
          （
          <Link
            to={ROUTES.legalTerms}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-link"
            onClick={(e) => e.stopPropagation()}
          >
            完整版
          </Link>
          ）
        </span>
      </label>

      {doc && (
        <Modal
          open
          title={doc.title}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="legal-modal-btn legal-modal-btn-ghost" onClick={() => setModal(null)}>
                关闭
              </button>
              <button
                type="button"
                className="legal-modal-btn legal-modal-btn-primary"
                onClick={() => {
                  onChange(true)
                  setModal(null)
                }}
              >
                我已阅读并同意
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-[var(--ifly-text-secondary)]">{doc.intro}</p>
          <LegalDocumentBody doc={doc} compact />
        </Modal>
      )}
    </>
  )
}
