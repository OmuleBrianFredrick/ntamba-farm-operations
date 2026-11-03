import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimalLifecycleOverview, AssetRegister, LifecycleEventRegister } from '../features/animals/LifecycleWorkspace'
import { animalDb, outputs, validateAnimalRecord, type AnimalRecord, type Enterprise, type ReviewStatus } from '../features/animals/records'

const titles = { livestock: 'Livestock', poultry: 'Poultry', 'fish-apiary': 'Fish & Apiary' }
const descriptions = {
  livestock: 'Manage animals and herds, movements, breeding, treatment history and daily outputs.',
  poultry: 'Manage flock cycles, bird reconciliation, health events and daily production.',
  'fish-apiary': 'Manage ponds and hives, stocking, water and colony observations, treatments and harvests.',
}
const tabs = ['overview', 'production', 'register', 'lifecycle'] as const
type Tab = typeof tabs[number]

function farmToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date()) }
function currentTimestamp() { return new Date().toISOString() }

export function AnimalOperationsPage({ enterprise }: { enterprise: Enterprise }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')
  const tab: Tab = tabs.includes(requested as Tab) ? requested as Tab : 'overview'
  return <div className="page animal-operations-page">
    <div className="page-heading"><div><h1>{titles[enterprise]}</h1><p>{descriptions[enterprise]}</p></div></div>
    <nav className="workspace-tabs" aria-label={`${titles[enterprise]} workspace`}>
      {tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setParams(item === 'overview' ? {} : { view: item })}>{item === 'register' ? 'Managed register' : item}</button>)}
    </nav>
    {tab === 'overview' ? <AnimalLifecycleOverview enterprise={enterprise} /> : null}
    {tab === 'production' ? <ProductionWorkspace enterprise={enterprise} /> : null}
    {tab === 'register' ? <AssetRegister enterprise={enterprise} /> : null}
    {tab === 'lifecycle' ? <LifecycleEventRegister enterprise={enterprise} /> : null}
  </div>
}

