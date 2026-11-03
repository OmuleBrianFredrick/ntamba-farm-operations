import Dexie, { type EntityTable } from 'dexie'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type Account = { id: string; code: string; name: string; type: AccountType; active: boolean; system: boolean }
export type Party = { id: string; name: string; type: 'customer' | 'supplier' | 'both'; phone: string; email: string; address: string; notes: string; active: boolean; createdAt: string; updatedAt: string }
export type Worker = { id: string; name: string; phone: string; defaultBasis: 'monthly' | 'daily' | 'task'; defaultRate: number; department: string; active: boolean; createdAt: string; updatedAt: string }
export type SaleInvoice = { id: string; invoiceNumber: string; invoiceDate: string; customerId: string; customerName: string; description: string; quantity: number; unit: string; unitPrice: number; deliveryCost: number; total: number; paidAmount: number; balance: number; status: 'unpaid' | 'partial' | 'paid'; enterprise: string; notes: string; createdAt: string }
export type ExpenseRecord = { id: string; reference: string; expenseDate: string; supplierId: string | null; supplierName: string; description: string; expenseAccountCode: string; paymentAccountCode: string | null; total: number; paidAmount: number; balance: number; status: 'unpaid' | 'partial' | 'paid'; enterprise: string; notes: string; createdAt: string }
export type WageRecord = { id: string; reference: string; workerId: string; workerName: string; period: string; workDate: string; basis: 'monthly' | 'daily' | 'task'; units: number; rate: number; grossWage: number; deductions: number; netWage: number; paidAmount: number; balance: number; status: 'unpaid' | 'partial' | 'paid'; notes: string; createdAt: string }
export type Payment = { id: string; paymentDate: string; direction: 'in' | 'out'; allocationType: 'sale' | 'expense' | 'wage'; allocationId: string; partyName: string; amount: number; paymentAccountCode: string; method: 'cash' | 'mobile-money' | 'bank'; reference: string; notes: string; createdAt: string }
export type JournalLine = { accountCode: string; accountName: string; debit: number; credit: number; memo: string }
export type JournalEntry = { id: string; entryDate: string; reference: string; source: 'sale' | 'receipt' | 'expense' | 'supplier-payment' | 'wage' | 'wage-payment' | 'manual'; description: string; lines: JournalLine[]; createdAt: string }
export type AccountingPeriod = { id: string; name: string; startDate: string; endDate: string; status: 'closed'; closedAt: string; notes: string }
export type Reconciliation = { id: string; accountCode: string; accountName: string; statementDate: string; statementBalance: number; systemBalance: number; difference: number; status: 'reconciled' | 'difference'; notes: string; createdAt: string }

export type SaleInput = Omit<SaleInvoice, 'id' | 'total' | 'paidAmount' | 'balance' | 'status' | 'createdAt'> & { amountReceived: number; paymentAccountCode: string; paymentMethod: Payment['method']; paymentReference: string }
export type ExpenseInput = Omit<ExpenseRecord, 'id' | 'paidAmount' | 'balance' | 'status' | 'createdAt' | 'paymentAccountCode'> & { paymentMode: 'paid' | 'credit'; paymentAccountCode: string }
export type WageInput = Omit<WageRecord, 'id' | 'grossWage' | 'netWage' | 'paidAmount' | 'balance' | 'status' | 'createdAt'> & { amountPaid: number; paymentAccountCode: string; paymentMethod: Payment['method'] }

export const paymentAccounts = [
  { code: '1000', name: 'Cash on Hand', method: 'cash' as const },
  { code: '1010', name: 'Mobile Money', method: 'mobile-money' as const },
  { code: '1020', name: 'Bank Account', method: 'bank' as const },
]

