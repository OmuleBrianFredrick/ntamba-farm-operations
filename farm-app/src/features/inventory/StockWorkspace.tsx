import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Boxes, CircleDollarSign, PackageCheck } from 'lucide-react'
import {
  daysUntilDate, inventoryCategories, inventoryDb, saveStockTransaction, transactionEffect, transactionLabels,
  validateInventoryItem, validateSupplier, type InventoryItem, type InventoryLot, type StockTransaction,
  type StockTransactionType, type Supplier,
} from './inventoryStore'

function farmToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date()) }
function timestamp() { return new Date().toISOString() }
function money(value: number) { return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value) }

function blankItem(): InventoryItem {
  const now = timestamp()
  return { id: '', sku: '', name: '', category: 'Other', unit: 'kg', storageLocation: 'Main store', openingQuantity: 0, quantityOnHand: 0, reorderLevel: 0, unitCost: 0, trackBatch: false, trackExpiry: false, status: 'active', createdAt: now, updatedAt: now }
}

function blankSupplier(): Supplier {
  const now = timestamp()
  return { id: '', name: '', contactPerson: '', phone: '', email: '', paymentTerms: '', notes: '', status: 'active', createdAt: now, updatedAt: now }
}

export function StockOverview() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [lots, setLots] = useState<InventoryLot[]>([])
  useEffect(() => {
    let active = true
    void Promise.all([inventoryDb.items.toArray(), inventoryDb.transactions.orderBy('transactionDate').reverse().toArray(), inventoryDb.lots.toArray()]).then(([nextItems, nextTransactions, nextLots]) => {
      if (!active) return
      setItems(nextItems); setTransactions(nextTransactions); setLots(nextLots)
    })
    return () => { active = false }
  }, [])
  const activeItems = items.filter(item => item.status === 'active')
  const lowStock = activeItems.filter(item => item.quantityOnHand <= item.reorderLevel)
  const today = farmToday()
  const expiring = lots.filter(lot => lot.remainingQuantity > 0 && lot.expiryDate && daysUntilDate(lot.expiryDate, today) <= 60)
  const value = items.reduce((total, item) => total + item.quantityOnHand * item.unitCost, 0)
  return <>
    <section className="crop-summary" aria-label="Stock summary">
      <Metric Icon={Boxes} value={String(activeItems.length)} label="active stock items" detail="Materials available to the farm" />
      <Metric Icon={CircleDollarSign} value={money(value)} label="estimated stock value" detail="Quantity on hand × average cost" />
      <Metric Icon={AlertTriangle} value={String(lowStock.length)} label="low-stock items" detail="At or below reorder level" warning />
      <Metric Icon={PackageCheck} value={String(expiring.length)} label="batches expiring" detail="Expired or due within 60 days" warning={expiring.length > 0} />
    </section>
    <section className="panel stock-recent">
      <div className="panel-head"><h2>Recent stock movements</h2><span>{transactions.length} movement(s)</span></div>
      {transactions.length ? <MovementTable rows={transactions.slice(0, 8)} /> : <p className="empty-register">Create an item, then record its first receipt or opening movement.</p>}
    </section>
  </>
}

function Metric({ Icon, value, label, detail, warning = false }: { Icon: typeof Boxes; value: string; label: string; detail: string; warning?: boolean }) {
  return <div className={`crop-summary-item${warning ? ' warning' : ''}`}><Icon /><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></div>
}

