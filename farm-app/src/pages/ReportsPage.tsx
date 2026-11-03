import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Boxes, Download, FileCheck2, Leaf, Printer, Save, ShieldCheck, WalletCards } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { animalDb } from '../features/animals/records'
import { financeDb } from '../features/finance/financeStore'
import { inventoryDb } from '../features/inventory/inventoryStore'
import { qhseDb } from '../features/qhse/qhseStore'
import { phase6ChangeEvent, phase6Db, recordAudit, saveReport, type SavedReport } from '../features/administration/phase6Store'
import { buildReportSummary, filterDataset, reportCsv, type ReportDataset } from '../features/reports/reporting'
import { offlineDb } from '../lib/offlineDb'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
const monthStart = () => `${today().slice(0, 8)}01`
const money = (value: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value)
const emptyData: ReportDataset = { plantings: [], cropRecords: [], animalRecords: [], assets: [], lifecycleEvents: [], inventoryItems: [], stockTransactions: [], sales: [], expenses: [], wages: [], payments: [], journals: [], submissions: [], actions: [] }
const tabs = ['overview', 'production', 'finance', 'stock', 'qhse', 'saved'] as const
type Tab = typeof tabs[number]

async function loadDataset(): Promise<ReportDataset> {
  const [plantings, cropRecords, animalRecords, assets, lifecycleEvents, inventoryItems, stockTransactions, sales, expenses, wages, payments, journals, submissions, actions] = await Promise.all([
    offlineDb.plantingSessions.toArray(), offlineDb.cropRecords.toArray(), animalDb.records.toArray(), animalDb.assets.toArray(), animalDb.events.toArray(),
    inventoryDb.items.toArray(), inventoryDb.transactions.toArray(), financeDb.sales.toArray(), financeDb.expenses.toArray(), financeDb.wages.toArray(),
    financeDb.payments.toArray(), financeDb.journals.toArray(), qhseDb.submissions.toArray(), qhseDb.actions.toArray(),
  ])
  return { plantings, cropRecords, animalRecords, assets, lifecycleEvents, inventoryItems, stockTransactions, sales, expenses, wages, payments, journals, submissions, actions }
}

export function ReportsPage() {
  const { displayName } = useAuth(); const [tab, setTab] = useState<Tab>('overview'); const [data, setData] = useState<ReportDataset>(emptyData)
  const [saved, setSaved] = useState<SavedReport[]>([]); const [start, setStart] = useState(monthStart); const [end, setEnd] = useState(today)
  const [enterprise, setEnterprise] = useState('All farm'); const [message, setMessage] = useState('')
  const refresh = useCallback(async () => { setData(await loadDataset()); setSaved(await phase6Db.savedReports.orderBy('createdAt').reverse().toArray()) }, [])
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); const listener = () => void refresh(); window.addEventListener(phase6ChangeEvent, listener); window.addEventListener('focus', listener); return () => { window.clearTimeout(timer); window.removeEventListener(phase6ChangeEvent, listener); window.removeEventListener('focus', listener) } }, [refresh])
  const filters = useMemo(() => ({ start, end, enterprise }), [start, end, enterprise]); const filtered = useMemo(() => filterDataset(data, filters), [data, filters]); const summary = useMemo(() => buildReportSummary(filtered), [filtered])
  const exportReport = async () => {
    const blob = new Blob([reportCsv(summary, filters)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `ntamba-report-${start}-to-${end}.csv`; link.click(); URL.revokeObjectURL(url)
    await recordAudit({ actor: displayName, role: 'manager', module: 'reports', action: 'exported-csv', entityType: 'report-export', entityId: `${start}-${end}`, summary: `${enterprise} · ${summary.productionRecords} production records`, severity: 'information' }); setMessage('CSV report exported from the current filters.')
  }
  const printReport = async () => { await recordAudit({ actor: displayName, role: 'manager', module: 'reports', action: 'printed-report', entityType: 'report-print', entityId: `${start}-${end}`, summary: `${enterprise} · ${start} to ${end}`, severity: 'information' }); window.print() }
  const saveSnapshot = async () => { await saveReport({ title: `${enterprise} management report`, reportType: tab, periodStart: start, periodEnd: end, enterprise, createdBy: displayName, summary }); setMessage('Management report snapshot saved.'); await refresh() }

  return <div className="page reports-page">
    <div className="page-heading report-heading"><div><h1>Reports</h1><p>One management view across farm production, finance, stock and QHSE evidence.</p></div><div className="report-actions"><button className="secondary-button" onClick={() => void exportReport()}><Download />Export CSV</button><button className="secondary-button" onClick={() => void printReport()}><Printer />Print</button><button className="primary-button" onClick={() => void saveSnapshot()}><Save />Save snapshot</button></div></div>
    <section className="report-filter-band" aria-label="Report filters"><label><span>Period start</span><input className="field" aria-label="Period start" type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label><span>Period end</span><input className="field" aria-label="Period end" type="date" value={end} onChange={event => setEnd(event.target.value)} /></label><label><span>Enterprise</span><select className="field" aria-label="Enterprise" value={enterprise} onChange={event => setEnterprise(event.target.value)}><option>All farm</option><option>Crops</option><option>Livestock</option><option>Poultry</option><option>Fish-apiary</option></select></label><div><span>Reporting basis</span><strong>Recorded activity · {start} to {end}</strong></div></section>
    {message && <p className="status-message" role="status">{message}</p>}
    <nav className="workspace-tabs" aria-label="Report sections">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === 'overview' && <Overview summary={summary} data={filtered} />}
    {tab === 'production' && <ProductionReport data={filtered} />}
    {tab === 'finance' && <FinanceReport data={filtered} />}
    {tab === 'stock' && <StockReport data={filtered} />}
    {tab === 'qhse' && <QhseReport data={filtered} />}
    {tab === 'saved' && <SavedReports rows={saved} />}
  </div>
}

