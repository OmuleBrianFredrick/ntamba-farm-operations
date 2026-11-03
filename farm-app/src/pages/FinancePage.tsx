import { useSearchParams } from 'react-router-dom'
import { AccountingWorkspace, ContactsWorkspace, ExpensesWorkspace, FinanceOverview, SalesWorkspace, WagesWorkspace } from '../features/finance/FinanceWorkspace'

const tabs = ['overview', 'sales', 'expenses', 'wages', 'contacts', 'accounting'] as const
type Tab = typeof tabs[number]

export function FinancePage() {
  const [params, setParams] = useSearchParams(); const requested = params.get('view'); const tab: Tab = tabs.includes(requested as Tab) ? requested as Tab : 'overview'
  return <div className="page finance-page">
    <div className="page-heading"><div><h1>Sales & Finance</h1><p>Daily money records for sales, expenses, customer and supplier balances, wages, cash flow and accounting.</p></div></div>
    <nav className="workspace-tabs" aria-label="Sales and finance workspace">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setParams(item === 'overview' ? {} : { view: item })}>{item}</button>)}</nav>
    {tab === 'overview' ? <FinanceOverview /> : null}{tab === 'sales' ? <SalesWorkspace /> : null}{tab === 'expenses' ? <ExpensesWorkspace /> : null}{tab === 'wages' ? <WagesWorkspace /> : null}{tab === 'contacts' ? <ContactsWorkspace /> : null}{tab === 'accounting' ? <AccountingWorkspace /> : null}
  </div>
}
