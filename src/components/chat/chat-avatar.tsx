import { useId } from 'react'
import { cn } from '@/lib/utils'

type ChatAvatarRole = 'user' | 'assistant'

interface ChatAvatarProps {
  role: ChatAvatarRole
  className?: string
  /** 流式输出时助手头像轻微呼吸动效 */
  active?: boolean
}

export function ChatAvatar({ role, className, active }: ChatAvatarProps) {
  const uid = useId().replace(/:/g, '')

  return (
    <div
      className={cn(
        'workspace-msg-avatar',
        role === 'user' ? 'workspace-msg-avatar--user' : 'workspace-msg-avatar--assistant',
        active && role === 'assistant' && 'is-active',
        className,
      )}
      aria-hidden="true"
    >
      {role === 'user' ? <UserAvatarSvg uid={uid} /> : <AssistantAvatarSvg uid={uid} active={active} />}
    </div>
  )
}

function UserAvatarSvg({ uid }: { uid: string }) {
  const bg = `user-bg-${uid}`

  return (
    <svg className="workspace-msg-avatar-svg" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop className="workspace-msg-avatar-user-stop-a" offset="0%" />
          <stop className="workspace-msg-avatar-user-stop-b" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="11" fill={`url(#${bg})`} />
      <circle cx="18" cy="13.8" r="4.6" fill="currentColor" fillOpacity="0.96" />
      <path
        className="workspace-msg-avatar-user-figure"
        d="M10.2 28.8c1.45-4.35 4.95-6.8 7.8-6.8s6.35 2.45 7.8 6.8"
        fill="currentColor"
        fillOpacity="0.96"
      />
    </svg>
  )
}

function AssistantAvatarSvg({ uid, active }: { uid: string; active?: boolean }) {
  const bg = `asst-bg-${uid}`
  const glow = `asst-glow-${uid}`

  return (
    <svg className="workspace-msg-avatar-svg" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="5" y1="3" x2="31" y2="33" gradientUnits="userSpaceOnUse">
          <stop className="workspace-msg-avatar-asst-stop-a" offset="0%" />
          <stop className="workspace-msg-avatar-asst-stop-b" offset="55%" />
          <stop className="workspace-msg-avatar-asst-stop-c" offset="100%" />
        </linearGradient>
        <radialGradient
          id={glow}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(18 14) rotate(90) scale(16)"
        >
          <stop className="workspace-msg-avatar-asst-glow-a" offset="0%" />
          <stop className="workspace-msg-avatar-asst-glow-b" offset="100%" />
        </radialGradient>
      </defs>

      <rect width="36" height="36" rx="11" fill={`url(#${bg})`} />
      <rect width="36" height="36" rx="11" fill={`url(#${glow})`} />

      <g className="workspace-msg-avatar-mark">
        <circle cx="18" cy="18" r="10.5" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" fill="none" />
        <rect x="12.8" y="14.2" width="2.6" height="7.6" rx="1.3" fill="currentColor" fillOpacity="0.82" />
        <rect x="16.7" y="11.2" width="2.6" height="10.6" rx="1.3" fill="currentColor" />
        <rect x="20.6" y="14.2" width="2.6" height="7.6" rx="1.3" fill="currentColor" fillOpacity="0.82" />
        <circle cx="18" cy="24.8" r="1.35" fill="currentColor" fillOpacity="0.55" />
      </g>

      {active ? (
        <circle className="workspace-msg-avatar-active-ring" cx="18" cy="18" r="15.5" stroke="currentColor" strokeWidth="1">
          <animate attributeName="r" values="13.5;15.5;13.5" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.08;0.28;0.08" dur="2.4s" repeatCount="indefinite" />
        </circle>
      ) : null}
    </svg>
  )
}
