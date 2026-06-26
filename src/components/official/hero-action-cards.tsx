import { Link } from 'react-router-dom'
import { ChevronRight, Mic, Sparkles, Upload } from 'lucide-react'
import { HERO_ACTION_CARDS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const CARD_ICONS = {
  import: Upload,
  record: Mic,
  summary: Sparkles,
} as const

export function HeroActionCards() {
  return (
    <div className="hero-action-cards-wrap mt-8">
      <div className="hero-action-cards">
        {HERO_ACTION_CARDS.map((card) => {
          const Icon = CARD_ICONS[card.iconKey]

          return (
            <Link
              key={card.id}
              to={card.href}
              className={cn('hero-action-card', card.badge && 'hero-action-card-has-badge')}
            >
              <span
                className={cn('hero-action-card-icon-wrap', `hero-action-card-icon-${card.iconKey}`)}
                aria-hidden="true"
              >
                <Icon className="hero-action-card-icon-glyph" strokeWidth={1.5} />
              </span>

              <h3 className="hero-action-card-title">{card.title}</h3>

              <ul className="hero-action-card-bullets">
                {card.bullets.map((item) => (
                  <li key={item}>
                    {item}
                    {card.badge && item === card.bullets[0] && (
                      <span className="hero-action-card-badge">{card.badge}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="hero-action-card-footer">
                <div className="hero-action-card-footer-inner">
                  <span className="hero-action-card-cta">
                    立即体验
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="hero-platform-hint mt-5 text-center">
        支持 Web 端 · 无需安装 · 打开浏览器即可开始
      </p>
    </div>
  )
}
