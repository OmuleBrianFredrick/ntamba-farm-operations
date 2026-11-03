import { describe, expect, it } from 'vitest'
import { accountBalance, calculateSaleTotal, calculateWage, dateFallsInPeriod, defaultAccounts, reconciliationDifference, validateAccountingPeriod, validateJournalLines, validateParty, validateWorker, type JournalEntry, type Party, type Worker } from './financeStore'

const party: Party = { id: 'p1', name: 'Farm buyer', type: 'customer', phone: '', email: '', address: '', notes: '', active: true, createdAt: '', updatedAt: '' }
const worker: Worker = { id: 'w1', name: 'Worker One', phone: '', defaultBasis: 'daily', defaultRate: 15000, department: 'Crops', active: true, createdAt: '', updatedAt: '' }

describe('finance calculations and accounting controls', () => {
  it('calculates sale totals including delivery', () => expect(calculateSaleTotal(10, 2500, 5000)).toBe(30000))
  it('calculates gross and net wages', () => expect(calculateWage(5, 15000, 5000)).toEqual({ gross: 75000, net: 70000 }))
  it('accepts complete parties and workers', () => { expect(validateParty(party)).toBeNull(); expect(validateWorker(worker)).toBeNull() })
  it('rejects invalid emails and negative wage rates', () => { expect(validateParty({ ...party, email: 'bad' })).toContain('email'); expect(validateWorker({ ...worker, defaultRate: -1 })).toContain('negative') })
  it('accepts balanced double-entry journals', () => expect(validateJournalLines([
    { accountCode: '1000', accountName: 'Cash', debit: 100, credit: 0, memo: '' }, { accountCode: '4000', accountName: 'Sales', debit: 0, credit: 100, memo: '' },
  ])).toBeNull())
  it('rejects unbalanced journals', () => expect(validateJournalLines([
    { accountCode: '1000', accountName: 'Cash', debit: 100, credit: 0, memo: '' }, { accountCode: '4000', accountName: 'Sales', debit: 0, credit: 90, memo: '' },
  ])).toContain('not balanced'))
  it('validates accounting-period date order', () => {
    expect(validateAccountingPeriod({ name: 'October 2026', startDate: '2026-10-01', endDate: '2026-10-31' })).toBeNull()
    expect(validateAccountingPeriod({ name: 'Broken', startDate: '2026-11-30', endDate: '2026-11-01' })).toContain('before')
  })
  it('recognises posting dates inside a closed period', () => {
    const period = { startDate: '2026-10-01', endDate: '2026-10-31' }
    expect(dateFallsInPeriod('2026-10-15', period)).toBe(true)
    expect(dateFallsInPeriod('2026-11-01', period)).toBe(false)
  })
  it('calculates reconciliation differences', () => expect(reconciliationDifference(170000, 165000)).toBe(5000))
  it('calculates normal debit and credit balances', () => {
    const journal: JournalEntry = { id: 'j1', entryDate: '', reference: '', source: 'manual', description: '', createdAt: '', lines: [
      { accountCode: '1000', accountName: 'Cash', debit: 100, credit: 20, memo: '' }, { accountCode: '4000', accountName: 'Sales', debit: 10, credit: 100, memo: '' },
    ] }
    expect(accountBalance(defaultAccounts.find(a => a.code === '1000')!, [journal])).toBe(80)
    expect(accountBalance(defaultAccounts.find(a => a.code === '4000')!, [journal])).toBe(90)
  })
})
