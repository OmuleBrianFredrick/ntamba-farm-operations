import { describe, expect, it } from 'vitest'
import { canPerform, permissionMatrix, summarizeAcceptance, validateAdminUser } from './phase6Store'
import { buildReportSummary, filterDataset, isJournalBalanced, reportCsv, type ReportDataset } from '../reports/reporting'
import type { JournalEntry, SaleInvoice } from '../finance/financeStore'
import type { InventoryItem } from '../inventory/inventoryStore'

const emptyData = (): ReportDataset => ({ plantings: [], cropRecords: [], animalRecords: [], assets: [], lifecycleEvents: [], inventoryItems: [], stockTransactions: [], sales: [], expenses: [], wages: [], payments: [], journals: [], submissions: [], actions: [] })

describe('Phase 6 administration policy', () => {
  it('keeps workers out of finance and administration', () => {
    expect(canPerform('worker', 'finance', 'view')).toBe(false)
    expect(canPerform('worker', 'administration', 'manage')).toBe(false)
  })

  it('lets accountants manage finance without managing users', () => {
    expect(canPerform('accountant', 'finance', 'manage')).toBe(true)
    expect(canPerform('accountant', 'administration', 'view')).toBe(false)
  })

  it('gives owners full policy coverage', () => {
    expect(Object.values(permissionMatrix.owner).every(actions => actions.length === 5)).toBe(true)
  })

  it('validates required user identity and scope', () => {
    expect(validateAdminUser({ name: '', email: 'bad', role: 'worker', department: '', enterprise: '' })).toBeTruthy()
    expect(validateAdminUser({ name: 'QA User', email: 'qa@ntamba.test', role: 'supervisor', department: 'Crops', enterprise: 'Crops' })).toBeNull()
  })

  it('fails acceptance only for a failed check', () => {
    expect(summarizeAcceptance([{ id: 'a', label: 'A', status: 'warning', detail: 'Deferred' }])).toBe('passed')
    expect(summarizeAcceptance([{ id: 'a', label: 'A', status: 'failed', detail: 'Broken' }])).toBe('attention-required')
  })
})

describe('Phase 6 cross-enterprise reporting', () => {
  it('calculates revenue, stock value and alerts', () => {
    const data = emptyData()
    data.sales = [{ total: 320000, balance: 150000 } as SaleInvoice]
    data.inventoryItems = [{ quantityOnHand: 35, unitCost: 2500, reorderLevel: 40, status: 'active' } as InventoryItem]
    const summary = buildReportSummary(data)
    expect(summary.revenue).toBe(320000)
    expect(summary.stockValue).toBe(87500)
    expect(summary.stockAlerts).toBe(1)
  })

  it('filters records by inclusive date range', () => {
    const data = emptyData()
    data.sales = [{ invoiceDate: '2026-11-01', enterprise: 'Crops' }, { invoiceDate: '2026-10-31', enterprise: 'Crops' }] as SaleInvoice[]
    expect(filterDataset(data, { start: '2026-11-01', end: '2026-11-30', enterprise: 'All farm' }).sales).toHaveLength(1)
  })

  it('filters enterprise-specific records', () => {
    const data = emptyData()
    data.sales = [{ invoiceDate: '2026-11-03', enterprise: 'Livestock' }, { invoiceDate: '2026-11-03', enterprise: 'Poultry' }] as SaleInvoice[]
    expect(filterDataset(data, { start: '2026-11-01', end: '2026-11-30', enterprise: 'Livestock' }).sales).toHaveLength(1)
  })

  it('detects balanced and unbalanced journals', () => {
    const balanced = [{ lines: [{ debit: 100, credit: 0 }, { debit: 0, credit: 100 }] }] as JournalEntry[]
    const unbalanced = [{ lines: [{ debit: 100, credit: 0 }] }] as JournalEntry[]
    expect(isJournalBalanced(balanced)).toBe(true)
    expect(isJournalBalanced(unbalanced)).toBe(false)
  })

  it('creates a management CSV containing the selected period', () => {
    const csv = reportCsv(buildReportSummary(emptyData()), { start: '2026-11-01', end: '2026-11-30', enterprise: 'All farm' })
    expect(csv).toContain('Period start')
    expect(csv).toContain('2026-11-30')
    expect(csv).toContain('Stock value')
  })
})
