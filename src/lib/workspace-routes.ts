import { ROUTES } from '@/lib/constants'

export function isFileDetailPath(pathname: string): boolean {
  return /^\/app\/files\/[^/]+$/.test(pathname)
}

export function isWorkspaceAppPath(pathname: string): boolean {
  return pathname.startsWith(ROUTES.app)
}
