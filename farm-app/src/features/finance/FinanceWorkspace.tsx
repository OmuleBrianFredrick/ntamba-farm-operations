import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BanknoteArrowDown, BookOpenCheck, Landmark, ReceiptText, UsersRound } from 'lucide-react'
import {
  accountBalance, accrueWage, defaultAccounts, expenseAccounts, financeChangeEvent, financeDb, paymentAccounts,
  closeAccountingPeriod, postExpense, postManualJournal, postSale, recordCustomerPayment, recordSupplierPayment, recordWagePayment, reopenAccountingPeriod, saveParty, saveReconciliation, saveWorker,
  type Account, type AccountingPeriod, type ExpenseRecord, type JournalEntry, type JournalLine, type Party, type Payment, type Reconciliation, type SaleInvoice, type WageRecord, type Worker,
} from './financeStore'

type FinanceSnapshot = { accounts: Account[]; parties: Party[]; workers: Worker[]; sales: SaleInvoice[]; expenses: ExpenseRecord[]; wages: WageRecord[]; payments: Payment[]; journals: JournalEntry[]; periods: AccountingPeriod[]; reconciliations: Reconciliation[] }
const emptySnapshot: FinanceSnapshot = { accounts: [], parties: [], workers: [], sales: [], expenses: [], wages: [], payments: [], journals: [], periods: [], reconciliations: [] }
const formatMoney = (value: number) => `USh ${Math.round(value).toLocaleString()}`
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const numberValue = (data: FormData, key: string) => Number(data.get(key) || 0)
const textValue = (data: FormData, key: string) => String(data.get(key) || '')
const methodForAccount = (code: string) => paymentAccounts.find(account => account.code === code)?.method ?? 'cash'

function useFinanceSnapshot() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>(emptySnapshot)
  useEffect(() => {
    let active = true
    const load = () => {
      void Promise.all([
        financeDb.parties.toArray(), financeDb.workers.toArray(), financeDb.sales.orderBy('invoiceDate').reverse().toArray(),
        financeDb.expenses.orderBy('expenseDate').reverse().toArray(), financeDb.wages.orderBy('workDate').reverse().toArray(), financeDb.payments.orderBy('paymentDate').reverse().toArray(), financeDb.journals.orderBy('entryDate').reverse().toArray(),
        financeDb.periods.orderBy('startDate').reverse().toArray(), financeDb.reconciliations.orderBy('statementDate').reverse().toArray(),
      ]).then(([parties, workers, sales, expenses, wages, payments, journals, periods, reconciliations]) => {
        if (active) setSnapshot({ accounts: defaultAccounts, parties, workers, sales, expenses, wages, payments, journals, periods, reconciliations })
      }).catch(error => console.error(`Finance load failed: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`))
    }
    load(); window.addEventListener(financeChangeEvent, load)
    return () => { active = false; window.removeEventListener(financeChangeEvent, load) }
  }, [])
  return snapshot
}

function Message({ value }: { value: { kind: 'success' | 'error'; text: string } | null }) {
  return value ? <p role={value.kind === 'error' ? 'alert' : 'status'} className={value.kind === 'error' ? 'form-error' : 'register-message'}>{value.text}</p> : null
}

function PaymentAccountSelect({ name = 'paymentAccountCode' }: { name?: string }) {
  return <select className="field" name={name} defaultValue="1000" required>{paymentAccounts.map(account => <option key={account.code} value={account.code}>{account.name}</option>)}</select>
}

function BalanceStatus({ status }: { status: 'unpaid' | 'partial' | 'paid' }) {
  return <span className={`finance-status ${status}`}>{status}</span>
}

