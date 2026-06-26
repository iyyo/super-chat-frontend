import { Compass, Home, MessageSquare, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const iconMap = {
  home: Home,
  message: MessageSquare,
  compass: Compass,
  user: User,
} as const

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const Icon = iconMap[icon]
          return (
            <NavLink
              key={path}
              to={path}
              end={path === ROUTES.app}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
