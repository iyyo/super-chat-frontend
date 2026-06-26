import { Link } from 'react-router-dom'
import { ChevronRight, LogIn, LogOut, Settings, Shield } from 'lucide-react'
import { BrandThemePanel } from '@/components/theme/brand-theme-panel'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { ROUTES } from '@/lib/constants'

const MENU_ITEMS = [
  { icon: Settings, label: '设置' },
  { icon: Shield, label: '隐私与安全' },
  { icon: LogOut, label: '退出登录' },
]

export function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const displayName = user?.nickname ?? user?.username ?? '未登录用户'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-accent">
          {initial}
        </div>
        <div className="flex-1">
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted">
            {isAuthenticated ? '已登录，对话记录已同步' : '登录后同步对话记录'}
          </p>
        </div>
        {!isAuthenticated && (
          <Link
            to={ROUTES.auth}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent"
          >
            <LogIn className="h-4 w-4" />
            登录
          </Link>
        )}
      </Card>

      <BrandThemePanel variant="app" />

      <section className="flex flex-col gap-2">
        {MENU_ITEMS.map(({ icon: Icon, label }) => (
          <Card
            key={label}
            className="flex items-center justify-between py-3"
            onClick={label === '退出登录' && isAuthenticated ? logout : undefined}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted" />
              <span>{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Card>
        ))}
      </section>
    </div>
  )
}
