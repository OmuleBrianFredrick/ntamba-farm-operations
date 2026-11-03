import { describe, expect, it } from 'vitest'
import { daysUntilDate, transactionEffect, validateInventoryItem, validateStockTransaction, type InventoryItem, type InventoryLot, type StockTransaction } from './inventoryStore'

const item: InventoryItem = {
  id: 'item-1', sku: 'FEED-001', name: 'Layer mash', category: 'Animal feed', unit: 'kg', storageLocation: 'Main store',
  openingQuantity: 100, quantityOnHand: 100, reorderLevel: 20, unitCost: 2500, trackBatch: true, trackExpiry: true,
  status: 'active', createdAt: '', updatedAt: '',
}
const lot: InventoryLot = { id: 'lot-1', itemId: item.id, batchNumber: 'B-001', expiryDate: '2027-01-01', receivedQuantity: 100, remainingQuantity: 100, unitCost: 2500, supplierId: null, location: 'Main store', receivedOn: '2026-11-02', updatedAt: '' }
const movement: StockTransaction = {
  id: 'tx-1', itemId: item.id, itemName: item.name, transactionDate: '2026-11-02', type: 'issue', quantity: 10, unit: 'kg', unitCost: 2500, totalValue: 25000,
  supplierId: null, supplierName: '', enterprise: 'Poultry', activity: 'Daily feeding', fromLocation: 'Main store', toLocation: 'House 1', reference: 'ISS-001', batchNumber: 'B-001', lotId: 'lot-1', expiryDate: null, notes: '', createdAt: '',
}

describe('inventory calculations and validation', () => {
  it('applies correct stock directions', () => {
    expect(transactionEffect('receipt')).toBe(1)
    expect(transactionEffect('issue')).toBe(-1)
    expect(transactionEffect('transfer')).toBe(0)
  })
  it('accepts a complete item', () => expect(validateInventoryItem(item)).toBeNull())
  it('rejects negative opening stock', () => expect(validateInventoryItem({ ...item, openingQuantity: -1 })).not.toBeNull())
  it('accepts a valid batch issue', () => expect(validateStockTransaction(movement, item, lot)).toBeNull())
  it('prevents negative stock', () => expect(validateStockTransaction({ ...movement, quantity: 101 }, item, lot)).toContain('available'))
  it('requires an expiry date on controlled receipts', () => expect(validateStockTransaction({ ...movement, type: 'receipt', expiryDate: null }, item)).toContain('expiry'))
  it('calculates days to expiry', () => expect(daysUntilDate('2026-11-12', '2026-11-02')).toBe(10))
})