export function FinanceOverview() {
  const { accounts, sales, expenses, wages, payments, journals } = useFinanceSnapshot()
  const paymentBalances = paymentAccounts.map(item => ({ ...item, balance: accountBalance(accounts.find(account => account.code === item.code) ?? defaultAccounts.find(account => account.code === item.code)!, journals) }))
  const cash = paymentBalances.reduce((sum, item) => sum + item.balance, 0)
  const receivables = sales.reduce((sum, sale) => sum + sale.balance, 0)
  const payables = expenses.reduce((sum, expense) => sum + expense.balance, 0)
  const outstandingWages = wages.reduce((sum, wage) => sum + wage.balance, 0)
  return <>
    <section className="crop-summary finance-summary" aria-label="Finance summary">
      <div className="crop-summary-item"><Landmark /><div><strong>{formatMoney(cash)}</strong><span>cash position</span><small>Cash, mobile money and bank</small></div></div>
      <div className="crop-summary-item"><BanknoteArrowDown /><div><strong>{formatMoney(receivables)}</strong><span>customer balances</span><small>Unpaid sales invoices</small></div></div>
      <div className="crop-summary-item warning"><ReceiptText /><div><strong>{formatMoney(payables)}</strong><span>supplier balances</span><small>Unpaid bills</small></div></div>
      <div className="crop-summary-item warning"><UsersRound /><div><strong>{formatMoney(outstandingWages)}</strong><span>outstanding wages</span><small>Accrued but not yet paid</small></div></div>
    </section>
    <div className="finance-overview-grid">
      <section className="panel">
        <div className="panel-head"><h2>Daily cash flow</h2><span>{payments.length} payment(s)</span></div>
        <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Reference</th><th>Party / worker</th><th>Method</th><th>Cash in</th><th>Cash out</th></tr></thead><tbody>
          {payments.slice(0, 12).map(payment => <tr key={payment.id}><td>{payment.paymentDate}</td><td>{payment.reference}</td><td>{payment.partyName}</td><td>{payment.method.replace('-', ' ')}</td><td className="money-in">{payment.direction === 'in' ? formatMoney(payment.amount) : '—'}</td><td className="money-out">{payment.direction === 'out' ? formatMoney(payment.amount) : '—'}</td></tr>)}
        </tbody></table></div>
        {payments.length === 0 ? <p className="empty-register">No cash movements recorded yet.</p> : null}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Money accounts</h2><span>Ledger balances</span></div>
        <div className="finance-account-list">{paymentBalances.map(account => <div key={account.code}><span>{account.name}</span><strong className={account.balance < 0 ? 'stock-low' : ''}>{formatMoney(account.balance)}</strong></div>)}</div>
        <div className="finance-integrity"><BookOpenCheck /><div><strong>Double-entry control active</strong><span>{journals.length} balanced journal entr{journals.length === 1 ? 'y' : 'ies'} recorded locally.</span></div></div>
      </section>
    </div>
  </>
}

