import { useEffect, useState } from 'react'
import {
  BarChart3, Bird, Boxes, ClipboardList, Fish, Gauge, Leaf, Menu,
  Settings, ShieldCheck, Tractor, WalletCards, X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { isPublicDemoRoute } from '../lib/sharedDemoMode'
import { startAuthenticatedFarmSync } from '../lib/serverSync'

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
  const [sharedUpdate, setSharedUpdate] = useState(0)
  const [demoSyncLabel, setDemoSyncLabel] = useState('Connecting live demo')
  const [todayLabel] = useState(() => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kampala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()))
  const { activeMembership, canManageUsers, displayName, demo, session, signOut } = useAuth()
  const sync = useSyncStatus()
  const location = useLocation()
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (isPublicDemoRoute || !session || !activeMembership) return
    return startAuthenticatedFarmSync(activeMembership, session.user.id)
  }, [activeMembership, session])

  useEffect(() => {
    if (!isPublicDemoRoute) return
    const update = () => setSharedUpdate((version) => version + 1)
    const status = (event: Event) => setDemoSyncLabel((event as CustomEvent<string>).detail)
    window.addEventListener('public-demo-updated', update)
    window.addEventListener('public-demo-sync-status', status)
    return () => {
      window.removeEventListener('public-demo-updated', update)
      window.removeEventListener('public-demo-sync-status', status)
    }
  }, [])

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand"><img src="/ntamba-logo.png" alt="Ntamba Processors" /><span>Farm Operations</span></div>
        <nav className="nav-list" aria-label="Primary navigation">
          {items.filter(([to]) => to !== '/administration' || canManageUsers).map(([to, label, Icon]) => (
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
          <div className="topbar-greeting"><strong>Good morning, {displayName.split(' ')[0]}</strong><span>{todayLabel}{demo ? ' · Demo workspace' : activeMembership ? ` · ${activeMembership.farmName}` : ''}</span></div>
          <div className={`sync-online ${isPublicDemoRoute ? (demoSyncLabel.includes('synced') ? 'online' : 'pending') : sync.tone}`} title={sync.pending ? `${sync.pending} record(s) have not reached the server` : undefined}>{isPublicDemoRoute ? demoSyncLabel : sync.label}</div>
          {isPublicDemoRoute
            ? <span className="avatar" aria-label="Public demonstration visitor">DV</span>
            : <button className="avatar" aria-label={`Sign out ${displayName}`} onClick={() => void signOut()}>{initials}</button>}
        </header>
        <div key={`${location.pathname}:${sharedUpdate}`} className="route-content"><Outlet /></div>
      </main>
    </div>
  )
}
