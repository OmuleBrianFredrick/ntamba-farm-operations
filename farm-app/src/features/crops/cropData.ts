import type { StoredPlantingSession } from '../../lib/offlineDb'

export const cropIds = {
  organization: '10000000-0000-4000-8000-000000000001',
  farm: '20000000-0000-4000-8000-000000000001',
  bananaEnterprise: '30000000-0000-4000-8000-000000000001',
  coffeeEnterprise: '30000000-0000-4000-8000-000000000002',
  seasonalEnterprise: '30000000-0000-4000-8000-000000000003',
  gardenEnterprise: '30000000-0000-4000-8000-000000000004',
  blockB4: '40000000-0000-4000-8000-000000000001',
  northField: '40000000-0000-4000-8000-000000000002',
  gardenG2: '40000000-0000-4000-8000-000000000003',
  coffeeC1: '40000000-0000-4000-8000-000000000004',
  bananaVariety: '50000000-0000-4000-8000-000000000001',
  maizeVariety: '50000000-0000-4000-8000-000000000002',
  tomatoVariety: '50000000-0000-4000-8000-000000000003',
  coffeeVariety: '50000000-0000-4000-8000-000000000004',
  currentSeason: '60000000-0000-4000-8000-000000000001',
}

export const varieties = [
  { id: cropIds.bananaVariety, crop: 'Banana', variety: 'East African Highland', category: 'Perennial', maturity: '365 days', unit: 'kg' },
  { id: cropIds.maizeVariety, crop: 'Maize', variety: 'Longe 10H', category: 'Seasonal', maturity: '120 days', unit: 'kg' },
  { id: cropIds.tomatoVariety, crop: 'Tomato', variety: 'Assila F1', category: 'Garden', maturity: '85 days', unit: 'kg' },
  { id: cropIds.coffeeVariety, crop: 'Coffee', variety: 'Robusta Elite', category: 'Perennial', maturity: '900 days', unit: 'kg' },
]

export const seasons = [
  { id: cropIds.currentSeason, name: 'Second rains 2026', code: '2026-B', dates: '15 Aug 2026 – 31 Jan 2027', startsOn: '2026-08-15', endsOn: '2027-01-31', status: 'Active', rainfall: '520 mm' },
  { id: '60000000-0000-4000-8000-000000000002', name: 'First rains 2027', code: '2027-A', dates: '15 Feb – 31 Jul 2027', startsOn: '2027-02-15', endsOn: '2027-07-31', status: 'Planning', rainfall: '480 mm' },
]

export const seededPlantings: StoredPlantingSession[] = [
  { id: '81000000-0000-4000-8000-000000000001', crop: 'Banana', variety: 'East African Highland', block: 'Block B4', season: 'Second rains 2026', plantedOn: '2026-02-12', area: 2.5, areaUnit: 'acres', expectedHarvest: '12 Feb 2027', status: 'growing', syncStatus: 'synced', updatedAt: '2026-11-01T07:00:00Z' },
  { id: '81000000-0000-4000-8000-000000000002', crop: 'Maize', variety: 'Longe 10H', block: 'North Field', season: 'Second rains 2026', plantedOn: '2026-09-06', area: 4, areaUnit: 'acres', expectedHarvest: '5 Jan 2027', status: 'growing', syncStatus: 'synced', updatedAt: '2026-11-01T07:00:00Z' },
  { id: '81000000-0000-4000-8000-000000000003', crop: 'Tomato', variety: 'Assila F1', block: 'Garden G2', season: 'Second rains 2026', plantedOn: '2026-10-14', area: 0.75, areaUnit: 'acres', expectedHarvest: '7 Jan 2027', status: 'planted', syncStatus: 'synced', updatedAt: '2026-11-01T07:00:00Z' },
  { id: '81000000-0000-4000-8000-000000000004', crop: 'Coffee', variety: 'Robusta Elite', block: 'Coffee C1', season: 'Perennial cycle', plantedOn: '2024-04-18', area: 6, areaUnit: 'acres', expectedHarvest: 'In harvest', status: 'harvesting', syncStatus: 'synced', updatedAt: '2026-11-01T07:00:00Z' },
]

export function plantingStatusLabel(status: StoredPlantingSession['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
