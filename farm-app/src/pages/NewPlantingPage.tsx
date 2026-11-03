import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cropIds, varieties as initialVarieties } from '../features/crops/cropData'
import { loadVarieties, loadSeasons, loadFields, type Field, type Season } from '../features/crops/masterStore'
import { expectedHarvestDate } from '../features/crops/cropMath'
import { queuePlantingSession, type PlantingSessionSyncPayload } from '../lib/offlineDb'
import { flushSyncQueue } from '../lib/syncEngine'

type InputRow = { id: string; name: string; quantity: number; unit: string }

function farmToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date())
}

const cropOptions = [
  { varietyId: cropIds.bananaVariety, enterpriseId: cropIds.bananaEnterprise, areaId: cropIds.blockB4, block: 'Block B4', days: 365 },
  { varietyId: cropIds.maizeVariety, enterpriseId: cropIds.seasonalEnterprise, areaId: cropIds.northField, block: 'North Field', days: 120 },
  { varietyId: cropIds.tomatoVariety, enterpriseId: cropIds.gardenEnterprise, areaId: cropIds.gardenG2, block: 'Garden G2', days: 85 },
  { varietyId: cropIds.coffeeVariety, enterpriseId: cropIds.coffeeEnterprise, areaId: cropIds.coffeeC1, block: 'Coffee C1', days: 900 },
]

