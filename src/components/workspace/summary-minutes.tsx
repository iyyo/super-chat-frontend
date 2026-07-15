import type { DialogueBlock } from '@/lib/structured-summary-document'
import { cn } from '@/lib/utils'

interface SummaryMinutesProps {
  title: string
  sections: DialogueBlock[]
}

const ACTION_LABEL = /行动|待办|下一步|负责人|截止/

function hasContent(section: DialogueBlock) {
  return Boolean(section.paragraphs?.length || section.items?.length || section.bullets?.length)
}

export function SummaryMinutes({ title, sections }: SummaryMinutesProps) {
  const content = sections.filter(hasContent)
  const notes = content.filter((section) => section.heading === '备注')
  const mainSections = content.filter((section) => section.heading !== '备注')
  if (content.length === 0) return null

  return (
    <section id="summary-minutes" className="summary-minutes">
      <header className="summary-section-heading">
        <span>纪要</span>
        <h3>{title || '会议纪要'}</h3>
      </header>

      <div className="summary-minutes-list">
        {mainSections.map((section, index) => (
          <article key={`${index}-${section.heading}`} className="summary-minutes-section">
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h4>{section.heading}</h4>
            </header>

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="summary-minutes-lead">{paragraph}</p>
            ))}

            {section.items?.length ? (
              <dl className="summary-minutes-facts">
                {section.items.map((item) => (
                  <div key={item.label} className={cn(ACTION_LABEL.test(item.label) && 'is-action')}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {section.bullets?.length ? (
              <ol className="summary-minutes-points">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={bullet}>
                    <span>{String(bulletIndex + 1).padStart(2, '0')}</span>
                    <p>{bullet}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </article>
        ))}
      </div>

      {notes.flatMap((section) => section.paragraphs ?? []).map((note) => (
        <p key={note} className="summary-minutes-note">{note}</p>
      ))}
    </section>
  )
}
