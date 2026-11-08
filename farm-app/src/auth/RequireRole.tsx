import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { PlatformRole } from './roles'

export function RequireRole({ allowed }: { allowed: PlatformRole[] }) {
  const { demo, roles } = useAuth()
  if (demo || roles.some((role) => allowed.includes(role))) return <Outlet />
  return <Navigate to="/" replace />
}

