import { Clock, Target, Users } from 'lucide-react'
import {
  STORY_SCENE_TAGS,
  STORY_STATS_EXTRA,
  STORY_STATS_PRIMARY,
} from '@/lib/constants'
import { OfficialSectionHeader } from '@/components/official/official-section-header'
import { StoryColumnsMarquee } from '@/components/official/story-columns-marquee'
import { Reveal } from '@/components/official/reveal'

const STAT_ICONS = [Users, Target, Clock] as const

export function UserStoriesSection() {
  return (
    <section id="stories" className="official-section official-section-gray">
      <div className="mx-auto max-w-[1200px] px-6 pt-16 md:pt-20">
        <Reveal>
          <OfficialSectionHeader
            center
            label="真实用户 · 真实反馈"
            title="用户故事 · 传递更多声音"
            desc="记者、教师、创作者、职场人——AI 语音如何改变他们的每一天"
          />
        </Reveal>

        <Reveal delay={40}>
          <div className="stories-metrics mt-8">
            <div className="stories-metrics-primary">
              {STORY_STATS_PRIMARY.map((item, i) => {
                const Icon = STAT_ICONS[i] ?? Users
                return (
                  <div key={item.label} className="stories-metric stories-metric-highlight">
                    <span className="stories-metric-icon" aria-hidden="true">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <div>
                      <p className="stories-metric-value">{item.value}</p>
                      <p className="stories-metric-label">{item.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="stories-metrics-divider" aria-hidden="true" />
            <div className="stories-metrics-secondary">
              {STORY_STATS_EXTRA.map((item) => (
                <div key={item.label} className="stories-metric stories-metric-compact">
                  <span className="stories-metric-value-sm">{item.value}</span>
                  <span className="stories-metric-label-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="stories-scene-tags mt-4">
            {STORY_SCENE_TAGS.map((tag) => (
              <span key={tag} className="stories-scene-chip">{tag}</span>
            ))}
          </div>
        </Reveal>
      </div>

      <StoryColumnsMarquee />
    </section>
  )
}
