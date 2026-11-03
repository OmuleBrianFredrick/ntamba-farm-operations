import Dexie, { type EntityTable } from 'dexie'
import { varieties, seasons } from './cropData'
export type Variety = typeof varieties[number]
export type Season = typeof seasons[number] & { startsOn?: string; endsOn?: string }
export type Field = { id: string; name: string; enterpriseId: string; area: string; unit: string }
class MasterDatabase extends Dexie {
  varieties!: EntityTable<Variety, 'id'>
  seasons!: EntityTable<Season, 'id'>
  fields!: EntityTable<Field, 'id'>
  constructor() { super('ntamba-crop-master'); this.version(1).stores({ varieties: 'id, crop', seasons: 'id, code' }); this.version(2).stores({ varieties: 'id, crop', seasons: 'id, code', fields: 'id, name' }) }
}
export const masterDb = new MasterDatabase()
export async function loadVarieties() { const saved = await masterDb.varieties.toArray(); return [...new Map([...varieties, ...saved].map(row => [row.id, row])).values()] }
export async function loadSeasons() { const saved = await masterDb.seasons.toArray(); return [...new Map([...seasons, ...saved].map(row => [row.id, row])).values()] }
export async function loadFields(): Promise<Field[]> {
  const { cropIds: ids } = await import('./cropData')
  const seed = [
    { id: ids.blockB4, name: 'Block B4', enterpriseId: ids.bananaEnterprise, area: '2.5', unit: 'acres' },
    { id: ids.northField, name: 'North Field', enterpriseId: ids.seasonalEnterprise, area: '4', unit: 'acres' },
    { id: ids.gardenG2, name: 'Garden G2', enterpriseId: ids.gardenEnterprise, area: '0.75', unit: 'acres' },
    { id: ids.coffeeC1, name: 'Coffee C1', enterpriseId: ids.coffeeEnterprise, area: '6', unit: 'acres' },
  ]
  return [...new Map([...seed, ...await masterDb.fields.toArray()].map(row => [row.id, row])).values()]
}
