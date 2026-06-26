import { useState } from 'react'
import { cn } from '@/lib/utils'

const AVATAR_GRADIENTS: Record<string, string> = {
  lina: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  wuxiu: 'linear-gradient(135deg, var(--ifly-blue) 0%, var(--brand-soft) 100%)',
  jack: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  chenjing: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  huanghan: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  lisa: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  chenyu: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  tujie: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
}

interface StoryAvatarProps {
  id: string
  name: string
  src: string
  className?: string
  size?: number
}

/** 用户故事头像：图片缺失时降级为渐变首字母 */
export function StoryAvatar({ id, name, src, className, size = 96 }: StoryAvatarProps) {
  const [failed, setFailed] = useState(false)
  const gradient =
    AVATAR_GRADIENTS[id] ?? 'linear-gradient(135deg, var(--ifly-blue) 0%, var(--brand-soft) 100%)'

  if (failed) {
    return (
      <div
        className={cn('stories-avatar stories-avatar-fallback', className)}
        style={{ background: gradient, width: size, height: size, fontSize: size * 0.32 }}
        aria-label={name}
      >
        {name[0]}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={cn('stories-avatar', className)}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}
