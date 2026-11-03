import { useEffect, useState } from 'react'
import { offlineDb } from '../lib/offlineDb'
import { flushSyncQueue } from '../lib/syncEngine'
import { isSupabaseConfigured } from '../lib/supabase'

type Status = { label: string; tone: 'online' | 'pending' | 'offline'; pending: number }

export function useSyncStatus(): Status {
  const [status, setStatus] = useState<Status>({ label: 'Checking sync…', tone: 'pending', pending: 0 })

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const pending = await offlineDb.syncQueue.where('status').anyOf('queued', 'syncing', 'needs-attention').count()
      if (!active) return
      if (!navigator.onLine) setStatus({ label: `${pending} saved offline`, tone: 'offline', pending })
      else if (!isSupabaseConfigured) setStatus({ label: pending ? `${pending} queued locally` : 'Local development', tone: 'pending', pending })
      else if (pending) setStatus({ label: `${pending} waiting to sync`, tone: 'pending', pending })
      else setStatus({ label: 'Online / Synced', tone: 'online', pending: 0 })
    }
    const onOnline = () => { void flushSyncQueue().finally(refresh) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', refresh)
    window.addEventListener('farm-sync-change', refresh)
    void refresh().then(() => flushSyncQueue()).then(refresh)
    return () => {
      active = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', refresh)
      window.removeEventListener('farm-sync-change', refresh)
    }
  }, [])

  return status
}
