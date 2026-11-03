import Dexie, { type EntityTable } from 'dexie'

export type SyncStatus = 'draft' | 'queued' | 'syncing' | 'synced' | 'needs-attention'

export type DraftRecord = {
  id: string
  formType: 'daily-work'
  step: number
  payload: Record<string, unknown>
  updatedAt: string
  syncStatus: SyncStatus
}

export type DailyWorkSyncPayload = {
  activity: {
    id: string
    client_record_id: string
    organization_id: string
    farm_id: string
    enterprise_id: string
    work_area_id: string
    record_date: string
    activity_type: string
    status: 'submitted'
    output_quantity: number
    rejected_quantity: number
    output_unit: string
    submitted_at: string
  }
  workers: Array<{ id: string; activity_id: string; worker_id: string; attendance_status: 'present' }>
  inputs: Array<{ id: string; activity_id: string; input_name: string; quantity: number; unit: string }>
}

export type PlantingSessionSyncPayload = {
  planting: {
    id: string
    client_record_id: string
    organization_id: string
    farm_id: string
    enterprise_id: string
    work_area_id: string
    crop_variety_id: string
    season_id: string | null
    planted_on: string
    area_value: number
    area_unit: string
    planting_method: string
    seed_quantity: number | null
    seed_unit: string | null
    expected_harvest_start: string | null
    expected_harvest_end: string | null
    status: 'planned' | 'planted' | 'growing' | 'harvesting' | 'closed' | 'failed'
    notes: string | null
  }
  inputs: Array<{ id: string; planting_session_id: string; input_name: string; quantity: number; unit: string }>
}

export type CropObservationSyncPayload = {
  observation: {
    id: string
    client_record_id: string
    organization_id: string
    planting_session_id: string
    observed_on: string
    kind: 'routine' | 'growth' | 'pest' | 'disease' | 'weather' | 'irrigation' | 'damage'
    growth_stage: string | null
    summary: string
    action_required: boolean
    action_notes: string | null
  }
}

export type HarvestBatchSyncPayload = {
  harvest: {
    id: string
    client_record_id: string
    organization_id: string
    planting_session_id: string
    harvested_on: string
    grade: string | null
    gross_quantity: number
    rejected_quantity: number
    unit: string
    destination: string | null
  }
}

type SyncQueueBase = {
  id: string
  status: Exclude<SyncStatus, 'draft'>
  attempts: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type SyncQueueRecord = SyncQueueBase & (
  | { recordType: 'daily-work'; payload: DailyWorkSyncPayload }
  | { recordType: 'planting-session'; payload: PlantingSessionSyncPayload }
  | { recordType: 'crop-observation'; payload: CropObservationSyncPayload }
  | { recordType: 'harvest-batch'; payload: HarvestBatchSyncPayload }
)

export type StoredPlantingSession = {
  id: string
  crop: string
  variety: string
  block: string
  season: string
  plantedOn: string
  area: number
  areaUnit: string
  expectedHarvest: string
  status: 'planned' | 'planted' | 'growing' | 'harvesting' | 'closed' | 'failed'
  syncStatus: 'queued' | 'synced' | 'needs-attention'
  updatedAt: string
}

export type StoredCropRecord = {
  id: string
  recordType: 'observation' | 'harvest'
  crop: string
  block: string
  recordDate: string
  summary: string
  actionRequired: boolean
  syncStatus: 'queued' | 'synced' | 'needs-attention'
  updatedAt: string
}

class FarmDatabase extends Dexie {
  drafts!: EntityTable<DraftRecord, 'id'>
  syncQueue!: EntityTable<SyncQueueRecord, 'id'>
  plantingSessions!: EntityTable<StoredPlantingSession, 'id'>
  cropRecords!: EntityTable<StoredCropRecord, 'id'>

  constructor() {
    super('ntamba-farm-operations')
    this.version(1).stores({ drafts: 'id, formType, updatedAt, syncStatus' })
    this.version(2).stores({
      drafts: 'id, formType, updatedAt, syncStatus',
      syncQueue: 'id, recordType, status, createdAt, updatedAt',
    })
    this.version(3).stores({
      drafts: 'id, formType, updatedAt, syncStatus',
      syncQueue: 'id, recordType, status, createdAt, updatedAt',
      plantingSessions: 'id, crop, block, status, syncStatus, plantedOn, updatedAt',
    })
    this.version(4).stores({
      drafts: 'id, formType, updatedAt, syncStatus',
      syncQueue: 'id, recordType, status, createdAt, updatedAt',
      plantingSessions: 'id, crop, block, status, syncStatus, plantedOn, updatedAt',
      cropRecords: 'id, recordType, crop, block, recordDate, actionRequired, syncStatus, updatedAt',
    })
  }
}

export const offlineDb = new FarmDatabase()

export async function saveDailyWorkDraft(step: number, payload: Record<string, unknown>) {
  await offlineDb.drafts.put({
    id: 'daily-work-current', formType: 'daily-work', step, payload,
    updatedAt: new Date().toISOString(), syncStatus: 'draft',
  })
}

export async function queueDailyWork(payload: DailyWorkSyncPayload) {
  const now = new Date().toISOString()
  await offlineDb.transaction('rw', offlineDb.drafts, offlineDb.syncQueue, async () => {
    await offlineDb.syncQueue.put({
      id: payload.activity.client_record_id,
      recordType: 'daily-work', payload, status: 'queued', attempts: 0,
      createdAt: now, updatedAt: now,
    })
    await offlineDb.drafts.delete('daily-work-current')
  })
  window.dispatchEvent(new CustomEvent('farm-sync-change'))
}

export async function queuePlantingSession(payload: PlantingSessionSyncPayload, display: Omit<StoredPlantingSession, 'syncStatus' | 'updatedAt'>) {
  const now = new Date().toISOString()
  await offlineDb.transaction('rw', offlineDb.plantingSessions, offlineDb.syncQueue, async () => {
    await offlineDb.plantingSessions.put({ ...display, syncStatus: 'queued', updatedAt: now })
    await offlineDb.syncQueue.put({
      id: payload.planting.client_record_id,
      recordType: 'planting-session', payload, status: 'queued', attempts: 0,
      createdAt: now, updatedAt: now,
    })
  })
  window.dispatchEvent(new CustomEvent('farm-sync-change'))
}

export async function queueCropRecord(
  recordType: 'crop-observation' | 'harvest-batch',
  payload: CropObservationSyncPayload | HarvestBatchSyncPayload,
  display: Omit<StoredCropRecord, 'syncStatus' | 'updatedAt'>,
) {
  const id = recordType === 'crop-observation'
    ? (payload as CropObservationSyncPayload).observation.client_record_id
    : (payload as HarvestBatchSyncPayload).harvest.client_record_id
  const now = new Date().toISOString()
  const queueRecord: SyncQueueRecord = recordType === 'crop-observation'
    ? { id, recordType, payload: payload as CropObservationSyncPayload, status: 'queued', attempts: 0, createdAt: now, updatedAt: now }
    : { id, recordType, payload: payload as HarvestBatchSyncPayload, status: 'queued', attempts: 0, createdAt: now, updatedAt: now }
  await offlineDb.transaction('rw', offlineDb.cropRecords, offlineDb.syncQueue, async () => {
    await offlineDb.cropRecords.put({ ...display, syncStatus: 'queued', updatedAt: now })
    await offlineDb.syncQueue.put(queueRecord)
  })
  window.dispatchEvent(new CustomEvent('farm-sync-change'))
}
