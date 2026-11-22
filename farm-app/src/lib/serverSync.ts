import Dexie, { type DBCore, type DBCoreMutateRequest, type Middleware } from 'dexie'
import { animalDb } from '../features/animals/records'
import { masterDb } from '../features/crops/masterStore'
import { financeDb } from '../features/finance/financeStore'
import { inventoryDb } from '../features/inventory/inventoryStore'
import { phase6Db } from '../features/administration/phase6Store'
import { qhseDb } from '../features/qhse/qhseStore'
import { offlineDb, queueFarmSyncMutation, type FarmSyncQueueRecord } from './offlineDb'
import { supabase } from './supabase'
import type { FarmMembership } from '../auth/AuthContext'

type FarmSyncScope = Pick<FarmMembership, 'organizationId' | 'farmId'>
type ServerSyncRow = {
  id: string
  organization_id: string
  farm_id: string | null
  database_name: string
  table_name: string
  record_key: string
  operation: 'upsert' | 'delete'
  payload: Record<string, unknown> | null
  client_updated_at: string
  updated_by: string
}

const trackedDatabases = [animalDb, masterDb, inventoryDb, financeDb, qhseDb, phase6Db]
const trackedDatabaseNames = new Map(trackedDatabases.map((db) => [db.name, db]))
const installed = new Set<Dexie>()
let currentScope: FarmSyncScope | null = null
let currentUserId: string | null = null
let applyingRemote = false
let flushing = false
let generation = 0
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

function canonicalDatabaseName(db: Dexie) {
  return db.name
}

function recordKey(key: unknown) {
  if (typeof key === 'string' || typeof key === 'number') return String(key)
  throw new Error('Farm synchronization supports string and numeric record keys only.')
}

function recordTimestamp(value: unknown) {
  if (value && typeof value === 'object') {
    const candidate = (value as { updatedAt?: unknown; createdAt?: unknown }).updatedAt
      ?? (value as { createdAt?: unknown }).createdAt
    if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) return new Date(candidate).toISOString()
  }
  return new Date().toISOString()
}

function installMutationTracking(db: Dexie) {
  if (installed.has(db)) return
  installed.add(db)
  const databaseName = canonicalDatabaseName(db)
  const middleware: Middleware<DBCore> = {
    stack: 'dbcore',
    name: `farm-server-sync-${databaseName}`,
    create: (down) => ({
      ...down,
      table: (tableName) => {
        const base = down.table(tableName)
        return {
          ...base,
          mutate: async (request: DBCoreMutateRequest) => {
            const deletedRangeKeys = request.type === 'deleteRange'
              ? (await base.query({ trans: request.trans, query: { index: base.schema.primaryKey, range: request.range }, values: false })).result
              : []
            const response = await base.mutate(request)
            if (applyingRemote || !currentScope || response.numFailures === (request.type === 'add' || request.type === 'put' ? request.values.length : request.type === 'delete' ? request.keys.length : deletedRangeKeys.length)) return response

            const mutations: Array<{ operation: 'upsert' | 'delete'; key: unknown; payload: Record<string, unknown> | null }> = []
            if (request.type === 'add' || request.type === 'put') {
              request.values.forEach((value, index) => {
                if (response.failures[index]) return
                const key = request.keys?.[index] ?? base.schema.primaryKey.extractKey?.(value) ?? (value as { id?: unknown }).id
                mutations.push({ operation: 'upsert', key, payload: value as Record<string, unknown> })
              })
            } else if (request.type === 'delete') {
              request.keys.forEach((key) => mutations.push({ operation: 'delete', key, payload: null }))
            } else {
              deletedRangeKeys.forEach((key) => mutations.push({ operation: 'delete', key, payload: null }))
            }
            for (const mutation of mutations) {
              try {
                const key = recordKey(mutation.key)
                await queueFarmSyncMutation({
                  organizationId: currentScope.organizationId,
                  farmId: currentScope.farmId,
                  databaseName,
                  tableName,
                  recordKey: key,
                  operation: mutation.operation,
                  payload: mutation.payload,
                  clientUpdatedAt: recordTimestamp(mutation.payload),
                })
              } catch (error) {
                window.dispatchEvent(new CustomEvent('farm-sync-change', { detail: error instanceof Error ? error.message : 'Unable to queue synchronization.' }))
              }
            }
            return response
          },
        }
      },
    }),
  }
  db.use(middleware)
}

