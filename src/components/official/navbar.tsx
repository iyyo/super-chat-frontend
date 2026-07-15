import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { BrandThemeTrigger } from '@/components/theme/brand-theme-trigger'
import { APP_NAME, OFFICIAL_NAV, ROUTES } from '@/lib/constants'
import { useOfficialScroll } from '@/hooks/use-official-scroll'
import { useScrolled } from '@/hooks/use-scrolled'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

export function OfficialNavbar() {
  const scrolled = useScrolled(8)
  const { scrollTo } = useOfficialScroll()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isLoggedIn = isAuthenticated || Boolean(accessToken)

  const handleAnchor = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(href, { offset: -64 })
  }

  return (
    <header
      className={cn(
        'official-nav-ifly sticky top-0 z-50',
        scrolled && 'official-nav-ifly-scrolled',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link to={ROUTES.official} className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[var(--ifly-blue)]">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {OFFICIAL_NAV.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={handleAnchor(href)}
              className="text-sm text-[var(--ifly-text-secondary)] transition-colors hover:text-[var(--ifly-blue)]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <BrandThemeTrigger variant="official" />
          {isLoggedIn && (
            <>
              <Link to={ROUTES.profile} className="ifly-nav-action ifly-nav-action-optional">
                我的
              </Link>
              <Link to={ROUTES.app} className="ifly-nav-action ifly-nav-action-primary">
                工作台
              </Link>
            </>
          )}
          <Link
            to={ROUTES.auth}
            className={cn(
              'ifly-nav-action ifly-nav-action-optional',
              isLoggedIn && 'ifly-nav-action-hidden',
            )}
          >
            登录
          </Link>
          <Link
            to={ROUTES.authRegister}
            className={cn(
              'ifly-nav-action ifly-nav-action-primary',
              isLoggedIn && 'ifly-nav-action-hidden',
            )}
          >
            免费体验
          </Link>
          <button
            type="button"
            className="hidden items-center gap-1 text-sm text-[var(--ifly-text-secondary)] hover:text-[var(--ifly-blue)] md:flex"
            aria-label="下载客户端"
          >
            <Download className="h-4 w-4" />
            下载
          </button>
        </div>
      </div>
    </header>
  )
}
