import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore, type ToastItem, type ToastType } from '@/stores/toast-store'
import { cn } from '@/lib/utils'
import '@/styles/toast.css'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = ICONS[item.type]

  return (
    <div
      className={cn('app-toast', `app-toast-${item.type}`)}
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icon className="app-toast-icon" aria-hidden="true" />
      <p className="app-toast-message">{item.message}</p>
      <button
        type="button"
        className="app-toast-close"
        aria-label="关闭提示"
        onClick={() => onDismiss(item.id)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="app-toast-viewport" aria-label="全局提示">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  )
}
