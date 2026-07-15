import { useEffect, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { ChapterOverview } from '@/components/workspace/chapter-overview'
import { SummaryBrief } from '@/components/workspace/summary-brief'
import { SummaryMinutes } from '@/components/workspace/summary-minutes'
import { SummaryVisualCard } from '@/components/workspace/summary-visual-card'
import type { StructuredSummaryDocument } from '@/lib/structured-summary-document'

interface StructuredSummaryPanelProps {
  document: StructuredSummaryDocument
  onCopy?: () => void
  onSeekChapter?: (startMs: number) => void
  summaryImageUrl?: string | null
}

export function StructuredSummaryPanel({
  document: doc,
  onCopy,
  onSeekChapter,
  summaryImageUrl,
}: StructuredSummaryPanelProps) {
  const hasHighlights = Boolean(doc.abstract || doc.previewBullets?.length)
  const hasMinutes = doc.dialogueSections.some(
    (section) => section.paragraphs?.length || section.items?.length || section.bullets?.length,
  )
  const navItems = useMemo(
    () => [
      { id: 'summary-overview', label: '总览' },
      ...(hasHighlights ? [{ id: 'summary-highlights', label: '重点' }] : []),
      ...(doc.chapters.length > 0 ? [{ id: 'summary-chapters', label: '章节' }] : []),
      ...(hasMinutes ? [{ id: 'summary-minutes', label: '纪要' }] : []),
    ],
    [doc.chapters.length, hasHighlights, hasMinutes],
  )
  const [activeSection, setActiveSection] = useState('summary-overview')
  const visibleMetadata = doc.metadata.filter((item) => item.label !== '会议状态')

  useEffect(() => {
    const elements = navItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-10% 0px -72% 0px' },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [navItems])

  return (
    <div className="file-detail-summary-body file-detail-structured-summary">
      <nav className="file-detail-doc-nav" aria-label="纪要目录">
        {navItems.map((item) => (
          <a
            key={item.id}
            className={activeSection === item.id ? 'is-active' : undefined}
            href={`#${item.id}`}
            aria-current={activeSection === item.id ? 'location' : undefined}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <article className="file-detail-doc-article">
        <header id="summary-overview" className="file-detail-doc-hero">
          <span className="file-detail-summary-eyebrow">会议简报</span>
          <div className="file-detail-doc-title-row">
            <h2 className="file-detail-summary-title">{doc.title}</h2>
            {onCopy ? (
              <button
                type="button"
                className="file-detail-copy-summary-btn"
                aria-label="复制纪要"
                title="复制纪要"
                onClick={onCopy}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ul className="file-detail-doc-meta">
            {visibleMetadata.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                {item.value}
              </li>
            ))}
          </ul>
          <p className="file-detail-summary-desc">{doc.description}</p>
        </header>

        {summaryImageUrl ? <SummaryVisualCard imageUrl={summaryImageUrl} title={doc.title} /> : null}
        <SummaryBrief abstract={doc.abstract} bullets={doc.previewBullets} />
        <ChapterOverview chapters={doc.chapters} onSeek={onSeekChapter} />
        <SummaryMinutes title={doc.dialogueTitle} sections={doc.dialogueSections} />
      </article>
    </div>
  )
}
