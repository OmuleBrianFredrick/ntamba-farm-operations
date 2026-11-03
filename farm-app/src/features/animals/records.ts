import Dexie, { type EntityTable } from 'dexie'

export type Enterprise = 'livestock' | 'poultry' | 'fish-apiary'
export type ReviewStatus = 'recorded' | 'reviewed' | 'needs-correction'
export type AssetKind = 'animal' | 'herd' | 'flock' | 'pond' | 'hive'
export type AssetStatus = 'active' | 'inactive' | 'sold' | 'deceased' | 'completed'
export const outputs = {
  livestock: [{ name: 'Milk', unit: 'L' }, { name: 'Live weight', unit: 'kg' }, { name: 'Births', unit: 'head' }, { name: 'Deaths', unit: 'head' }],
  poultry: [{ name: 'Egg collection', unit: 'eggs' }, { name: 'Bird weight', unit: 'kg' }, { name: 'Deaths', unit: 'birds' }],
  'fish-apiary': [{ name: 'Fish harvested', unit: 'kg' }, { name: 'Honey harvested', unit: 'kg' }, { name: 'Fish deaths', unit: 'fish' }],
} as const
export type AnimalRecord = { id: string; enterprise: Enterprise; subject: string; date: string; output: string; unit: string; gross: number; rejected: number; feedKg: number; notes: string; reviewStatus?: ReviewStatus; createdAt: string; updatedAt?: string }
export type ManagedAsset = {
  id: string
  enterprise: Enterprise
  kind: AssetKind
  name: string
  category: string
  breed: string
  location: string
  startedOn: string
  openingCount: number
  currentCount: number
  countUnit: 'head' | 'birds' | 'fish' | 'colonies'
  status: AssetStatus
  notes: string
  createdAt: string
  updatedAt: string
}
export type LifecycleEvent = {
  id: string
  enterprise: Enterprise
  assetId: string
  assetName: string
  assetKind: AssetKind
  eventDate: string
  eventType: string
  quantity: number
  unit: string
  countAfter: number | null
  fromLocation: string
  toLocation: string
  details: string
  nextActionOn: string | null
  createdAt: string
}

export const eventOptions: Record<Enterprise, Partial<Record<AssetKind, Array<{ value: string; label: string }>>>> = {
  livestock: {
    animal: [
      ['inspection', 'Routine inspection'], ['movement', 'Movement'], ['breeding', 'Breeding / service'], ['pregnancy-check', 'Pregnancy check'],
      ['birth', 'Birth'], ['vaccination', 'Vaccination'], ['treatment', 'Treatment'], ['weight-check', 'Weight check'], ['sale', 'Sale'], ['death', 'Death'],
    ].map(([value, label]) => ({ value, label })),
    herd: [
      ['inspection', 'Routine inspection'], ['movement', 'Movement'], ['breeding', 'Breeding'], ['birth', 'Births'], ['stock-count', 'Stock reconciliation'],
      ['vaccination', 'Vaccination'], ['treatment', 'Treatment'], ['sale', 'Sale'], ['death', 'Deaths'],
    ].map(([value, label]) => ({ value, label })),
  },
  poultry: {
    flock: [
      ['placement', 'Flock placement'], ['stock-count', 'Stock reconciliation'], ['vaccination', 'Vaccination'], ['treatment', 'Treatment'],
      ['mortality', 'Mortality'], ['transfer', 'Transfer'], ['sale', 'Sale'], ['cycle-close', 'Close flock cycle'],
    ].map(([value, label]) => ({ value, label })),
  },
  'fish-apiary': {
    pond: [
      ['stocking', 'Pond stocking'], ['water-observation', 'Water quality observation'], ['feeding', 'Feeding'], ['treatment', 'Treatment'],
      ['stock-count', 'Stock reconciliation'], ['mortality', 'Mortality'], ['grading', 'Grading'], ['transfer', 'Transfer'], ['harvest', 'Fish harvest'], ['cycle-close', 'Close fish cycle'],
    ].map(([value, label]) => ({ value, label })),
    hive: [
      ['inspection', 'Hive inspection'], ['colony-status', 'Colony status'], ['queen-event', 'Queen event'], ['feeding', 'Supplementary feeding'],
      ['treatment', 'Treatment'], ['swarm', 'Swarm event'], ['honey-harvest', 'Honey harvest'], ['colony-loss', 'Colony loss'],
    ].map(([value, label]) => ({ value, label })),
  },
}

class AnimalDatabase extends Dexie {
  records!: EntityTable<AnimalRecord, 'id'>
  assets!: EntityTable<ManagedAsset, 'id'>
  events!: EntityTable<LifecycleEvent, 'id'>
  constructor() {
    super('ntamba-animal-records')
    this.version(1).stores({ records: 'id, enterprise, date, subject' })
    this.version(2).stores({
      records: 'id, enterprise, date, subject, reviewStatus',
      assets: 'id, enterprise, kind, name, status, location, updatedAt',
      events: 'id, enterprise, assetId, eventDate, eventType, nextActionOn, createdAt',
    })
  }
}
export const animalDb = new AnimalDatabase()
export function validateAnimalRecord(record: AnimalRecord) {
  if (!record.subject.trim() || !record.date) return 'Enter the animal tag, flock, pond or hive and record date.'
  if (![record.gross, record.rejected, record.feedKg].every(Number.isFinite)) return 'Enter valid numeric quantities.'
  if (record.gross < 0 || record.rejected < 0 || record.feedKg < 0 || record.rejected > record.gross) return 'Quantities must be non-negative; losses cannot exceed gross output.'
  if (['head', 'birds', 'fish', 'eggs'].includes(record.unit) && (!Number.isInteger(record.gross) || !Number.isInteger(record.rejected))) return 'Counts must be whole numbers.'
  return null
}

export function validateManagedAsset(asset: ManagedAsset) {
  if (!asset.name.trim() || !asset.category.trim() || !asset.location.trim() || !asset.startedOn) return 'Enter the identifier, category, location and start date.'
  if (![asset.openingCount, asset.currentCount].every(Number.isFinite) || asset.openingCount < 0 || asset.currentCount < 0) return 'Opening and current counts must be valid non-negative numbers.'
  if (!Number.isInteger(asset.openingCount) || !Number.isInteger(asset.currentCount)) return 'Animal, bird, fish and colony counts must be whole numbers.'
  return null
}

export function validateLifecycleEvent(event: LifecycleEvent) {
  if (!event.assetId || !event.eventDate || !event.eventType || !event.details.trim()) return 'Select a managed record and enter the date, event type and details.'
  if (!Number.isFinite(event.quantity) || event.quantity < 0) return 'Event quantity must be a valid non-negative number.'
  if (event.countAfter !== null && (!Number.isInteger(event.countAfter) || event.countAfter < 0)) return 'Count after the event must be a non-negative whole number.'
  if (event.eventType === 'stock-count' && event.countAfter === null) return 'Enter the reconciled count after a stock-count event.'
  if (['head', 'birds', 'fish', 'colonies'].includes(event.unit) && !Number.isInteger(event.quantity)) return 'Count quantities must be whole numbers.'
  return null
}

export async function saveLifecycleEvent(event: LifecycleEvent) {
  await animalDb.transaction('rw', animalDb.events, animalDb.assets, async () => {
    await animalDb.events.put(event)
    if (event.countAfter !== null) await animalDb.assets.update(event.assetId, { currentCount: event.countAfter, updatedAt: new Date().toISOString() })
  })
}
