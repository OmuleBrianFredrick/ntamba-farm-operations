import Dexie, { type EntityTable } from 'dexie'

export type AdminRole = 'worker' | 'supervisor' | 'qhse' | 'accountant' | 'manager' | 'owner' | 'administrator'
export type AdminUserStatus = 'active' | 'suspended' | 'invited'
export type PermissionAction = 'view' | 'create' | 'review' | 'approve' | 'manage'
export type PermissionModule = 'daily-work' | 'crops' | 'animals' | 'stock' | 'finance' | 'qhse' | 'reports' | 'administration'

export type AdminUser = {
  id: string; name: string; email: string; phone: string; role: AdminRole; department: string; enterprise: string;
  status: AdminUserStatus; createdAt: string; updatedAt: string; lastActiveAt: string | null
}
export type FarmSettings = {
  id: 'farm-profile'; farmName: string; currency: string; timezone: string; weekStartsOn: 'Monday' | 'Sunday';
  reportingCutoffDay: number; qhseReminderHour: string; allowOffline: boolean; updatedAt: string; updatedBy: string
}
export type AuditEvent = {
  id: string; timestamp: string; actor: string; role: AdminRole; module: PermissionModule; action: string;
  entityType: string; entityId: string; summary: string; severity: 'information' | 'warning' | 'critical'; immutable: true
}
export type ReportSummary = {
  productionRecords: number; acceptedOutput: number; revenue: number; expenses: number; wages: number; outstanding: number;
  stockValue: number; stockAlerts: number; qhseSubmitted: number; qhseApproved: number; openActions: number; exceptions: number
}
export type SavedReport = {
  id: string; title: string; reportType: string; periodStart: string; periodEnd: string; enterprise: string;
  createdBy: string; createdAt: string; summary: ReportSummary
}
export type AcceptanceCheck = { id: string; label: string; status: 'passed' | 'warning' | 'failed'; detail: string }
export type AcceptanceRun = { id: string; runAt: string; runBy: string; status: 'passed' | 'attention-required'; checks: AcceptanceCheck[] }

class Phase6Database extends Dexie {
  users!: EntityTable<AdminUser, 'id'>
  settings!: EntityTable<FarmSettings, 'id'>
  audit!: EntityTable<AuditEvent, 'id'>
  savedReports!: EntityTable<SavedReport, 'id'>
  acceptanceRuns!: EntityTable<AcceptanceRun, 'id'>
  constructor() {
    super('ntamba-administration')
    this.version(1).stores({
      users: 'id, &email, role, department, enterprise, status, updatedAt',
      settings: 'id, updatedAt',
      audit: 'id, timestamp, actor, role, module, action, entityType, entityId, severity',
      savedReports: 'id, reportType, periodStart, periodEnd, enterprise, createdAt',
      acceptanceRuns: 'id, runAt, runBy, status',
    })
  }
}

export const phase6Db = new Phase6Database()
export const phase6ChangeEvent = 'ntamba-phase6-change'
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(phase6ChangeEvent)) }

export const roleLabels: Record<AdminRole, string> = {
  worker: 'Worker / specialist', supervisor: 'Enterprise supervisor', qhse: 'QHSE lead', accountant: 'Accountant',
  manager: 'Farm manager', owner: 'CEO / owner', administrator: 'System administrator',
}

const all: PermissionAction[] = ['view', 'create', 'review', 'approve', 'manage']
export const permissionMatrix: Record<AdminRole, Record<PermissionModule, PermissionAction[]>> = {
  worker: { 'daily-work': ['view', 'create'], crops: ['view', 'create'], animals: ['view', 'create'], stock: ['view', 'create'], finance: [], qhse: ['view', 'create'], reports: [], administration: [] },
  supervisor: { 'daily-work': ['view', 'create', 'review'], crops: ['view', 'create', 'review'], animals: ['view', 'create', 'review'], stock: ['view', 'create', 'review'], finance: ['view'], qhse: ['view', 'create', 'review'], reports: ['view'], administration: [] },
  qhse: { 'daily-work': ['view'], crops: ['view'], animals: ['view'], stock: ['view'], finance: [], qhse: ['view', 'create', 'review', 'approve', 'manage'], reports: ['view', 'create'], administration: [] },
  accountant: { 'daily-work': ['view'], crops: ['view'], animals: ['view'], stock: ['view'], finance: all, qhse: ['view'], reports: ['view', 'create'], administration: [] },
  manager: { 'daily-work': all, crops: all, animals: all, stock: all, finance: ['view', 'create', 'review', 'approve'], qhse: all, reports: all, administration: ['view', 'create', 'review'] },
  owner: { 'daily-work': all, crops: all, animals: all, stock: all, finance: all, qhse: all, reports: all, administration: all },
  administrator: { 'daily-work': ['view'], crops: ['view'], animals: ['view'], stock: ['view'], finance: [], qhse: [], reports: ['view'], administration: all },
}

export function canPerform(role: AdminRole, module: PermissionModule, action: PermissionAction) {
  return permissionMatrix[role][module].includes(action)
}

