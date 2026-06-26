import { ENTERPRISE_LOGOS } from '@/lib/constants'
import { Reveal } from '@/components/official/reveal'

export function LogoWallSection() {
  const row = [...ENTERPRISE_LOGOS, ...ENTERPRISE_LOGOS]

  return (
    <section className="logo-wall-section" aria-label="企业客户">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <div className="logo-wall-head">
            <p className="logo-wall-eyebrow">众多团队的一致选择</p>
            <h2 className="logo-wall-title">覆盖互联网、金融、教育、医疗等行业</h2>
          </div>
        </Reveal>
      </div>

      <div className="logo-wall-marquee mt-8" aria-hidden="true">
        <div className="logo-wall-track">
          {row.map((item, index) => (
            <div key={`${item.name}-${index}`} className="logo-wall-item">
              <img
                className="logo-wall-mark"
                src={item.logo}
                alt=""
                loading="lazy"
                draggable={false}
              />
              <span className="logo-wall-name">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