export function ContactsWorkspace() {
  const { parties } = useFinanceSnapshot()
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const now = new Date().toISOString()
    try {
      await saveParty({ id: crypto.randomUUID(), name: textValue(data, 'name').trim(), type: textValue(data, 'type') as Party['type'], phone: textValue(data, 'phone'), email: textValue(data, 'email'), address: textValue(data, 'address'), notes: textValue(data, 'notes'), active: true, createdAt: now, updatedAt: now })
      form.reset(); setShowForm(false); setMessage({ kind: 'success', text: 'Customer or supplier saved locally.' })
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to save contact.' }) }
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Customers & suppliers</h2><span>{parties.length} contact(s)</span></div><button className="primary-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close form' : 'Add contact'}</button></div>
    {showForm ? <form className="form-panel embedded-form" onSubmit={submit}><div className="form-grid three-column">
      <label className="field-group"><span>Name</span><input className="field" name="name" required /></label>
      <label className="field-group"><span>Contact type</span><select className="field" name="type" defaultValue="customer"><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Customer and supplier</option></select></label>
      <label className="field-group"><span>Phone</span><input className="field" name="phone" /></label>
      <label className="field-group"><span>Email</span><input className="field" name="email" type="email" /></label>
      <label className="field-group"><span>Address</span><input className="field" name="address" /></label>
      <label className="field-group"><span>Notes</span><input className="field" name="notes" /></label>
    </div><div className="form-actions"><span className="saved-note">Used by sales and supplier bills.</span><button className="primary-button" type="submit">Save contact</button></div></form> : null}
    <Message value={message} />
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead><tbody>{parties.map(party => <tr key={party.id}><td><strong>{party.name}</strong></td><td><span className="finance-status paid">{party.type}</span></td><td>{party.phone || '—'}</td><td>{party.email || '—'}</td><td>{party.address || '—'}</td></tr>)}</tbody></table></div>
    {parties.length === 0 ? <p className="empty-register">Add customers and suppliers before recording credit transactions.</p> : null}
  </section>
}

export function SalesWorkspace() {
  const { parties, sales } = useFinanceSnapshot(); const customers = parties.filter(party => party.type !== 'supplier' && party.active)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null); const [showForm, setShowForm] = useState(false); const [payingId, setPayingId] = useState<string | null>(null)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const customer = customers.find(item => item.id === textValue(data, 'customerId')); const account = textValue(data, 'paymentAccountCode')
    try {
      await postSale({ invoiceNumber: textValue(data, 'invoiceNumber'), invoiceDate: textValue(data, 'invoiceDate'), customerId: customer?.id ?? '', customerName: customer?.name ?? '', description: textValue(data, 'description'), quantity: numberValue(data, 'quantity'), unit: textValue(data, 'unit'), unitPrice: numberValue(data, 'unitPrice'), deliveryCost: numberValue(data, 'deliveryCost'), enterprise: textValue(data, 'enterprise'), notes: textValue(data, 'notes'), amountReceived: numberValue(data, 'amountReceived'), paymentAccountCode: account, paymentMethod: methodForAccount(account), paymentReference: textValue(data, 'paymentReference') })
      form.reset(); setShowForm(false); setMessage({ kind: 'success', text: 'Sale posted. Customer balance and accounting journal updated.' })
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to post sale.' }) }
  }
  const submitPayment = async (event: FormEvent<HTMLFormElement>, sale: SaleInvoice) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const account = textValue(data, 'paymentAccountCode')
    try { await recordCustomerPayment(sale.id, numberValue(data, 'amount'), textValue(data, 'paymentDate'), account, methodForAccount(account), textValue(data, 'reference')); setPayingId(null); setMessage({ kind: 'success', text: 'Customer payment recorded and posted to the ledger.' }) }
    catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to record payment.' }) }
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Sales & customer balances</h2><span>{sales.length} invoice(s)</span></div><button className="primary-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close form' : 'Record sale'}</button></div>
    {showForm ? <form className="form-panel embedded-form" onSubmit={submit}><div className="form-grid three-column">
      <label className="field-group"><span>Invoice number</span><input className="field" name="invoiceNumber" placeholder="e.g. INV-0001" required /></label>
      <label className="field-group"><span>Invoice date</span><input className="field" name="invoiceDate" type="date" defaultValue={today()} required /></label>
      <label className="field-group"><span>Customer</span><select className="field" name="customerId" defaultValue="" required><option value="">Select customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="field-group"><span>Product / service</span><input className="field" name="description" required /></label>
      <label className="field-group"><span>Quantity</span><input className="field" name="quantity" type="number" min="0.01" step="0.01" required /></label>
      <label className="field-group"><span>Unit</span><input className="field" name="unit" defaultValue="kg" required /></label>
      <label className="field-group"><span>Unit price (UGX)</span><input className="field" name="unitPrice" type="number" min="0" step="1" required /></label>
      <label className="field-group"><span>Delivery cost (UGX)</span><input className="field" name="deliveryCost" type="number" min="0" step="1" defaultValue="0" /></label>
      <label className="field-group"><span>Enterprise</span><select className="field" name="enterprise" defaultValue="Crops"><option>Crops</option><option>Livestock</option><option>Poultry</option><option>Fish & Apiary</option><option>General farm</option></select></label>
      <label className="field-group"><span>Amount received now</span><input className="field" name="amountReceived" type="number" min="0" step="1" defaultValue="0" /></label>
      <label className="field-group"><span>Payment account</span><PaymentAccountSelect /></label>
      <label className="field-group"><span>Payment reference</span><input className="field" name="paymentReference" placeholder="Receipt / transaction ID" /></label>
      <label className="field-group full"><span>Notes</span><textarea className="field" name="notes" /></label>
    </div><div className="form-actions"><span className="saved-note">Cash and credit can be mixed through partial payments.</span><button className="primary-button" type="submit">Post sale</button></div></form> : null}
    <Message value={message} />
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Sale</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{sales.map(sale => <Fragment key={sale.id}><tr><td>{sale.invoiceDate}</td><td>{sale.invoiceNumber}</td><td>{sale.customerName}</td><td><strong>{sale.description}</strong><span>{sale.quantity} {sale.unit} · {sale.enterprise}</span></td><td>{formatMoney(sale.total)}</td><td>{formatMoney(sale.paidAmount)}</td><td className={sale.balance > 0 ? 'stock-low' : ''}><strong>{formatMoney(sale.balance)}</strong></td><td><BalanceStatus status={sale.status} /></td><td>{sale.balance > 0 ? <button className="text-link" onClick={() => setPayingId(payingId === sale.id ? null : sale.id)}>Receive payment</button> : '—'}</td></tr>
        {payingId === sale.id ? <tr className="finance-payment-row"><td colSpan={9}><form onSubmit={event => submitPayment(event, sale)}><label><span>Payment date</span><input className="field" name="paymentDate" type="date" defaultValue={today()} required /></label><label><span>Amount</span><input className="field" name="amount" type="number" max={sale.balance} min="1" required /></label><label><span>Account</span><PaymentAccountSelect /></label><label><span>Reference</span><input className="field" name="reference" required /></label><button className="primary-button compact-button" type="submit">Save payment</button></form></td></tr> : null}</Fragment>)}</tbody></table></div>
    {sales.length === 0 ? <p className="empty-register">No sales invoices yet.</p> : null}
  </section>
}

