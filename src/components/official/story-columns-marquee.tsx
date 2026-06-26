import type { CSSProperties } from 'react'
import { USER_STORIES } from '@/lib/constants'
import { StoryCard } from '@/components/official/story-card'
import { cn } from '@/lib/utils'

const STORY_TONES = ['lavender', 'sky', 'mint', 'peach', 'rose', 'sand'] as const

type StoryTone = (typeof STORY_TONES)[number]
type Story = (typeof USER_STORIES)[number]
type ColumnDirection = 'down' | 'up'

const COLUMN_CONFIG: { direction: ColumnDirection; duration: number }[] = [
  { direction: 'down', duration: 48 },
  { direction: 'up', duration: 54 },
  { direction: 'down', duration: 50 },
]

function storiesForColumn(columnIndex: number): Story[] {
  const primary = USER_STORIES.filter((_, index) => index % 3 === columnIndex)
  const fill: Story[] = [...primary]
  let cursor = 0
  while (fill.length < 4) {
    fill.push(USER_STORIES[cursor % USER_STORIES.length])
    cursor += 1
  }
  return [...fill, ...fill, ...fill]
}

function toneForStory(storyId: string, columnIndex: number): StoryTone {
  const hash = storyId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return STORY_TONES[(hash + columnIndex) % STORY_TONES.length]
}

export function StoryColumnsMarquee() {
  return (
    <div className="story-columns mt-5 pb-16 md:pb-20" aria-label="用户故事滚动展示">
      {COLUMN_CONFIG.map(({ direction, duration }, columnIndex) => {
        const stories = storiesForColumn(columnIndex)

        return (
          <div key={columnIndex} className="story-column">
            <div
              className={cn(
                'story-column-track',
                direction === 'up' ? 'story-column-up' : 'story-column-down',
              )}
              style={{ '--story-col-duration': `${duration}s` } as CSSProperties}
            >
              {stories.map((story, index) => (
                <StoryCard
                  key={`${story.id}-${columnIndex}-${index}`}
                  id={story.id}
                  name={story.name}
                  role={story.role}
                  tag={story.tag}
                  avatar={story.avatar}
                  quote={story.quote}
                  tone={toneForStory(story.id, columnIndex)}
                />
              ))}
            </div>
          </div>
        )
      })}

      <div className="story-columns-static" aria-label="用户故事列表">
        {USER_STORIES.map((story, index) => (
          <StoryCard
            key={story.id}
            id={story.id}
            name={story.name}
            role={story.role}
            tag={story.tag}
            avatar={story.avatar}
            quote={story.quote}
            tone={STORY_TONES[index % STORY_TONES.length]}
          />
        ))}
      </div>
    </div>
  )
}
