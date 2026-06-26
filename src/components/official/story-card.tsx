import { StoryAvatar } from '@/components/official/story-avatar'
import { cn } from '@/lib/utils'

interface StoryCardProps {
  id: string
  name: string
  role: string
  tag: string
  avatar: string
  quote: string
  className?: string
  tone?: 'lavender' | 'sky' | 'mint' | 'peach' | 'rose' | 'sand'
}

export function StoryCard({ id, name, role, tag, avatar, quote, className, tone }: StoryCardProps) {
  return (
    <article className={cn('story-review-card', tone && `story-review-card-${tone}`, className)}>
      <span className="story-review-tag">{tag}</span>
      <blockquote className="story-review-quote">{quote}</blockquote>
      <footer className="story-review-footer">
        <StoryAvatar
          id={id}
          name={name}
          src={avatar}
          size={40}
          className="story-review-avatar"
        />
        <div className="min-w-0">
          <p className="story-review-name">{name}</p>
          <p className="story-review-role">{role}</p>
        </div>
      </footer>
    </article>
  )
}