export function ExpensesWorkspace() {
  const { parties, expenses } = useFinanceSnapshot(); const suppliers = parties.filter(party => party.type !== 'customer' && party.active)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null); const [showForm, setShowForm] = useState(false); const [payingId, setPayingId] = useState<string | null>(null)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const supplier = suppliers.find(item => item.id === textValue(data, 'supplierId'))
    try { await postExpense({ reference: textValue(data, 'reference'), expenseDate: textValue(data, 'expenseDate'), supplierId: supplier?.id ?? null, supplierName: supplier?.name ?? textValue(data, 'payee'), description: textValue(data, 'description'), expenseAccountCode: textValue(data, 'expenseAccountCode'), total: numberValue(data, 'total'), enterprise: textValue(data, 'enterprise'), notes: textValue(data, 'notes'), paymentMode: textValue(data, 'paymentMode') as 'paid' | 'credit', paymentAccountCode: textValue(data, 'paymentAccountCode') }); form.reset(); setShowForm(false); setMessage({ kind: 'success', text: 'Expense or supplier bill posted to the accounting ledger.' }) }
    catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to post expense.' }) }
  }
  const submitPayment = async (event: FormEvent<HTMLFormElement>, expense: ExpenseRecord) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const account = textValue(data, 'paymentAccountCode')
    try { await recordSupplierPayment(expense.id, numberValue(data, 'amount'), textValue(data, 'paymentDate'), account, methodForAccount(account), textValue(data, 'reference')); setPayingId(null); setMessage({ kind: 'success', text: 'Supplier payment recorded and posted.' }) }
    catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to record supplier payment.' }) }
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Expenses & supplier bills</h2><span>{expenses.length} transaction(s)</span></div><button className="primary-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close form' : 'Record expense'}</button></div>
    {showForm ? <form className="form-panel embedded-form" onSubmit={submit}><div className="form-grid three-column">
      <label className="field-group"><span>Reference</span><input className="field" name="reference" required /></label><label className="field-group"><span>Date</span><input className="field" name="expenseDate" type="date" defaultValue={today()} required /></label>
      <label className="field-group"><span>Paid or on credit</span><select className="field" name="paymentMode" defaultValue="paid"><option value="paid">Paid now</option><option value="credit">Supplier credit / bill</option></select></label>
      <label className="field-group"><span>Supplier</span><select className="field" name="supplierId" defaultValue=""><option value="">No registered supplier</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
      <label className="field-group"><span>Other payee</span><input className="field" name="payee" /></label><label className="field-group"><span>Description</span><input className="field" name="description" required /></label>
      <label className="field-group"><span>Expense category</span><select className="field" name="expenseAccountCode" defaultValue="6000">{expenseAccounts.map(account => <option key={account.code} value={account.code}>{account.name}</option>)}</select></label>
      <label className="field-group"><span>Amount (UGX)</span><input className="field" name="total" type="number" min="1" required /></label><label className="field-group"><span>Payment account</span><PaymentAccountSelect /></label>
      <label className="field-group"><span>Enterprise</span><select className="field" name="enterprise" defaultValue="General farm"><option>General farm</option><option>Crops</option><option>Livestock</option><option>Poultry</option><option>Fish & Apiary</option><option>Administration</option></select></label>
      <label className="field-group full"><span>Notes</span><textarea className="field" name="notes" /></label>
    </div><div className="form-actions"><span className="saved-note">Credit bills become supplier balances until paid.</span><button className="primary-button" type="submit">Post expense</button></div></form> : null}
    <Message value={message} />
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Reference</th><th>Supplier / payee</th><th>Description</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{expenses.map(expense => <Fragment key={expense.id}><tr><td>{expense.expenseDate}</td><td>{expense.reference}</td><td>{expense.supplierName || '—'}</td><td><strong>{expense.description}</strong><span>{expense.enterprise}</span></td><td>{formatMoney(expense.total)}</td><td>{formatMoney(expense.paidAmount)}</td><td className={expense.balance > 0 ? 'stock-low' : ''}><strong>{formatMoney(expense.balance)}</strong></td><td><BalanceStatus status={expense.status} /></td><td>{expense.balance > 0 ? <button className="text-link" onClick={() => setPayingId(payingId === expense.id ? null : expense.id)}>Pay bill</button> : '—'}</td></tr>
      {payingId === expense.id ? <tr className="finance-payment-row"><td colSpan={9}><form onSubmit={event => submitPayment(event, expense)}><label><span>Payment date</span><input className="field" name="paymentDate" type="date" defaultValue={today()} required /></label><label><span>Amount</span><input className="field" name="amount" type="number" max={expense.balance} min="1" required /></label><label><span>Account</span><PaymentAccountSelect /></label><label><span>Reference</span><input className="field" name="reference" required /></label><button className="primary-button compact-button" type="submit">Save payment</button></form></td></tr> : null}</Fragment>)}</tbody></table></div>
    {expenses.length === 0 ? <p className="empty-register">No expenses or supplier bills yet.</p> : null}
  </section>
}

