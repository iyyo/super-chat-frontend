import {
  APP_NAME,
  HERO_PRODUCT_CHIPS,
  HERO_TAGLINE,
} from '@/lib/constants'
import { HeroActionCards } from '@/components/official/hero-action-cards'
import { HeroAmbientBg } from '@/components/official/hero-ambient-bg'
import { Link } from 'react-router-dom'

export function HeroBanner() {
  return (
    <section className="ifly-hero relative overflow-hidden">
      <HeroAmbientBg />

      <div className="ifly-hero-inner relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="hero-copy-block mx-auto max-w-[760px]">
          <div className="hero-copy-orb" aria-hidden="true" />
          <div className="official-hero-stagger hero-copy-inner text-center">
          <p className="hero-tagline">{HERO_TAGLINE}</p>

          <h1 className="hero-headline mt-5">
            <span className="hero-headline-brand">{APP_NAME}</span>
            <span className="hero-headline-sep" aria-hidden="true">
              {' '}
              ·{' '}
            </span>
            <span className="hero-headline-accent">智能语音识别与 AI 办公平台</span>
          </h1>

          <p className="hero-subline mx-auto mt-5 max-w-[560px]">
            告别反复听录音、手动整理纪要。从实时转写到 AI 提炼要点，让每一次对话都变成可搜索、可复用的知识资产。
          </p>

          <div className="hero-chip-row mt-8 flex flex-wrap items-center justify-center gap-2">
            {HERO_PRODUCT_CHIPS.map((chip) => (
              <Link key={chip.id} to={chip.href} className="hero-product-chip">
                {chip.label}
              </Link>
            ))}
          </div>
          </div>
        </div>

        <div className="official-hero-stagger mx-auto max-w-[920px]">
          <HeroActionCards />
        </div>
      </div>
    </section>
  )
}
