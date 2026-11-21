import Dexie, { type DBCore, type DBCoreMutateRequest, type Middleware } from 'dexie'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { animalDb } from '../features/animals/records'
import { masterDb } from '../features/crops/masterStore'
import { financeDb } from '../features/finance/financeStore'
import { inventoryDb } from '../features/inventory/inventoryStore'
import { phase6Db } from '../features/administration/phase6Store'
import { qhseDb } from '../features/qhse/qhseStore'
import { offlineDb } from './offlineDb'
import { supabasePublishableKey, supabaseUrl } from './supabase'

const sharedDemoSuffix = '-public-demo'
const databases = [offlineDb, animalDb, masterDb, inventoryDb, financeDb, qhseDb, phase6Db]
const writerId = crypto.randomUUID()
const pendingUpserts = new Map<string, DemoRecord>()
const pendingDeletes = new Set<string>()

type DemoRecord = {
  id: string
  database_name: string
  table_name: string
  record_key: string
  payload: unknown
  writer_id: string
}

type SharedDemoPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: DemoRecord
  old: Pick<DemoRecord, 'id'>
}

let client: SupabaseClient | null = null
let applyingRemote = false
let timer = 0
let started = false
let channel: ReturnType<SupabaseClient['channel']> | null = null

function anonClient() {
  if (client) return client
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('Supabase is not configured for the public demo.')
  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return client
}

function canonicalDatabaseName(db: Dexie) {
  return db.name.endsWith(sharedDemoSuffix) ? db.name.slice(0, -sharedDemoSuffix.length) : db.name
}

function recordKey(key: unknown) {
  if (typeof key === 'string' || typeof key === 'number') return String(key)
  throw new Error('The public demo can synchronize only string or numeric record keys.')
}

function sharedId(databaseName: string, tableName: string, key: string) {
  return `ntamba-demo:${databaseName}:${tableName}:${encodeURIComponent(key)}`
}

function enqueueUpsert(databaseName: string, tableName: string, key: unknown, payload: unknown) {
  const keyText = recordKey(key)
  const id = sharedId(databaseName, tableName, keyText)
  pendingDeletes.delete(id)
  pendingUpserts.set(id, {
    id, database_name: databaseName, table_name: tableName,
    record_key: keyText, payload, writer_id: writerId,
  })
  scheduleFlush()
}

function enqueueDelete(databaseName: string, tableName: string, key: unknown) {
  const id = sharedId(databaseName, tableName, recordKey(key))
  pendingUpserts.delete(id)
  pendingDeletes.add(id)
  scheduleFlush()
}

function scheduleFlush() {
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => { timer = 0; void flushPending() }, 300)
}

async function flushPending() {
  const supabase = anonClient()
  while (pendingUpserts.size || pendingDeletes.size) {
    const upserts = [...pendingUpserts.values()].slice(0, 100)
    upserts.forEach((record) => pendingUpserts.delete(record.id))
    const deletes = [...pendingDeletes].slice(0, 100)
    deletes.forEach((id) => pendingDeletes.delete(id))

    if (upserts.length) {
      const { error } = await supabase.from('public_demo_records').upsert(upserts, { onConflict: 'id' })
      if (error) {
        upserts.forEach((record) => pendingUpserts.set(record.id, record))
        window.dispatchEvent(new CustomEvent('public-demo-sync-status', { detail: 'Demo sync needs attention' }))
        window.setTimeout(scheduleFlush, 2500)
        return
      }
    }
    if (deletes.length) {
      const { error } = await supabase.from('public_demo_records').delete().in('id', deletes)
      if (error) {
        deletes.forEach((id) => pendingDeletes.add(id))
        window.dispatchEvent(new CustomEvent('public-demo-sync-status', { detail: 'Demo sync needs attention' }))
        window.setTimeout(scheduleFlush, 2500)
        return
      }
    }
  }
  window.dispatchEvent(new CustomEvent('public-demo-sync-status', { detail: 'Live demo / synced' }))
}

