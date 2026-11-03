import { offlineDb, type SyncQueueRecord } from './offlineDb'
import { supabase } from './supabase'

let flushing = false

async function uploadDailyWork(record: Extract<SyncQueueRecord, { recordType: 'daily-work' }>) {
  if (!supabase) throw new Error('Waiting for Supabase configuration')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in is required before synchronization')

  const activity = { ...record.payload.activity, submitted_by: auth.user.id }
  const parent = await supabase.from('work_activities').upsert(activity, { onConflict: 'id' })
  if (parent.error) throw parent.error

  if (record.payload.workers.length) {
    const workerResult = await supabase.from('work_activity_workers').upsert(record.payload.workers, { onConflict: 'id' })
    if (workerResult.error) throw workerResult.error
  }
  if (record.payload.inputs.length) {
    const inputResult = await supabase.from('input_usage').upsert(record.payload.inputs, { onConflict: 'id' })
    if (inputResult.error) throw inputResult.error
  }
}

async function uploadPlantingSession(record: Extract<SyncQueueRecord, { recordType: 'planting-session' }>) {
  if (!supabase) throw new Error('Waiting for Supabase configuration')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in is required before synchronization')

  const planting = { ...record.payload.planting, created_by: auth.user.id }
  const parent = await supabase.from('planting_sessions').upsert(planting, { onConflict: 'id' })
  if (parent.error) throw parent.error
  if (record.payload.inputs.length) {
    const inputs = await supabase.from('planting_session_inputs').upsert(record.payload.inputs, { onConflict: 'id' })
    if (inputs.error) throw inputs.error
  }
}

async function uploadCropObservation(record: Extract<SyncQueueRecord, { recordType: 'crop-observation' }>) {
  if (!supabase) throw new Error('Waiting for Supabase configuration')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in is required before synchronization')
  const result = await supabase.from('crop_observations').upsert({ ...record.payload.observation, observed_by: auth.user.id }, { onConflict: 'id' })
  if (result.error) throw result.error
}

async function uploadHarvestBatch(record: Extract<SyncQueueRecord, { recordType: 'harvest-batch' }>) {
  if (!supabase) throw new Error('Waiting for Supabase configuration')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in is required before synchronization')
  const result = await supabase.from('harvest_batches').upsert({ ...record.payload.harvest, recorded_by: auth.user.id }, { onConflict: 'id' })
  if (result.error) throw result.error
}

export async function flushSyncQueue() {
  if (flushing || !navigator.onLine || !supabase) return
  flushing = true
  try {
    const records = await offlineDb.syncQueue.where('status').anyOf('queued', 'needs-attention').toArray()
    for (const record of records) {
      await offlineDb.syncQueue.update(record.id, { status: 'syncing', updatedAt: new Date().toISOString() })
      window.dispatchEvent(new CustomEvent('farm-sync-change'))
      try {
        if (record.recordType === 'daily-work') await uploadDailyWork(record)
        else if (record.recordType === 'planting-session') await uploadPlantingSession(record)
        else if (record.recordType === 'crop-observation') await uploadCropObservation(record)
        else await uploadHarvestBatch(record)
        await offlineDb.syncQueue.update(record.id, { status: 'synced', lastError: undefined, updatedAt: new Date().toISOString() })
        if (record.recordType === 'planting-session') {
          await offlineDb.plantingSessions.update(record.payload.planting.id, { syncStatus: 'synced', updatedAt: new Date().toISOString() })
        }
        if (record.recordType === 'crop-observation' || record.recordType === 'harvest-batch') {
          await offlineDb.cropRecords.update(record.id, { syncStatus: 'synced', updatedAt: new Date().toISOString() })
        }
      } catch (error) {
        await offlineDb.syncQueue.update(record.id, {
          status: 'needs-attention', attempts: record.attempts + 1,
          lastError: error instanceof Error ? error.message : 'Synchronization failed',
          updatedAt: new Date().toISOString(),
        })
        if (record.recordType === 'planting-session') {
          await offlineDb.plantingSessions.update(record.payload.planting.id, { syncStatus: 'needs-attention', updatedAt: new Date().toISOString() })
        }
        if (record.recordType === 'crop-observation' || record.recordType === 'harvest-batch') {
          await offlineDb.cropRecords.update(record.id, { syncStatus: 'needs-attention', updatedAt: new Date().toISOString() })
        }
      }
      window.dispatchEvent(new CustomEvent('farm-sync-change'))
    }
  } finally {
    flushing = false
  }
}