function ProductionWorkspace({ enterprise }: { enterprise: Enterprise }) {
  const [records, setRecords] = useState<AnimalRecord[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [outputIndex, setOutputIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AnimalRecord | null>(null)
  useEffect(() => {
    let active = true
    void animalDb.records.where('enterprise').equals(enterprise).reverse().sortBy('date').then(rows => { if (active) setRecords(rows) }).catch(() => { if (active) setError('Could not load device records. Refresh to retry.') })
    return () => { active = false }
  }, [enterprise])
  const output = outputs[enterprise][outputIndex] ?? outputs[enterprise][0]
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const form = event.currentTarget
    const data = new FormData(form)
    const now = currentTimestamp()
    const record: AnimalRecord = {
      id: crypto.randomUUID(), enterprise, subject: String(data.get('subject')).trim(), date: String(data.get('date')),
      output: output.name, unit: output.unit, gross: Number(data.get('gross')), rejected: Number(data.get('rejected')),
      feedKg: Number(data.get('feed')), notes: String(data.get('notes')).trim(), reviewStatus: 'recorded', createdAt: now, updatedAt: now,
    }
    const issue = validateAnimalRecord(record)
    if (issue) { setError(issue); return }
    setSaving(true); setError(''); setMessage('')
    try {
      await animalDb.records.add(record)
      setRecords(rows => [record, ...rows]); setMessage('Production record saved on this device. Live integration is pending.'); form.reset()
    } catch { setError('Could not save the record. Your entries are still here; please retry.') }
    finally { setSaving(false) }
  }
  async function updateReview(id: string, reviewStatus: ReviewStatus) {
    await animalDb.records.update(id, { reviewStatus, updatedAt: currentTimestamp() })
    setRecords(rows => rows.map(row => row.id === id ? { ...row, reviewStatus } : row))
    setMessage(reviewStatus === 'reviewed' ? 'Production record marked as reviewed.' : reviewStatus === 'needs-correction' ? 'Production record flagged for correction.' : 'Review status updated.')
  }
  async function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return
    const data = new FormData(event.currentTarget)
    const corrected: AnimalRecord = {
      ...editing, gross: Number(data.get('gross')), rejected: Number(data.get('rejected')), feedKg: Number(data.get('feed')),
      notes: String(data.get('notes')).trim(), reviewStatus: 'reviewed', updatedAt: currentTimestamp(),
    }
    const issue = validateAnimalRecord(corrected)
    if (issue) { setError(issue); return }
    await animalDb.records.put(corrected)
    setRecords(rows => rows.map(row => row.id === corrected.id ? corrected : row)); setEditing(null); setError(''); setMessage('Correction saved and the record marked as reviewed.')
  }
  const filtered = useMemo(() => records.filter(row => `${row.subject} ${row.output} ${row.notes} ${row.reviewStatus ?? 'recorded'}`.toLowerCase().includes(query.toLowerCase())), [records, query])
  const needsCorrection = records.filter(row => row.reviewStatus === 'needs-correction').length
  return <>
    <form className="form-panel" onSubmit={submit}>
      <div className="section-heading"><div><h2>Daily production record</h2><p>Capture accepted output, losses and feed against a managed animal, flock, pond or hive.</p></div>{needsCorrection ? <span className="review-alert">{needsCorrection} correction(s) required</span> : null}</div>
      <div className="form-grid">
        <label className="field-group">Animal tag / flock / pond / hive<input className="field" name="subject" required maxLength={120} placeholder={enterprise === 'livestock' ? 'Cow tag or herd name' : enterprise === 'poultry' ? 'Flock or house name' : 'Pond or hive name'} /></label>
        <label className="field-group">Date<input className="field" type="date" name="date" required defaultValue={farmToday()} /></label>
        <label className="field-group">Output<select className="field" value={outputIndex} onChange={event => setOutputIndex(Number(event.target.value))}>{outputs[enterprise].map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
        <label className="field-group">Gross quantity ({output.unit})<input className="field" type="number" name="gross" min="0" step="any" required /></label>
        <label className="field-group">Rejected / lost quantity ({output.unit})<input className="field" type="number" name="rejected" min="0" step="any" required defaultValue="0" /></label>
        <label className="field-group">Feed used (kg)<input className="field" type="number" name="feed" min="0" step="any" required defaultValue="0" /></label>
        <label className="field-group full">Notes / health concerns<textarea className="field" name="notes" /></label>
      </div>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="form-actions"><span>Offline-ready · Live synchronization pending</span><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save production record'}</button></div>
    </form>
    <section className="panel production-register">
      <div className="crop-toolbar"><div><h2>Production and review register</h2><span>{records.length} record(s)</span></div><input aria-label="Search production records" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tag, location, output or review" /></div>
      <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Animal / location</th><th>Output</th><th>Gross</th><th>Lost</th><th>Accepted</th><th>Feed</th><th>Notes</th><th>Review</th><th>Correction</th></tr></thead><tbody>{filtered.flatMap(row => {
        const main = <tr key={row.id}><td>{row.date}</td><td>{row.subject}</td><td>{row.output}</td><td>{row.gross} {row.unit}</td><td>{row.rejected} {row.unit}</td><td>{row.gross - row.rejected} {row.unit}</td><td>{row.feedKg} kg</td><td>{row.notes || '—'}</td><td><select aria-label={`Review ${row.subject} ${row.date}`} className={`review-select ${row.reviewStatus ?? 'recorded'}`} value={row.reviewStatus ?? 'recorded'} onChange={event => void updateReview(row.id, event.target.value as ReviewStatus)}><option value="recorded">Recorded</option><option value="reviewed">Reviewed</option><option value="needs-correction">Needs correction</option></select></td><td><button className="secondary-button compact-button" onClick={() => { setEditing(row); setError(''); setMessage('') }}>Correct</button></td></tr>
        if (editing?.id !== row.id) return [main]
        const correction = <tr className="correction-row" key={`${row.id}-correction`}><td colSpan={10}><form onSubmit={saveCorrection}><strong>Correct {row.subject} · {row.output} · {row.date}</strong><div className="correction-fields"><label>Gross<input name="gross" type="number" min="0" step="any" defaultValue={row.gross} /></label><label>Lost<input name="rejected" type="number" min="0" step="any" defaultValue={row.rejected} /></label><label>Feed kg<input name="feed" type="number" min="0" step="any" defaultValue={row.feedKg} /></label><label>Notes<input name="notes" defaultValue={row.notes} /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button">Save correction</button></div></form></td></tr>
        return [main, correction]
      })}</tbody></table></div>
      {!filtered.length ? <p className="empty-register">{records.length ? 'No matching records.' : 'No production records yet. Record the first output above.'}</p> : null}
    </section>
  </>
}
