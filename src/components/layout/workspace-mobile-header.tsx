import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME, ROUTES } from '@/lib/constants'

export function WorkspaceMobileHeader() {
  return (
    <header className="workspace-mobile-header">
      <Link to={ROUTES.official} className="workspace-mobile-back">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        <span>返回官网</span>
      </Link>
      <span className="workspace-mobile-title">{APP_NAME}</span>
    </header>
  )
}