export function NewPlantingPage() {
  const navigate = useNavigate()
  const [varieties, setVarieties] = useState(initialVarieties)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState(cropIds.currentSeason)
  const [fields, setFields] = useState<Field[]>([])
  const [fieldId, setFieldId] = useState('')
  useEffect(() => { void loadFields().then(setFields) }, [])
  useEffect(() => { void loadVarieties().then(setVarieties); void loadSeasons().then(setSeasons) }, [])
  const [varietyId, setVarietyId] = useState(cropIds.maizeVariety)
  const [plantedOn, setPlantedOn] = useState(farmToday)
  const [area, setArea] = useState(2)
  const [method, setMethod] = useState('Row planting')
  const [seedQuantity, setSeedQuantity] = useState(25)
  const [notes, setNotes] = useState('')
  const [inputs, setInputs] = useState<InputRow[]>([{ id: crypto.randomUUID(), name: 'DAP fertilizer', quantity: 50, unit: 'kg' }])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const selected = varieties.find((item) => item.id === varietyId) ?? varieties[0]
  const defaultContext = cropOptions.find((item) => item.varietyId === varietyId) ?? cropOptions[selected.category === 'Garden' ? 2 : selected.category === 'Seasonal' ? 1 : selected.crop === 'Coffee' ? 3 : 0]
  const field = fields.find(item => item.id === fieldId)
  const context = field ? { ...defaultContext, enterpriseId: field.enterpriseId, areaId: field.id, block: field.name } : defaultContext
  const expected = expectedHarvestDate(plantedOn, Number.parseInt(selected.maturity, 10) || context.days)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!plantedOn || area <= 0 || seedQuantity <= 0) return setError('Enter a valid planting date, area and seed quantity.')
    setSubmitting(true)
    setError('')
    const id = crypto.randomUUID()
    const payload: PlantingSessionSyncPayload = {
      planting: {
        id, client_record_id: id, organization_id: cropIds.organization, farm_id: cropIds.farm,
        enterprise_id: context.enterpriseId, work_area_id: context.areaId, crop_variety_id: varietyId,
        season_id: seasonId, planted_on: plantedOn, area_value: area, area_unit: 'acres',
        planting_method: method, seed_quantity: seedQuantity, seed_unit: 'kg',
        expected_harvest_start: expected, expected_harvest_end: expected,
        status: 'planted', notes: notes.trim() || null,
      },
      inputs: inputs.filter((item) => item.name.trim() && item.quantity > 0).map((item) => ({ id: item.id, planting_session_id: id, input_name: item.name.trim(), quantity: item.quantity, unit: item.unit })),
    }
    await queuePlantingSession(payload, {
      id, crop: selected.crop, variety: selected.variety, block: context.block,
      season: seasons.find(item => item.id === seasonId)?.name ?? 'Unspecified', plantedOn, area, areaUnit: 'acres',
      expectedHarvest: expected,
      status: 'planted',
    })
    await flushSyncQueue()
    setSubmitting(false)
    setComplete(true)
  }

  if (complete) return <div className="page workflow-page"><div className="form-success planting-success"><CheckCircle2 /><h2>Planting session recorded</h2><p>{selected.crop} in {context.block} is stored safely and ready for field observations and activity records.</p><div className="success-actions"><button className="secondary-button" onClick={() => navigate('/crops?view=plantings')}>View plantings</button><button className="primary-button" onClick={() => navigate('/daily-work')}>Record field activity</button></div></div></div>

  return <div className="page planting-form-page">
    <div className="page-heading"><div className="workflow-title"><button className="back-button" onClick={() => navigate('/crops')} aria-label="Back to crops"><ArrowLeft /></button><div><h1>New planting session</h1><p>Record what was planted, where, when and the inputs used.</p></div></div></div>
    <form onSubmit={submit}>
      <label className="field-group">Field / block<select className="field" value={fieldId} onChange={event => setFieldId(event.target.value)}><option value="">Default crop block</option>{fields.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field-group">Season<select className="field" value={seasonId} onChange={event => setSeasonId(event.target.value)}>{seasons.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <section className="form-panel planting-section"><div className="section-number">1</div><div className="section-content"><h2>Crop and location</h2><div className="form-grid three-column"><PlantingSelect label="Crop variety" value={varietyId} onChange={setVarietyId} options={varieties.map((item) => ({ value: item.id, label: `${item.crop} — ${item.variety}` }))} /><ReadOnly label="Enterprise" value={selected.category === 'Garden' ? 'Garden Crops' : selected.category === 'Seasonal' ? 'Seasonal Crops' : `${selected.crop} Enterprise`} /><ReadOnly label="Field or block" value={context.block} /></div></div></section>
      <section className="form-panel planting-section"><div className="section-number">2</div><div className="section-content"><h2>Planting details</h2><div className="form-grid three-column"><PlantingField label="Planting date" type="date" value={plantedOn} onChange={setPlantedOn} /><PlantingField label="Area planted (acres)" type="number" value={area} onChange={(value) => setArea(Number(value))} /><PlantingSelect label="Planting method" value={method} onChange={setMethod} options={['Row planting', 'Direct seeding', 'Transplanting', 'Broadcasting'].map((value) => ({ value, label: value }))} /><PlantingField label="Seed or planting material" type="number" value={seedQuantity} onChange={(value) => setSeedQuantity(Number(value))} /><ReadOnly label="Seed unit" value="kg" /><ReadOnly label="Expected harvest" value={expected ? new Date(`${expected}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} /></div></div></section>
      <section className="form-panel planting-section"><div className="section-number">3</div><div className="section-content"><div className="section-heading"><h2>Inputs applied</h2><button type="button" className="text-link" onClick={() => setInputs((items) => [...items, { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'kg' }])}><Plus size={15} /> Add input</button></div><div className="input-lines">{inputs.map((item) => <div className="planting-input-row" key={item.id}><input aria-label="Input name" value={item.name} placeholder="Input name" onChange={(event) => setInputs((items) => items.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry))} /><input aria-label="Input quantity" type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => setInputs((items) => items.map((entry) => entry.id === item.id ? { ...entry, quantity: Number(event.target.value) } : entry))} /><select aria-label="Input unit" value={item.unit} onChange={(event) => setInputs((items) => items.map((entry) => entry.id === item.id ? { ...entry, unit: event.target.value } : entry))}><option>kg</option><option>L</option><option>units</option><option>bags</option></select><button type="button" className="icon-button" aria-label="Remove input" onClick={() => setInputs((items) => items.filter((entry) => entry.id !== item.id))}><Trash2 /></button></div>)}</div><label className="notes-field">Notes <span>(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Planting conditions, spacing or other useful details" /></label></div></section>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions planting-actions"><span className="saved-note">Offline-ready · The record will synchronize automatically.</span><div className="action-buttons"><button type="button" className="secondary-button" onClick={() => navigate('/crops')}>Cancel</button><button className="primary-button" disabled={submitting}>{submitting ? 'Saving…' : 'Record planting'}</button></div></div>
    </form>
  </div>
}

function PlantingField({ label, type, value, onChange }: { label: string; type: string; value: string | number; onChange: (value: string) => void }) { return <label className="field-group">{label}<input className="field" required type={type} min={type === 'number' ? '0.001' : undefined} step={type === 'number' ? '0.001' : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function PlantingSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <label className="field-group">{label}<select className="field" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div className="field-group"><span className="field-label">{label}</span><div className="read-only-field">{value}</div></div> }