function syncErrorMessage(error: { message?: string } | null) {
  return error?.message || 'Synchronization failed.'
}

function isConflict(message: string) {
  return ['STALE_SYNC_RECORD', 'SYNC_TIMESTAMP_CONFLICT', 'SYNC_SCOPE_IMMUTABLE'].some((code) => message.includes(code))
}

async function applyRemote(row: ServerSyncRow) {
  const db = trackedDatabaseNames.get(row.database_name)
  if (!db || !db.tables.some((table) => table.name === row.table_name)) return
  const table = db.table(row.table_name)
  applyingRemote = true
  try {
    if (row.operation === 'delete') await table.delete(row.record_key)
    else if (row.payload) await table.put(row.payload)
  } finally {
    applyingRemote = false
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('farm-server-sync-updated'))
}

async function hydrate(scope: FarmSyncScope, token: number) {
  if (!supabase || token !== generation) return
  const query = supabase.from('farm_sync_records').select('id,organization_id,farm_id,database_name,table_name,record_key,operation,payload,client_updated_at,updated_by').eq('organization_id', scope.organizationId)
  const scoped = scope.farmId ? query.or(`farm_id.is.null,farm_id.eq.${scope.farmId}`) : query
  const { data, error } = await scoped
  if (error) throw error
  for (const row of (data ?? []) as ServerSyncRow[]) {
    if (token !== generation) return
    await applyRemote(row)
  }
}

export async function flushFarmSyncQueue() {
  if (flushing || !navigator.onLine || !supabase || !currentScope || !currentUserId) return
  flushing = true
  try {
    const records = await offlineDb.farmSyncQueue.where('status').anyOf('queued', 'needs-attention', 'conflict').toArray()
    for (const record of records) {
      await offlineDb.farmSyncQueue.update(record.id, { status: 'syncing', updatedAt: new Date().toISOString() })
      try {
        const row = {
          id: record.id,
          organization_id: record.organizationId,
          farm_id: record.farmId,
          database_name: record.databaseName,
          table_name: record.tableName,
          record_key: record.recordKey,
          operation: record.operation,
          payload: record.payload,
          client_updated_at: record.clientUpdatedAt,
          updated_by: currentUserId,
        }
        const { error } = await supabase.from('farm_sync_records').upsert(row, { onConflict: 'id' })
        if (error) throw error
        await offlineDb.farmSyncQueue.delete(record.id)
      } catch (error) {
        const message = syncErrorMessage(error as { message?: string })
        await offlineDb.farmSyncQueue.update(record.id, {
          status: isConflict(message) ? 'conflict' : 'needs-attention',
          attempts: record.attempts + 1,
          lastError: message,
          updatedAt: new Date().toISOString(),
        })
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('farm-sync-change'))
    }
  } finally {
    flushing = false
  }
}

export function startAuthenticatedFarmSync(scope: FarmSyncScope, userId: string) {
  generation += 1
  const token = generation
  currentScope = scope
  currentUserId = userId
  trackedDatabases.forEach(installMutationTracking)

  void (async () => {
    try {
      await Promise.all(trackedDatabases.map((db) => db.open()))
      await hydrate(scope, token)
      if (!supabase || token !== generation) return
      channel = supabase.channel(`ntamba-farm-sync-${scope.organizationId}-${scope.farmId ?? 'all'}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_sync_records', filter: `organization_id=eq.${scope.organizationId}` }, (payload) => {
          const row = (payload.new ?? null) as ServerSyncRow | null
          if (row?.id) void applyRemote(row)
        })
        .subscribe((status) => {
          const label = status === 'SUBSCRIBED' ? 'Online / Synced' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'Sync needs attention' : 'Connecting sync'
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('farm-server-sync-status', { detail: label }))
        })
      await flushFarmSyncQueue()
    } catch (error) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('farm-server-sync-status', { detail: error instanceof Error ? `Sync needs attention: ${error.message}` : 'Sync needs attention' }))
    }
  })()

  return () => {
    if (token !== generation) return
    generation += 1
    currentScope = null
    currentUserId = null
    if (channel && supabase) void supabase.removeChannel(channel)
    channel = null
  }
}

export function farmSyncPendingCount() {
  return offlineDb.farmSyncQueue.where('status').anyOf('queued', 'syncing', 'needs-attention', 'conflict').count()
}

export type { FarmSyncQueueRecord }
