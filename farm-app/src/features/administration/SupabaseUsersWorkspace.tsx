import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import type { FarmMembership } from '../../auth/AuthContext'
import { inviteFarmUser, updateFarmUser, type FarmUser } from '../../auth/farmUsers'
import { platformRoleLabels, type PlatformRole } from '../../auth/roles'

export function SupabaseUsersWorkspace({ membership, rows, refresh, setMessage }: {
  membership: FarmMembership
  rows: FarmUser[]
  refresh: () => Promise<void>
  setMessage: (message: string) => void
}) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<FarmUser | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const input = {
        name: String(form.get('name')).trim(),
        email: String(form.get('email')).trim().toLowerCase(),
        phone: String(form.get('phone')).trim(),
        role: String(form.get('role')) as PlatformRole,
        isActive: String(form.get('status')) === 'active',
      }
      if (editing) {
        await updateFarmUser(membership, editing.membershipId, input)
        setMessage('The user profile, role and access status were updated in Supabase.')
      } else {
        const result = await inviteFarmUser(membership, input)
        setMessage(result.invited ? 'The invitation email was sent and farm access was assigned.' : 'The existing account was assigned to this farm.')
      }
      setShow(false)
      setEditing(null)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The Supabase user could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Platform users and responsibilities</h2><span>{rows.length} Supabase membership(s) · {membership.farmName}</span></div><button className="primary-button" onClick={() => { setEditing(null); setShow(!show) }}><UserPlus />{show ? 'Close form' : 'Invite user'}</button></div>
    {(show || editing) && <form className="form-panel embedded-form" onSubmit={submit}>
      <div className="form-grid three-column">
        <Field name="name" label="Full name" value={editing?.name} />
        <Field name="email" label="Email" type="email" value={editing?.email} readOnly={Boolean(editing)} />
        <Field name="phone" label="Phone" value={editing?.phone} required={false} />
        <label className="field-group"><span>Role</span><select className="field" name="role" defaultValue={editing?.role ?? 'worker'}>{Object.entries(platformRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field-group"><span>Account access</span><select className="field" name="status" defaultValue={editing?.isActive === false ? 'suspended' : 'active'}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
        <label className="field-group"><span>Farm scope</span><input className="field" value={`${membership.organizationName} · ${membership.farmName}`} readOnly /></label>
      </div>
      <div className="form-actions"><span className="saved-note">{editing ? 'Email changes require a separate identity-verification flow.' : 'Supabase will email a secure account-setup invitation.'}</span><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update platform user' : 'Send invitation'}</button></div>
    </form>}
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>User</th><th>Role</th><th>Farm</th><th>Status</th><th>Added</th><th>Action</th></tr></thead><tbody>{rows.map((user) => <tr key={user.membershipId}><td><strong>{user.name}</strong><span>{user.email}{user.phone ? ` · ${user.phone}` : ''}</span></td><td>{platformRoleLabels[user.role]}</td><td>{membership.farmName}</td><td><span className={`operation-status ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'active' : 'suspended'}</span></td><td>{new Date(user.createdAt).toLocaleDateString('en-GB')}</td><td><button className="text-link" onClick={() => { setEditing(user); setShow(false) }}>Edit</button></td></tr>)}</tbody></table></div>
  </section>
}

function Field({ name, label, type = 'text', value, readOnly = false, required = true }: { name: string; label: string; type?: string; value?: string; readOnly?: boolean; required?: boolean }) {
  return <label className="field-group"><span>{label}</span><input className="field" name={name} type={type} defaultValue={value} readOnly={readOnly} required={required} /></label>
}
