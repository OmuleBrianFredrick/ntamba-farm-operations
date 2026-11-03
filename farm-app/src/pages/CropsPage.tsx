import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Leaf, Plus, Sprout, Wheat } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { offlineDb, type StoredPlantingSession, type StoredCropRecord } from '../lib/offlineDb'
import { plantingStatusLabel, seededPlantings } from '../features/crops/cropData'
import { daysUntil, plantingProgress } from '../features/crops/cropMath'
import { MasterEditor } from '../features/crops/MasterEditor'
import { CropRegister } from '../features/crops/CropRegister'
import { LifecycleEditor } from '../features/crops/LifecycleEditor'

const tabs = ['overview', 'plantings', 'seasons', 'varieties', 'fields', 'records', 'stages'] as const
type Tab = typeof tabs[number]

export function CropsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const current = params.get('view')
  const tab: Tab = tabs.includes(current as Tab) ? current as Tab : 'overview'
  const [localPlantings, setLocalPlantings] = useState<StoredPlantingSession[]>([])
  const [query, setQuery] = useState('')
  const [cropRecords, setCropRecords] = useState<StoredCropRecord[]>([])
  const [today] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date()))

  useEffect(() => {
    let active = true
    void offlineDb.plantingSessions.toArray().then((records) => { if (active) setLocalPlantings(records) })
    void offlineDb.cropRecords.toArray().then(records => { if (active) setCropRecords(records) })
    return () => { active = false }
  }, [])

  const plantings = useMemo(() => [...localPlantings, ...seededPlantings], [localPlantings])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? plantings.filter((item) => `${item.crop} ${item.variety} ${item.block}`.toLowerCase().includes(needle)) : plantings
  }, [plantings, query])
  const activeArea = plantings.filter((item) => item.status !== 'planned').reduce((total, item) => total + item.area, 0)

  return <div className="page crops-page">
    <div className="page-heading crops-heading">
      <div><h1>Crops</h1><p>Seasons, planting sessions, field progress and harvest readiness.</p></div>
      <div className="crop-heading-actions"><button className="secondary-button" onClick={() => navigate('/crops/record')}>Record crop update</button><button className="primary-button" onClick={() => navigate('/crops/new-planting')}><Plus size={17} /> New planting</button></div>
    </div>

    <nav className="workspace-tabs" aria-label="Crop workspace">
      {tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setParams(item === 'overview' ? {} : { view: item })}>{item}</button>)}
    </nav>

    {tab === 'overview' && <>
      <section className="crop-summary" aria-label="Crop summary">
        <CropSummary Icon={Sprout} value={`${plantings.length}`} label="active plantings" detail="Includes labelled development samples" />
        <CropSummary Icon={Leaf} value={`${activeArea.toFixed(2)} acres`} label="area under crops" detail="Current recorded area" />
        <CropSummary Icon={Wheat} value={String(plantings.filter(item => { const date = new Date(item.expectedHarvest); if (!Number.isFinite(date.getTime())) return false; const days = daysUntil(date.toISOString().slice(0, 10), today); return days >= 0 && days <= 90 }).length)} label="harvests approaching" detail="Within the next 90 days" />
        <CropSummary Icon={CircleAlert} value={String(cropRecords.filter(item => item.actionRequired).length)} label="actions required" detail="Saved observations flagged for follow-up" warning />
      </section>

      <div className="crop-overview-grid">
        <section className="panel crop-focus">
          <div className="panel-head"><h2>Planting progress</h2><button className="text-link" onClick={() => setParams({ view: 'plantings' })}>View all →</button></div>
          <div className="planting-progress-list">
            {plantings.slice(0, 4).map((item) => <PlantingProgress key={item.id} item={item} />)}
          </div>
        </section>
        <section className="panel season-focus">
          <div className="panel-head"><h2>Current season</h2><button className="text-link" onClick={() => setParams({ view: 'seasons' })}>All seasons →</button></div>
          <div className="season-body"><p>Manage season dates and details in the Seasons register. Sample plantings are included in this development workspace.</p></div>
          <ul className="crop-actions">{cropRecords.filter(item => item.actionRequired).map(item => <li key={item.id}><div><strong>{item.crop} · {item.block}</strong><small>{item.summary}</small></div></li>)}</ul>
        </section>
      </div>
    </>}

    {tab === 'plantings' && <section className="panel crop-table-panel">
      <div className="crop-toolbar"><div><h2>Planting sessions</h2><span>{filtered.length} records</span></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crop, variety or block" aria-label="Search planting sessions" /></div>
      <PlantingsTable plantings={filtered} />
    </section>}

    {tab === 'records' && <CropRegister />}
    {tab === 'stages' && <LifecycleEditor />}
    {(tab === 'seasons' || tab === 'varieties' || tab === 'fields') && <MasterEditor key={tab} kind={tab} />}

  </div>
}

function CropSummary({ Icon, value, label, detail, warning = false }: { Icon: typeof Leaf; value: string; label: string; detail: string; warning?: boolean }) {
  return <div className={`crop-summary-item${warning ? ' warning' : ''}`}><Icon /><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></div>
}

function PlantingProgress({ item }: { item: StoredPlantingSession }) {
  const parsed = new Date(item.expectedHarvest)
  const isoExpected = Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : ''
  const [today] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date()))
  const progress = plantingProgress(item.plantedOn, isoExpected, today)
  const remainingDays = daysUntil(isoExpected, today)
  return <div className="planting-progress-row"><div className="crop-initial">{item.crop.slice(0, 1)}</div><div className="planting-progress-copy"><div><strong>{item.crop} · {item.block}</strong><span>{item.area} {item.areaUnit}</span></div><small>{item.variety}</small><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="progress-status"><span className={`planting-status ${item.status}`}>{plantingStatusLabel(item.status)}</span><small>{remainingDays > 0 ? `${remainingDays} days to harvest` : 'Harvest active'}</small></div></div>
}

function PlantingsTable({ plantings }: { plantings: StoredPlantingSession[] }) {
  return <div className="table-scroll"><table className="crop-table"><thead><tr><th>Crop & variety</th><th>Block</th><th>Planted</th><th>Area</th><th>Expected harvest</th><th>Status</th><th>Sync</th></tr></thead><tbody>{plantings.map((item) => <tr key={item.id}><td><strong>{item.crop}</strong><span>{item.variety}</span></td><td>{item.block}</td><td>{new Date(`${item.plantedOn}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{item.area} {item.areaUnit}</td><td>{item.expectedHarvest}</td><td><span className={`planting-status ${item.status}`}>{plantingStatusLabel(item.status)}</span></td><td><span className={`sync-state ${item.syncStatus}`}>{item.syncStatus === 'synced' ? 'Synced' : item.syncStatus === 'queued' ? 'Queued' : 'Check'}</span></td></tr>)}</tbody></table></div>
}
