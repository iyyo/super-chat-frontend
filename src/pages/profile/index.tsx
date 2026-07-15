import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Copy, LogIn, RefreshCw } from 'lucide-react'
import { BrandThemePanel } from '@/components/theme/brand-theme-panel'
import { Modal } from '@/components/ui/modal'
import { authApi } from '@/lib/api/auth'
import { ApiClientError } from '@/lib/errors/api-client-error'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/stores/toast-store'
import type { UserProfile } from '@/types/auth'
import { EditNicknameModal } from './edit-nickname-modal'

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'expired'

function displayName(profile: UserProfile | null, fallback: string) {
  return profile?.nickname ?? profile?.username ?? fallback
}

function ProfileSkeleton() {
  return (
    <div className="profile-page" aria-busy="true">
      <div className="profile-page-head">
        <div className="profile-skeleton profile-skeleton-title" />
        <div className="profile-skeleton profile-skeleton-sub" />
      </div>
      <div className="profile-card profile-hero-card">
        <div className="profile-skeleton profile-skeleton-avatar" />
        <div className="profile-hero-text">
          <div className="profile-skeleton profile-skeleton-line lg" />
          <div className="profile-skeleton profile-skeleton-line md" />
          <div className="profile-skeleton profile-skeleton-line sm" />
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="profile-card">
          <div className="profile-skeleton profile-skeleton-line sm" />
          <div className="profile-skeleton profile-skeleton-row" />
          <div className="profile-skeleton profile-skeleton-row" />
        </div>
      ))}
      <p className="profile-loading-hint">正在加载账号信息…</p>
    </div>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [nicknameOpen, setNicknameOpen] = useState(false)
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null)
      setLoadState('idle')
      return
    }

    setLoadState('loading')
    try {
      const data = await authApi.me()
      setProfile(data)
      setUser(data)
      setLoadState('ready')
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.code === 10006 || err.code === 10007)
      ) {
        setLoadState('expired')
        return
      }
      setLoadState('error')
    }
  }, [isAuthenticated, setUser])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const name = profile
    ? displayName(profile, '未登录用户')
    : (user?.nickname ?? user?.username ?? '未登录用户')
  const initial = name.charAt(0).toUpperCase()

  const handleCopyId = async () => {
    if (!profile) return
    try {
      await navigator.clipboard.writeText(String(profile.id))
      toast.success('用户 ID 已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleSaveNickname = async (nickname: string) => {
    setNicknameSaving(true)
    setNicknameError(null)
    try {
      const updated = await authApi.updateProfile({ nickname })
      setProfile(updated)
      setUser(updated)
      setNicknameOpen(false)
      toast.success('昵称已更新')
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : '保存失败，请稍后重试'
      setNicknameError(message)
    } finally {
      setNicknameSaving(false)
    }
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
      toast.success('已退出登录')
      navigate(ROUTES.auth)
    } finally {
      setLogoutLoading(false)
      setLogoutOpen(false)
    }
  }

  if (isAuthenticated && loadState === 'loading') {
    return <ProfileSkeleton />
  }

  if (loadState === 'expired') {
    return (
      <div className="profile-page">
        <div className="profile-card profile-state-card">
          <p className="profile-state-title">登录已过期</p>
          <p className="profile-state-desc">请重新登录以查看账号信息</p>
          <Link to={ROUTES.auth} className="profile-state-btn">
            重新登录
          </Link>
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="profile-page">
        <div className="profile-card profile-state-card">
          <p className="profile-state-title">加载失败</p>
          <p className="profile-state-desc">网络不太稳定，请稍后重试</p>
          <button type="button" className="profile-state-btn" onClick={() => void fetchProfile()}>
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-page-head">
        <h1 className="profile-page-title">个人中心</h1>
        <p className="profile-page-subtitle">管理你的账号资料、安全与偏好设置</p>
      </header>

      <section className="profile-card profile-hero-card">
        <div className="profile-hero-avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="profile-hero-text">
          <div className="profile-hero-top">
            <p className="profile-hero-name">{name}</p>
            {isAuthenticated && (
              <button
                type="button"
                className="profile-hero-edit"
                onClick={() => setNicknameOpen(true)}
              >
                编辑资料
              </button>
            )}
          </div>
          {isAuthenticated ? (
            <>
              <p className="profile-hero-meta">
                <span className="profile-hero-badge" />
                @{profile?.username ?? user?.username}
                <span className="profile-hero-status">已登录</span>
              </p>
              <p className="profile-hero-email">
                {profile?.email ?? '未绑定邮箱'}
              </p>
              <p className="profile-hero-sync">对话记录已云端同步</p>
            </>
          ) : (
            <p className="profile-hero-guest">登录后同步对话记录与账号信息</p>
          )}
        </div>
        {!isAuthenticated && (
          <Link to={ROUTES.auth} className="profile-hero-login">
            <LogIn className="h-4 w-4" />
            登录 / 注册
          </Link>
        )}
      </section>

      <section className={cn('profile-card', !isAuthenticated && 'is-locked')}>
        <p className="import-setting-label">账号信息</p>
        {!isAuthenticated ? (
          <p className="profile-locked-hint">登录后查看账号信息</p>
        ) : (
          <div className="profile-setting-rows">
            <div className="import-setting-row profile-setting-row-static">
              <span>用户名</span>
              <span className="import-setting-value">{profile?.username}</span>
            </div>
            <div className="import-setting-row profile-setting-row-static">
              <span>邮箱</span>
              <span className="import-setting-value">
                {profile?.email ?? '未绑定'}
              </span>
            </div>
            <button
              type="button"
              className="import-setting-row"
              onClick={() => void handleCopyId()}
            >
              <span>用户 ID</span>
              <span className="import-setting-value">
                #{profile?.id}
                <Copy className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        )}
      </section>

      <section className={cn('profile-card', !isAuthenticated && 'is-locked')}>
        <p className="import-setting-label">安全设置</p>
        {!isAuthenticated ? (
          <p className="profile-locked-hint">登录后管理安全设置</p>
        ) : (
          <div className="profile-setting-rows">
            <button
              type="button"
              className="import-setting-row"
              onClick={() => navigate(ROUTES.authForgotPassword)}
            >
              <span>登录密码</span>
              <span className="import-setting-value">
                修改
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            <div className="import-setting-row profile-setting-row-static">
              <span>邮箱验证</span>
              <span className="import-setting-value">
                {profile?.email ? (
                  <span className="profile-tag profile-tag-success">已绑定</span>
                ) : (
                  <span className="profile-tag profile-tag-warn">未绑定</span>
                )}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="profile-card profile-preferences-card">
        <p className="import-setting-label">偏好设置</p>
        <p className="profile-preferences-desc">全局品牌色，官网与工作台同步生效</p>
        <BrandThemePanel variant="app" />
      </section>

      <section className="profile-card">
        <p className="import-setting-label">其他</p>
        <div className="profile-setting-rows">
          <a
            href={ROUTES.legalTerms}
            target="_blank"
            rel="noopener noreferrer"
            className="import-setting-row"
          >
            <span>服务条款</span>
            <span className="import-setting-value">
              查看
              <ChevronRight className="h-4 w-4" />
            </span>
          </a>
          <a
            href={ROUTES.legalPrivacy}
            target="_blank"
            rel="noopener noreferrer"
            className="import-setting-row"
          >
            <span>隐私政策</span>
            <span className="import-setting-value">
              查看
              <ChevronRight className="h-4 w-4" />
            </span>
          </a>
        </div>
      </section>

      {isAuthenticated && (
        <button
          type="button"
          className="profile-logout-btn"
          onClick={() => setLogoutOpen(true)}
        >
          退出登录
        </button>
      )}

      <EditNicknameModal
        open={nicknameOpen}
        initialNickname={name}
        saving={nicknameSaving}
        error={nicknameError}
        onClose={() => {
          setNicknameOpen(false)
          setNicknameError(null)
        }}
        onSave={handleSaveNickname}
      />

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="确认退出登录？"
        footer={
          <div className="profile-modal-footer">
            <button
              type="button"
              className="profile-modal-btn-secondary"
              onClick={() => setLogoutOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="profile-modal-btn-danger"
              disabled={logoutLoading}
              onClick={() => void handleLogout()}
            >
              {logoutLoading ? '退出中…' : '确认退出'}
            </button>
          </div>
        }
      >
        <p className="profile-logout-desc">退出后需重新登录才能同步对话记录</p>
      </Modal>
    </div>
  )
}
