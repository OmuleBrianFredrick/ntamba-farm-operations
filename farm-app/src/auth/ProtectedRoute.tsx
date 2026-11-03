import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { demo, loading, session } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading">Checking your secure session…</div>
  if (!demo && !session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
