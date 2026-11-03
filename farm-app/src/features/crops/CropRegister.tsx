import { useEffect, useState } from 'react'
import { offlineDb, type StoredCropRecord, type HarvestBatchSyncPayload } from '../../lib/offlineDb'
export function CropRegister() {
  const [rows, setRows] = useState<StoredCropRecord[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [harvests, setHarvests] = useState<HarvestBatchSyncPayload['harvest'][]>([])
  useEffect(() => { void offlineDb.syncQueue.toArray().then(items => setHarvests(items.flatMap(item => item.recordType === 'harvest-batch' ? [item.payload.harvest] : []))) }, [])
  useEffect(() => { void offlineDb.cropRecords.orderBy('recordDate').reverse().toArray().then(setRows).catch(() => setError('Could not load crop records.')) }, [])
  const filtered = rows.filter(row => `${row.crop} ${row.block} ${row.summary} ${row.recordType}`.toLowerCase().includes(query.toLowerCase()))
  const visibleHarvests = harvests.filter(item => filtered.some(row => row.id === item.id))
  return <section className="panel"><div className="crop-toolbar"><h2>Observations and harvests</h2><input aria-label="Search crop records" placeholder="Search crop, block or observation" value={query} onChange={event => setQuery(event.target.value)} /></div>{error && <p role="alert">{error}</p>}<div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Type</th><th>Crop</th><th>Block</th><th>Record</th><th>Follow-up</th><th>Sync</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.recordDate}</td><td>{row.recordType}</td><td>{row.crop}</td><td>{row.block}</td><td>{row.summary}</td><td>{row.actionRequired ? 'Required' : 'None flagged'}</td><td>{row.syncStatus}</td></tr>)}</tbody></table></div>{!filtered.length && <p style={{ padding: 16 }}>No matching crop records.</p>}
  <h2 style={{ padding: 16 }}>Harvest quantities</h2><div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Gross</th><th>Rejected</th><th>Accepted</th><th>Grade</th><th>Destination</th></tr></thead><tbody>{visibleHarvests.map(item => <tr key={item.id}><td>{item.harvested_on}</td><td>{item.gross_quantity} {item.unit}</td><td>{item.rejected_quantity} {item.unit}</td><td>{item.gross_quantity - item.rejected_quantity} {item.unit}</td><td>{item.grade}</td><td>{item.destination}</td></tr>)}</tbody></table></div>
  </section>
}
