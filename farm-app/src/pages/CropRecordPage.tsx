import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cropIds, seededPlantings } from '../features/crops/cropData'
import { offlineDb, queueCropRecord, type CropObservationSyncPayload, type HarvestBatchSyncPayload, type StoredPlantingSession } from '../lib/offlineDb'
import { flushSyncQueue } from '../lib/syncEngine'

function farmToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
}

export function CropRecordPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode = params.get('type') === 'harvest' ? 'harvest' : 'observation'
  const [plantings, setPlantings] = useState<StoredPlantingSession[]>(seededPlantings)
  const [plantingId, setPlantingId] = useState(seededPlantings[0].id)
  const [recordDate, setRecordDate] = useState(farmToday)
  const [kind, setKind] = useState<CropObservationSyncPayload['observation']['kind']>('routine')
  const [growthStage, setGrowthStage] = useState('Vegetative growth')
  const [summary, setSummary] = useState('')
  const [actionRequired, setActionRequired] = useState(false)
  const [actionNotes, setActionNotes] = useState('')
  const [gross, setGross] = useState(250)
  const [rejected, setRejected] = useState(5)
  const [grade, setGrade] = useState('Grade A')
  const [destination, setDestination] = useState('Farm store')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void offlineDb.plantingSessions.toArray().then((local) => {
      if (!active || local.length === 0) return
      setPlantings([...local, ...seededPlantings])
      setPlantingId(local[0].id)
    })
    return () => { active = false }
  }, [])

  const planting = plantings.find((item) => item.id === plantingId) ?? plantings[0]
  const net = Math.max(0, gross - rejected)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'observation' && !summary.trim()) return setError('Add a clear field observation summary.')
    if (mode === 'harvest' && (gross <= 0 || rejected < 0 || rejected > gross)) return setError('Harvest quantities are not valid.')
    setSaving(true)
    setError('')
    const id = crypto.randomUUID()
    if (mode === 'observation') {
      const payload: CropObservationSyncPayload = { observation: {
        id, client_record_id: id, organization_id: cropIds.organization, planting_session_id: plantingId,
        observed_on: recordDate, kind, growth_stage: growthStage.trim() || null, summary: summary.trim(),
        action_required: actionRequired, action_notes: actionRequired && actionNotes.trim() ? actionNotes.trim() : null,
      } }
      await queueCropRecord('crop-observation', payload, { id, recordType: 'observation', crop: planting.crop, block: planting.block, recordDate, summary: summary.trim(), actionRequired })
    } else {
      const payload: HarvestBatchSyncPayload = { harvest: {
        id, client_record_id: id, organization_id: cropIds.organization, planting_session_id: plantingId,
        harvested_on: recordDate, grade: grade.trim() || null, gross_quantity: gross,
        rejected_quantity: rejected, unit: 'kg', destination: destination.trim() || null,
      } }
      await queueCropRecord('harvest-batch', payload, { id, recordType: 'harvest', crop: planting.crop, block: planting.block, recordDate, summary: `${net.toLocaleString()} kg accepted`, actionRequired: false })
    }
    await flushSyncQueue()
    setSaving(false)
    setComplete(true)
  }

  if (complete) return <div className="page workflow-page"><div className="form-success planting-success"><CheckCircle2 /><h2>{mode === 'harvest' ? 'Harvest batch recorded' : 'Field observation recorded'}</h2><p>The crop record is stored safely and linked to {planting.crop} in {planting.block}.</p><button className="primary-button" style={{ marginTop: 20 }} onClick={() => navigate('/crops')}>Return to crops</button></div></div>

  return <div className="page crop-record-page">
    <div className="page-heading"><div className="workflow-title"><button className="back-button" onClick={() => navigate('/crops')} aria-label="Back to crops"><ArrowLeft /></button><div><h1>Record crop update</h1><p>Capture field conditions or a harvest output against a planting.</p></div></div></div>
    <div className="record-mode" role="tablist"><button className={mode === 'observation' ? 'active' : ''} onClick={() => setParams({ type: 'observation' })}>Field observation</button><button className={mode === 'harvest' ? 'active' : ''} onClick={() => setParams({ type: 'harvest' })}>Harvest batch</button></div>
    <form onSubmit={submit} className="form-panel crop-record-form">
      <div className="form-grid three-column">
        <label className="field-group">Planting session<select className="field" value={plantingId} onChange={(event) => setPlantingId(event.target.value)}>{plantings.map((item) => <option key={item.id} value={item.id}>{item.crop} · {item.block} · {item.variety}</option>)}</select></label>
        <label className="field-group">Record date<input className="field" type="date" value={recordDate} onChange={(event) => setRecordDate(event.target.value)} /></label>
        <div className="field-group"><span className="field-label">Season</span><div className="read-only-field">{planting.season}</div></div>
      </div>

      {mode === 'observation' ? <div className="record-fields">
        <div className="form-grid"><label className="field-group">Observation type<select className="field" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="routine">Routine check</option><option value="growth">Growth</option><option value="pest">Pest</option><option value="disease">Disease</option><option value="weather">Weather</option><option value="irrigation">Irrigation</option><option value="damage">Damage</option></select></label><label className="field-group">Growth stage<input className="field" value={growthStage} onChange={(event) => setGrowthStage(event.target.value)} /></label></div>
        <label className="notes-field">What did you observe?<textarea required value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe the crop condition, coverage and anything unusual" /></label>
        <label className="check-row"><input type="checkbox" checked={actionRequired} onChange={(event) => setActionRequired(event.target.checked)} /><span><strong>Follow-up action required</strong><small>Flag this observation for the supervisor.</small></span></label>
        {actionRequired && <label className="notes-field">Required action<textarea value={actionNotes} onChange={(event) => setActionNotes(event.target.value)} placeholder="What should be done, by whom and when?" /></label>}
      </div> : <div className="record-fields">
        <div className="form-grid three-column"><label className="field-group">Gross quantity (kg)<input className="field" type="number" min="0.001" step="0.001" value={gross} onChange={(event) => setGross(Number(event.target.value))} /></label><label className="field-group">Rejected quantity (kg)<input className="field" type="number" min="0" step="0.001" value={rejected} onChange={(event) => setRejected(Number(event.target.value))} /></label><label className="field-group">Grade<input className="field" value={grade} onChange={(event) => setGrade(event.target.value)} /></label><label className="field-group">Destination<input className="field" value={destination} onChange={(event) => setDestination(event.target.value)} /></label></div>
        <div className="harvest-total"><span>Accepted harvest</span><strong>{net.toLocaleString()} kg</strong><small>{gross.toLocaleString()} kg gross − {rejected.toLocaleString()} kg rejected</small></div>
      </div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="record-actions"><span>Offline-ready · Linked to the selected planting session.</span><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : mode === 'harvest' ? 'Record harvest' : 'Save observation'}</button></div>
    </form>
  </div>
}