export function WagesWorkspace() {
  const { workers, wages } = useFinanceSnapshot(); const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null); const [showWorker, setShowWorker] = useState(false); const [showWage, setShowWage] = useState(false); const [payingId, setPayingId] = useState<string | null>(null)
  const submitWorker = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const now = new Date().toISOString(); try { await saveWorker({ id: crypto.randomUUID(), name: textValue(data, 'name'), phone: textValue(data, 'phone'), defaultBasis: textValue(data, 'defaultBasis') as Worker['defaultBasis'], defaultRate: numberValue(data, 'defaultRate'), department: textValue(data, 'department'), active: true, createdAt: now, updatedAt: now }); form.reset(); setShowWorker(false); setMessage({ kind: 'success', text: 'Worker saved locally.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to save worker.' }) } }
  const submitWage = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const worker = workers.find(item => item.id === textValue(data, 'workerId')); const account = textValue(data, 'paymentAccountCode'); try { await accrueWage({ reference: textValue(data, 'reference'), workerId: worker?.id ?? '', workerName: worker?.name ?? '', period: textValue(data, 'period'), workDate: textValue(data, 'workDate'), basis: textValue(data, 'basis') as WageRecord['basis'], units: numberValue(data, 'units'), rate: numberValue(data, 'rate'), deductions: numberValue(data, 'deductions'), notes: textValue(data, 'notes'), amountPaid: numberValue(data, 'amountPaid'), paymentAccountCode: account, paymentMethod: methodForAccount(account) }); form.reset(); setShowWage(false); setMessage({ kind: 'success', text: 'Wage accrued. Any unpaid amount is now an outstanding wage.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to record wage.' }) } }
  const submitPayment = async (event: FormEvent<HTMLFormElement>, wage: WageRecord) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const account = textValue(data, 'paymentAccountCode'); try { await recordWagePayment(wage.id, numberValue(data, 'amount'), textValue(data, 'paymentDate'), account, methodForAccount(account), textValue(data, 'reference')); setPayingId(null); setMessage({ kind: 'success', text: 'Wage payment recorded and outstanding wages updated.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to record wage payment.' }) } }
  return <div className="finance-stack">
    <section className="panel"><div className="crop-toolbar"><div><h2>Worker register</h2><span>{workers.length} worker(s)</span></div><button className="secondary-button" onClick={() => setShowWorker(value => !value)}>{showWorker ? 'Close form' : 'Add worker'}</button></div>
      {showWorker ? <form className="form-panel embedded-form" onSubmit={submitWorker}><div className="form-grid three-column"><label className="field-group"><span>Worker name</span><input className="field" name="name" required /></label><label className="field-group"><span>Phone</span><input className="field" name="phone" /></label><label className="field-group"><span>Department</span><input className="field" name="department" required /></label><label className="field-group"><span>Default pay basis</span><select className="field" name="defaultBasis"><option value="daily">Daily wage</option><option value="monthly">Monthly salary</option><option value="task">Task / quantity</option></select></label><label className="field-group"><span>Default rate (UGX)</span><input className="field" name="defaultRate" type="number" min="0" required /></label></div><div className="form-actions"><span className="saved-note">Monthly, daily and task workers are supported.</span><button className="primary-button" type="submit">Save worker</button></div></form> : null}
      <div className="worker-chip-list">{workers.map(worker => <div key={worker.id}><strong>{worker.name}</strong><span>{worker.department} · {worker.defaultBasis} · {formatMoney(worker.defaultRate)}</span></div>)}</div>
    </section>
    <section className="panel"><div className="crop-toolbar"><div><h2>Wages & outstanding balances</h2><span>{wages.length} wage record(s)</span></div><button className="primary-button" onClick={() => setShowWage(value => !value)}>{showWage ? 'Close form' : 'Record wage'}</button></div>
      {showWage ? <form className="form-panel embedded-form" onSubmit={submitWage}><div className="form-grid three-column"><label className="field-group"><span>Reference</span><input className="field" name="reference" required /></label><label className="field-group"><span>Work / accrual date</span><input className="field" name="workDate" type="date" defaultValue={today()} required /></label><label className="field-group"><span>Pay period</span><input className="field" name="period" placeholder="e.g. November 2026" required /></label><label className="field-group"><span>Worker</span><select className="field" name="workerId" defaultValue="" required><option value="">Select worker</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label><label className="field-group"><span>Pay basis</span><select className="field" name="basis"><option value="daily">Daily wage</option><option value="monthly">Monthly salary</option><option value="task">Task / quantity</option></select></label><label className="field-group"><span>Days / months / quantity</span><input className="field" name="units" type="number" min="0.01" step="0.01" required /></label><label className="field-group"><span>Rate (UGX)</span><input className="field" name="rate" type="number" min="0" required /></label><label className="field-group"><span>Deductions (UGX)</span><input className="field" name="deductions" type="number" min="0" defaultValue="0" /></label><label className="field-group"><span>Amount paid now</span><input className="field" name="amountPaid" type="number" min="0" defaultValue="0" /></label><label className="field-group"><span>Payment account</span><PaymentAccountSelect /></label><label className="field-group full"><span>Notes, bonus or adjustment details</span><textarea className="field" name="notes" /></label></div><div className="form-actions"><span className="saved-note">Bonuses may be included in the rate or wage amount and explained in notes.</span><button className="primary-button" type="submit">Accrue wage</button></div></form> : null}
      <Message value={message} />
      <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Worker</th><th>Period / basis</th><th>Net wage</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Action</th></tr></thead><tbody>{wages.map(wage => <Fragment key={wage.id}><tr><td>{wage.workDate}</td><td><strong>{wage.workerName}</strong><span>{wage.reference}</span></td><td>{wage.period}<span>{wage.units} × {formatMoney(wage.rate)} · {wage.basis}</span></td><td>{formatMoney(wage.netWage)}</td><td>{formatMoney(wage.paidAmount)}</td><td className={wage.balance > 0 ? 'stock-low' : ''}><strong>{formatMoney(wage.balance)}</strong></td><td><BalanceStatus status={wage.status} /></td><td>{wage.balance > 0 ? <button className="text-link" onClick={() => setPayingId(payingId === wage.id ? null : wage.id)}>Pay wage</button> : '—'}</td></tr>{payingId === wage.id ? <tr className="finance-payment-row"><td colSpan={8}><form onSubmit={event => submitPayment(event, wage)}><label><span>Payment date</span><input className="field" name="paymentDate" type="date" defaultValue={today()} required /></label><label><span>Amount</span><input className="field" name="amount" type="number" max={wage.balance} min="1" required /></label><label><span>Account</span><PaymentAccountSelect /></label><label><span>Reference</span><input className="field" name="reference" required /></label><button className="primary-button compact-button" type="submit">Save payment</button></form></td></tr> : null}</Fragment>)}</tbody></table></div>
      {wages.length === 0 ? <p className="empty-register">No wage records yet.</p> : null}
    </section>
  </div>
}

