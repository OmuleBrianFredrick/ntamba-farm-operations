import { useState } from 'react'
import {
  BarChart3, Bird, Boxes, ClipboardList, Fish, Gauge, Leaf, Menu,
  Settings, ShieldCheck, Tractor, WalletCards, X,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSyncStatus } from '../hooks/useSyncStatus'

const items = [
  ['/', 'Overview', Gauge], ['/daily-work', 'Daily Work', ClipboardList],
  ['/crops', 'Crops', Leaf], ['/livestock', 'Livestock', Tractor],
  ['/poultry', 'Poultry', Bird], ['/fish-apiary', 'Fish & Apiary', Fish],
  ['/stock', 'Stock & Inputs', Boxes], ['/finance', 'Sales & Finance', WalletCards],
  ['/qhse', 'QHSE Forms', ShieldCheck], ['/reports', 'Reports', BarChart3],
  ['/administration', 'Administration', Settings],
] as const

export function AppShell() {
  const [open, setOpen] = useState(false)
  const [todayLabel] = useState(() => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kampala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()))
  const { displayName, demo, signOut } = useAuth()
  const sync = useSyncStatus()
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand"><strong>Ntamba</strong><span>Farm Operations</span></div>
        <nav className="nav-list" aria-label="Primary navigation">
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="collapse">Farm operations v0.1.0</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
            {open ? <X /> : <Menu />}
          </button>
          <div className="topbar-greeting"><strong>Good morning, {displayName.split(' ')[0]}</strong><span>{todayLabel}{demo ? ' · Demo workspace' : ''}</span></div>
          <div className={`sync-online ${sync.tone}`} title={sync.pending ? `${sync.pending} record(s) have not reached the server` : undefined}>{sync.label}</div>
          <button className="avatar" aria-label={`Sign out ${displayName}`} onClick={() => void signOut()}>{initials}</button>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
