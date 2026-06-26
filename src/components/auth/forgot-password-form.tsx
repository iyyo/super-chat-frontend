import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { AuthFormShell } from '@/components/auth/auth-form-shell'
import { ROUTES } from '@/lib/constants'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

type Step = 'account' | 'reset' | 'done'

const STEPS: { key: Step; label: string }[] = [
  { key: 'account', label: '验证账号' },
  { key: 'reset', label: '重置密码' },
  { key: 'done', label: '完成' },
]

const RESEND_SECONDS = 60

export function ForgotPasswordForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('account')
  const [account, setAccount] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  const sendCode = async () => {
    const trimmed = account.trim()
    if (!trimmed) {
      toast.warning('请先填写手机号、邮箱或用户名')
      return
    }

    setLoading(true)
    try {
      const result = await authApi.forgotPassword({ account: trimmed })
      setCountdown(RESEND_SECONDS)
      toast.success(result.message || '验证码已发送，请查收')
      if (step === 'account') setStep('reset')
    } catch {
      // 全局 toast 已提示
    } finally {
      setLoading(false)
    }
  }

  const handleAccountSubmit = (e: FormEvent) => {
    e.preventDefault()
    void sendCode()
  }

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const trimmed = account.trim()
    if (!code.trim()) {
      toast.warning('请输入验证码')
      return
    }
    if (code.trim().length !== 6) {
      toast.warning('验证码是 6 位数字')
      return
    }
    if (!password) {
      toast.warning('请先填写新密码')
      return
    }
    if (password.length < 6) {
      toast.warning('密码至少需要 6 位')
      return
    }
    if (password !== confirmPassword) {
      toast.warning('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({
        account: trimmed,
        code: code.trim(),
        password,
      })
      setStep('done')
      toast.success('密码已重置，请用新密码登录')
    } catch {
      // 全局 toast 已提示
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <AuthFormShell
        header={
          <>
            <h2 className="auth-title">密码重置成功</h2>
            <p className="auth-subtitle">你的新密码已生效，可以返回登录了</p>
          </>
        }
      >
        <div className="auth-success auth-success-in-shell">
          <div className="auth-success-icon">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="auth-success-desc">
            账号 <strong>{account.trim()}</strong> 的密码已更新。
          </p>
          <button
            type="button"
            className="auth-submit"
            onClick={() => navigate(ROUTES.auth, { replace: true })}
          >
            前往登录
          </button>
        </div>
      </AuthFormShell>
    )
  }

  return (
    <AuthFormShell
      header={
        <>
          <h2 className="auth-title">忘记密码</h2>
          <p className="auth-subtitle">
            {step === 'account'
              ? '输入注册时使用的手机号、邮箱或用户名，我们将发送验证码'
              : `验证码已发送至 ${account.trim()}，请查收后设置新密码`}
          </p>
        </>
      }
      toolbar={
        <div className="auth-steps" aria-label="重置步骤">
          {STEPS.slice(0, 2).map((s, i) => (
            <div key={s.key} className="auth-step">
              <div
                className={cn(
                  'auth-step-bar',
                  i < stepIndex && 'auth-step-bar-done',
                  i === stepIndex && 'auth-step-bar-active',
                )}
              />
              <span
                className={cn(
                  'auth-step-label',
                  i === stepIndex && 'auth-step-label-active',
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      }
      footer={
        <p className="auth-footer-text">
          想起密码了？
          <Link to={ROUTES.auth} className="auth-link auth-link-inline">
            返回登录
          </Link>
        </p>
      }
    >
      {step === 'account' ? (
        <form className="auth-form" onSubmit={handleAccountSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="forgot-account" className="auth-label">
              账号
            </label>
            <div className="auth-input-wrap">
              <User className="auth-input-icon" aria-hidden="true" />
              <input
                id="forgot-account"
                type="text"
                autoComplete="username"
                className="auth-input"
                placeholder="手机号 / 邮箱 / 用户名"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                disabled={loading}
              />
            </div>
            <p className="auth-hint">请填写注册时绑定的联系方式，以便接收验证码</p>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? '发送中…' : '发送验证码'}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleResetSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="forgot-code" className="auth-label">
              验证码
            </label>
            <div className="auth-code-row">
              <div className="auth-input-wrap">
                <input
                  id="forgot-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="auth-input auth-input-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                className="auth-resend-btn"
                disabled={loading || countdown > 0}
                onClick={() => void sendCode()}
              >
                {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="forgot-password" className="auth-label">
              新密码
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="forgot-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="auth-input"
                placeholder="至少 6 位"
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

          <div className="auth-field">
            <label htmlFor="forgot-confirm" className="auth-label">
              确认新密码
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="forgot-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="auth-input"
                placeholder="请再次输入新密码"
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

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? '提交中…' : '确认重置'}
          </button>

          <button
            type="button"
            className="auth-link auth-link-center"
            onClick={() => {
              setStep('account')
              setCode('')
            }}
          >
            更换账号
          </button>
        </form>
      )}
    </AuthFormShell>
  )
}
