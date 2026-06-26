import { useRoutes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { OfficialHomePage } from '@/pages/official'
import { HomePage } from '@/pages/home'
import { ChatPage } from '@/pages/chat'
import { ExplorePage } from '@/pages/explore'
import { ProfilePage } from '@/pages/profile'
import { TermsPage } from '@/pages/legal/terms'
import { PrivacyPage } from '@/pages/legal/privacy'
import { AuthLayout } from '@/pages/auth/layout'
import { AuthLoginPage } from '@/pages/auth'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'
import { ManualTranscribePage } from '@/pages/manual-transcribe'
import { FilesPage } from '@/pages/files'

const routes = [
  { path: '/', element: <OfficialHomePage /> },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <AuthLoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '/legal/terms', element: <TermsPage /> },
  { path: '/legal/privacy', element: <PrivacyPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:conversationId', element: <ChatPage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'manual', element: <ManualTranscribePage /> },
    ],
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