function Overview({ summary, data }: { summary: ReturnType<typeof buildReportSummary>; data: ReportDataset }) {
  const net = summary.revenue - summary.expenses - summary.wages
  return <div className="report-stack"><section className="report-kpis"><Kpi icon={Leaf} value={summary.productionRecords} label="production records" detail={`${data.plantings.length} plantings · ${data.animalRecords.length} output records`} /><Kpi icon={WalletCards} value={money(net)} label="operating result" detail={`${money(summary.revenue)} revenue`} /><Kpi icon={Boxes} value={money(summary.stockValue)} label="stock value" detail={`${summary.stockAlerts} reorder alert(s)`} /><Kpi icon={ShieldCheck} value={summary.exceptions} label="management exceptions" detail={`${summary.openActions} open QHSE action(s)`} /></section>
    <div className="report-grid"><section className="panel"><div className="panel-head"><h2>Farm activity mix</h2><span>Records in selected period</span></div><div className="report-bars"><Bar label="Crops" value={data.plantings.length + data.cropRecords.length} max={summary.productionRecords} /><Bar label="Animal outputs" value={data.animalRecords.length} max={summary.productionRecords} /><Bar label="Lifecycle events" value={data.lifecycleEvents.length} max={summary.productionRecords} /><Bar label="Stock movements" value={data.stockTransactions.length} max={Math.max(1, data.stockTransactions.length)} /></div></section><section className="panel"><div className="panel-head"><h2>Management attention</h2><span>Act on exceptions first</span></div><div className="exception-register"><p><strong>{summary.outstanding ? money(summary.outstanding) : 'None'}</strong><span>Outstanding customer, supplier and wage balances</span></p><p><strong>{summary.stockAlerts}</strong><span>Items at or below reorder level</span></p><p><strong>{summary.openActions}</strong><span>Corrective actions still open</span></p><p><strong>{data.submissions.filter(item => item.status === 'restricted').length}</strong><span>Restricted QHSE submissions</span></p></div></section></div>
  </div>
}

function ProductionReport({ data }: { data: ReportDataset }) {
  const enterprises = ['livestock', 'poultry', 'fish-apiary'].map(name => ({ name, rows: data.animalRecords.filter(item => item.enterprise === name), accepted: data.animalRecords.filter(item => item.enterprise === name).reduce((sum, item) => sum + item.gross - item.rejected, 0) }))
  return <div className="report-grid"><section className="panel"><div className="panel-head"><h2>Production by enterprise</h2><span>Accepted outputs</span></div><div className="report-bars">{enterprises.map(item => <Bar key={item.name} label={item.name} value={item.accepted} max={Math.max(1, ...enterprises.map(row => row.accepted))} suffix={` · ${item.rows.length} records`} />)}</div></section><section className="panel"><div className="panel-head"><h2>Crop and lifecycle activity</h2><span>Selected period</span></div><div className="exception-register"><p><strong>{data.plantings.length}</strong><span>Planting sessions started</span></p><p><strong>{data.cropRecords.length}</strong><span>Crop observations and harvest records</span></p><p><strong>{data.assets.length}</strong><span>Managed animal, flock, pond and hive records</span></p><p><strong>{data.lifecycleEvents.length}</strong><span>Lifecycle and health events</span></p></div></section><RecentTable headings={['Date', 'Enterprise', 'Subject', 'Output', 'Accepted']} rows={data.animalRecords.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(item => [item.date, item.enterprise, item.subject, `${item.gross} ${item.unit}`, `${item.gross-item.rejected} ${item.unit}`])} /></div>
}

