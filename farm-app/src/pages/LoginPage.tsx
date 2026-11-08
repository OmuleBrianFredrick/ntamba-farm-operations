import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { demo, loading, sendPasswordReset, session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading) return <div className="auth-loading">Checking your secure session…</div>
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

  const requestReset = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    const message = await sendPasswordReset(email)
    setSubmitting(false)
    if (message) return setError(message)
    setNotice('Password-reset instructions were sent if this email belongs to an account.')
  }

  return <main className="login-page">
    <section className="login-card">
      <div className="login-mark"><Leaf /><span>Ntamba</span></div>
      <p className="eyebrow">Farm operations</p>
      <h1>{resetMode ? 'Reset your password' : 'Welcome back'}</h1>
      <p className="login-intro">{resetMode ? 'Enter your registered email to receive a secure recovery link.' : 'Sign in to record farm work, outputs, finance and QHSE information.'}</p>
      <form onSubmit={resetMode ? requestReset : submit} className="login-form">
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {!resetMode && <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="status-message" role="status">{notice}</div>}
        <button className="primary-button" disabled={submitting}>{submitting ? 'Please wait…' : resetMode ? 'Send recovery email' : 'Sign in'}</button>
      </form>
      <button className="login-secondary-action" onClick={() => { setResetMode((value) => !value); setError(''); setNotice('') }}>{resetMode ? 'Back to sign in' : 'Forgot your password?'}</button>
      <p className="login-help">Accounts are created by the farm administrator.</p>
    </section>
  </main>
}
