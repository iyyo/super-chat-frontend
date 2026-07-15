interface SummaryBriefProps {
  abstract: string
  bullets?: string[]
}

export function SummaryBrief({ abstract, bullets = [] }: SummaryBriefProps) {
  const points = bullets.filter(Boolean).slice(0, 3)
  if (!abstract && points.length === 0) return null

  return (
    <section id="summary-highlights" className="summary-brief">
      <header className="summary-section-heading">
        <span>摘要</span>
        <h3>先看重点</h3>
      </header>
      {abstract ? <p className="summary-brief-abstract">{abstract}</p> : null}
      {points.length > 0 ? (
        <ol className="summary-brief-points">
          {points.map((point, index) => (
            <li key={point}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{point}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
