import { describe, expect, it } from 'vitest'
import { farmSyncRecordId } from './offlineDb'

describe('authenticated farm sync envelope identity', () => {
  it('is deterministic for retries of the same scoped record', () => {
    const first = farmSyncRecordId('org-1', 'farm-1', 'ntamba-qhse', 'submissions', 'submission/1')
    const retry = farmSyncRecordId('org-1', 'farm-1', 'ntamba-qhse', 'submissions', 'submission/1')
    expect(retry).toBe(first)
  })

  it('separates farm and all-farm scopes', () => {
    const farm = farmSyncRecordId('org-1', 'farm-1', 'ntamba-inventory', 'items', 'item-1')
    const allFarms = farmSyncRecordId('org-1', null, 'ntamba-inventory', 'items', 'item-1')
    expect(allFarms).not.toBe(farm)
    expect(farm).toContain('item-1')
  })
})
