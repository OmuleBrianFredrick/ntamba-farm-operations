import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRoles = new Set([
  'ceo', 'administrator', 'farm_manager', 'accountant', 'qhse_lead',
  'enterprise_supervisor', 'storekeeper', 'communications_officer', 'worker', 'auditor',
])
const managementRoles = ['ceo', 'administrator', 'farm_manager']

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ ok: false, error: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return response({ ok: false, error: 'Authentication is required.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const token = authorization.slice('Bearer '.length)
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return response({ ok: false, error: 'Your session is invalid or expired.' }, 401)

    const body = await request.json()
    const action = String(body.action ?? '')
    const organizationId = String(body.organizationId ?? '')
    const farmId = body.farmId ? String(body.farmId) : null
    const role = String(body.role ?? '')
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = String(body.phone ?? '').trim() || null
    const isActive = body.isActive !== false

    if (!['invite', 'update'].includes(action)) return response({ ok: false, error: 'Unsupported user-management action.' }, 400)
    if (!organizationId || !allowedRoles.has(role)) return response({ ok: false, error: 'Organization and a valid role are required.' }, 400)
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return response({ ok: false, error: 'A name and valid email address are required.' }, 400)

    let permissionQuery = admin.from('memberships').select('role').eq('organization_id', organizationId)
      .eq('user_id', userData.user.id).eq('is_active', true)
    permissionQuery = farmId ? permissionQuery.eq('farm_id', farmId) : permissionQuery.is('farm_id', null)
    const { data: permissions, error: permissionError } = await permissionQuery
    if (permissionError) throw permissionError
    if (!permissions?.some((membership) => managementRoles.includes(membership.role))) {
      return response({ ok: false, error: 'You do not have permission to manage users for this farm.' }, 403)
    }

    let targetUserId = ''
    let invited = false
    if (action === 'invite') {
      const { data: existingProfile, error: existingProfileError } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
      if (existingProfileError) throw existingProfileError
      if (existingProfile) {
        targetUserId = existingProfile.id
      } else {
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { display_name: name, phone },
          redirectTo: String(body.redirectTo ?? '').trim() || undefined,
        })
        if (inviteError) throw inviteError
        targetUserId = inviteData.user.id
        invited = true
      }
    } else {
      const membershipId = String(body.membershipId ?? '')
      let targetQuery = admin.from('memberships').select('user_id').eq('id', membershipId)
        .eq('organization_id', organizationId)
      targetQuery = farmId ? targetQuery.eq('farm_id', farmId) : targetQuery.is('farm_id', null)
      const { data: targetMembership } = await targetQuery.maybeSingle()
      if (!targetMembership) return response({ ok: false, error: 'The selected farm membership was not found.' }, 404)
      targetUserId = targetMembership.user_id
      const { error: membershipUpdateError } = await admin.from('memberships').update({ role, is_active: isActive }).eq('id', membershipId)
      if (membershipUpdateError) throw membershipUpdateError
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: targetUserId, display_name: name, email, phone, is_active: isActive,
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    if (action === 'invite') {
      const { error: membershipError } = await admin.from('memberships').upsert({
        organization_id: organizationId, farm_id: farmId, user_id: targetUserId, role, is_active: isActive,
      }, { onConflict: 'organization_id,farm_id,user_id,role' })
      if (membershipError) throw membershipError
    }

    const { error: auditError } = await admin.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userData.user.id,
      entity_type: 'membership',
      entity_id: targetUserId,
      action: action === 'invite' ? 'user_invited' : 'user_membership_updated',
      event_data: { email, role, farm_id: farmId, active: isActive, invitation_sent: invited },
    })
    if (auditError) throw auditError

    return response({ ok: true, invited })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected user-management failure.'
    console.error(JSON.stringify({ event: 'manage-farm-user-error', message }))
    return response({ ok: false, error: message }, 400)
  }
})
