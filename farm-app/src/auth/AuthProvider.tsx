import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isDemoMode, supabase } from '../lib/supabase'
import { AuthContext, type AuthState, type FarmMembership } from './AuthContext'
import { highestPriorityRole, type PlatformRole } from './roles'

type MembershipRow = {
  id: string
  organization_id: string
  farm_id: string | null
  role: PlatformRole
  organizations: { name: string } | Array<{ name: string }> | null
  farms: { name: string } | Array<{ name: string }> | null
}

type ProfileRow = { display_name: string; email: string | null }

function relatedName(value: { name: string } | Array<{ name: string }> | null, fallback: string) {
  if (Array.isArray(value)) return value[0]?.name ?? fallback
  return value?.name ?? fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!isDemoMode)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [memberships, setMemberships] = useState<FarmMembership[]>([])
  const [identityError, setIdentityError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) setLoading(true)
      if (!nextSession) {
        setProfile(null)
        setMemberships([])
        setLoading(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const refreshIdentity = useCallback(async () => {
    if (!supabase || !session) return
    setIdentityError(null)
    const [{ data: profileData, error: profileError }, { data: membershipData, error: membershipError }] = await Promise.all([
      supabase.from('profiles').select('display_name,email').eq('id', session.user.id).single(),
      supabase.from('memberships').select('id,organization_id,farm_id,role,organizations(name),farms(name)')
        .eq('user_id', session.user.id).eq('is_active', true),
    ])
    if (profileError || membershipError) {
      setIdentityError(profileError?.message ?? membershipError?.message ?? 'Your farm access could not be loaded.')
      setLoading(false)
      return
    }
    setProfile(profileData as ProfileRow)
    setMemberships(((membershipData ?? []) as unknown as MembershipRow[]).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      organizationName: relatedName(row.organizations, 'Farm organization'),
      farmId: row.farm_id,
      farmName: relatedName(row.farms, 'All farms'),
      role: row.role,
    })))
    setLoading(false)
  }, [session])

  useEffect(() => {
    if (!session || !supabase) return
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- Supabase identity is external session state.
    void refreshIdentity()
  }, [refreshIdentity, session])

  const roles = memberships.map((membership) => membership.role)
  const primaryRole = highestPriorityRole(roles)
  const activeMembership = memberships.find((membership) => membership.role === primaryRole) ?? memberships[0] ?? null

  const value = useMemo<AuthState>(() => ({
    session,
    loading,
    demo: isDemoMode,
    email: profile?.email ?? session?.user.email ?? '',
    memberships,
    activeMembership,
    roles,
    identityError,
    canManageUsers: isDemoMode || roles.some((role) => ['ceo', 'administrator', 'farm_manager'].includes(role)),
    displayName: isDemoMode
      ? 'Sarah K.'
      : String(profile?.display_name ?? session?.user.user_metadata.display_name ?? session?.user.email?.split('@')[0] ?? 'Farm user'),
    signIn: async (email, password) => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/set-password` })
      return error?.message ?? null
    },
    updatePassword: async (password) => {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.updateUser({ password })
      return error?.message ?? null
    },
    refreshIdentity,
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
  }), [activeMembership, identityError, loading, memberships, profile, refreshIdentity, roles, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
