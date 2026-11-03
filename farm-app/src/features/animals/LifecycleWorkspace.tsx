import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Boxes, CalendarClock, ClipboardCheck } from 'lucide-react'
import {
  animalDb, eventOptions, saveLifecycleEvent, validateLifecycleEvent, validateManagedAsset,
  type AssetKind, type Enterprise, type LifecycleEvent, type ManagedAsset,
} from './records'

function farmToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
}

const kindOptions: Record<Enterprise, Array<{ value: AssetKind; label: string }>> = {
  livestock: [{ value: 'animal', label: 'Individual animal' }, { value: 'herd', label: 'Herd / group' }],
  poultry: [{ value: 'flock', label: 'Flock' }],
  'fish-apiary': [{ value: 'pond', label: 'Fish pond' }, { value: 'hive', label: 'Bee hive' }],
}

const categoryHints: Record<AssetKind, string> = {
  animal: 'Cattle, goat, sheep, pig…', herd: 'Dairy herd, goat group…', flock: 'Layers, broilers, local birds…', pond: 'Tilapia, catfish…', hive: 'Langstroth, Kenya top-bar…',
}

const countUnits: Record<AssetKind, ManagedAsset['countUnit']> = { animal: 'head', herd: 'head', flock: 'birds', pond: 'fish', hive: 'colonies' }

function blankAsset(enterprise: Enterprise): ManagedAsset {
  const kind = kindOptions[enterprise][0].value
  const now = new Date().toISOString()
  return {
    id: '', enterprise, kind, name: '', category: '', breed: '', location: '', startedOn: farmToday(),
    openingCount: kind === 'hive' ? 1 : 0, currentCount: kind === 'hive' ? 1 : 0,
    countUnit: countUnits[kind], status: 'active', notes: '', createdAt: now, updatedAt: now,
  }
}

export function AnimalLifecycleOverview({ enterprise }: { enterprise: Enterprise }) {
  const [assets, setAssets] = useState<ManagedAsset[]>([])
  const [events, setEvents] = useState<LifecycleEvent[]>([])
  const [productionCount, setProductionCount] = useState(0)
  useEffect(() => {
    let active = true
    void Promise.all([
      animalDb.assets.where('enterprise').equals(enterprise).toArray(),
      animalDb.events.where('enterprise').equals(enterprise).reverse().sortBy('eventDate'),
      animalDb.records.where('enterprise').equals(enterprise).count(),
    ]).then(([nextAssets, nextEvents, nextProductionCount]) => {
      if (!active) return
      setAssets(nextAssets); setEvents(nextEvents); setProductionCount(nextProductionCount)
    })
    return () => { active = false }
  }, [enterprise])
  const today = farmToday()
  const activeAssets = assets.filter(item => item.status === 'active')
  const dueActions = events.filter(item => item.nextActionOn && item.nextActionOn >= today).length
  return <>
    <section className="crop-summary" aria-label="Enterprise lifecycle summary">
      <Summary Icon={Boxes} value={String(activeAssets.length)} label="active managed records" detail="Animals, groups, ponds or hives" />
      <Summary Icon={Activity} value={String(events.length)} label="lifecycle events" detail="Health and operational history" />
      <Summary Icon={CalendarClock} value={String(dueActions)} label="scheduled follow-ups" detail="Future actions recorded" />
      <Summary Icon={ClipboardCheck} value={String(productionCount)} label="production entries" detail="Daily outputs on this device" />
    </section>
    <section className="panel lifecycle-recent">
      <div className="panel-head"><h2>Recent lifecycle activity</h2><span>{events.length ? `${events.length} event(s)` : 'No events yet'}</span></div>
      {events.length ? <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Managed record</th><th>Event</th><th>Details</th><th>Follow-up</th></tr></thead><tbody>{events.slice(0, 6).map(item => <tr key={item.id}><td>{item.eventDate}</td><td><strong>{item.assetName}</strong><span>{item.assetKind}</span></td><td>{eventLabel(item)}</td><td>{item.details}</td><td>{item.nextActionOn ?? '—'}</td></tr>)}</tbody></table></div> : <p className="empty-register">Add a managed record, then capture its first lifecycle or health event.</p>}
    </section>
  </>
}

function Summary({ Icon, value, label, detail }: { Icon: typeof Boxes; value: string; label: string; detail: string }) {
  return <div className="crop-summary-item"><Icon /><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></div>
}