export function ItemRegister() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [draft, setDraft] = useState<InventoryItem | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { let active = true; void inventoryDb.items.orderBy('name').toArray().then(rows => { if (active) setItems(rows) }); return () => { active = false } }, [])
  const filtered = useMemo(() => items.filter(item => `${item.sku} ${item.name} ${item.category} ${item.storageLocation}`.toLowerCase().includes(query.toLowerCase())), [items, query])
  function update<K extends keyof InventoryItem>(key: K, value: InventoryItem[K]) { setDraft(current => current ? { ...current, [key]: value } : current) }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return
    const now = timestamp()
    const isNew = !draft.id
    const record: InventoryItem = { ...draft, id: draft.id || crypto.randomUUID(), sku: draft.sku.trim().toUpperCase(), name: draft.name.trim(), storageLocation: draft.storageLocation.trim(), quantityOnHand: isNew ? draft.openingQuantity : draft.quantityOnHand, createdAt: isNew ? now : draft.createdAt, updatedAt: now }
    const issue = validateInventoryItem(record)
    if (issue) { setError(issue); return }
    if (record.trackExpiry) record.trackBatch = true
    if (isNew && record.openingQuantity > 0 && (record.trackBatch || record.trackExpiry)) { setError('Create batch or expiry-controlled items with opening quantity 0, then receive each opening batch through Stock movements.'); return }
    const original = items.find(item => item.id === record.id)
    if (!isNew && !original?.trackBatch && record.trackBatch && record.quantityOnHand > 0) { setError('Batch tracking can only be enabled when the current balance is zero. Receive future stock by batch after the balance reaches zero.'); return }
    if (items.some(item => item.id !== record.id && item.sku.toLowerCase() === record.sku.toLowerCase())) { setError('That item code already exists.'); return }
    await inventoryDb.items.put(record)
    setItems(await inventoryDb.items.orderBy('name').toArray()); setDraft(null); setError(''); setMessage('Stock item saved on this device. Live integration is pending.')
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Item master</h2><span>{items.length} item(s)</span></div><div className="toolbar-actions"><input aria-label="Search stock items" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search code, item, category or store" /><button className="primary-button" onClick={() => { setDraft(blankItem()); setError(''); setMessage('') }}>Add stock item</button></div></div>
    {draft ? <form className="form-panel embedded-form" onSubmit={save}>
      <div className="form-grid three-column">
        <label className="field-group">Item code / SKU<input className="field" required value={draft.sku} onChange={event => update('sku', event.target.value)} placeholder="e.g. FEED-LAYER-01" /></label>
        <label className="field-group">Item name<input className="field" required value={draft.name} onChange={event => update('name', event.target.value)} /></label>
        <label className="field-group">Category<select className="field" value={draft.category} onChange={event => update('category', event.target.value as InventoryItem['category'])}>{inventoryCategories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="field-group">Stock unit<select className="field" value={draft.unit} onChange={event => update('unit', event.target.value)}><option>kg</option><option>L</option><option>bags</option><option>units</option><option>metres</option><option>rolls</option><option>boxes</option></select></label>
        <label className="field-group">Primary storage location<input className="field" required value={draft.storageLocation} onChange={event => update('storageLocation', event.target.value)} /></label>
        <label className="field-group">Reorder level<input className="field" type="number" min="0" step="any" required value={draft.reorderLevel} onChange={event => update('reorderLevel', Number(event.target.value))} /></label>
        {!draft.id ? <label className="field-group">Opening quantity<input className="field" type="number" min="0" step="any" required value={draft.openingQuantity} onChange={event => update('openingQuantity', Number(event.target.value))} /></label> : <div className="field-group"><span className="field-label">Current balance</span><div className="read-only-field">{draft.quantityOnHand} {draft.unit}</div></div>}
        <label className="field-group">Average unit cost (UGX)<input className="field" type="number" min="0" step="any" required value={draft.unitCost} onChange={event => update('unitCost', Number(event.target.value))} /></label>
        <label className="field-group">Status<select className="field" value={draft.status} onChange={event => update('status', event.target.value as InventoryItem['status'])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="check-row stock-check"><input type="checkbox" checked={draft.trackBatch} onChange={event => setDraft(current => current ? { ...current, trackBatch: event.target.checked, trackExpiry: event.target.checked ? current.trackExpiry : false } : current)} /><span><strong>Track batches / lots</strong><small>Required for controlled stock and traceability.</small></span></label>
        <label className="check-row stock-check"><input type="checkbox" checked={draft.trackExpiry} onChange={event => setDraft(current => current ? { ...current, trackExpiry: event.target.checked, trackBatch: event.target.checked ? true : current.trackBatch } : current)} /><span><strong>Track expiry dates</strong><small>Show expired and approaching-expiry alerts.</small></span></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancel</button><button className="primary-button">Save stock item</button></div>
    </form> : null}
    {message ? <p className="register-message" role="status">{message}</p> : null}
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Code</th><th>Item</th><th>Category</th><th>Store</th><th>On hand</th><th>Reorder</th><th>Average cost</th><th>Stock value</th><th>Controls</th><th>Action</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{item.sku}</td><td><strong>{item.name}</strong><span>{item.status}</span></td><td>{item.category}</td><td>{item.storageLocation}</td><td><strong className={item.quantityOnHand <= item.reorderLevel ? 'stock-low' : ''}>{item.quantityOnHand} {item.unit}</strong></td><td>{item.reorderLevel} {item.unit}</td><td>{money(item.unitCost)}</td><td>{money(item.quantityOnHand * item.unitCost)}</td><td>{[item.trackBatch ? 'Batch' : '', item.trackExpiry ? 'Expiry' : ''].filter(Boolean).join(' · ') || 'Standard'}</td><td><button className="secondary-button compact-button" onClick={() => { setDraft(item); setError(''); setMessage('') }}>Edit</button></td></tr>)}</tbody></table></div>
    {!filtered.length ? <p className="empty-register">{items.length ? 'No matching stock items.' : 'No stock items yet.'}</p> : null}
  </section>
}

