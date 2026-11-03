import Dexie, { type EntityTable } from 'dexie'
import { canAccessForm, formById, qhseForms, type QhseFrequency, type QhseRole } from './qhseCatalog'

export type SubmissionStatus = 'draft' | 'submitted' | 'needs-changes' | 'approved' | 'restricted'
export type ReviewDecision = 'approve' | 'changes' | 'restrict'
export type SubmissionHistory = { at: string; by: string; role: QhseRole; action: string; note: string }
export type QhseSubmission = {
  id: string; formId: string; formTitle: string; formVersion: string; reference: string; recordDate: string; dueDate: string;
  enterprise: string; location: string; createdBy: string; createdByRole: QhseRole; answers: Record<string, string>;
  overallResult: 'satisfactory' | 'action-required' | 'not-applicable'; riskLevel: 'low' | 'medium' | 'high' | 'critical';
  restrictionRequired: boolean; confidential: boolean; status: SubmissionStatus; revision: number; reviewNote: string;
  createdAt: string; updatedAt: string; submittedAt: string | null; approvedAt: string | null; history: SubmissionHistory[]
}
export type CorrectiveAction = {
  id: string; sourceSubmissionId: string; sourceReference: string; sourceFormTitle: string; description: string; owner: string;
  priority: 'low' | 'medium' | 'high' | 'critical'; dueDate: string; status: 'open' | 'in-progress' | 'completed' | 'overdue';
  completionNote: string; createdAt: string; completedAt: string | null
}
export type Announcement = { id: string; title: string; body: string; audience: string; author: string; publishedAt: string; expiresOn: string | null }
export type ReportPack = { id: string; title: string; periodStart: string; periodEnd: string; generatedBy: string; generatedAt: string; summary: Record<string, number> }
export type FormAssignment = { id: string; formId: string; role: QhseRole; enterprise: string; department: string; assignee: string; frequency: QhseFrequency; nextDue: string; active: boolean; updatedAt: string }

class QhseDatabase extends Dexie {
  submissions!: EntityTable<QhseSubmission, 'id'>
  actions!: EntityTable<CorrectiveAction, 'id'>
  announcements!: EntityTable<Announcement, 'id'>
  reportPacks!: EntityTable<ReportPack, 'id'>
  assignments!: EntityTable<FormAssignment, 'id'>
  constructor() {
    super('ntamba-qhse')
    this.version(1).stores({
      submissions: 'id, &reference, formId, recordDate, dueDate, enterprise, createdByRole, status, riskLevel, confidential, updatedAt',
      actions: 'id, sourceSubmissionId, priority, dueDate, status, createdAt',
      announcements: 'id, audience, publishedAt, expiresOn', reportPacks: 'id, periodStart, periodEnd, generatedAt',
      assignments: 'id, formId, role, enterprise, assignee, nextDue, active, updatedAt',
    })
  }
}

export const qhseDb = new QhseDatabase()
export const qhseChangeEvent = 'ntamba-qhse-change'
function notify() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(qhseChangeEvent)) }
export function farmToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }

export function validateSubmission(submission: Pick<QhseSubmission, 'formId' | 'recordDate' | 'enterprise' | 'location' | 'answers' | 'overallResult' | 'riskLevel'>) {
  if (!formById(submission.formId)) return 'Select a valid controlled form.'
  if (!submission.recordDate || !submission.enterprise.trim() || !submission.location.trim()) return 'Enter the record date, enterprise and work area.'
  const answered = Object.values(submission.answers).filter(value => value.trim()).length
  if (answered < 2) return 'Answer at least two of the simplified form questions.'
  if (submission.overallResult === 'action-required' && !Object.values(submission.answers).some(value => value.trim().length >= 8)) return 'Describe the finding and immediate action.'
  return null
}

export function dueWindowStart(frequency: QhseFrequency, today: string) {
  const date = new Date(`${today}T12:00:00`)
  if (frequency === 'daily') return today
  if (frequency === 'weekly') { const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1) }
  else if (frequency === 'monthly') date.setDate(1)
  else return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function missingRoutineForms(role: QhseRole, submissions: QhseSubmission[], today = farmToday()) {
  return qhseForms.filter(definition => canAccessForm(definition, role) && ['daily', 'weekly', 'monthly'].includes(definition.frequency)).filter(definition => {
    const start = dueWindowStart(definition.frequency, today)
    return !submissions.some(item => item.formId === definition.id && item.recordDate >= start && item.recordDate <= today && item.status !== 'draft')
  })
}

