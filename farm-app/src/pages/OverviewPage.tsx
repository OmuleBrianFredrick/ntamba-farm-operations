import { Banknote, CheckCircle2, Clock3, ClipboardCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { productionMetrics, transactions, workProgress } from '../data/dashboard'

export function OverviewPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Today&apos;s farm picture</h1>
        <button className="primary-button" onClick={() => navigate('/daily-work')}>Record activity</button>
      </div>

      <section className="summary-band" aria-label="Today's summary">
        <Summary Icon={Users} value="42" label="workers present" trend="↑ 4 more than yesterday" />
        <Summary Icon={ClipboardCheck} value="9" label="activities completed" trend="↑ 2 more than yesterday" />
        <Summary Icon={Clock3} value="3" label="awaiting review" trend="↑ 1 more than yesterday" />
        <Summary Icon={Banknote} value="UGX 4,860,000" label="received today" trend="↑ 12% more than yesterday" />
      </section>

      <div className="dashboard-grid">
        <div className="stack">
          <section className="panel">
            <PanelHead title="Production today" filters />
            <div className="production-rail">
              {productionMetrics.map((item) => (
                <div className="metric" key={item.label}>
                  <div className="metric-label">{item.label}</div>
                  <div className="metric-value">{item.value} <small>{item.unit}</small></div>
                  <div className={`metric-trend${item.down ? ' down' : ''}`}>{item.trend}</div>
                  <div className="metric-note">{item.note}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <PanelHead title="Work progress" filters />
            <table className="work-table">
              <thead><tr><th>Enterprise</th><th>Activity</th><th>Team</th><th>Output</th><th>Status</th></tr></thead>
              <tbody>{workProgress.map((row) => <tr key={row.enterprise}><td>{row.enterprise}</td><td>{row.activity}</td><td>{row.team}</td><td>{row.output}</td><td><span className={`status ${row.style}`}>{row.status}</span></td></tr>)}</tbody>
            </table>
          </section>
        </div>

        <section className="panel attention">
          <PanelHead title="Needs attention" />
          <ul className="attention-list">
            <Attention title="3 overdue wages" detail="Total UGX 640,000" danger />
            <Attention title="Dairy Block B water check missed" detail="Scheduled for today" />
            <Attention title="2 supplier invoices due" detail="Total UGX 2,350,000" />
            <Attention title="Pesticide restriction ending tomorrow" detail="Check application plan" />
          </ul>
        </section>
      </div>

      <div className="bottom-grid">
        <section className="panel">
          <PanelHead title="Cash today" />
          <div className="cash-rail">
            <Cash label="Received" value="UGX 4,860,000" />
            <Cash label="Paid" value="UGX 1,720,000" />
            <Cash label="Customer payments due" value="UGX 2,350,000" />
            <Cash label="Outstanding wages" value="UGX 640,000" />
          </div>
          <table className="transaction-table">
            <thead><tr><th>Time</th><th>Type</th><th>Description</th><th>Amount (UGX)</th></tr></thead>
            <tbody>{transactions.map((item) => <tr key={item.time}><td>{item.time}</td><td>{item.type}</td><td>{item.description}</td><td className={item.incoming ? 'money-in' : 'money-out'}>{item.amount}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="panel">
          <PanelHead title="Required records" />
          <ul className="record-list">
            <Attention title="Daily inspection" detail="Due today" danger />
            <li><CheckCircle2 color="#18864b" /><div className="list-copy"><strong>Poultry daily record</strong><span>Submitted today, 08:12</span></div></li>
            <Attention title="Fish pond log" detail="Missing for today" danger />
          </ul>
        </section>
      </div>
      <div className="sync-footer">● &nbsp; All records synced · Last sync 10:42</div>
    </div>
  )
}

function Summary({ Icon, value, label, trend }: { Icon: typeof Users; value: string; label: string; trend: string }) {
  return <div className="summary-item"><Icon /><div><span className="summary-value">{value}</span><span className="summary-label">{label}</span><span className="summary-trend">{trend}</span></div></div>
}

function PanelHead({ title, filters = false }: { title: string; filters?: boolean }) {
  return <div className="panel-head"><h2>{title}</h2>{filters ? <div className="filters"><select aria-label="Enterprise"><option>All enterprises</option></select><select aria-label="Date"><option>Today, 1 Nov 2026</option></select></div> : <button className="text-link">View all →</button>}</div>
}

function Attention({ title, detail, danger = false }: { title: string; detail: string; danger?: boolean }) {
  return <li><span className={`attention-dot${danger ? ' danger' : ''}`}>!</span><div className="list-copy"><strong>{title}</strong><span>{detail}</span></div><span aria-hidden="true">›</span></li>
}

function Cash({ label, value }: { label: string; value: string }) { return <div className="cash-item"><span>{label}</span><strong>{value}</strong></div> }
