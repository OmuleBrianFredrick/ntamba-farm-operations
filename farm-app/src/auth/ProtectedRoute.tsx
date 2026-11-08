import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { demo, identityError, loading, memberships, session, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading">Checking your secure session…</div>
  if (!demo && !session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!demo && identityError) return <main className="access-boundary"><h1>Farm access could not be loaded</h1><p>{identityError}</p><button className="primary-button" onClick={() => void signOut()}>Return to sign in</button></main>
  if (!demo && !memberships.length) return <main className="access-boundary"><h1>Account awaiting farm access</h1><p>Your login is valid, but no active Ntamba Farm role is assigned. Ask an administrator or farm owner to activate your membership.</p><button className="primary-button" onClick={() => void signOut()}>Return to sign in</button></main>
  return <Outlet />
}