export function validateAdminUser(user: Pick<AdminUser, 'name' | 'email' | 'role' | 'department' | 'enterprise'>) {
  if (!user.name.trim() || !user.email.trim() || !user.department.trim() || !user.enterprise.trim()) return 'Enter the name, email, department and enterprise scope.'
  if (!/^\S+@\S+\.\S+$/.test(user.email)) return 'Enter a valid email address.'
  if (!roleLabels[user.role]) return 'Select a valid role.'
  return null
}

export function summarizeAcceptance(checks: AcceptanceCheck[]) {
  return checks.some(item => item.status === 'failed') ? 'attention-required' as const : 'passed' as const
}

export async function recordAudit(input: Omit<AuditEvent, 'id' | 'timestamp' | 'immutable'>) {
  const event: AuditEvent = { ...input, id: crypto.randomUUID(), timestamp: new Date().toISOString(), immutable: true }
  await phase6Db.audit.add(event); notify(); return event
}

export async function ensureAdministrationSeed() {
  if (!(await phase6Db.settings.count())) await phase6Db.settings.add({
    id: 'farm-profile', farmName: 'Ntamba Farm', currency: 'UGX', timezone: 'Africa/Kampala', weekStartsOn: 'Monday',
    reportingCutoffDay: 1, qhseReminderHour: '07:00', allowOffline: true, updatedAt: new Date().toISOString(), updatedBy: 'System setup',
  })
  if (!(await phase6Db.users.count())) {
    const now = new Date().toISOString()
    await phase6Db.users.bulkAdd([
      { id: crypto.randomUUID(), name: 'Sarah K.', email: 'sarah.manager@ntamba.local', phone: '', role: 'manager', department: 'Farm management', enterprise: 'All farm', status: 'active', createdAt: now, updatedAt: now, lastActiveAt: now },
      { id: crypto.randomUUID(), name: 'Daniel A.', email: 'daniel.supervisor@ntamba.local', phone: '', role: 'supervisor', department: 'Production', enterprise: 'Crops', status: 'active', createdAt: now, updatedAt: now, lastActiveAt: null },
      { id: crypto.randomUUID(), name: 'Grace N.', email: 'grace.qhse@ntamba.local', phone: '', role: 'qhse', department: 'QHSE', enterprise: 'All farm', status: 'active', createdAt: now, updatedAt: now, lastActiveAt: null },
      { id: crypto.randomUUID(), name: 'Peter O.', email: 'peter.accounts@ntamba.local', phone: '', role: 'accountant', department: 'Finance', enterprise: 'All farm', status: 'invited', createdAt: now, updatedAt: now, lastActiveAt: null },
    ])
  }
  notify()
}

export async function saveAdminUser(input: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt' | 'lastActiveAt'> & { id?: string }, actor: string) {
  const issue = validateAdminUser(input); if (issue) throw new Error(issue)
  const duplicate = await phase6Db.users.where('email').equalsIgnoreCase(input.email.trim()).first()
  if (duplicate && duplicate.id !== input.id) throw new Error('That email already belongs to another user record.')
  const now = new Date().toISOString(); const existing = input.id ? await phase6Db.users.get(input.id) : undefined
  const user: AdminUser = { ...input, id: existing?.id ?? crypto.randomUUID(), email: input.email.trim().toLowerCase(), createdAt: existing?.createdAt ?? now, updatedAt: now, lastActiveAt: existing?.lastActiveAt ?? null }
  await phase6Db.users.put(user)
  await recordAudit({ actor, role: 'manager', module: 'administration', action: existing ? 'updated-user' : 'created-user', entityType: 'user', entityId: user.id, summary: `${user.name} · ${roleLabels[user.role]} · ${user.status}`, severity: 'information' })
  notify(); return user
}

export async function saveFarmSettings(settings: FarmSettings, actor: string) {
  const next = { ...settings, reportingCutoffDay: Math.min(28, Math.max(1, settings.reportingCutoffDay)), updatedAt: new Date().toISOString(), updatedBy: actor }
  await phase6Db.settings.put(next)
  await recordAudit({ actor, role: 'manager', module: 'administration', action: 'updated-settings', entityType: 'farm-settings', entityId: next.id, summary: `${next.farmName} · ${next.currency} · ${next.timezone}`, severity: 'information' })
  notify(); return next
}

export async function saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>) {
  const saved: SavedReport = { ...report, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  await phase6Db.savedReports.add(saved)
  await recordAudit({ actor: report.createdBy, role: 'manager', module: 'reports', action: 'saved-report-snapshot', entityType: 'report', entityId: saved.id, summary: `${saved.title} · ${saved.periodStart} to ${saved.periodEnd}`, severity: 'information' })
  notify(); return saved
}

export async function saveAcceptanceRun(runBy: string, checks: AcceptanceCheck[]) {
  const run: AcceptanceRun = { id: crypto.randomUUID(), runAt: new Date().toISOString(), runBy, status: summarizeAcceptance(checks), checks }
  await phase6Db.acceptanceRuns.add(run)
  await recordAudit({ actor: runBy, role: 'manager', module: 'administration', action: 'ran-system-acceptance', entityType: 'acceptance-run', entityId: run.id, summary: `${checks.filter(item => item.status === 'passed').length}/${checks.length} checks passed`, severity: run.status === 'passed' ? 'information' : 'warning' })
  notify(); return run
}
