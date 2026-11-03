import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isDemoMode, supabase } from '../lib/supabase'
import { AuthContext, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => ({
    session,
    loading,
    demo: isDemoMode,
    displayName: isDemoMode
      ? 'Sarah K.'
      : String(session?.user.user_metadata.display_name ?? session?.user.email?.split('@')[0] ?? 'Farm user'),
    signIn: async (email, password) => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
