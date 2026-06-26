import type { LegalDocument } from '@/content/legal/types'

interface LegalDocumentBodyProps {
  doc: LegalDocument
  compact?: boolean
}

export function LegalDocumentBody({ doc, compact = false }: LegalDocumentBodyProps) {
  return (
    <>
      {!compact && (
        <>
          <p className="legal-doc-meta">最近更新：{doc.updatedAt}</p>
          <div className="legal-doc-intro">{doc.intro}</div>
          <nav className="legal-toc" aria-label="目录">
            <p className="legal-toc-title">目录</p>
            <ul className="legal-toc-list">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="legal-toc-link">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      {compact && <p className="legal-doc-meta">最近更新：{doc.updatedAt}</p>}

      {doc.sections.map((section) => (
        <section key={section.id} id={compact ? undefined : section.id} className="legal-section">
          <h3 className="legal-section-title">{section.title}</h3>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
          {section.list && (
            <ul>
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {!compact && (
        <p className="legal-footer-note">
          本文档为产品模板，正式上线前请由法务审核并根据实际业务、数据处理流程修订。
        </p>
      )}
    </>
  )
}
