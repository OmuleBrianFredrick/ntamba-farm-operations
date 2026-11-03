import { describe, expect, it } from 'vitest'
import { canAccessForm, qhseForms } from './qhseCatalog'
import { dueWindowStart, missingRoutineForms, validateSubmission, type QhseSubmission } from './qhseStore'

const valid = {
  formId: '01', recordDate: '2026-11-02', enterprise: 'All farm', location: 'Main yard',
  answers: { one: 'All access routes checked', two: 'No unsafe condition found' }, overallResult: 'satisfactory' as const, riskLevel: 'low' as const,
}

describe('QHSE catalogue and hierarchy', () => {
  it('contains all 38 controlled forms with unique ids and source PDFs', () => {
    expect(qhseForms).toHaveLength(38)
    expect(new Set(qhseForms.map(item => item.id)).size).toBe(38)
    expect(qhseForms.every(item => item.sourceFile.endsWith('.pdf') && item.version === '01')).toBe(true)
  })
  it('gives management full oversight while limiting worker assignments', () => {
    expect(qhseForms.every(item => canAccessForm(item, 'manager'))).toBe(true)
    expect(qhseForms.filter(item => canAccessForm(item, 'worker')).length).toBeLessThan(38)
    expect(canAccessForm(qhseForms.find(item => item.id === '38')!, 'worker')).toBe(false)
  })
  it('validates a complete simplified submission', () => expect(validateSubmission(valid)).toBeNull())
  it('rejects incomplete simplified submissions', () => expect(validateSubmission({ ...valid, location: '', answers: {} })).toContain('date'))
  it('calculates daily, weekly and monthly due windows', () => {
    expect(dueWindowStart('daily', '2026-11-02')).toBe('2026-11-02')
    expect(dueWindowStart('weekly', '2026-11-05')).toBe('2026-11-02')
    expect(dueWindowStart('monthly', '2026-11-22')).toBe('2026-11-01')
    expect(dueWindowStart('event', '2026-11-02')).toBe('')
  })
  it('removes a routine form from missing reports after submission', () => {
    const before = missingRoutineForms('manager', [], '2026-11-02')
    expect(before.some(item => item.id === '01')).toBe(true)
    const submitted = { formId: '01', recordDate: '2026-11-02', status: 'submitted' } as QhseSubmission
    const after = missingRoutineForms('manager', [submitted], '2026-11-02')
    expect(after.some(item => item.id === '01')).toBe(false)
  })
})
