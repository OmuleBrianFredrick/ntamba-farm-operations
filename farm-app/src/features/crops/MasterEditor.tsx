import { useEffect, useState, type FormEvent } from 'react'
import { loadSeasons, loadVarieties, loadFields, masterDb, type Field, type Season, type Variety } from './masterStore'
import { cropIds } from './cropData'

const labels: Record<string, string> = {
  name: 'Name', code: 'Season code', startsOn: 'Start date', endsOn: 'End date', status: 'Status', rainfall: 'Expected rainfall (mm)',
  enterpriseId: 'Crop enterprise', area: 'Area', unit: 'Unit', crop: 'Crop', variety: 'Variety', category: 'Category', maturity: 'Maturity (days)',
}

const enterpriseOptions = [
  [cropIds.bananaEnterprise, 'Banana enterprise'], [cropIds.coffeeEnterprise, 'Coffee enterprise'],
  [cropIds.seasonalEnterprise, 'Seasonal crops'], [cropIds.gardenEnterprise, 'Garden crops'],
] as const

function displayValue(field: string, value: string) {
  if (field === 'enterpriseId') return enterpriseOptions.find(([id]) => id === value)?.[1] ?? value
  if (field === 'rainfall' && value && !value.includes('mm')) return `${value} mm`
  if (field === 'maturity' && value && !value.includes('day')) return `${value} days`
  return value
}

export function MasterEditor({ kind }: { kind: 'seasons' | 'varieties' | 'fields' }) {
  const [rows, setRows] = useState<Array<Season | Variety | Field>>([])
  const [editing, setEditing] = useState<Season | Variety | Field | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { let active = true; void (kind === 'seasons' ? loadSeasons() : kind === 'fields' ? loadFields() : loadVarieties()).then(data => { if (active) setRows(data) }).catch(() => setMessage('Could not load records.')); return () => { active = false } }, [kind])
  const fields = kind === 'seasons' ? ['name', 'code', 'startsOn', 'endsOn', 'status', 'rainfall'] : kind === 'fields' ? ['name', 'enterpriseId', 'area', 'unit'] : ['crop', 'variety', 'category', 'maturity', 'unit']
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return
    const data = new FormData(event.currentTarget)
    const row = Object.fromEntries(fields.map(field => [field, String(data.get(field)).trim()])) as Record<string, string>
    if (fields.some(field => !row[field])) { setMessage('Complete every field.'); return }
    if (kind === 'seasons' && row.endsOn < row.startsOn) { setMessage('End date must not precede start date.'); return }
    const duplicate = rows.some(item => item.id !== editing?.id && (kind === 'seasons' ? (item as Season).code.toLowerCase() === row.code.toLowerCase() : kind === 'fields' ? (item as Field).name.toLowerCase() === row.name.toLowerCase() : `${(item as Variety).crop}|${(item as Variety).variety}`.toLowerCase() === `${row.crop}|${row.variety}`.toLowerCase()))
    if (duplicate) { setMessage(`A ${kind === 'seasons' ? 'season code' : kind === 'fields' ? 'field or block' : 'crop variety'} with these details already exists.`); return }
    if (kind === 'seasons') row.dates = `${row.startsOn} – ${row.endsOn}`
    row.id = editing?.id || crypto.randomUUID()
    setSaving(true)
    try {
      if (kind === 'seasons') await masterDb.seasons.put(row as Season)
      else if (kind === 'fields') await masterDb.fields.put(row as Field)
      else await masterDb.varieties.put(row as Variety)
      setRows(await (kind === 'seasons' ? loadSeasons() : kind === 'fields' ? loadFields() : loadVarieties())); setEditing(null); setMessage('Saved on this device. Live master-data integration is pending.')
    } catch { setMessage('Save failed. Your entries have been preserved.') }
    finally { setSaving(false) }
  }
  function editorField(field: string) {
    const value = (editing as unknown as Record<string, string>)[field] ?? ''
    const options = field === 'enterpriseId' ? enterpriseOptions : field === 'status' ? [['Active', 'Active'], ['Planning', 'Planning'], ['Closed', 'Closed']] : field === 'category' ? [['Perennial', 'Perennial'], ['Seasonal', 'Seasonal'], ['Garden', 'Garden']] : field === 'unit' ? kind === 'fields' ? [['acres', 'acres'], ['hectares', 'hectares']] : [['kg', 'kg'], ['tonnes', 'tonnes']] : null
    if (options) return <select className="field" name={field} required defaultValue={value}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select>
    return <input className="field" name={field} required type={field.endsWith('On') ? 'date' : ['area', 'rainfall', 'maturity'].includes(field) ? 'number' : 'text'} min={field === 'rainfall' ? 0 : 0.001} step="any" defaultValue={['rainfall', 'maturity'].includes(field) ? Number.parseFloat(value) || '' : value} />
  }
  return <section className="panel"><div className="crop-toolbar"><h2>{kind === 'fields' ? 'Fields and blocks' : kind === 'seasons' ? 'Seasons' : 'Crop varieties'}</h2><button className="primary-button" onClick={() => setEditing({ id: '' } as Variety)}>Add {kind === 'fields' ? 'field' : kind === 'seasons' ? 'season' : 'variety'}</button></div>
    {editing && <form key={editing.id} className="form-panel" onSubmit={save}><div className="form-grid">{fields.map(field => <label className="field-group" key={field}>{labels[field]}{editorField(field)}</label>)}</div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form>}
    {message && <p role="status" style={{ padding: 16 }}>{message}</p>}
    <div className="table-scroll"><table className="crop-table"><thead><tr>{fields.map(field => <th key={field}>{labels[field]}</th>)}<th>Edit</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{fields.map(field => <td key={field}>{displayValue(field, (row as unknown as Record<string, string>)[field])}</td>)}<td><button className="secondary-button" onClick={() => setEditing(row)}>Edit</button></td></tr>)}</tbody></table></div>
  </section>
}
