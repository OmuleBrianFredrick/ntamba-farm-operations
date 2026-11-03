import { useEffect, useState } from 'react'
import { offlineDb, type StoredPlantingSession } from '../../lib/offlineDb'
export function LifecycleEditor() {
  const [rows, setRows] = useState<StoredPlantingSession[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => { void offlineDb.plantingSessions.toArray().then(setRows) }, [])
  async function update(id: string, status: StoredPlantingSession['status']) {
    try {
      await offlineDb.transaction('rw', offlineDb.plantingSessions, offlineDb.syncQueue, async () => {
        const queued = await offlineDb.syncQueue.get(id)
        if (!queued || queued.recordType !== 'planting-session' || queued.status === 'syncing') throw new Error('This record cannot be updated locally right now.')
        await offlineDb.syncQueue.put({ ...queued, payload: { ...queued.payload, planting: { ...queued.payload.planting, status } }, status: 'queued', updatedAt: new Date().toISOString() })
        await offlineDb.plantingSessions.update(id, { status, syncStatus: 'queued', updatedAt: new Date().toISOString() })
      })
      setRows(await offlineDb.plantingSessions.toArray()); setMessage('Planting stage saved.'); window.dispatchEvent(new CustomEvent('farm-sync-change'))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save stage.') }
  }
  return <section className="form-panel"><h2>Update planting stage</h2><p>Applies to plantings recorded on this device. Sample plantings are read-only.</p>{rows.map(row => <label className="field-group" key={row.id}>{row.crop} · {row.block} · {row.plantedOn}<select className="field" value={row.status} onChange={event => void update(row.id, event.target.value as StoredPlantingSession['status'])}>{['planned', 'planted', 'growing', 'harvesting', 'closed', 'failed'].map(status => <option key={status}>{status}</option>)}</select></label>)}{!rows.length && <p>Record a planting to manage its lifecycle.</p>}{message && <p role="status">{message}</p>}</section>
}