export const defaultAccounts: Account[] = [
  { id: 'acct-1000', code: '1000', name: 'Cash on Hand', type: 'asset', active: true, system: true },
  { id: 'acct-1010', code: '1010', name: 'Mobile Money', type: 'asset', active: true, system: true },
  { id: 'acct-1020', code: '1020', name: 'Bank Account', type: 'asset', active: true, system: true },
  { id: 'acct-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', active: true, system: true },
  { id: 'acct-1200', code: '1200', name: 'Inventory', type: 'asset', active: true, system: true },
  { id: 'acct-2000', code: '2000', name: 'Accounts Payable', type: 'liability', active: true, system: true },
  { id: 'acct-2100', code: '2100', name: 'Outstanding Wages', type: 'liability', active: true, system: true },
  { id: 'acct-3000', code: '3000', name: 'Owner Capital', type: 'equity', active: true, system: true },
  { id: 'acct-4000', code: '4000', name: 'Farm Sales', type: 'income', active: true, system: true },
  { id: 'acct-4100', code: '4100', name: 'Other Income', type: 'income', active: true, system: true },
  { id: 'acct-6000', code: '6000', name: 'Farm Inputs Expense', type: 'expense', active: true, system: true },
  { id: 'acct-6100', code: '6100', name: 'Labour and Wages', type: 'expense', active: true, system: true },
  { id: 'acct-6200', code: '6200', name: 'Transport and Delivery', type: 'expense', active: true, system: true },
  { id: 'acct-6300', code: '6300', name: 'Utilities', type: 'expense', active: true, system: true },
  { id: 'acct-6400', code: '6400', name: 'Repairs and Maintenance', type: 'expense', active: true, system: true },
  { id: 'acct-6500', code: '6500', name: 'General Administration', type: 'expense', active: true, system: true },
]

export const expenseAccounts = defaultAccounts.filter(account => account.type === 'expense')

class FinanceDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  parties!: EntityTable<Party, 'id'>
  workers!: EntityTable<Worker, 'id'>
  sales!: EntityTable<SaleInvoice, 'id'>
  expenses!: EntityTable<ExpenseRecord, 'id'>
  wages!: EntityTable<WageRecord, 'id'>
  payments!: EntityTable<Payment, 'id'>
  journals!: EntityTable<JournalEntry, 'id'>
  periods!: EntityTable<AccountingPeriod, 'id'>
  reconciliations!: EntityTable<Reconciliation, 'id'>
  constructor() {
    super('ntamba-finance')
    this.version(1).stores({
      accounts: 'id, &code, type, active', parties: 'id, name, type, active, updatedAt', workers: 'id, name, active, updatedAt',
      sales: 'id, &invoiceNumber, invoiceDate, customerId, status, enterprise, createdAt', expenses: 'id, &reference, expenseDate, supplierId, status, enterprise, createdAt',
      wages: 'id, &reference, workerId, period, status, createdAt', payments: 'id, paymentDate, direction, allocationType, allocationId, paymentAccountCode, createdAt',
      journals: 'id, entryDate, &reference, source, createdAt',
    })
    this.version(2).stores({
      accounts: 'id, &code, type, active', parties: 'id, name, type, active, updatedAt', workers: 'id, name, active, updatedAt',
      sales: 'id, &invoiceNumber, invoiceDate, customerId, status, enterprise, createdAt', expenses: 'id, &reference, expenseDate, supplierId, status, enterprise, createdAt',
      wages: 'id, &reference, workerId, period, workDate, status, createdAt', payments: 'id, paymentDate, direction, allocationType, allocationId, paymentAccountCode, createdAt',
      journals: 'id, entryDate, &reference, source, createdAt',
    })
    this.version(3).stores({
      accounts: 'id, &code, type, active', parties: 'id, name, type, active, updatedAt', workers: 'id, name, active, updatedAt',
      sales: 'id, &invoiceNumber, invoiceDate, customerId, status, enterprise, createdAt', expenses: 'id, &reference, expenseDate, supplierId, status, enterprise, createdAt',
      wages: 'id, &reference, workerId, period, workDate, status, createdAt', payments: 'id, paymentDate, direction, allocationType, allocationId, paymentAccountCode, createdAt',
      journals: 'id, entryDate, &reference, source, createdAt', periods: 'id, startDate, endDate, status, closedAt',
      reconciliations: 'id, accountCode, statementDate, status, createdAt',
    })
  }
}

