import { TRUST_STATS } from '@/lib/constants'
import { Reveal } from '@/components/official/reveal'

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="平台数据">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <div className="trust-strip-inner">
            <p className="trust-strip-eyebrow">
              <span className="trust-strip-dot" aria-hidden="true" />
              深耕 AI 语音 · 数百万用户的信赖之选
            </p>
            <div className="trust-strip-stats">
              {TRUST_STATS.map((item) => (
                <div key={item.label} className="trust-stat">
                  <p className="trust-stat-value">{item.value}</p>
                  <p className="trust-stat-label">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