function installMutationTracking(db: Dexie) {
  const name = canonicalDatabaseName(db)
  const middleware: Middleware<DBCore> = {
    stack: 'dbcore',
    name: `public-demo-sync-${name}`,
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
            if (applyingRemote || response.numFailures === (request.type === 'add' || request.type === 'put' ? request.values.length : request.type === 'delete' ? request.keys.length : deletedRangeKeys.length)) return response

            if (request.type === 'add' || request.type === 'put') {
              request.values.forEach((value, index) => {
                if (response.failures[index]) return
                const key = request.keys?.[index] ?? base.schema.primaryKey.extractKey?.(value) ?? (value as { id?: unknown }).id
                enqueueUpsert(name, tableName, key, value)
              })
            } else if (request.type === 'delete') {
              request.keys.forEach((key) => enqueueDelete(name, tableName, key))
            } else {
              deletedRangeKeys.forEach((key) => enqueueDelete(name, tableName, key))
            }
            return response
          },
        }
      },
    }),
  }
  db.use(middleware)
}

async function applyRemoteRecord(record: DemoRecord) {
  const db = databases.find((database) => canonicalDatabaseName(database) === record.database_name)
  if (!db || !db.tables.some((table) => table.name === record.table_name)) return
  const table = db.table(record.table_name)
  if (record.payload === null) await table.delete(record.record_key)
  else await table.put(record.payload as Record<string, unknown>)
}

async function hydrate(records: DemoRecord[]) {
  const byTable = new Map<string, DemoRecord[]>()
  records.forEach((record) => {
    const group = `${record.database_name}\u0000${record.table_name}`
    byTable.set(group, [...(byTable.get(group) ?? []), record])
  })
  applyingRemote = true
  try {
    await Promise.all(databases.map(async (db) => {
      await db.open()
      const databaseName = canonicalDatabaseName(db)
      await Promise.all(db.tables.map(async (table) => {
        const rows = byTable.get(`${databaseName}\u0000${table.name}`) ?? []
        await table.clear()
        if (rows.length) await table.bulkPut(rows.map((record) => record.payload as Record<string, unknown>))
      }))
    }))
  } finally {
    applyingRemote = false
  }
}

function applyRealtime(payload: SharedDemoPayload) {
  if (payload.eventType === 'DELETE') {
    const match = /^ntamba-demo:([^:]+):([^:]+):(.+)$/.exec(payload.old.id)
    if (!match) return
    const [databaseName, tableName, encodedKey] = match.slice(1)
    const db = databases.find((database) => canonicalDatabaseName(database) === databaseName)
    if (!db || !db.tables.some((table) => table.name === tableName)) return
    applyingRemote = true
    void db.table(tableName).delete(decodeURIComponent(encodedKey)).finally(() => {
      applyingRemote = false
      window.dispatchEvent(new Event('public-demo-updated'))
    })
    return
  }
  if (!payload.new || payload.new.writer_id === writerId) return
  applyingRemote = true
  void applyRemoteRecord(payload.new).finally(() => {
    applyingRemote = false
    window.dispatchEvent(new Event('public-demo-updated'))
  })
}

export async function startPublicDemo() {
  if (started) return
  const supabase = anonClient()
  databases.forEach(installMutationTracking)
  await Promise.all(databases.map((db) => db.open()))

  const { data, error } = await supabase.from('public_demo_records').select('id,database_name,table_name,record_key,payload,writer_id')
  if (error) throw new Error(`The shared demo database is not ready: ${error.message}`)
  const records = (data ?? []) as DemoRecord[]
  if (records.length) await hydrate(records)
  started = true

  channel = supabase.channel('ntamba-public-demo-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'public_demo_records' }, (payload) => applyRealtime(payload as unknown as SharedDemoPayload))
    .subscribe((status) => {
      const label = status === 'SUBSCRIBED' ? 'Live demo / synced' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'Demo sync needs attention' : 'Connecting live demo'
      window.dispatchEvent(new CustomEvent('public-demo-sync-status', { detail: label }))
    })

  // A browser with an existing demo-only cache can seed an empty shared demo.
  if (!records.length) {
    for (const db of databases) {
      for (const table of db.tables) {
        const rows = await table.toArray()
        for (const row of rows) enqueueUpsert(canonicalDatabaseName(db), table.name, (row as { id?: unknown }).id, row)
      }
    }
  }
}

export function publicDemoConnection() {
  return { connected: started, disconnect: () => { if (channel) void anonClient().removeChannel(channel); channel = null; started = false } }
}
