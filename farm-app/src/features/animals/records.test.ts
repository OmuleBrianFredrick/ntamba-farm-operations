import { describe, expect, it } from 'vitest'
import { validateAnimalRecord, validateLifecycleEvent, validateManagedAsset, type AnimalRecord, type LifecycleEvent, type ManagedAsset } from './records'
const record: AnimalRecord = { id: 'test', enterprise: 'poultry', subject: 'House A', date: '2026-11-02', output: 'Egg collection', unit: 'eggs', gross: 100, rejected: 3, feedKg: 20, notes: '', createdAt: '' }
describe('animal production validation', () => {
  it('accepts a valid production record', () => expect(validateAnimalRecord(record)).toBeNull())
  it('rejects losses above production', () => expect(validateAnimalRecord({ ...record, rejected: 101 })).not.toBeNull())
  it('rejects fractional animal and egg counts', () => expect(validateAnimalRecord({ ...record, gross: 1.5 })).not.toBeNull())
  it('rejects invalid feed quantities', () => expect(validateAnimalRecord({ ...record, feedKg: Number.NaN })).not.toBeNull())
})

const asset: ManagedAsset = {
  id: 'asset-1', enterprise: 'poultry', kind: 'flock', name: 'House A', category: 'Layers', breed: 'Lohmann', location: 'Poultry block',
  startedOn: '2026-11-02', openingCount: 500, currentCount: 498, countUnit: 'birds', status: 'active', notes: '', createdAt: '', updatedAt: '',
}
const lifecycleEvent: LifecycleEvent = {
  id: 'event-1', enterprise: 'poultry', assetId: asset.id, assetName: asset.name, assetKind: asset.kind, eventDate: '2026-11-02',
  eventType: 'stock-count', quantity: 2, unit: 'birds', countAfter: 498, fromLocation: '', toLocation: '', details: 'Daily reconciliation', nextActionOn: null, createdAt: '',
}

describe('animal lifecycle validation', () => {
  it('accepts a valid managed record', () => expect(validateManagedAsset(asset)).toBeNull())
  it('rejects fractional stock counts', () => expect(validateManagedAsset({ ...asset, currentCount: 497.5 })).not.toBeNull())
  it('accepts a reconciled lifecycle event', () => expect(validateLifecycleEvent(lifecycleEvent)).toBeNull())
  it('requires count after stock reconciliation', () => expect(validateLifecycleEvent({ ...lifecycleEvent, countAfter: null })).not.toBeNull())
  it('rejects fractional bird event quantities', () => expect(validateLifecycleEvent({ ...lifecycleEvent, quantity: 1.5 })).not.toBeNull())
})
