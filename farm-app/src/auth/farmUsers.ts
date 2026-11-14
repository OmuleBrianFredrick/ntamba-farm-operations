import { supabase } from '../lib/supabase'
import type { FarmMembership } from './AuthContext'
import type { PlatformRole } from './roles'

export type FarmUser = {
  membershipId: string
  userId: string
  name: string
  email: string
  phone: string
  role: PlatformRole
  isActive: boolean
  createdAt: string
}

export type FarmUserInput = {
  name: string
  email: string
  phone: string
  role: PlatformRole
  isActive: boolean
}

type MembershipRow = {
  id: string
  user_id: string
  role: PlatformRole
  is_active: boolean
  created_at: string
}

type ProfileRow = {
  id: string
  display_name: string
  email: string | null
  phone: string | null
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function listFarmUsers(membership: FarmMembership): Promise<FarmUser[]> {
  const client = requireSupabase()
  let query = client.from('memberships').select('id,user_id,role,is_active,created_at')
    .eq('organization_id', membership.organizationId)
  query = membership.farmId ? query.eq('farm_id', membership.farmId) : query.is('farm_id', null)
  const { data: membershipRows, error: membershipError } = await query
  if (membershipError) throw membershipError
  const rows = (membershipRows ?? []) as MembershipRow[]
  if (!rows.length) return []

  const { data: profileRows, error: profileError } = await client.from('profiles')
    .select('id,display_name,email,phone')
    .in('id', rows.map((row) => row.user_id))
  if (profileError) throw profileError
  const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))

  return rows.map((row) => {
    const profile = profiles.get(row.user_id)
    return {
      membershipId: row.id,
      userId: row.user_id,
      name: profile?.display_name ?? 'Farm user',
      email: profile?.email ?? 'Email unavailable',
      phone: profile?.phone ?? '',
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
    }
  }).sort((left, right) => left.name.localeCompare(right.name))
}

async function getAccessToken() {
  const client = requireSupabase()
  let { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw new Error(`Unable to read the current Supabase session: ${sessionError.message}`)
  let session = sessionData.session
  if (!session || (session.expires_at ?? 0) * 1000 < Date.now() + 60_000) {
    const refreshed = await client.auth.refreshSession()
    sessionError = refreshed.error
    session = refreshed.data.session
    if (sessionError) throw new Error(`Your Supabase session has expired. Sign in again before sending an invitation.`)
  }
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('Your Supabase session has expired. Sign in again before sending an invitation.')
  return accessToken
}

async function invokeUserManagement(body: Record<string, unknown>) {
  let accessToken = await getAccessToken()

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !publishableKey) throw new Error('Supabase is not configured for user management.')

  let response: Response | undefined
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/manage-farm-user`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: publishableKey,
          'Content-Type': 'application/json',
          'X-Client-Info': 'ntamba-farm-operations',
        },
        body: JSON.stringify(body),
      })
      if (response.status !== 401 || attempt === 1) break
      accessToken = await getAccessToken()
    } catch (error) {
      if (attempt === 0) {
        accessToken = await getAccessToken()
        continue
      }
      const message = error instanceof Error ? error.message : 'Unknown network error.'
      throw new Error(`Unable to reach the Supabase user-management function: ${message}`)
    }
  }
  if (!response) throw new Error('Unable to reach the Supabase user-management function.')

  const payload = await response.json().catch(() => null) as { ok?: boolean; error?: unknown } | null
  if (!response.ok) {
    const detail = typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`
    throw new Error(`Supabase user-management failed: ${detail}`)
  }
  if (!payload?.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'The user-management request failed.')
  return payload as { ok: true; invited?: boolean }
}

export async function inviteFarmUser(membership: FarmMembership, input: FarmUserInput) {
  return invokeUserManagement({
    action: 'invite',
    organizationId: membership.organizationId,
    farmId: membership.farmId,
    redirectTo: `${window.location.origin}/set-password`,
    ...input,
  })
}

export async function updateFarmUser(membership: FarmMembership, membershipId: string, input: FarmUserInput) {
  return invokeUserManagement({
    action: 'update',
    organizationId: membership.organizationId,
    farmId: membership.farmId,
    membershipId,
    ...input,
  })
}
