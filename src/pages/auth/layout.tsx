import { useLayoutEffect } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Mic, Shield, Sparkles } from 'lucide-react'
import {
  AuthBrandAmbient,
  AuthBrandWaveform,
  AuthFormAmbient,
} from '@/components/auth/auth-ambient'
import { BrandThemeTrigger } from '@/components/theme/brand-theme-trigger'
import { APP_NAME, HERO_STATS, ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import '@/styles/auth.css'

const BRAND_COPY = {
  default: {
    headline: ['听见你的', 'AI 语音记录助手'],
    description: '登录后即可同步对话记录、使用实时转写与 AI 纪要，数据安全加密存储。',
    eyebrow: 'AI 语音 · 智能纪要',
  },
  forgot: {
    headline: ['安全找回', '你的账号'],
    description: '通过绑定的手机号或邮箱验证身份，重置密码后即刻恢复使用智能语音与 AI 对话服务。',
    eyebrow: '账号安全 · 快速验证',
  },
} as const

export function AuthLayout() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isForgot = location.pathname.endsWith('/forgot-password')
  const brand = isForgot ? BRAND_COPY.forgot : BRAND_COPY.default

  useLayoutEffect(() => {
    document.documentElement.classList.add('auth-route-active')
    return () => document.documentElement.classList.remove('auth-route-active')
  }, [])

  if (isAuthenticated) {
    return <Navigate to={ROUTES.app} replace />
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand-panel" aria-hidden="false">
        <div className="auth-brand-bg" aria-hidden="true" />
        <AuthBrandAmbient />
        <div className="auth-brand-grid" aria-hidden="true" />

        <div className="auth-brand-content">
          <p className="auth-brand-eyebrow">
            <span className="auth-brand-live-dot" aria-hidden="true" />
            {brand.eyebrow}
          </p>
          <p className="auth-brand-logo">{APP_NAME}</p>
          <h1 className="auth-brand-headline">
            {brand.headline[0]}
            <br />
            <span className="auth-headline-accent">{brand.headline[1]}</span>
          </h1>
          <p className="auth-brand-desc">{brand.description}</p>
          <AuthBrandWaveform />
        </div>

        <div className="auth-brand-stats">
          {HERO_STATS.map(({ value, label }) => (
            <div key={label} className="auth-brand-stat">
              <p className="auth-brand-stat-value">{value}</p>
              <p className="auth-brand-stat-label">{label}</p>
            </div>
          ))}
        </div>
      </aside>

      <div className="auth-form-panel">
        <AuthFormAmbient />

        <div className="auth-form-inner">
          <div className="auth-form-header-row">
            <Link
              to={isForgot ? ROUTES.auth : ROUTES.official}
              className="auth-back-link"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {isForgot ? '返回登录' : '返回首页'}
            </Link>
            <BrandThemeTrigger variant="official" />
          </div>

          <p className="auth-mobile-logo">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {APP_NAME}
          </p>

          <div className="auth-form-card">
            <div className="auth-form-body">
              <Outlet />
            </div>
          </div>

          <div className="auth-trust-badges">
            <span className="auth-trust-badge">
              <Shield className="h-4 w-4" aria-hidden="true" />
              数据加密传输
            </span>
            <span className="auth-trust-badge">
              <Mic className="h-4 w-4" aria-hidden="true" />
              企业级转写引擎
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
