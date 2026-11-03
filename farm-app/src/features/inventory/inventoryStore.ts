import Dexie, { type EntityTable } from 'dexie'

export type InventoryCategory = 'Seed and planting material' | 'Fertilizer and soil inputs' | 'Animal feed' | 'Veterinary and crop health' | 'Fuel and lubricants' | 'Tools and hardware' | 'Packaging' | 'Other'
export type InventoryItem = {
  id: string
  sku: string
  name: string
  category: InventoryCategory
  unit: string
  storageLocation: string
  openingQuantity: number
  quantityOnHand: number
  reorderLevel: number
  unitCost: number
  trackBatch: boolean
  trackExpiry: boolean
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
export type Supplier = {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  paymentTerms: string
  notes: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
export type StockTransactionType = 'receipt' | 'issue' | 'return-in' | 'return-out' | 'transfer' | 'adjustment-in' | 'adjustment-out' | 'spoilage'
export type StockTransaction = {
  id: string
  itemId: string
  itemName: string
  transactionDate: string
  type: StockTransactionType
  quantity: number
  unit: string
  unitCost: number
  totalValue: number
  supplierId: string | null
  supplierName: string
  enterprise: string
  activity: string
  fromLocation: string
  toLocation: string
  reference: string
  batchNumber: string
  lotId: string | null
  expiryDate: string | null
  notes: string
  createdAt: string
}
export type InventoryLot = {
  id: string
  itemId: string
  batchNumber: string
  expiryDate: string | null
  receivedQuantity: number
  remainingQuantity: number
  unitCost: number
  supplierId: string | null
  location: string
  receivedOn: string
  updatedAt: string
}

export const inventoryCategories: InventoryCategory[] = ['Seed and planting material', 'Fertilizer and soil inputs', 'Animal feed', 'Veterinary and crop health', 'Fuel and lubricants', 'Tools and hardware', 'Packaging', 'Other']
export const transactionLabels: Record<StockTransactionType, string> = {
  receipt: 'Receive purchase / delivery', issue: 'Issue to farm activity', 'return-in': 'Return from enterprise', 'return-out': 'Return to supplier',
  transfer: 'Transfer between locations', 'adjustment-in': 'Positive stock adjustment', 'adjustment-out': 'Negative stock adjustment', spoilage: 'Spoilage / expiry loss',
}

export function transactionEffect(type: StockTransactionType) {
  if (['receipt', 'return-in', 'adjustment-in'].includes(type)) return 1
  if (['issue', 'return-out', 'adjustment-out', 'spoilage'].includes(type)) return -1
  return 0
}

export function validateInventoryItem(item: InventoryItem) {
  if (!item.sku.trim() || !item.name.trim() || !item.unit.trim() || !item.storageLocation.trim()) return 'Enter the item code, name, unit and storage location.'
  if (![item.openingQuantity, item.quantityOnHand, item.reorderLevel, item.unitCost].every(Number.isFinite)) return 'Enter valid numeric stock values.'
  if (item.openingQuantity < 0 || item.quantityOnHand < 0 || item.reorderLevel < 0 || item.unitCost < 0) return 'Stock quantities, reorder level and unit cost cannot be negative.'
  return null
}

export function validateSupplier(supplier: Supplier) {
  if (!supplier.name.trim()) return 'Enter the supplier name.'
  if (supplier.email && !/^\S+@\S+\.\S+$/.test(supplier.email)) return 'Enter a valid supplier email address.'
  return null
}

export function validateStockTransaction(record: StockTransaction, item: InventoryItem, lot?: InventoryLot) {
  if (!record.itemId || !record.transactionDate || !record.type || !record.reference.trim()) return 'Select an item and enter the date, movement type and reference.'
  if (!Number.isFinite(record.quantity) || record.quantity <= 0) return 'Movement quantity must be greater than zero.'
  if (!Number.isFinite(record.unitCost) || record.unitCost < 0) return 'Unit cost must be a valid non-negative number.'
  if (transactionEffect(record.type) < 0 && record.quantity > item.quantityOnHand) return `Only ${item.quantityOnHand} ${item.unit} is available.`
  if (record.type === 'transfer' && (!record.fromLocation.trim() || !record.toLocation.trim() || record.fromLocation.trim() === record.toLocation.trim())) return 'Enter two different locations for a transfer.'
  if (item.trackBatch && !record.batchNumber.trim()) return 'This item requires a batch or lot number.'
  if (item.trackExpiry && ['receipt', 'return-in', 'adjustment-in'].includes(record.type) && !record.expiryDate) return 'This item requires an expiry date when stock is received.'
  if (transactionEffect(record.type) < 0 && item.trackBatch && (!lot || lot.remainingQuantity < record.quantity)) return 'The selected batch does not contain enough stock.'
  if (record.type === 'transfer' && item.trackBatch && (!lot || lot.remainingQuantity < record.quantity)) return 'The selected batch does not contain enough stock for this transfer.'
  return null
}

class InventoryDatabase extends Dexie {
  items!: EntityTable<InventoryItem, 'id'>
  suppliers!: EntityTable<Supplier, 'id'>
  transactions!: EntityTable<StockTransaction, 'id'>
  lots!: EntityTable<InventoryLot, 'id'>
  constructor() {
    super('ntamba-inventory')
    this.version(1).stores({
      items: 'id, &sku, name, category, status, storageLocation, updatedAt',
      suppliers: 'id, name, status, updatedAt',
      transactions: 'id, itemId, transactionDate, type, supplierId, enterprise, batchNumber, createdAt',
      lots: 'id, itemId, [itemId+batchNumber], expiryDate, remainingQuantity, location, updatedAt',
    })
  }
}

export const inventoryDb = new InventoryDatabase()

export async function saveStockTransaction(record: StockTransaction) {
  await inventoryDb.transaction('rw', inventoryDb.items, inventoryDb.transactions, inventoryDb.lots, async () => {
    const item = await inventoryDb.items.get(record.itemId)
    if (!item) throw new Error('The selected inventory item no longer exists.')
    const effect = transactionEffect(record.type)
    const lots = item.trackBatch ? await inventoryDb.lots.where('[itemId+batchNumber]').equals([item.id, record.batchNumber]).toArray() : []
    const targetLocation = record.toLocation || item.storageLocation
    const lot = record.lotId ? await inventoryDb.lots.get(record.lotId) : effect > 0 ? lots.find(entry => entry.location === targetLocation) : lots[0]
    const issue = validateStockTransaction(record, item, lot)
    if (issue) throw new Error(issue)
    const nextQuantity = item.quantityOnHand + effect * record.quantity
    let nextUnitCost = item.unitCost
    if (effect > 0 && record.unitCost > 0) {
      const existingValue = item.quantityOnHand * item.unitCost
      nextUnitCost = (existingValue + record.quantity * record.unitCost) / nextQuantity
    }
    const now = new Date().toISOString()
    if (item.trackBatch && effect > 0) {
      if (lot) {
        const combinedQuantity = lot.remainingQuantity + record.quantity
        const combinedCost = combinedQuantity ? ((lot.remainingQuantity * lot.unitCost) + (record.quantity * record.unitCost)) / combinedQuantity : lot.unitCost
        await inventoryDb.lots.update(lot.id, { remainingQuantity: combinedQuantity, receivedQuantity: lot.receivedQuantity + record.quantity, unitCost: combinedCost, expiryDate: record.expiryDate ?? lot.expiryDate, location: record.toLocation || lot.location, updatedAt: now })
      } else {
        await inventoryDb.lots.add({ id: crypto.randomUUID(), itemId: item.id, batchNumber: record.batchNumber, expiryDate: record.expiryDate, receivedQuantity: record.quantity, remainingQuantity: record.quantity, unitCost: record.unitCost, supplierId: record.supplierId, location: targetLocation, receivedOn: record.transactionDate, updatedAt: now })
      }
    } else if (item.trackBatch && effect < 0 && lot) {
      await inventoryDb.lots.update(lot.id, { remainingQuantity: lot.remainingQuantity - record.quantity, updatedAt: now })
    } else if (item.trackBatch && record.type === 'transfer' && lot) {
      if (lot.remainingQuantity === record.quantity) await inventoryDb.lots.update(lot.id, { location: record.toLocation, updatedAt: now })
      else {
        await inventoryDb.lots.update(lot.id, { remainingQuantity: lot.remainingQuantity - record.quantity, updatedAt: now })
        await inventoryDb.lots.add({ ...lot, id: crypto.randomUUID(), receivedQuantity: record.quantity, remainingQuantity: record.quantity, location: record.toLocation, updatedAt: now })
      }
    }
    await inventoryDb.items.update(item.id, { quantityOnHand: nextQuantity, unitCost: nextUnitCost, updatedAt: now })
    await inventoryDb.transactions.add({ ...record, unitCost: record.unitCost || item.unitCost, totalValue: record.quantity * (record.unitCost || item.unitCost), createdAt: now })
  })
}

export function daysUntilDate(date: string, today: string) {
  const target = Date.parse(`${date}T12:00:00Z`)
  const baseline = Date.parse(`${today}T12:00:00Z`)
  return Number.isFinite(target) && Number.isFinite(baseline) ? Math.ceil((target - baseline) / 86_400_000) : Number.NaN
}
