import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import { ROUTES } from '@/lib/constants'
import { LegalAgreement } from '@/components/legal/legal-agreement'
import { AuthFormShell } from '@/components/auth/auth-form-shell'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'
type LoginMethod = 'password' | 'email'

const RESEND_SECONDS = 60

interface AuthFormProps {
  initialMode?: AuthMode
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail)
  const register = useAuthStore((s) => s.register)

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  const isLogin = mode === 'login'
  const isEmailLogin = isLogin && loginMethod === 'email'

  useEffect(() => {
    if (codeCountdown <= 0) return
    const timer = window.setTimeout(() => setCodeCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [codeCountdown])

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setConfirmPassword('')
    setAgreeTerms(false)
    setEmail('')
    setLoginCode('')
    setCodeCountdown(0)
  }

  const switchLoginMethod = (next: LoginMethod) => {
    setLoginMethod(next)
    setLoginCode('')
  }

  const sendLoginCode = async () => {
    const trimmed = loginEmail.trim().toLowerCase()
    if (!trimmed) {
      toast.warning('请先填写邮箱')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.warning('邮箱格式好像不太对')
      return
    }

    setSendingCode(true)
    try {
      const result = await authApi.sendLoginCode({ email: trimmed })
      setCodeCountdown(RESEND_SECONDS)
      toast.success(result.message || '验证码已发送，请查收邮箱')
    } catch {
      // 全局 toast 已提示
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (isLogin && loginMethod === 'email') {
      const trimmedEmail = loginEmail.trim().toLowerCase()
      if (!trimmedEmail) {
        toast.warning('请先填写邮箱')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        toast.warning('邮箱格式好像不太对')
        return
      }
      if (!loginCode.trim()) {
        toast.warning('请输入验证码')
        return
      }
      if (loginCode.trim().length !== 6) {
        toast.warning('验证码是 6 位数字')
        return
      }

      setLoading(true)
      try {
        await loginWithEmail({ email: trimmedEmail, code: loginCode.trim() })
        navigate(ROUTES.app, { replace: true })
      } catch {
        // 全局 toast 已提示
      } finally {
        setLoading(false)
      }
      return
    }

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      toast.warning('请先填写账号')
      return
    }
    if (trimmedUsername.length < 3) {
      toast.warning('账号至少需要 3 个字符')
      return
    }
    if (!password) {
      toast.warning('请先填写密码')
      return
    }
    if (password.length < 6) {
      toast.warning('密码至少需要 6 位')
      return
    }
    if (!isLogin) {
      if (password !== confirmPassword) {
        toast.warning('两次输入的密码不一致')
        return
      }
      if (!agreeTerms) {
        toast.warning('请先阅读并同意用户协议与隐私政策')
        return
      }
      const trimmedEmail = email.trim()
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        toast.warning('邮箱格式好像不太对')
        return
      }
    }

    setLoading(true)
    try {
      if (isLogin) {
        await login({ username: trimmedUsername, password })
      } else {
        const trimmedEmail = email.trim()
        await register({
          username: trimmedUsername,
          password,
          ...(trimmedEmail ? { email: trimmedEmail.toLowerCase() } : {}),
        })
      }
      navigate(ROUTES.app, { replace: true })
    } catch {
      // 全局 toast 已提示
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFormShell
      header={
        <div className="auth-head-row">
          <div className="auth-head-copy">
            <h2 className="auth-title">{isLogin ? '欢迎回来' : '创建账号'}</h2>
            <p className="auth-subtitle">
              {isLogin
                ? loginMethod === 'email'
                  ? '验证码将发送至绑定邮箱'
                  : '登录后继续你的 AI 之旅'
                : '注册后即可免费体验核心功能'}
            </p>
          </div>
          <button
            type="button"
            className="auth-head-mode-btn"
            onClick={() => switchMode(isLogin ? 'register' : 'login')}
          >
            {isLogin ? '注册' : '登录'}
          </button>
        </div>
      }
      toolbar={
        isLogin ? (
          <div className="auth-method-nav" role="tablist" aria-label="登录方式">
            <button
              type="button"
              role="tab"
              aria-selected={loginMethod === 'password' ? 'true' : 'false'}
              className={cn('auth-method-link', loginMethod === 'password' && 'auth-method-link-active')}
              onClick={() => switchLoginMethod('password')}
            >
              密码登录
            </button>
            <span className="auth-method-sep" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              role="tab"
              aria-selected={loginMethod === 'email' ? 'true' : 'false'}
              className={cn('auth-method-link', loginMethod === 'email' && 'auth-method-link-active')}
              onClick={() => switchLoginMethod('email')}
            >
              邮箱验证码
            </button>
          </div>
        ) : undefined
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {isEmailLogin ? (
          <>
            <div className="auth-field">
              <label htmlFor="auth-login-email" className="auth-label">
                邮箱
              </label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" aria-hidden="true" />
                <input
                  id="auth-login-email"
                  type="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="注册时绑定的邮箱"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={loading || sendingCode}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-login-code" className="auth-label">
                验证码
              </label>
              <div className="auth-code-row">
                <div className="auth-input-wrap">
                  <input
                    id="auth-login-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="auth-input auth-input-code"
                    placeholder="000000"
                    value={loginCode}
                    onChange={(e) =>
                      setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    disabled={loading}
                  />
                </div>
                <button
                  type="button"
                  className="auth-resend-btn"
                  disabled={loading || sendingCode || codeCountdown > 0}
                  onClick={() => void sendLoginCode()}
                >
                  {sendingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : codeCountdown > 0 ? (
                    `${codeCountdown}s`
                  ) : (
                    '获取验证码'
                  )}
                </button>
              </div>
              <p className="auth-hint">验证码将发送至你的绑定邮箱，10 分钟内有效</p>
            </div>
          </>
        ) : (
          <>
            <div className="auth-field">
              <label htmlFor="auth-username" className="auth-label">
                账号
              </label>
              <div className="auth-input-wrap">
                <User className="auth-input-icon" aria-hidden="true" />
                <input
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  className="auth-input"
                  placeholder={isLogin ? '用户名' : '手机号 / 邮箱 / 用户名'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="auth-field">
                <label htmlFor="auth-email" className="auth-label">
                  邮箱
                  <span className="auth-label-optional">（选填，用于验证码登录）</span>
                </label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" aria-hidden="true" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    className="auth-input"
                    placeholder="your@163.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-password" className="auth-label">
                密码
              </label>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" aria-hidden="true" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="auth-input"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="auth-field">
                <label htmlFor="auth-confirm" className="auth-label">
                  确认密码
                </label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" aria-hidden="true" />
                  <input
                    id="auth-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="auth-input"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? '隐藏确认密码' : '显示确认密码'}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isLogin && loginMethod === 'password' ? (
          <div className="auth-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              记住我
            </label>
            <Link to={ROUTES.authForgotPassword} className="auth-link">
              忘记密码？
            </Link>
          </div>
        ) : !isLogin ? (
          <LegalAgreement
            checked={agreeTerms}
            onChange={setAgreeTerms}
            disabled={loading}
          />
        ) : null}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || sendingCode}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isEmailLogin ? (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          ) : isLogin ? (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? '处理中…' : isLogin ? '登录' : '注册'}
        </button>
      </form>
    </AuthFormShell>
  )
}
