import { useState, type FormEvent } from 'react'
import { CheckCircle2, KeyRound, Leaf } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function SetPasswordPage() {
  const { demo, loading, session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (demo) return <Navigate to="/" replace />
  if (loading) return <div className="auth-loading">Confirming your secure invitation…</div>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    setSubmitting(true)
    setError('')
    const message = await updatePassword(password)
    setSubmitting(false)
    if (message) return setError(message)
    setSaved(true)
  }

  return <main className="login-page"><section className="login-card">
    <div className="login-mark"><Leaf /><span>Ntamba</span></div>
    {saved ? <div className="password-success"><CheckCircle2 /><h1>Password saved</h1><p>Your account is ready to use.</p><button className="primary-button" onClick={() => navigate('/', { replace: true })}>Open farm operations</button></div> : <>
      <p className="eyebrow">Secure account setup</p><h1>Create your password</h1>
      <p className="login-intro">Complete your invitation or password recovery for {session?.user.email ?? 'your farm account'}.</p>
      {!session ? <div className="form-error" role="alert">This secure link is missing or has expired. Request a new invitation or password-reset email.</div> : <form onSubmit={submit} className="login-form">
        <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={submitting}><KeyRound />{submitting ? 'Saving password…' : 'Save password'}</button>
      </form>}
    </>}
  </section></main>
}

