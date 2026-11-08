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

async function invokeUserManagement(body: Record<string, unknown>) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('manage-farm-user', { body })
  if (error) {
    let message = error.message
    const context = 'context' in error ? error.context : undefined
    if (context && typeof context === 'object' && 'json' in context && typeof context.json === 'function') {
      const responseContext = context as { clone?: () => { json: () => Promise<unknown> }; json: () => Promise<unknown> }
      const payload = await (responseContext.clone ? responseContext.clone().json() : responseContext.json()).catch(() => null) as { error?: unknown } | null
      if (typeof payload?.error === 'string') message = payload.error
    }
    throw new Error(message)
  }
  if (!data?.ok) throw new Error(data?.error ?? 'The user-management request failed.')
  return data as { ok: true; invited?: boolean }
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
