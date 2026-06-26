import type { ReactNode } from 'react'

interface AuthFormShellProps {
  header: ReactNode
  toolbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/** 登录 / 注册 / 忘记密码共用布局，高度完全随内容 */
export function AuthFormShell({ header, toolbar, footer, children }: AuthFormShellProps) {
  return (
    <div className="auth-form-shell">
      <div className="auth-form-header-slot">{header}</div>
      {toolbar != null ? <div className="auth-form-toolbar-slot">{toolbar}</div> : null}
      <div className="auth-form-content-slot">{children}</div>
      {footer != null ? <div className="auth-form-footer-slot">{footer}</div> : null}
    </div>
  )
}