export const financeDb = new FinanceDatabase()
export const financeChangeEvent = 'ntamba-finance-change'
function notifyFinanceChange() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(financeChangeEvent)) }
function money(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100 }
function statusFor(balance: number, total: number): 'unpaid' | 'partial' | 'paid' { return balance <= 0 ? 'paid' : balance < total ? 'partial' : 'unpaid' }
function accountName(code: string) { return defaultAccounts.find(account => account.code === code)?.name ?? code }

export async function ensureFinanceSetup() {
  return Promise.resolve()
}

export function calculateSaleTotal(quantity: number, unitPrice: number, deliveryCost: number) { return money(quantity * unitPrice + deliveryCost) }
export function calculateWage(units: number, rate: number, deductions: number) { const gross = money(units * rate); return { gross, net: money(Math.max(0, gross - deductions)) } }
export function reconciliationDifference(statementBalance: number, systemBalance: number) { return money(statementBalance - systemBalance) }
export function dateFallsInPeriod(date: string, period: Pick<AccountingPeriod, 'startDate' | 'endDate'>) { return date >= period.startDate && date <= period.endDate }
export function validateAccountingPeriod(period: Pick<AccountingPeriod, 'name' | 'startDate' | 'endDate'>) {
  if (!period.name.trim() || !period.startDate || !period.endDate) return 'Enter the period name, start date and end date.'
  if (period.startDate > period.endDate) return 'The period start date must be before the end date.'
  return null
}
export function validateParty(party: Party) {
  if (!party.name.trim()) return 'Enter the customer or supplier name.'
  if (party.email && !/^\S+@\S+\.\S+$/.test(party.email)) return 'Enter a valid email address.'
  return null
}
export function validateWorker(worker: Worker) {
  if (!worker.name.trim() || !worker.department.trim()) return 'Enter the worker name and department.'
  if (!Number.isFinite(worker.defaultRate) || worker.defaultRate < 0) return 'Default wage rate cannot be negative.'
  return null
}
export function validateJournalLines(lines: JournalLine[]) {
  if (lines.length < 2) return 'A journal must contain at least two lines.'
  if (lines.some(line => !line.accountCode || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0))) return 'Each journal line needs one account and either a debit or credit.'
  const debit = money(lines.reduce((sum, line) => sum + line.debit, 0))
  const credit = money(lines.reduce((sum, line) => sum + line.credit, 0))
  if (debit <= 0 || debit !== credit) return `Journal is not balanced: debits ${debit} and credits ${credit}.`
  return null
}

function makeJournal(entryDate: string, reference: string, source: JournalEntry['source'], description: string, lines: Omit<JournalLine, 'accountName'>[]): JournalEntry {
  const expanded = lines.map(line => ({ ...line, accountName: accountName(line.accountCode) }))
  const issue = validateJournalLines(expanded)
  if (issue) throw new Error(issue)
  return { id: crypto.randomUUID(), entryDate, reference, source, description, lines: expanded, createdAt: new Date().toISOString() }
}

async function assertPostingDateOpen(entryDate: string) {
  const closed = await financeDb.periods.filter(period => dateFallsInPeriod(entryDate, period)).first()
  if (closed) throw new Error(`${closed.name} is closed. Reopen the period before posting transactions dated ${entryDate}.`)
}

export async function saveParty(party: Party) {
  const issue = validateParty(party); if (issue) throw new Error(issue)
  const duplicate = await financeDb.parties.where('name').equalsIgnoreCase(party.name.trim()).first()
  if (duplicate && duplicate.id !== party.id) throw new Error('A party with this name already exists.')
  await financeDb.parties.put(party); notifyFinanceChange()
}
export async function saveWorker(worker: Worker) {
  const issue = validateWorker(worker); if (issue) throw new Error(issue)
  await financeDb.workers.put(worker); notifyFinanceChange()
}

