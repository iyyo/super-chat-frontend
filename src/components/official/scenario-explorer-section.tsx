import { type CSSProperties, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { EXPLORER_SCENARIOS, type ExplorerVisualType } from '@/lib/constants'
import { ChatPanel } from '@/components/official/illustrations/chat-panel'
import { ChatVisual } from '@/components/official/illustrations/chat-visual'
import { DocVisual } from '@/components/official/illustrations/doc-visual'
import { ImageVisual } from '@/components/official/illustrations/image-visual'
import { TranscriptionPanel } from '@/components/official/illustrations/voice-visual'
import { useScrollDrivenTabs } from '@/hooks/use-scroll-driven-tabs'
import {
  OFFICIAL_EXPLORER_ANCHOR_EVENT,
  type OfficialExplorerAnchor,
} from '@/hooks/use-official-scroll'
import { cn } from '@/lib/utils'

function resolveExplorerAnchorIndex(target: OfficialExplorerAnchor) {
  if (target === '#enterprise') {
    return EXPLORER_SCENARIOS.findIndex((item) => item.id === 'enterprise')
  }
  return 0
}

function ExplorerVisual({ type }: { type: ExplorerVisualType }) {
  switch (type) {
    case 'voice':
      return <TranscriptionPanel animateWave liveFeed />
    case 'chat-panel':
      return <ChatPanel liveFeed />
    case 'chat':
      return <ChatVisual theme="light" />
    case 'image':
      return <ImageVisual theme="light" />
    case 'doc':
      return <DocVisual theme="light" />
    default:
      return <ChatVisual theme="light" />
  }
}

function ExplorerPanelContent({
  index,
  isActive,
}: {
  index: number
  isActive: boolean
}) {
  const item = EXPLORER_SCENARIOS[index]

  return (
    <article
      className={cn('explorer-panel', isActive && 'is-active')}
      role="tabpanel"
      aria-hidden={!isActive}
    >
      <div className="explorer-panel-visual">
        <div className="explorer-visual-frame">
          <div className="explorer-visual-slot">
            <ExplorerVisual type={item.visual} />
          </div>
        </div>
      </div>

      <div className="explorer-panel-copy">
        <p className="explorer-panel-step">
          {String(index + 1).padStart(2, '0')} / {String(EXPLORER_SCENARIOS.length).padStart(2, '0')}
        </p>
        <p className="explorer-panel-tag">{item.tag}</p>
        <h3 className="explorer-panel-title">{item.title}</h3>
        <p className="explorer-panel-desc">{item.desc}</p>

        <ul className="explorer-panel-bullets">
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        {item.id === 'enterprise' ? (
          <div className="explorer-panel-enterprise-meta">
            <p className="explorer-panel-stat">
              <span className="explorer-panel-stat-value">10万+</span>
              <span className="explorer-panel-stat-label">企业团队在用</span>
            </p>
            <Link
              to={item.link}
              tabIndex={isActive ? 0 : -1}
              className="ifly-btn-primary explorer-panel-cta gap-2"
            >
              {item.cta}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Link
            to={item.link}
            tabIndex={isActive ? 0 : -1}
            className="ifly-btn-primary explorer-panel-cta gap-2"
          >
            {item.cta}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  )
}

export function ScenarioExplorerSection() {
  const { activeIndex, progress, stageRef, scrollToStep, reducedMotion, stepVh } =
    useScrollDrivenTabs(EXPLORER_SCENARIOS.length)

  useEffect(() => {
    const goToAnchor = (target: OfficialExplorerAnchor) => {
      const index = resolveExplorerAnchorIndex(target)
      if (index < 0) return
      requestAnimationFrame(() => scrollToStep(index))
    }

    const onExplorerAnchor = (event: Event) => {
      const { target } = (event as CustomEvent<{ target: OfficialExplorerAnchor }>).detail
      goToAnchor(target)
    }

    const onHashChange = () => {
      const hash = window.location.hash
      if (hash === '#products' || hash === '#enterprise') {
        goToAnchor(hash)
      }
    }

    window.addEventListener(OFFICIAL_EXPLORER_ANCHOR_EVENT, onExplorerAnchor)
    window.addEventListener('hashchange', onHashChange)
    onHashChange()

    return () => {
      window.removeEventListener(OFFICIAL_EXPLORER_ANCHOR_EVENT, onExplorerAnchor)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [scrollToStep])

  const explorerBody = (staticLayout: boolean) => (
    <div className={cn('explorer-shell', staticLayout && 'explorer-shell-static')}>
      <header className="explorer-header">
        <p className="explorer-header-label">全场景 AI 办公</p>
        <h2 className="explorer-header-title">一套能力，覆盖从产品到交付的每一种场景</h2>
        <p className="explorer-header-desc">
          继续向下滚动，依次浏览全部能力与方案；也可点选左侧场景快速跳转
        </p>
      </header>

      <div className="explorer-layout">
        <div className="explorer-nav" role="tablist" aria-label="产品与方案场景">
          {EXPLORER_SCENARIOS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              className={cn(
                'explorer-nav-btn',
                activeIndex === index && 'explorer-nav-btn-active',
                item.id === 'enterprise' && 'explorer-nav-btn-enterprise',
              )}
              onClick={() => scrollToStep(index)}
            >
              <span className="explorer-nav-label">{item.nav}</span>
              <span className="explorer-nav-tag">{item.tag}</span>
            </button>
          ))}
        </div>

        <div className="explorer-main">
          <div
            className="explorer-progress"
            aria-hidden="true"
            style={{ '--progress': progress } as CSSProperties}
          >
            <div className="explorer-progress-bar" />
          </div>

          <div className={cn('explorer-panels', staticLayout && 'explorer-panels-static')}>
            {staticLayout ? (
              <ExplorerPanelContent index={activeIndex} isActive />
            ) : (
              EXPLORER_SCENARIOS.map((item, index) => (
                <ExplorerPanelContent
                  key={item.id}
                  index={index}
                  isActive={activeIndex === index}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <section id="products" className="official-section explorer-section">
      <div id="enterprise" className="explorer-anchor-sentinel" aria-hidden="true" />
      {!reducedMotion && (
        <div
          ref={stageRef}
          className="explorer-scroll-stage"
          style={
            {
              '--explorer-steps': EXPLORER_SCENARIOS.length,
              '--step-vh': stepVh,
            } as CSSProperties
          }
        >
          <div className="explorer-scroll-sticky">
            <div className="mx-auto max-w-[1200px] px-6">{explorerBody(false)}</div>
          </div>
        </div>
      )}

      {reducedMotion && (
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
          {explorerBody(true)}
        </div>
      )}
    </section>
  )
}
