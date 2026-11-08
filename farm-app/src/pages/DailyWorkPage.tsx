import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ImagePlus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { queueDailyWork, saveDailyWorkDraft, type DailyWorkSyncPayload } from '../lib/offlineDb'
import { flushSyncQueue } from '../lib/syncEngine'
import { acceptedOutput } from '../lib/farmMath'

const initialWorkers = [
  { id: '70000000-0000-4000-8000-000000000001', name: 'Amina K.', pay: 'Daily wage' },
  { id: '70000000-0000-4000-8000-000000000002', name: 'Peter M.', pay: 'Task rate' },
  { id: '70000000-0000-4000-8000-000000000003', name: 'John O.', pay: 'Monthly salary' },
]

const demoIds = {
  organization: '10000000-0000-4000-8000-000000000001',
  farm: '20000000-0000-4000-8000-000000000001',
  enterprise: '30000000-0000-4000-8000-000000000001',
  workArea: '40000000-0000-4000-8000-000000000001',
}

export function DailyWorkPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(2)
  const [workers, setWorkers] = useState(initialWorkers)
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(() => Object.fromEntries(initialWorkers.map((worker) => [worker.id, 'present'])))
  const [workerQuery, setWorkerQuery] = useState('')
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [photoName, setPhotoName] = useState('')
  const [harvested, setHarvested] = useState(1240)
  const [rejected, setRejected] = useState(35)
  const [saved, setSaved] = useState('Saved on this phone')
  const accepted = useMemo(() => acceptedOutput(harvested, rejected), [harvested, rejected])

  const save = async () => {
    await saveDailyWorkDraft(step, { harvested, rejected, accepted, workers: workers.map((worker) => ({ ...worker, attendance: attendance[worker.id] })) })
    setSaved(`Saved on this phone at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  const submit = async () => {
    const activityId = crypto.randomUUID()
    const payload: DailyWorkSyncPayload = {
      activity: {
        id: activityId, client_record_id: activityId,
        organization_id: demoIds.organization, farm_id: demoIds.farm,
        enterprise_id: demoIds.enterprise, work_area_id: demoIds.workArea,
        record_date: '2026-11-01', activity_type: 'Harvesting', status: 'submitted',
        output_quantity: harvested, rejected_quantity: rejected, output_unit: 'kg',
        submitted_at: new Date().toISOString(),
      },
      workers: workers.filter((worker) => attendance[worker.id] === 'present').map((worker) => ({
        id: crypto.randomUUID(), activity_id: activityId, worker_id: worker.id, attendance_status: 'present' as const,
      })),
      inputs: [{
        id: crypto.randomUUID(), activity_id: activityId,
        input_name: 'Harvest crates', quantity: 80, unit: 'units',
      }],
    }
    await queueDailyWork(payload)
    await flushSyncQueue()
    setStep(4)
  }

  if (step === 4) return <Success onDone={() => navigate('/')} />

  return (
    <div className="page workflow-page">
      <div className="page-heading">
        <div className="workflow-title"><button className="back-button" onClick={() => step > 2 ? setStep(step - 1) : navigate('/')} aria-label="Go back"><ArrowLeft /></button><h1>Daily work &amp; output</h1></div>
      </div>
      <div className="stepper">
        {['Details', 'Workers', 'Output', 'Review'].map((label, index) => { const number = index + 1; return <div key={label} className={`step${number < step ? ' done' : ''}${number === step ? ' active' : ''}`}><div className="step-dot">{number}</div>{label}</div> })}
      </div>
      <div className="context-band">
        <Context label="Crop" value="Banana" /><Context label="Block" value="Block B4" /><Context label="Activity" value="Harvesting" /><Context label="Date" value="1 Nov 2026" />
      </div>

      {step === 2 ? (
        <section className="form-panel">
          <h2>Who worked on this activity?</h2>
          <input className="worker-search" placeholder="Search workers by name" aria-label="Search workers" value={workerQuery} onChange={(event) => setWorkerQuery(event.target.value)} />
          <div className="worker-list">
            {workers.filter((worker) => worker.name.toLowerCase().includes(workerQuery.toLowerCase())).map((worker) => <div className="worker-row" key={worker.id}><div className="worker-copy"><strong>{worker.name}</strong><span>{worker.pay}</span></div><button type="button" className="attendance" onClick={() => setAttendance((current) => ({ ...current, [worker.id]: current[worker.id] === 'present' ? 'absent' : 'present' }))}>{attendance[worker.id] === 'present' ? 'Present' : 'Absent'}⌄</button></div>)}
          </div>
          <button type="button" className="secondary-button wide-secondary" onClick={() => setShowAddWorker((value) => !value)}><Plus size={17} /> {showAddWorker ? 'Close worker form' : 'Add worker'}</button>
          {showAddWorker ? <form className="form-panel embedded-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name') ?? '').trim(); const pay = String(form.get('pay') ?? '').trim(); if (!name || !pay) return; const worker = { id: crypto.randomUUID(), name, pay }; setWorkers((current) => [...current, worker]); setAttendance((current) => ({ ...current, [worker.id]: 'present' })); event.currentTarget.reset(); setShowAddWorker(false) }}><div className="form-grid"><label className="field-group"><span>Worker name</span><input className="field" name="name" required /></label><label className="field-group"><span>Pay basis</span><input className="field" name="pay" placeholder="Daily wage, task rate or salary" required /></label></div><div className="form-actions"><button className="primary-button">Add worker</button></div></form> : null}
        </section>
      ) : (
        <section className="form-panel">
          <h2>What was completed?</h2>
          <div className="form-grid">
            <Field label="Area worked (acres)" defaultValue="2.5" required />
            <Field label="Quantity harvested (kg)" value={harvested} onChange={setHarvested} required />
            <Field label="Rejected quantity (kg)" value={rejected} onChange={setRejected} required />
            <div className="field-group"><label>Inputs used</label><div className="input-row"><input className="field" defaultValue="Harvest crates" /><input className="field" defaultValue="80" /><input className="field" defaultValue="units" /></div></div>
            <div className="field-group full"><label>Work not completed or problems <span style={{ color: '#68756d', fontWeight: 400 }}>(optional)</span></label><textarea className="field" placeholder="Add details if needed" /></div>
            <label className="secondary-button field-group full" style={{ cursor: 'pointer' }}><ImagePlus size={17} /> {photoName || 'Add photo (optional)'}<input type="file" accept="image/*" capture="environment" hidden onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? '')} /></label>
          </div>
          <div className="calculated"><strong>Today&apos;s output: {accepted.toLocaleString()} kg accepted</strong><span>{harvested.toLocaleString()} kg harvested − {rejected.toLocaleString()} kg rejected</span></div>
          <div className="offline-note">Offline-ready — this record will sync automatically when a connection is available.</div>
        </section>
      )}

      <div className="form-actions">
        <span className="saved-note">{saved}</span>
        <div className="action-buttons"><button className="secondary-button" onClick={save}>Save draft</button><button className="primary-button" onClick={step === 2 ? async () => { await save(); setStep(3) } : submit}>{step === 2 ? 'Continue' : 'Submit record'}</button></div>
      </div>
    </div>
  )
}

function Context({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }

function Field({ label, defaultValue, value, onChange, required }: { label: string; defaultValue?: string; value?: number; onChange?: (value: number) => void; required?: boolean }) {
  return <div className="field-group"><label>{label} {required && <span className="required">*</span>}</label><input className="field" type={value === undefined ? 'text' : 'number'} defaultValue={defaultValue} value={value} onChange={onChange ? (event) => onChange(Number(event.target.value)) : undefined} /></div>
}

function Success({ onDone }: { onDone: () => void }) {
  return <div className="page workflow-page"><div className="form-success"><CheckCircle2 /><h2>Daily work record submitted</h2><p>It is safely stored and will synchronize automatically when the server is available.</p><button className="primary-button" style={{ marginTop: 20 }} onClick={onDone}>Return to overview</button></div></div>
}