export function AccountingWorkspace() {
  const { accounts, journals, periods, reconciliations } = useFinanceSnapshot(); const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null); const [showManual, setShowManual] = useState(false); const [showPeriod, setShowPeriod] = useState(false); const [showReconciliation, setShowReconciliation] = useState(false)
  const balances = useMemo(() => accounts.map(account => ({ ...account, balance: accountBalance(account, journals) })).filter(account => account.balance !== 0 || account.system), [accounts, journals])
  const totalDebits = journals.reduce((sum, journal) => sum + journal.lines.reduce((lineSum, line) => lineSum + line.debit, 0), 0); const totalCredits = journals.reduce((sum, journal) => sum + journal.lines.reduce((lineSum, line) => lineSum + line.credit, 0), 0)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const debitCode = textValue(data, 'debitAccount'); const creditCode = textValue(data, 'creditAccount'); const amount = numberValue(data, 'amount'); const memo = textValue(data, 'description'); const lines: JournalLine[] = [{ accountCode: debitCode, accountName: accounts.find(a => a.code === debitCode)?.name ?? debitCode, debit: amount, credit: 0, memo }, { accountCode: creditCode, accountName: accounts.find(a => a.code === creditCode)?.name ?? creditCode, debit: 0, credit: amount, memo }]; try { await postManualJournal(textValue(data, 'entryDate'), textValue(data, 'reference'), memo, lines); form.reset(); setShowManual(false); setMessage({ kind: 'success', text: 'Balanced manual journal posted.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to post journal.' }) } }
  const submitPeriod = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); try { await closeAccountingPeriod(textValue(data, 'name'), textValue(data, 'startDate'), textValue(data, 'endDate'), textValue(data, 'notes')); form.reset(); setShowPeriod(false); setMessage({ kind: 'success', text: 'Accounting period closed. Transactions in that date range are now locked.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to close period.' }) } }
  const submitReconciliation = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const code = textValue(data, 'accountCode'); const statementDate = textValue(data, 'statementDate'); const account = accounts.find(item => item.code === code); try { const reconciliation = await saveReconciliation(code, statementDate, numberValue(data, 'statementBalance'), account ? accountBalance(account, journals.filter(journal => journal.entryDate <= statementDate)) : 0, textValue(data, 'notes')); form.reset(); setShowReconciliation(false); setMessage({ kind: reconciliation.status === 'reconciled' ? 'success' : 'error', text: reconciliation.status === 'reconciled' ? 'Account reconciled with no difference.' : `Reconciliation saved with a ${formatMoney(Math.abs(reconciliation.difference))} difference.` }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to save reconciliation.' }) } }
  return <div className="finance-stack">
    <section className="panel"><div className="crop-toolbar"><div><h2>Trial balance</h2><span>{accounts.length} accounts · accountant view</span></div><button className="primary-button" onClick={() => setShowManual(value => !value)}>{showManual ? 'Close journal' : 'Post manual journal'}</button></div>
      {showManual ? <form className="form-panel embedded-form" onSubmit={submit}><div className="form-grid three-column"><label className="field-group"><span>Journal date</span><input className="field" name="entryDate" type="date" defaultValue={today()} required /></label><label className="field-group"><span>Reference</span><input className="field" name="reference" required /></label><label className="field-group"><span>Amount (UGX)</span><input className="field" name="amount" type="number" min="1" required /></label><label className="field-group"><span>Debit account</span><select className="field" name="debitAccount">{accounts.map(account => <option key={account.id} value={account.code}>{account.code} · {account.name}</option>)}</select></label><label className="field-group"><span>Credit account</span><select className="field" name="creditAccount" defaultValue="3000">{accounts.map(account => <option key={account.id} value={account.code}>{account.code} · {account.name}</option>)}</select></label><label className="field-group"><span>Description</span><input className="field" name="description" required /></label></div><div className="form-actions"><span className="saved-note">Manual journals are intended for the accountant.</span><button className="primary-button" type="submit">Post balanced journal</button></div></form> : null}
      <Message value={message} />
      <div className="table-scroll"><table className="crop-table"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Balance</th></tr></thead><tbody>{balances.map(account => <tr key={account.id}><td>{account.code}</td><td><strong>{account.name}</strong></td><td>{account.type}</td><td className={account.balance < 0 ? 'stock-low' : ''}><strong>{formatMoney(account.balance)}</strong></td></tr>)}</tbody></table></div>
    </section>
    <div className="finance-overview-grid">
      <section className="panel"><div className="crop-toolbar"><div><h2>Accounting periods</h2><span>{periods.length} closed period(s)</span></div><button className="secondary-button" onClick={() => setShowPeriod(value => !value)}>{showPeriod ? 'Close form' : 'Close a period'}</button></div>
        {showPeriod ? <form className="form-panel embedded-form" onSubmit={submitPeriod}><div className="form-grid"><label className="field-group"><span>Period name</span><input className="field" name="name" placeholder="e.g. October 2026" required /></label><label className="field-group"><span>Start date</span><input className="field" name="startDate" type="date" required /></label><label className="field-group"><span>End date</span><input className="field" name="endDate" type="date" required /></label><label className="field-group full"><span>Closing notes</span><textarea className="field" name="notes" /></label></div><div className="form-actions"><span className="saved-note">Closing locks all sales, expenses, wages, payments and journals in the range.</span><button className="primary-button" type="submit">Close period</button></div></form> : null}
        <div className="compact-record-list">{periods.map(period => <div key={period.id}><span><strong>{period.name}</strong><small>{period.startDate} to {period.endDate}</small></span><button className="text-link" onClick={() => void reopenAccountingPeriod(period.id).then(() => setMessage({ kind: 'success', text: `${period.name} reopened for corrections.` }))}>Reopen</button></div>)}</div>
        {periods.length === 0 ? <p className="empty-register">No periods have been closed yet.</p> : null}
      </section>
      <section className="panel"><div className="crop-toolbar"><div><h2>Money reconciliation</h2><span>{reconciliations.length} reconciliation(s)</span></div><button className="secondary-button" onClick={() => setShowReconciliation(value => !value)}>{showReconciliation ? 'Close form' : 'Reconcile account'}</button></div>
        {showReconciliation ? <form className="form-panel embedded-form" onSubmit={submitReconciliation}><div className="form-grid"><label className="field-group"><span>Money account</span><PaymentAccountSelect name="accountCode" /></label><label className="field-group"><span>Statement date</span><input className="field" name="statementDate" type="date" defaultValue={today()} required /></label><label className="field-group"><span>Statement / counted balance</span><input className="field" name="statementBalance" type="number" step="0.01" required /></label><label className="field-group full"><span>Notes</span><textarea className="field" name="notes" /></label></div><div className="form-actions"><span className="saved-note">The statement or counted amount is compared with the ledger balance.</span><button className="primary-button" type="submit">Save reconciliation</button></div></form> : null}
        <div className="compact-record-list">{reconciliations.map(item => <div key={item.id}><span><strong>{item.accountName} · {item.statementDate}</strong><small>Statement {formatMoney(item.statementBalance)} · ledger {formatMoney(item.systemBalance)}</small></span><span className={`finance-status ${item.status === 'reconciled' ? 'paid' : 'unpaid'}`}>{item.status === 'reconciled' ? 'reconciled' : `${formatMoney(Math.abs(item.difference))} difference`}</span></div>)}</div>
        {reconciliations.length === 0 ? <p className="empty-register">No cash, mobile-money or bank reconciliation saved yet.</p> : null}
      </section>
    </div>
    <section className="panel"><div className="panel-head"><h2>Journal register</h2><span className={Math.abs(totalDebits - totalCredits) < .01 ? 'journal-balanced' : 'stock-low'}>Debits {formatMoney(totalDebits)} · Credits {formatMoney(totalCredits)}</span></div>
      <div className="journal-list">{journals.map(journal => <details key={journal.id}><summary><span><strong>{journal.reference}</strong>{journal.entryDate} · {journal.source}</span><span>{journal.description}</span><strong>{formatMoney(journal.lines.reduce((sum, line) => sum + line.debit, 0))}</strong></summary><div>{journal.lines.map((line, index) => <p key={`${journal.id}-${index}`}><span>{line.accountCode} · {line.accountName}</span><span>Debit {formatMoney(line.debit)}</span><span>Credit {formatMoney(line.credit)}</span></p>)}</div></details>)}</div>
      {journals.length === 0 ? <p className="empty-register">Operational transactions will automatically create balanced journals.</p> : null}
    </section>
  </div>
}
