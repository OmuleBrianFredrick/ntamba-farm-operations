import type { AnimalRecord, LifecycleEvent, ManagedAsset } from '../animals/records'
import type { ExpenseRecord, JournalEntry, Payment, SaleInvoice, WageRecord } from '../finance/financeStore'
import type { InventoryItem, StockTransaction } from '../inventory/inventoryStore'
import type { CorrectiveAction, QhseSubmission } from '../qhse/qhseStore'
import type { StoredCropRecord, StoredPlantingSession } from '../../lib/offlineDb'
import type { ReportSummary } from '../administration/phase6Store'

export type ReportDataset = {
  plantings: StoredPlantingSession[]; cropRecords: StoredCropRecord[]; animalRecords: AnimalRecord[]; assets: ManagedAsset[];
  lifecycleEvents: LifecycleEvent[]; inventoryItems: InventoryItem[]; stockTransactions: StockTransaction[]; sales: SaleInvoice[];
  expenses: ExpenseRecord[]; wages: WageRecord[]; payments: Payment[]; journals: JournalEntry[]; submissions: QhseSubmission[]; actions: CorrectiveAction[]
}

export type ReportFilters = { start: string; end: string; enterprise: string }
export const within = (date: string, filters: ReportFilters) => Boolean(date) && date >= filters.start && date <= filters.end
export const enterpriseMatches = (value: string, selected: string) => selected === 'All farm' || value.toLowerCase().includes(selected.toLowerCase())

export function filterDataset(data: ReportDataset, filters: ReportFilters): ReportDataset {
  return {
    plantings: data.plantings.filter(item => within(item.plantedOn, filters)),
    cropRecords: data.cropRecords.filter(item => within(item.recordDate, filters)),
    animalRecords: data.animalRecords.filter(item => within(item.date, filters) && enterpriseMatches(item.enterprise, filters.enterprise)),
    assets: data.assets.filter(item => enterpriseMatches(item.enterprise, filters.enterprise)),
    lifecycleEvents: data.lifecycleEvents.filter(item => within(item.eventDate, filters) && enterpriseMatches(item.enterprise, filters.enterprise)),
    inventoryItems: data.inventoryItems,
    stockTransactions: data.stockTransactions.filter(item => within(item.transactionDate, filters) && enterpriseMatches(item.enterprise || 'All farm', filters.enterprise)),
    sales: data.sales.filter(item => within(item.invoiceDate, filters) && enterpriseMatches(item.enterprise || 'All farm', filters.enterprise)),
    expenses: data.expenses.filter(item => within(item.expenseDate, filters) && enterpriseMatches(item.enterprise || 'All farm', filters.enterprise)),
    wages: data.wages.filter(item => within(item.workDate, filters)),
    payments: data.payments.filter(item => within(item.paymentDate, filters)),
    journals: data.journals.filter(item => within(item.entryDate, filters)),
    submissions: data.submissions.filter(item => within(item.recordDate, filters) && enterpriseMatches(item.enterprise || 'All farm', filters.enterprise)),
    actions: data.actions.filter(item => within(item.createdAt.slice(0, 10), filters)),
  }
}

export function buildReportSummary(data: ReportDataset): ReportSummary {
  const acceptedOutput = data.animalRecords.reduce((sum, item) => sum + Math.max(0, item.gross - item.rejected), 0)
  const revenue = data.sales.reduce((sum, item) => sum + item.total, 0)
  const expenses = data.expenses.reduce((sum, item) => sum + item.total, 0)
  const wages = data.wages.reduce((sum, item) => sum + item.netWage, 0)
  const outstanding = data.sales.reduce((sum, item) => sum + item.balance, 0) + data.expenses.reduce((sum, item) => sum + item.balance, 0) + data.wages.reduce((sum, item) => sum + item.balance, 0)
  const stockValue = data.inventoryItems.reduce((sum, item) => sum + item.quantityOnHand * item.unitCost, 0)
  const stockAlerts = data.inventoryItems.filter(item => item.status === 'active' && item.quantityOnHand <= item.reorderLevel).length
  const openActions = data.actions.filter(item => item.status !== 'completed').length
  const qhseApproved = data.submissions.filter(item => item.status === 'approved').length
  const qhseSubmitted = data.submissions.filter(item => item.status !== 'draft').length
  const exceptions = stockAlerts + openActions + data.submissions.filter(item => ['restricted', 'needs-changes'].includes(item.status)).length + data.animalRecords.filter(item => item.reviewStatus === 'needs-correction').length
  return { productionRecords: data.plantings.length + data.cropRecords.length + data.animalRecords.length + data.lifecycleEvents.length, acceptedOutput, revenue, expenses, wages, outstanding, stockValue, stockAlerts, qhseSubmitted, qhseApproved, openActions, exceptions }
}

export function reportCsv(summary: ReportSummary, filters: ReportFilters) {
  const rows: Array<[string, string | number]> = [
    ['Period start', filters.start], ['Period end', filters.end], ['Enterprise', filters.enterprise],
    ['Production records', summary.productionRecords], ['Accepted animal output', summary.acceptedOutput], ['Sales revenue', summary.revenue],
    ['Expenses', summary.expenses], ['Wages', summary.wages], ['Outstanding balances', summary.outstanding], ['Stock value', summary.stockValue],
    ['Stock alerts', summary.stockAlerts], ['QHSE submitted', summary.qhseSubmitted], ['QHSE approved', summary.qhseApproved],
    ['Open corrective actions', summary.openActions], ['Exceptions', summary.exceptions],
  ]
  return ['Metric,Value', ...rows.map(([label, value]) => `"${String(label).replaceAll('"', '""')}","${String(value).replaceAll('"', '""')}"`)].join('\n')
}

export function isJournalBalanced(journals: JournalEntry[]) {
  const totals = journals.flatMap(item => item.lines).reduce((sum, line) => ({ debit: sum.debit + line.debit, credit: sum.credit + line.credit }), { debit: 0, credit: 0 })
  return Math.abs(totals.debit - totals.credit) < 0.01
}