export function SupplierRegister() {
  const [rows, setRows] = useState<Supplier[]>([])
  const [draft, setDraft] = useState<Supplier | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { let active = true; void inventoryDb.suppliers.orderBy('name').toArray().then(items => { if (active) setRows(items) }); return () => { active = false } }, [])
  const filtered = useMemo(() => rows.filter(item => `${item.name} ${item.contactPerson} ${item.phone} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  function update<K extends keyof Supplier>(key: K, value: Supplier[K]) { setDraft(current => current ? { ...current, [key]: value } : current) }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return
    const now = timestamp()
    const record = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim(), contactPerson: draft.contactPerson.trim(), phone: draft.phone.trim(), email: draft.email.trim(), paymentTerms: draft.paymentTerms.trim(), notes: draft.notes.trim(), createdAt: draft.id ? draft.createdAt : now, updatedAt: now }
    const issue = validateSupplier(record)
    if (issue) { setError(issue); return }
    if (rows.some(item => item.id !== record.id && item.name.toLowerCase() === record.name.toLowerCase())) { setError('That supplier already exists.'); return }
    await inventoryDb.suppliers.put(record)
    setRows(await inventoryDb.suppliers.orderBy('name').toArray()); setDraft(null); setError(''); setMessage('Supplier saved locally. Finance integration is pending.')
  }
  return <section className="panel">
    <div className="crop-toolbar"><div><h2>Supplier register</h2><span>{rows.length} supplier(s)</span></div><div className="toolbar-actions"><input aria-label="Search suppliers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search supplier or contact" /><button className="primary-button" onClick={() => { setDraft(blankSupplier()); setError(''); setMessage('') }}>Add supplier</button></div></div>
    {draft ? <form className="form-panel embedded-form" onSubmit={save}><div className="form-grid three-column">
      <label className="field-group">Supplier name<input className="field" required value={draft.name} onChange={event => update('name', event.target.value)} /></label>
      <label className="field-group">Contact person<input className="field" value={draft.contactPerson} onChange={event => update('contactPerson', event.target.value)} /></label>
      <label className="field-group">Phone<input className="field" value={draft.phone} onChange={event => update('phone', event.target.value)} /></label>
      <label className="field-group">Email<input className="field" type="email" value={draft.email} onChange={event => update('email', event.target.value)} /></label>
      <label className="field-group">Payment terms<input className="field" value={draft.paymentTerms} onChange={event => update('paymentTerms', event.target.value)} placeholder="Cash, 30 days…" /></label>
      <label className="field-group">Status<select className="field" value={draft.status} onChange={event => update('status', event.target.value as Supplier['status'])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label className="field-group full">Notes<textarea className="field" value={draft.notes} onChange={event => update('notes', event.target.value)} /></label>
    </div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancel</button><button className="primary-button">Save supplier</button></div></form> : null}
    {message ? <p className="register-message" role="status">{message}</p> : null}
    <div className="table-scroll"><table className="crop-table"><thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Terms</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.contactPerson || '—'}</td><td>{item.phone || '—'}</td><td>{item.email || '—'}</td><td>{item.paymentTerms || '—'}</td><td>{item.status}</td><td><button className="secondary-button compact-button" onClick={() => setDraft(item)}>Edit</button></td></tr>)}</tbody></table></div>
    {!filtered.length ? <p className="empty-register">{rows.length ? 'No matching suppliers.' : 'No suppliers yet.'}</p> : null}
  </section>
}

export function StockMovements() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [lots, setLots] = useState<InventoryLot[]>([])
  const [rows, setRows] = useState<StockTransaction[]>([])
  const [itemId, setItemId] = useState('')
  const [type, setType] = useState<StockTransactionType>('receipt')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function refresh() {
    const [nextItems, nextSuppliers, nextLots, nextRows] = await Promise.all([inventoryDb.items.where('status').equals('active').sortBy('name'), inventoryDb.suppliers.where('status').equals('active').sortBy('name'), inventoryDb.lots.toArray(), inventoryDb.transactions.orderBy('transactionDate').reverse().toArray()])
    setItems(nextItems); setSuppliers(nextSuppliers); setLots(nextLots); setRows(nextRows); setItemId(current => current || nextItems[0]?.id || '')
  }
  useEffect(() => {
    let active = true
    void Promise.all([inventoryDb.items.where('status').equals('active').sortBy('name'), inventoryDb.suppliers.where('status').equals('active').sortBy('name'), inventoryDb.lots.toArray(), inventoryDb.transactions.orderBy('transactionDate').reverse().toArray()]).then(([nextItems, nextSuppliers, nextLots, nextRows]) => {
      if (!active) return
      setItems(nextItems); setSuppliers(nextSuppliers); setLots(nextLots); setRows(nextRows); setItemId(current => current || nextItems[0]?.id || '')
    })
    return () => { active = false }
  }, [])
  const item = items.find(entry => entry.id === itemId)
  const inbound = transactionEffect(type) > 0
  const availableLots = lots.filter(lot => lot.itemId === itemId && lot.remainingQuantity > 0)
  const filtered = useMemo(() => rows.filter(row => `${row.itemName} ${transactionLabels[row.type]} ${row.reference} ${row.enterprise} ${row.activity} ${row.batchNumber}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!item) { setError('Add an active stock item first.'); return }
    const form = event.currentTarget
    const data = new FormData(form)
    const supplierId = String(data.get('supplierId')) || null
    const supplier = suppliers.find(entry => entry.id === supplierId)
    const lotId = String(data.get('lotId')) || null
    const selectedLot = lots.find(entry => entry.id === lotId)
    const unitCost = Number(data.get('unitCost'))
    const quantity = Number(data.get('quantity'))
    const record: StockTransaction = {
      id: crypto.randomUUID(), itemId: item.id, itemName: item.name, transactionDate: String(data.get('transactionDate')), type, quantity, unit: item.unit,
      unitCost: Number.isFinite(unitCost) ? unitCost : item.unitCost, totalValue: quantity * (Number.isFinite(unitCost) ? unitCost : item.unitCost), supplierId,
      supplierName: supplier?.name ?? '', enterprise: String(data.get('enterprise')), activity: String(data.get('activity')).trim(), fromLocation: String(data.get('fromLocation')).trim(),
      toLocation: String(data.get('toLocation')).trim(), reference: String(data.get('reference')).trim(), batchNumber: inbound ? String(data.get('batchNumber')).trim() : selectedLot?.batchNumber ?? String(data.get('batchNumber')).trim(), lotId,
      expiryDate: String(data.get('expiryDate')).trim() || null, notes: String(data.get('notes')).trim(), createdAt: timestamp(),
    }
    try {
      await saveStockTransaction(record)
      await refresh(); setError(''); setMessage('Stock movement saved. Finance posting and live synchronization are pending.'); form.reset()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the stock movement.') }
  }
  return <div className="stock-movement-grid">
    <form className="form-panel" onSubmit={submit}>
      <div className="section-heading"><div><h2>Record stock movement</h2><p>Every change creates a dated ledger entry; corrections use explicit adjustments.</p></div>{item ? <div className={`balance-chip${item.quantityOnHand <= item.reorderLevel ? ' low' : ''}`}><span>Available</span><strong>{item.quantityOnHand} {item.unit}</strong></div> : null}</div>
      {!items.length ? <p className="form-error">Add an active item in the Item master first.</p> : null}
      <div className="form-grid three-column" key={`${itemId}-${type}`}>
        <label className="field-group">Stock item<select className="field" value={itemId} onChange={event => setItemId(event.target.value)} required><option value="">Select item</option>{items.map(entry => <option value={entry.id} key={entry.id}>{entry.sku} · {entry.name}</option>)}</select></label>
        <label className="field-group">Movement type<select className="field" value={type} onChange={event => setType(event.target.value as StockTransactionType)}>{(Object.keys(transactionLabels) as StockTransactionType[]).map(value => <option value={value} key={value}>{transactionLabels[value]}</option>)}</select></label>
        <label className="field-group">Movement date<input className="field" name="transactionDate" type="date" required defaultValue={farmToday()} /></label>
        <label className="field-group">Quantity ({item?.unit ?? 'unit'})<input className="field" name="quantity" type="number" min="0.001" step="any" required /></label>
        <label className="field-group">Unit cost (UGX)<input className="field" name="unitCost" type="number" min="0" step="any" defaultValue={item?.unitCost ?? 0} /></label>
        <label className="field-group">Reference / document number<input className="field" name="reference" required placeholder="Delivery note, issue voucher…" /></label>
        <label className="field-group">Supplier <span className="optional">when applicable</span><select className="field" name="supplierId"><option value="">No supplier</option>{suppliers.map(entry => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label>
        <label className="field-group">Farm enterprise<select className="field" name="enterprise"><option>General farm</option><option>Crops</option><option>Livestock</option><option>Poultry</option><option>Fish & Apiary</option><option>QHSE</option><option>Administration</option></select></label>
        <label className="field-group">Activity / recipient<input className="field" name="activity" placeholder="Planting, feeding, worker or department" /></label>
        <label className="field-group">From location<input className="field" name="fromLocation" defaultValue={inbound ? 'Supplier' : item?.storageLocation ?? ''} /></label>
        <label className="field-group">To location<input className="field" name="toLocation" defaultValue={inbound ? item?.storageLocation ?? '' : ''} /></label>
        {item?.trackBatch ? <label className="field-group">Batch / lot number{inbound ? <><input className="field" name="batchNumber" required /><input type="hidden" name="lotId" defaultValue="" /></> : <><select className="field" name="lotId" required><option value="">Select batch</option>{availableLots.map(lot => <option value={lot.id} key={lot.id}>{lot.batchNumber} · {lot.remainingQuantity} {item.unit} · {lot.location}</option>)}</select><input type="hidden" name="batchNumber" defaultValue="" /></>}</label> : <label className="field-group">Batch / lot <span className="optional">optional</span><input className="field" name="batchNumber" /><input type="hidden" name="lotId" defaultValue="" /></label>}
        {item?.trackExpiry && inbound ? <label className="field-group">Expiry date<input className="field" name="expiryDate" type="date" required /></label> : <input type="hidden" name="expiryDate" defaultValue="" />}
        <label className="field-group full">Notes / reason<textarea className="field" name="notes" placeholder={type.includes('adjustment') || type === 'spoilage' ? 'State the reason and person authorizing this movement' : 'Optional operational details'} /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="form-actions"><span>Offline-ready · Accounting posting pending</span><button className="primary-button" disabled={!items.length}>Save stock movement</button></div>
    </form>
    <section className="panel">
      <div className="crop-toolbar"><div><h2>Stock ledger</h2><span>{rows.length} movement(s)</span></div><input aria-label="Search stock ledger" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search item, reference, enterprise or batch" /></div>
      <MovementTable rows={filtered} />
      {!filtered.length ? <p className="empty-register">{rows.length ? 'No matching movements.' : 'No stock movements yet.'}</p> : null}
    </section>
  </div>
}

function MovementTable({ rows }: { rows: StockTransaction[] }) {
  return <div className="table-scroll"><table className="crop-table"><thead><tr><th>Date</th><th>Reference</th><th>Item</th><th>Movement</th><th>Quantity</th><th>Value</th><th>Enterprise / activity</th><th>Supplier</th><th>Batch / expiry</th><th>Locations</th></tr></thead><tbody>{rows.map(row => {
    const effect = transactionEffect(row.type)
    return <tr key={row.id}><td>{row.transactionDate}</td><td>{row.reference}</td><td><strong>{row.itemName}</strong></td><td>{transactionLabels[row.type]}</td><td><strong className={`movement-quantity ${effect > 0 ? 'in' : effect < 0 ? 'out' : ''}`}>{effect > 0 ? '+' : effect < 0 ? '−' : ''}{row.quantity} {row.unit}</strong></td><td>{money(row.totalValue)}</td><td>{row.enterprise}<span>{row.activity || '—'}</span></td><td>{row.supplierName || '—'}</td><td>{row.batchNumber || '—'}<span>{row.expiryDate ?? '—'}</span></td><td>{row.fromLocation || '—'} → {row.toLocation || '—'}</td></tr>
  })}</tbody></table></div>
}

export function StockAlerts() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lots, setLots] = useState<InventoryLot[]>([])
  useEffect(() => { let active = true; void Promise.all([inventoryDb.items.toArray(), inventoryDb.lots.toArray()]).then(([nextItems, nextLots]) => { if (active) { setItems(nextItems); setLots(nextLots) } }); return () => { active = false } }, [])
  const itemMap = useMemo(() => new Map(items.map(item => [item.id, item])), [items])
  const low = items.filter(item => item.status === 'active' && item.quantityOnHand <= item.reorderLevel)
  const today = farmToday()
  const expiring = lots.filter(lot => lot.remainingQuantity > 0 && lot.expiryDate && daysUntilDate(lot.expiryDate, today) <= 90).sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
  return <div className="stock-alert-grid">
    <section className="panel"><div className="panel-head"><h2>Reorder alerts</h2><span>{low.length} item(s)</span></div><div className="table-scroll"><table className="crop-table"><thead><tr><th>Item</th><th>Location</th><th>On hand</th><th>Reorder level</th><th>Shortfall</th></tr></thead><tbody>{low.map(item => <tr key={item.id}><td><strong>{item.name}</strong><span>{item.sku}</span></td><td>{item.storageLocation}</td><td><strong className="stock-low">{item.quantityOnHand} {item.unit}</strong></td><td>{item.reorderLevel} {item.unit}</td><td>{Math.max(0, item.reorderLevel - item.quantityOnHand)} {item.unit}</td></tr>)}</tbody></table></div>{!low.length ? <p className="empty-register">No items are at or below their reorder level.</p> : null}</section>
    <section className="panel"><div className="panel-head"><h2>Expiry alerts</h2><span>{expiring.length} batch(es)</span></div><div className="table-scroll"><table className="crop-table"><thead><tr><th>Item</th><th>Batch</th><th>Remaining</th><th>Expiry</th><th>Status</th></tr></thead><tbody>{expiring.map(lot => { const days = daysUntilDate(lot.expiryDate ?? '', today); const item = itemMap.get(lot.itemId); return <tr key={lot.id}><td><strong>{item?.name ?? 'Unknown item'}</strong></td><td>{lot.batchNumber}</td><td>{lot.remainingQuantity} {item?.unit ?? ''}</td><td>{lot.expiryDate}</td><td><span className={`expiry-status ${days < 0 ? 'expired' : days <= 30 ? 'urgent' : ''}`}>{days < 0 ? `${Math.abs(days)} days expired` : `${days} days remaining`}</span></td></tr> })}</tbody></table></div>{!expiring.length ? <p className="empty-register">No batches are expired or due within 90 days.</p> : null}</section>
  </div>
}
