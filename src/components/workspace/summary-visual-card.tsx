interface SummaryVisualCardProps {
  imageUrl: string
  title: string
}

export function SummaryVisualCard({ imageUrl, title }: SummaryVisualCardProps) {
  return (
    <figure className="summary-visual-card" aria-label="视觉纪要">
      <div className="summary-visual-art">
        <img src={imageUrl} alt={`${title}的视觉纪要插画`} loading="eager" />
      </div>
      <figcaption className="summary-visual-caption">
        <span className="summary-visual-kicker">视觉纪要</span>
        <strong>{title}</strong>
      </figcaption>
    </figure>
  )
}