export async function postSale(input: SaleInput) {
  const total = calculateSaleTotal(input.quantity, input.unitPrice, input.deliveryCost)
  if (!input.invoiceNumber.trim() || !input.invoiceDate || !input.customerId || !input.description.trim()) throw new Error('Enter the invoice number, date, customer and sale description.')
  if (input.quantity <= 0 || input.unitPrice < 0 || input.deliveryCost < 0 || total <= 0) throw new Error('Enter valid sale quantities and amounts.')
  if (input.amountReceived < 0 || input.amountReceived > total) throw new Error('The amount received cannot exceed the invoice total.')
  await assertPostingDateOpen(input.invoiceDate)
  const now = new Date().toISOString(); const id = crypto.randomUUID(); const balance = money(total - input.amountReceived)
  const sale: SaleInvoice = { ...input, id, total, paidAmount: input.amountReceived, balance, status: statusFor(balance, total), createdAt: now }
  const invoiceJournal = makeJournal(input.invoiceDate, input.invoiceNumber, 'sale', `Sale to ${input.customerName}`, [
    { accountCode: '1100', debit: total, credit: 0, memo: input.description }, { accountCode: '4000', debit: 0, credit: total, memo: input.description },
  ])
  await financeDb.transaction('rw', financeDb.sales, financeDb.payments, financeDb.journals, async () => {
    await financeDb.sales.add(sale); await financeDb.journals.add(invoiceJournal)
    if (input.amountReceived > 0) {
      await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate: input.invoiceDate, direction: 'in', allocationType: 'sale', allocationId: id, partyName: input.customerName, amount: input.amountReceived, paymentAccountCode: input.paymentAccountCode, method: input.paymentMethod, reference: input.paymentReference || `${input.invoiceNumber}-PAY`, notes: 'Payment received with sale', createdAt: now })
      await financeDb.journals.add(makeJournal(input.invoiceDate, input.paymentReference || `${input.invoiceNumber}-PAY`, 'receipt', `Payment from ${input.customerName}`, [
        { accountCode: input.paymentAccountCode, debit: input.amountReceived, credit: 0, memo: input.invoiceNumber }, { accountCode: '1100', debit: 0, credit: input.amountReceived, memo: input.invoiceNumber },
      ]))
    }
  })
  notifyFinanceChange(); return sale
}

export async function recordCustomerPayment(invoiceId: string, amount: number, paymentDate: string, paymentAccountCode: string, method: Payment['method'], reference: string) {
  const sale = await financeDb.sales.get(invoiceId); if (!sale) throw new Error('The selected invoice no longer exists.')
  if (!reference.trim() || !paymentDate || amount <= 0 || amount > sale.balance) throw new Error(`Enter a valid payment not exceeding ${sale.balance}.`)
  await assertPostingDateOpen(paymentDate)
  const now = new Date().toISOString(); const balance = money(sale.balance - amount); const paidAmount = money(sale.paidAmount + amount)
  await financeDb.transaction('rw', financeDb.sales, financeDb.payments, financeDb.journals, async () => {
    await financeDb.sales.update(invoiceId, { balance, paidAmount, status: statusFor(balance, sale.total) })
    await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate, direction: 'in', allocationType: 'sale', allocationId: invoiceId, partyName: sale.customerName, amount, paymentAccountCode, method, reference, notes: '', createdAt: now })
    await financeDb.journals.add(makeJournal(paymentDate, reference, 'receipt', `Payment from ${sale.customerName}`, [
      { accountCode: paymentAccountCode, debit: amount, credit: 0, memo: sale.invoiceNumber }, { accountCode: '1100', debit: 0, credit: amount, memo: sale.invoiceNumber },
    ]))
  })
  notifyFinanceChange()
}

export async function postExpense(input: ExpenseInput) {
  if (!input.reference.trim() || !input.expenseDate || !input.description.trim() || input.total <= 0) throw new Error('Enter the reference, date, description and a positive amount.')
  if (input.paymentMode === 'credit' && !input.supplierId) throw new Error('Select a supplier for a credit bill.')
  await assertPostingDateOpen(input.expenseDate)
  const now = new Date().toISOString(); const id = crypto.randomUUID(); const paidAmount = input.paymentMode === 'paid' ? input.total : 0; const balance = input.total - paidAmount
  const record: ExpenseRecord = { ...input, id, paymentAccountCode: input.paymentMode === 'paid' ? input.paymentAccountCode : null, paidAmount, balance, status: statusFor(balance, input.total), createdAt: now }
  const creditAccount = input.paymentMode === 'paid' ? input.paymentAccountCode : '2000'
  const journal = makeJournal(input.expenseDate, input.reference, 'expense', input.description, [
    { accountCode: input.expenseAccountCode, debit: input.total, credit: 0, memo: input.description }, { accountCode: creditAccount, debit: 0, credit: input.total, memo: input.supplierName },
  ])
  await financeDb.transaction('rw', financeDb.expenses, financeDb.payments, financeDb.journals, async () => {
    await financeDb.expenses.add(record); await financeDb.journals.add(journal)
    if (input.paymentMode === 'paid') await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate: input.expenseDate, direction: 'out', allocationType: 'expense', allocationId: id, partyName: input.supplierName || input.description, amount: input.total, paymentAccountCode: input.paymentAccountCode, method: paymentAccounts.find(account => account.code === input.paymentAccountCode)?.method ?? 'cash', reference: input.reference, notes: '', createdAt: now })
  })
  notifyFinanceChange(); return record
}