export async function saveSubmission(input: Omit<QhseSubmission, 'id' | 'reference' | 'formTitle' | 'formVersion' | 'status' | 'revision' | 'reviewNote' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'approvedAt' | 'history'> & { id?: string }, submit: boolean) {
  const definition = formById(input.formId); if (!definition) throw new Error('The selected form is not in the controlled catalogue.')
  const issue = validateSubmission(input); if (issue) throw new Error(issue)
  const now = new Date().toISOString(); const existing = input.id ? await qhseDb.submissions.get(input.id) : undefined
  if (existing && !['draft', 'needs-changes'].includes(existing.status)) throw new Error('Submitted evidence cannot be silently edited. Request changes or create a new record.')
  const id = existing?.id ?? crypto.randomUUID(); const reference = existing?.reference ?? `QHSE-${input.formId}-${farmToday().replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
  const status: SubmissionStatus = submit ? (input.restrictionRequired ? 'restricted' : 'submitted') : 'draft'
  const actionText = submit ? 'Submitted controlled record' : 'Saved draft'
  const submission: QhseSubmission = {
    ...input, id, reference, formTitle: definition.title, formVersion: definition.version, confidential: definition.confidential || input.confidential,
    status, revision: existing ? existing.revision + 1 : 1, reviewNote: '', createdAt: existing?.createdAt ?? now, updatedAt: now,
    submittedAt: submit ? now : null, approvedAt: null,
    history: [...(existing?.history ?? []), { at: now, by: input.createdBy, role: input.createdByRole, action: actionText, note: '' }],
  }
  await qhseDb.transaction('rw', qhseDb.submissions, qhseDb.actions, async () => {
    await qhseDb.submissions.put(submission)
    if (submit && (input.overallResult === 'action-required' || input.restrictionRequired) && !(await qhseDb.actions.where('sourceSubmissionId').equals(id).count())) {
      const descriptions = Object.values(input.answers).filter(value => value.trim()).join(' · ')
      await qhseDb.actions.add({ id: crypto.randomUUID(), sourceSubmissionId: id, sourceReference: reference, sourceFormTitle: definition.title, description: descriptions.slice(0, 320), owner: input.createdByRole === 'worker' ? 'Enterprise supervisor' : 'QHSE lead', priority: input.riskLevel, dueDate: input.dueDate || farmToday(), status: 'open', completionNote: '', createdAt: now, completedAt: null })
    }
  })
  notify(); return submission
}

export async function reviewSubmission(id: string, decision: ReviewDecision, reviewer: string, role: QhseRole, note: string) {
  if (!['qhse', 'manager', 'owner'].includes(role)) throw new Error('Only an authorized QHSE or management role can review submissions.')
  const submission = await qhseDb.submissions.get(id); if (!submission) throw new Error('Submission not found.')
  if (!note.trim() && decision !== 'approve') throw new Error('Enter a review note explaining the decision.')
  const now = new Date().toISOString(); const status: SubmissionStatus = decision === 'approve' ? 'approved' : decision === 'restrict' ? 'restricted' : 'needs-changes'
  await qhseDb.submissions.update(id, { status, reviewNote: note.trim(), approvedAt: decision === 'approve' ? now : null, updatedAt: now, history: [...submission.history, { at: now, by: reviewer, role, action: status, note: note.trim() }] })
  notify()
}

export async function updateAction(id: string, status: CorrectiveAction['status'], owner: string, completionNote: string) {
  const action = await qhseDb.actions.get(id); if (!action) throw new Error('Corrective action not found.')
  if (status === 'completed' && !completionNote.trim()) throw new Error('Enter completion evidence before closing the action.')
  await qhseDb.actions.update(id, { status, owner: owner.trim() || action.owner, completionNote: completionNote.trim(), completedAt: status === 'completed' ? new Date().toISOString() : null })
  notify()
}

export async function saveAssignment(assignment: FormAssignment) {
  if (!assignment.formId || !assignment.assignee.trim() || !assignment.nextDue) throw new Error('Select a form and enter the assignee and next due date.')
  await qhseDb.assignments.put(assignment); notify()
}

export async function publishAnnouncement(title: string, body: string, audience: string, author: string, expiresOn: string | null) {
  if (!title.trim() || !body.trim()) throw new Error('Enter the announcement title and message.')
  const record: Announcement = { id: crypto.randomUUID(), title: title.trim(), body: body.trim(), audience, author, publishedAt: new Date().toISOString(), expiresOn }
  await qhseDb.announcements.add(record); notify(); return record
}

export async function generateReportPack(title: string, periodStart: string, periodEnd: string, generatedBy: string) {
  if (!title.trim() || !periodStart || !periodEnd || periodStart > periodEnd) throw new Error('Enter a valid report title and date range.')
  const rows = await qhseDb.submissions.where('recordDate').between(periodStart, periodEnd, true, true).toArray()
  const actions = await qhseDb.actions.toArray()
  const summary = { submissions: rows.length, approved: rows.filter(item => item.status === 'approved').length, exceptions: rows.filter(item => item.overallResult === 'action-required').length, restricted: rows.filter(item => item.status === 'restricted').length, openActions: actions.filter(item => item.status !== 'completed').length }
  const pack: ReportPack = { id: crypto.randomUUID(), title: title.trim(), periodStart, periodEnd, generatedBy, generatedAt: new Date().toISOString(), summary }
  await qhseDb.reportPacks.add(pack); notify(); return pack
}
