import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { demo, session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (demo || session) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const message = await signIn(email, password)
    setSubmitting(false)
    if (message) return setError(message)
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(from, { replace: true })
  }

  return <main className="login-page">
    <section className="login-card">
      <div className="login-mark"><Leaf /><span>Ntamba</span></div>
      <p className="eyebrow">Farm operations</p>
      <h1>Welcome back</h1>
      <p className="login-intro">Sign in to record farm work, outputs, finance and QHSE information.</p>
      <form onSubmit={submit} className="login-form">
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="login-help">Accounts are created by the farm administrator.</p>
    </section>
  </main>
}