export async function recordSupplierPayment(expenseId: string, amount: number, paymentDate: string, paymentAccountCode: string, method: Payment['method'], reference: string) {
  const expense = await financeDb.expenses.get(expenseId); if (!expense) throw new Error('The selected supplier bill no longer exists.')
  if (!reference.trim() || !paymentDate || amount <= 0 || amount > expense.balance) throw new Error(`Enter a valid payment not exceeding ${expense.balance}.`)
  await assertPostingDateOpen(paymentDate)
  const now = new Date().toISOString(); const balance = money(expense.balance - amount); const paidAmount = money(expense.paidAmount + amount)
  await financeDb.transaction('rw', financeDb.expenses, financeDb.payments, financeDb.journals, async () => {
    await financeDb.expenses.update(expenseId, { balance, paidAmount, status: statusFor(balance, expense.total) })
    await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate, direction: 'out', allocationType: 'expense', allocationId: expenseId, partyName: expense.supplierName, amount, paymentAccountCode, method, reference, notes: '', createdAt: now })
    await financeDb.journals.add(makeJournal(paymentDate, reference, 'supplier-payment', `Payment to ${expense.supplierName}`, [
      { accountCode: '2000', debit: amount, credit: 0, memo: expense.reference }, { accountCode: paymentAccountCode, debit: 0, credit: amount, memo: expense.reference },
    ]))
  })
  notifyFinanceChange()
}

export async function accrueWage(input: WageInput) {
  const { gross, net } = calculateWage(input.units, input.rate, input.deductions)
  if (!input.reference.trim() || !input.workerId || !input.period || !input.workDate) throw new Error('Enter the wage reference, worker, period and date.')
  if (input.units <= 0 || input.rate < 0 || input.deductions < 0 || net <= 0) throw new Error('Enter valid wage units, rate and deductions.')
  if (input.amountPaid < 0 || input.amountPaid > net) throw new Error('The wage payment cannot exceed the net wage.')
  await assertPostingDateOpen(input.workDate)
  const now = new Date().toISOString(); const id = crypto.randomUUID(); const balance = money(net - input.amountPaid)
  const wage: WageRecord = { ...input, id, grossWage: gross, netWage: net, paidAmount: input.amountPaid, balance, status: statusFor(balance, net), createdAt: now }
  await financeDb.transaction('rw', financeDb.wages, financeDb.payments, financeDb.journals, async () => {
    await financeDb.wages.add(wage)
    await financeDb.journals.add(makeJournal(input.workDate, input.reference, 'wage', `Wages for ${input.workerName}`, [
      { accountCode: '6100', debit: net, credit: 0, memo: input.period }, { accountCode: '2100', debit: 0, credit: net, memo: input.workerName },
    ]))
    if (input.amountPaid > 0) {
      await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate: input.workDate, direction: 'out', allocationType: 'wage', allocationId: id, partyName: input.workerName, amount: input.amountPaid, paymentAccountCode: input.paymentAccountCode, method: input.paymentMethod, reference: `${input.reference}-PAY`, notes: '', createdAt: now })
      await financeDb.journals.add(makeJournal(input.workDate, `${input.reference}-PAY`, 'wage-payment', `Wage payment to ${input.workerName}`, [
        { accountCode: '2100', debit: input.amountPaid, credit: 0, memo: input.period }, { accountCode: input.paymentAccountCode, debit: 0, credit: input.amountPaid, memo: input.workerName },
      ]))
    }
  })
  notifyFinanceChange(); return wage
}