export function AssetRegister({ enterprise }: { enterprise: Enterprise }) {
  const [rows, setRows] = useState<ManagedAsset[]>([])
  const [draft, setDraft] = useState<ManagedAsset | null>(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { let active = true; void animalDb.assets.where('enterprise').equals(enterprise).sortBy('name').then(items => { if (active) setRows(items) }); return () => { active = false } }, [enterprise])
  const filtered = useMemo(() => rows.filter(item => `${item.name} ${item.category} ${item.breed} ${item.location} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  function update<K extends keyof ManagedAsset>(key: K, value: ManagedAsset[K]) { setDraft(current => current ? { ...current, [key]: value } : current) }
  function changeKind(kind: AssetKind) { setDraft(current => current ? { ...current, kind, countUnit: countUnits[kind], openingCount: kind === 'hive' ? 1 : current.openingCount, currentCount: kind === 'hive' ? 1 : current.currentCount } : current) }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return
    const now = new Date().toISOString()
    const record = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim(), category: draft.category.trim(), breed: draft.breed.trim(), location: draft.location.trim(), notes: draft.notes.trim(), createdAt: draft.id ? draft.createdAt : now, updatedAt: now }
    const issue = validateManagedAsset(record)
    if (issue) { setError(issue); return }
    if (rows.some(item => item.id !== record.id && item.name.toLowerCase() === record.name.toLowerCase())) { setError('That identifier already exists in this enterprise.'); return }
    await animalDb.assets.put(record)
    setRows(await animalDb.assets.where('enterprise').equals(enterprise).sortBy('name')); setDraft(null); setError(''); setMessage('Managed record saved on this device. Live integration is pending.')
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Managed register</h2><span>{rows.length} record(s)</span></div><div className="toolbar-actions"><input aria-label="Search managed records" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search identifier, type or location" /><button className="primary-button" onClick={() => { setDraft(blankAsset(enterprise)); setMessage(''); setError('') }}>Add record</button></div></div>
    {draft ? <form className="form-panel embedded-form" onSubmit={save}>
      <div className="form-grid three-column">
        <label className="field-group">Record type<select className="field" value={draft.kind} onChange={event => changeKind(event.target.value as AssetKind)}>{kindOptions[enterprise].map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label className="field-group">Identifier / name<input className="field" required value={draft.name} onChange={event => update('name', event.target.value)} placeholder={draft.kind === 'animal' ? 'Ear tag or animal name' : draft.kind === 'flock' ? 'Flock or house name' : draft.kind === 'pond' ? 'Pond name' : draft.kind === 'hive' ? 'Hive number' : 'Herd or group name'} /></label>
        <label className="field-group">Type / species<input className="field" required value={draft.category} onChange={event => update('category', event.target.value)} placeholder={categoryHints[draft.kind]} /></label>
        <label className="field-group">Breed / strain <span className="optional">optional</span><input className="field" value={draft.breed} onChange={event => update('breed', event.target.value)} /></label>
        <label className="field-group">Location<input className="field" required value={draft.location} onChange={event => update('location', event.target.value)} placeholder="Barn, house, pond block or apiary" /></label>
        <label className="field-group">Start / acquisition date<input className="field" type="date" required value={draft.startedOn} onChange={event => update('startedOn', event.target.value)} /></label>
        <label className="field-group">Opening count ({draft.countUnit})<input className="field" type="number" min="0" step="1" required value={draft.openingCount} onChange={event => update('openingCount', Number(event.target.value))} /></label>
        <label className="field-group">Current count ({draft.countUnit})<input className="field" type="number" min="0" step="1" required value={draft.currentCount} onChange={event => update('currentCount', Number(event.target.value))} /></label>
        <label className="field-group">Status<select className="field" value={draft.status} onChange={event => update('status', event.target.value as ManagedAsset['status'])}><option value="active">Active</option><option value="inactive">Inactive</option><option value="sold">Sold</option><option value="deceased">Deceased</option><option value="completed">Cycle completed</option></select></label>
        <label className="field-group full">Notes<textarea className="field" value={draft.notes} onChange={event => update('notes', event.target.value)} /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancel</button><button className="primary-button">Save managed record</button></div>
    </form> : null}
    {message ? <p className="register-message" role="status">{message}</p> : null}
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Identifier</th><th>Record type</th><th>Type / breed</th><th>Location</th><th>Current stock</th><th>Start date</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{kindOptions[item.enterprise].find(option => option.value === item.kind)?.label ?? item.kind}</td><td>{item.category}<span>{item.breed || '—'}</span></td><td>{item.location}</td><td>{item.currentCount} {item.countUnit}</td><td>{item.startedOn}</td><td><span className={`operation-status ${item.status}`}>{item.status}</span></td><td><button className="secondary-button compact-button" onClick={() => { setDraft(item); setError(''); setMessage('') }}>Edit</button></td></tr>)}</tbody></table></div>
    {!filtered.length ? <p className="empty-register">{rows.length ? 'No matching managed records.' : 'No managed records yet. Add the first one above.'}</p> : null}
  </section>
}

export function LifecycleEventRegister({ enterprise }: { enterprise: Enterprise }) {
  const [assets, setAssets] = useState<ManagedAsset[]>([])
  const [rows, setRows] = useState<LifecycleEvent[]>([])
  const [assetId, setAssetId] = useState('')
  const [eventType, setEventType] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void Promise.all([animalDb.assets.where('enterprise').equals(enterprise).sortBy('name'), animalDb.events.where('enterprise').equals(enterprise).reverse().sortBy('eventDate')]).then(([nextAssets, nextEvents]) => {
      if (!active) return
      setAssets(nextAssets); setRows(nextEvents); setAssetId(current => current || nextAssets[0]?.id || '')
    })
    return () => { active = false }
  }, [enterprise])
  const asset = assets.find(item => item.id === assetId)
  const options = asset ? eventOptions[enterprise][asset.kind] ?? [] : []
  const selectedEventType = options.some(item => item.value === eventType) ? eventType : options[0]?.value ?? ''
  const filtered = useMemo(() => rows.filter(item => `${item.assetName} ${eventLabel(item)} ${item.details} ${item.fromLocation} ${item.toLocation}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!asset) { setError('Add a managed record before recording an event.'); return }
    const form = event.currentTarget
    const data = new FormData(form)
    const countText = String(data.get('countAfter')).trim()
    const record: LifecycleEvent = {
      id: crypto.randomUUID(), enterprise, assetId: asset.id, assetName: asset.name, assetKind: asset.kind,
      eventDate: String(data.get('eventDate')), eventType: selectedEventType,
      quantity: Number(data.get('quantity')), unit: String(data.get('unit')), countAfter: countText ? Number(countText) : null,
      fromLocation: String(data.get('fromLocation')).trim(), toLocation: String(data.get('toLocation')).trim(),
      details: String(data.get('details')).trim(), nextActionOn: String(data.get('nextActionOn')).trim() || null, createdAt: new Date().toISOString(),
    }
    const issue = validateLifecycleEvent(record)
    if (issue) { setError(issue); return }
    await saveLifecycleEvent(record)
    const [nextAssets, nextEvents] = await Promise.all([animalDb.assets.where('enterprise').equals(enterprise).sortBy('name'), animalDb.events.where('enterprise').equals(enterprise).reverse().sortBy('eventDate')])
    setAssets(nextAssets); setRows(nextEvents); setError(''); setMessage('Lifecycle event saved. Live integration is pending.'); form.reset()
  }
  return <div className="lifecycle-grid">
    <form className="form-panel" onSubmit={submit}>
      <h2>Record lifecycle or health event</h2>
      {!assets.length ? <p className="form-error">Add an animal, flock, pond or hive in the Managed register first.</p> : null}
      <div className="form-grid">
        <label className="field-group">Managed record<select className="field" value={assetId} onChange={event => { setAssetId(event.target.value); setEventType('') }} required><option value="">Select record</option>{assets.map(item => <option value={item.id} key={item.id}>{item.name} · {item.category}</option>)}</select></label>
        <label className="field-group">Event date<input className="field" name="eventDate" type="date" required defaultValue={farmToday()} /></label>
        <label className="field-group">Event type<select className="field" value={selectedEventType} onChange={event => setEventType(event.target.value)} required>{options.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label className="field-group">Quantity<input className="field" name="quantity" type="number" min="0" step="any" required defaultValue="0" /></label>
        <label className="field-group">Quantity unit<select key={asset?.id ?? 'none'} className="field" name="unit" defaultValue={asset?.countUnit ?? 'record'}><option value="record">record</option><option value="head">head</option><option value="birds">birds</option><option value="fish">fish</option><option value="colonies">colonies</option><option value="kg">kg</option><option value="L">L</option><option value="doses">doses</option></select></label>
        <label className="field-group">Count after event <span className="optional">optional</span><input className="field" name="countAfter" type="number" min="0" step="1" placeholder={asset ? `Current: ${asset.currentCount}` : ''} /></label>
        <label className="field-group">From location <span className="optional">optional</span><input className="field" name="fromLocation" /></label>
        <label className="field-group">To location <span className="optional">optional</span><input className="field" name="toLocation" /></label>
        <label className="field-group">Next action date <span className="optional">optional</span><input className="field" name="nextActionOn" type="date" /></label>
        <label className="field-group full">Event details<textarea className="field" name="details" required placeholder="Condition observed, medicine or vaccine, batch/reference, outcome and responsible person" /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="form-actions"><span>Offline-ready lifecycle history</span><button className="primary-button" disabled={!assets.length}>Save lifecycle event</button></div>
    </form>
    <section className="panel">
      <div className="crop-toolbar"><div><h2>Lifecycle history</h2><span>{rows.length} event(s)</span></div><input aria-label="Search lifecycle events" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search record, event or details" /></div>
      <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Managed record</th><th>Event</th><th>Quantity</th><th>Stock after</th><th>Movement</th><th>Details</th><th>Follow-up</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{item.eventDate}</td><td><strong>{item.assetName}</strong><span>{item.assetKind}</span></td><td>{eventLabel(item)}</td><td>{item.quantity} {item.unit}</td><td>{item.countAfter === null ? '—' : item.countAfter}</td><td>{item.fromLocation || item.toLocation ? `${item.fromLocation || '—'} → ${item.toLocation || '—'}` : '—'}</td><td>{item.details}</td><td>{item.nextActionOn ?? '—'}</td></tr>)}</tbody></table></div>
      {!filtered.length ? <p className="empty-register">{rows.length ? 'No matching events.' : 'No lifecycle events yet.'}</p> : null}
    </section>
  </div>
}

function eventLabel(event: Pick<LifecycleEvent, 'enterprise' | 'assetKind' | 'eventType'>) {
  return eventOptions[event.enterprise][event.assetKind]?.find(item => item.value === event.eventType)?.label ?? event.eventType.replaceAll('-', ' ')
}