function FinanceReport({ data }: { data: ReportDataset }) {
  const revenue=data.sales.reduce((s,x)=>s+x.total,0), expenses=data.expenses.reduce((s,x)=>s+x.total,0), wages=data.wages.reduce((s,x)=>s+x.netWage,0), received=data.payments.filter(x=>x.direction==='in').reduce((s,x)=>s+x.amount,0), paid=data.payments.filter(x=>x.direction==='out').reduce((s,x)=>s+x.amount,0)
  return <div className="report-stack"><section className="report-kpis"><Kpi icon={WalletCards} value={money(revenue)} label="invoiced sales" detail={`${data.sales.length} invoice(s)`}/><Kpi icon={Download} value={money(received)} label="cash received" detail={`${data.payments.filter(x=>x.direction==='in').length} receipt(s)`}/><Kpi icon={BarChart3} value={money(expenses+wages)} label="expenses and wages" detail={`${money(paid)} cash paid`}/><Kpi icon={FileCheck2} value={money(revenue-expenses-wages)} label="operating result" detail={`${data.journals.length} journal(s)`}/></section><RecentTable headings={['Date','Reference','Customer','Description','Total','Balance']} rows={data.sales.slice().sort((a,b)=>b.invoiceDate.localeCompare(a.invoiceDate)).map(item=>[item.invoiceDate,item.invoiceNumber,item.customerName,item.description,money(item.total),money(item.balance)])}/></div>
}

function StockReport({ data }: { data: ReportDataset }) {
  const value=data.inventoryItems.reduce((s,x)=>s+x.quantityOnHand*x.unitCost,0), alerts=data.inventoryItems.filter(x=>x.status==='active'&&x.quantityOnHand<=x.reorderLevel)
  return <div className="report-grid"><section className="panel"><div className="panel-head"><h2>Stock position</h2><span>{money(value)} total value</span></div><div className="exception-register"><p><strong>{data.inventoryItems.length}</strong><span>Registered stock items</span></p><p><strong>{data.stockTransactions.length}</strong><span>Movements in selected period</span></p><p><strong>{alerts.length}</strong><span>At or below reorder level</span></p><p><strong>{data.inventoryItems.filter(x=>x.trackExpiry).length}</strong><span>Expiry-controlled items</span></p></div></section><RecentTable headings={['Item','Category','On hand','Reorder','Value']} rows={data.inventoryItems.map(item=>[item.name,item.category,`${item.quantityOnHand} ${item.unit}`,`${item.reorderLevel} ${item.unit}`,money(item.quantityOnHand*item.unitCost)])}/></div>
}

function QhseReport({ data }: { data: ReportDataset }) {
  const approved=data.submissions.filter(x=>x.status==='approved').length, open=data.actions.filter(x=>x.status!=='completed')
  return <div className="report-grid"><section className="panel"><div className="panel-head"><h2>Compliance position</h2><span>{data.submissions.length} controlled record(s)</span></div><div className="exception-register"><p><strong>{approved}</strong><span>Approved records</span></p><p><strong>{data.submissions.filter(x=>x.status==='submitted').length}</strong><span>Awaiting review</span></p><p><strong>{data.submissions.filter(x=>x.status==='restricted').length}</strong><span>Restricted records</span></p><p><strong>{open.length}</strong><span>Open corrective actions</span></p></div></section><RecentTable headings={['Date','Reference','Form','Risk','Status']} rows={data.submissions.slice().sort((a,b)=>b.recordDate.localeCompare(a.recordDate)).map(item=>[item.recordDate,item.reference,item.formTitle,item.riskLevel,item.status])}/></div>
}

function SavedReports({ rows }: { rows: SavedReport[] }) { return <section className="panel"><div className="panel-head"><h2>Saved report snapshots</h2><span>{rows.length} immutable snapshot(s)</span></div>{rows.length ? <div className="saved-report-list">{rows.map(item=><article key={item.id}><FileCheck2/><div><strong>{item.title}</strong><span>{item.periodStart} to {item.periodEnd} · {item.enterprise} · {item.reportType}</span><small>Generated by {item.createdBy} on {new Date(item.createdAt).toLocaleString('en-GB')}</small></div><b>{item.summary.exceptions} exception(s)</b></article>)}</div>:<p className="empty-register">Save a filtered report to preserve its management snapshot.</p>}</section> }
function Kpi({icon:Icon,value,label,detail}:{icon:typeof Leaf;value:string|number;label:string;detail:string}) { return <div><Icon/><span><strong>{value}</strong><b>{label}</b><small>{detail}</small></span></div> }
function Bar({label,value,max,suffix=''}:{label:string;value:number;max:number;suffix?:string}) { return <div><span><b>{label}</b><small>{value.toLocaleString()}{suffix}</small></span><i><em style={{width:`${Math.max(value?4:0,Math.min(100,value/Math.max(1,max)*100))}%`}}/></i></div> }
function RecentTable({headings,rows}:{headings:string[];rows:Array<Array<string|number>>}) { return <section className="panel report-table-panel"><div className="panel-head"><h2>Detailed records</h2><span>{rows.length} row(s)</span></div><div className="table-scroll"><table className="crop-table"><thead><tr>{headings.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<p className="empty-register">No records match the selected period and enterprise.</p>}</section> }