export async function recordWagePayment(wageId: string, amount: number, paymentDate: string, paymentAccountCode: string, method: Payment['method'], reference: string) {
  const wage = await financeDb.wages.get(wageId); if (!wage) throw new Error('The selected wage record no longer exists.')
  if (!reference.trim() || !paymentDate || amount <= 0 || amount > wage.balance) throw new Error(`Enter a valid payment not exceeding ${wage.balance}.`)
  await assertPostingDateOpen(paymentDate)
  const now = new Date().toISOString(); const balance = money(wage.balance - amount); const paidAmount = money(wage.paidAmount + amount)
  await financeDb.transaction('rw', financeDb.wages, financeDb.payments, financeDb.journals, async () => {
    await financeDb.wages.update(wageId, { balance, paidAmount, status: statusFor(balance, wage.netWage) })
    await financeDb.payments.add({ id: crypto.randomUUID(), paymentDate, direction: 'out', allocationType: 'wage', allocationId: wageId, partyName: wage.workerName, amount, paymentAccountCode, method, reference, notes: '', createdAt: now })
    await financeDb.journals.add(makeJournal(paymentDate, reference, 'wage-payment', `Wage payment to ${wage.workerName}`, [
      { accountCode: '2100', debit: amount, credit: 0, memo: wage.period }, { accountCode: paymentAccountCode, debit: 0, credit: amount, memo: wage.workerName },
    ]))
  })
  notifyFinanceChange()
}

export async function postManualJournal(entryDate: string, reference: string, description: string, lines: JournalLine[]) {
  if (!entryDate || !reference.trim() || !description.trim()) throw new Error('Enter the journal date, reference and description.')
  const issue = validateJournalLines(lines); if (issue) throw new Error(issue)
  await assertPostingDateOpen(entryDate)
  await financeDb.journals.add({ id: crypto.randomUUID(), entryDate, reference, source: 'manual', description, lines, createdAt: new Date().toISOString() })
  notifyFinanceChange()
}

export async function closeAccountingPeriod(name: string, startDate: string, endDate: string, notes: string) {
  const period: AccountingPeriod = { id: crypto.randomUUID(), name: name.trim(), startDate, endDate, status: 'closed', closedAt: new Date().toISOString(), notes: notes.trim() }
  const issue = validateAccountingPeriod(period); if (issue) throw new Error(issue)
  const overlapping = await financeDb.periods.filter(item => startDate <= item.endDate && endDate >= item.startDate).first()
  if (overlapping) throw new Error(`This date range overlaps the already closed period ${overlapping.name}.`)
  await financeDb.periods.add(period); notifyFinanceChange(); return period
}

export async function reopenAccountingPeriod(id: string) {
  await financeDb.periods.delete(id); notifyFinanceChange()
}

export async function saveReconciliation(accountCode: string, statementDate: string, statementBalance: number, systemBalance: number, notes: string) {
  const account = paymentAccounts.find(item => item.code === accountCode)
  if (!account || !statementDate || !Number.isFinite(statementBalance)) throw new Error('Select a money account, statement date and valid statement balance.')
  const difference = reconciliationDifference(statementBalance, systemBalance)
  const reconciliation: Reconciliation = { id: crypto.randomUUID(), accountCode, accountName: account.name, statementDate, statementBalance: money(statementBalance), systemBalance: money(systemBalance), difference, status: Math.abs(difference) < .01 ? 'reconciled' : 'difference', notes: notes.trim(), createdAt: new Date().toISOString() }
  await financeDb.reconciliations.add(reconciliation); notifyFinanceChange(); return reconciliation
}

export function accountBalance(account: Account, journals: JournalEntry[]) {
  let debit = 0; let credit = 0
  for (const journal of journals) for (const line of journal.lines) if (line.accountCode === account.code) { debit += line.debit; credit += line.credit }
  return money(['asset', 'expense'].includes(account.type) ? debit - credit : credit - debit)
}
