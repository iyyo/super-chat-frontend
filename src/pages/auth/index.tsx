import { useSearchParams } from 'react-router-dom'
import { AuthForm } from '@/components/auth/auth-form'

export function AuthLoginPage() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  const initialMode = tab === 'register' ? 'register' : 'login'

  return <AuthForm initialMode={initialMode} />
}
