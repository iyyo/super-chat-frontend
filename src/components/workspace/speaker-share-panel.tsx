import { getSpeakerColor } from '@/lib/speaker-colors'
import type { SpeakerShare } from '@/lib/speaker-insights'

interface SpeakerSharePanelProps {
  shares: SpeakerShare[]
  timelineMs: number
}

export function SpeakerSharePanel({ shares, timelineMs }: SpeakerSharePanelProps) {
  if (shares.length === 0) return null

  return (
    <section className="speaker-share-panel" aria-labelledby="speaker-share-title">
      <div className="speaker-share-heading">
        <h4 id="speaker-share-title">发言人</h4>
        <span>{shares.length} 位</span>
      </div>
      <div className="speaker-share-list">
        {shares.map((share, index) => {
          const color = getSpeakerColor(index)
          return (
            <div className="speaker-share-row" key={share.speaker}>
              <div className="speaker-share-label">
                <span className="speaker-share-dot" style={{ background: color.fg }} />
                <strong>{share.speaker}</strong>
                <span>{share.percent}%</span>
              </div>
              <div className="speaker-share-track" aria-label={`${share.speaker} 发言 ${share.percent}%`}>
                {share.segments.map((segment, segmentIndex) => {
                  const left = timelineMs > 0 ? (segment.beginMs / timelineMs) * 100 : 0
                  const width = timelineMs > 0 ? ((segment.endMs - segment.beginMs) / timelineMs) * 100 : 0
                  const safeLeft = Math.min(100, Math.max(0, left))
                  const safeWidth = Math.max(0.7, Math.min(100 - safeLeft, Math.max(0, width)))
                  return (
                    <span
                      key={`${segment.beginMs}-${segment.endMs}-${segmentIndex}`}
                      style={{
                        background: color.fg,
                        left: `${safeLeft}%`,
                        width: `${safeWidth}%`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
