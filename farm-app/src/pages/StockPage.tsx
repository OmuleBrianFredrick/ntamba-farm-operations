import { useSearchParams } from 'react-router-dom'
import { ItemRegister, StockAlerts, StockMovements, StockOverview, SupplierRegister } from '../features/inventory/StockWorkspace'

const tabs = ['overview', 'items', 'suppliers', 'movements', 'alerts'] as const
type Tab = typeof tabs[number]

export function StockPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')
  const tab: Tab = tabs.includes(requested as Tab) ? requested as Tab : 'overview'
  return <div className="page stock-page">
    <div className="page-heading"><div><h1>Stock & Inputs</h1><p>Farm supplies, receipts, issues, balances, batch traceability and reorder control.</p></div></div>
    <nav className="workspace-tabs" aria-label="Stock and inputs workspace">
      {tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setParams(item === 'overview' ? {} : { view: item })}>{item === 'items' ? 'Item master' : item}</button>)}
    </nav>
    {tab === 'overview' ? <StockOverview /> : null}
    {tab === 'items' ? <ItemRegister /> : null}
    {tab === 'suppliers' ? <SupplierRegister /> : null}
    {tab === 'movements' ? <StockMovements /> : null}
    {tab === 'alerts' ? <StockAlerts /> : null}
  </div>
}
