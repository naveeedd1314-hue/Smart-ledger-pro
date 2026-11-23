import DataBackup from '../components/DataBackup';
import { localDateISO } from '../lib/dateUtils';
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Package, AlertTriangle, IndianRupee, Plus, ClipboardList, FileDown, FileSpreadsheet, Pencil, X } from 'lucide-react'
import jsPDF from 'jspdf'

type Product = {
  id: string | number
  name: string
  selling: number
  wholesale?: number
  purchase: number
  averageCost?: number | null
  stock: number
  sku?: string
  category?: string
  hsn?: string
  gstRate?: number
}

type Adjustment = {
  id: string
  date: string
  product: string
  productId?: string | number
  change: number
  reason: string
  movement?: 'Stock In' | 'Stock Out' | 'Correction'
  stockAfter?: number
}

const read = <T,>(key: string): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function Inventory() {
  const [items, setItems] = useState<Product[]>(() => read<Product>('smartledger-products'))
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editDraft, setEditDraft] = useState<Product | null>(null)
  const [adjustments, setAdjustments] = useState<Adjustment[]>(() => read<Adjustment>('smartledger-pro-stock-adjustments'))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [stockFilter, setStockFilter] = useState('All Stock')
  const [sortBy, setSortBy] = useState('name')
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [group, setGroup] = useState('General')
  const [hsn, setHsn] = useState('')
  const [gstRate, setGstRate] = useState('0')
  const [purchase, setPurchase] = useState('')
  const [selling, setSelling] = useState('')
  const [wholesale, setWholesale] = useState('')
  const [qty, setQty] = useState('')
  const [lowLimit, setLowLimit] = useState('5')
  const [adjustProduct, setAdjustProduct] = useState('')
  const [adjustQty, setAdjustQty] = useState('')
  const [reason, setReason] = useState('Stock correction')
  const [movementFilter, setMovementFilter] = useState('All Movements')
  const [movementSearch, setMovementSearch] = useState('')
  useEffect(() => {
    const openAdd = () => { setShowAddForm(true); window.setTimeout(() => document.getElementById('add-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
    const openAdjustment = () => document.getElementById('stock-adjustment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const exportCsv = () => exportInventoryCsv();
    const exportPdf = () => exportInventoryPdf();
    window.addEventListener('smartledger:inventory-add', openAdd);
    window.addEventListener('smartledger:inventory-adjust', openAdjustment);
    window.addEventListener('smartledger:inventory-export-csv', exportCsv);
    window.addEventListener('smartledger:inventory-export-pdf', exportPdf);
    return () => {
      window.removeEventListener('smartledger:inventory-add', openAdd);
      window.removeEventListener('smartledger:inventory-adjust', openAdjustment);
      window.removeEventListener('smartledger:inventory-export-csv', exportCsv);
      window.removeEventListener('smartledger:inventory-export-pdf', exportPdf);
    };
  }, []);
  const addProductLock = useRef(false);
  const stockAdjustLock = useRef(false);

  const saveItems = (next: Product[]) => {
    setItems(next)
    localStorage.setItem('smartledger-products', JSON.stringify(next))
  }

  const saveAdjustments = (next: Adjustment[]) => {
    setAdjustments(next)
    localStorage.setItem('smartledger-pro-stock-adjustments', JSON.stringify(next))
  }

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map(x => x.category || 'General')))],
    [items]
  )

  const filtered = items.filter(x => {
    const stock = Number(x.stock) || 0
    const matchesCategory = category === 'All' || (x.category || 'General') === category
    const matchesSearch = `${x.name} ${x.sku || ''} ${x.hsn || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchesStock = stockFilter === 'All Stock' ||
      (stockFilter === 'Low Stock' && stock > 0 && stock <= Math.max(0, Number(lowLimit) || 0)) ||
      (stockFilter === 'Out of Stock' && stock <= 0)
    return matchesCategory && matchesSearch && matchesStock
  })

  const visibleItems = [...filtered].sort((a, b) => {
    if (sortBy === 'stock') return Number(a.stock) - Number(b.stock)
    if (sortBy === 'purchase') return Number(a.purchase) - Number(b.purchase)
    if (sortBy === 'selling') return Number(a.selling) - Number(b.selling)
    if (sortBy === 'margin') return (Number(a.selling) - Number(a.averageCost ?? a.purchase)) - (Number(b.selling) - Number(b.averageCost ?? b.purchase))
    return a.name.localeCompare(b.name)
  })

  const totalUnits = items.reduce((s, x) => s + Math.max(0, Number(x.stock) || 0), 0)
  const stockValue = items.reduce((s, x) => s + Math.max(0, Number(x.stock) || 0) * (Number(x.averageCost ?? x.purchase) || 0), 0)
  const retailValue = items.reduce((s, x) => s + Math.max(0, Number(x.stock) || 0) * (Number(x.selling) || 0), 0)
  const lowStock = items.filter(x => Number(x.stock) > 0 && Number(x.stock) <= Math.max(0, Number(lowLimit) || 0))
  const outOfStock = items.filter(x => Number(x.stock) <= 0)
  function exportInventoryCsv() {
    const headers = ['Product', 'SKU', 'Category', 'HSN', 'GST %', 'Last Purchase Price', 'Average Cost', 'Selling Price', 'Profit Per Unit', 'Stock', 'Stock Cost Value', 'Retail Value']
    const rows = items.map(x => [
      x.name, x.sku || '', x.category || 'General', x.hsn || '',
      Number(x.gstRate) || 0, Number(x.purchase) || 0, Number(x.averageCost ?? x.purchase) || 0,
      Number(x.selling) || 0,
      (Number(x.selling) || 0) - (Number(x.averageCost ?? x.purchase) || 0),
      Number(x.stock) || 0,
      Math.max(0, Number(x.stock) || 0) * (Number(x.averageCost ?? x.purchase) || 0),
      Math.max(0, Number(x.stock) || 0) * (Number(x.selling) || 0)
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'SmartLedger-Inventory-Report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportInventoryPdf() {
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const columns = ['Product', 'SKU', 'Average Cost', 'Selling', 'Profit/Unit', 'Stock', 'Cost Value', 'Retail Value']
    const widths = [58, 28, 25, 25, 27, 18, 35, 35]
    const startX = 12
    let y = 43

    const heading = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('SMARTLEDGER', 12, 15)
      doc.setFontSize(12)
      doc.text('Inventory Valuation & Stock Report', 12, 23)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 12, 29)
      doc.text(`Products: ${items.length}   |   Total Units: ${totalUnits.toLocaleString('en-IN')}   |   Stock Cost: INR ${stockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}   |   Retail Value: INR ${retailValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 12, 35)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      let x = startX
      columns.forEach((col, i) => {
        doc.text(col, x + 1, y)
        x += widths[i]
      })
      doc.line(startX, y + 2, pageWidth - 12, y + 2)
      y += 8
    }

    heading()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    items.forEach((item, index) => {
      if (y > pageHeight - 18) {
        doc.addPage()
        y = 43
        heading()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
      }
      const purchasePrice = Number(item.purchase) || 0
      const sellingPrice = Number(item.selling) || 0
      const stock = Number(item.stock) || 0
      const values = [
        item.name,
        item.sku || '-',
        purchasePrice.toFixed(2),
        sellingPrice.toFixed(2),
        (sellingPrice - purchasePrice).toFixed(2),
        String(stock),
        (Math.max(0, stock) * purchasePrice).toFixed(2),
        (stock * sellingPrice).toFixed(2)
      ]
      let x = startX
      values.forEach((value, i) => {
        const text = doc.splitTextToSize(String(value), widths[i] - 3)
        doc.text(text, x + 1, y)
        x += widths[i]
      })
      y += 7
      if (index === items.length - 1) doc.line(startX, y - 3, pageWidth - 12, y - 3)
    })

    y += 5
    if (y > pageHeight - 35) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.text('LOW / OUT OF STOCK ITEMS', 12, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    const alerts = items.filter(x => Number(x.stock) <= Math.max(0, Number(lowLimit) || 0))
    if (!alerts.length) {
      doc.text('No low-stock items.', 12, y)
    } else {
      alerts.forEach(item => {
        if (y > pageHeight - 12) {
          doc.addPage()
          y = 18
        }
        doc.text(`${item.name}  |  Stock: ${item.stock}  |  Category: ${item.category || 'General'}`, 12, y)
        y += 6
      })
    }

    doc.save('SmartLedger-Inventory-Report.pdf')
  }

  
  const filteredAdjustments = adjustments.filter(x => {
    const movement = x.movement || (x.change > 0 ? 'Stock In' : 'Stock Out')
  
  return (movementFilter === 'All Movements' || movement === movementFilter) &&
      `${x.product} ${x.reason} ${x.date}`.toLowerCase().includes(movementSearch.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date))

  function addProduct() {
    if (addProductLock.current) return;
    addProductLock.current = true;
    const reject = (message: string) => { addProductLock.current = false; alert(message); };
    const purchaseValue = Number(purchase);
    const sellingValue = Number(selling);
    const wholesaleValue = Number(wholesale || 0);
    const stockValue = Number(qty);
    const gstValue = Number(gstRate);
    if (!name.trim() || !Number.isFinite(sellingValue) || sellingValue <= 0 || !Number.isFinite(purchaseValue) || purchaseValue < 0 || !Number.isFinite(wholesaleValue) || wholesaleValue < 0 || !Number.isFinite(stockValue) || stockValue < 0 || !Number.isFinite(gstValue) || gstValue < 0 || gstValue > 100) {
      return reject('Enter a product name, valid prices and opening stock.')
    }
    if (items.some(x => x.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      return reject('A product with this name already exists.')
    }
    if (sku.trim() && items.some(x => (x.sku || '').toLowerCase() === sku.trim().toLowerCase())) {
      return reject('This SKU already exists.')
    }

    const newProduct = {
      id: crypto.randomUUID(),
      name: name.trim(),
      sku: sku.trim(),
      category: group.trim() || 'General',
      hsn: hsn.trim(),
      gstRate: gstValue,
      purchase: purchaseValue,
      averageCost: purchaseValue > 0 ? purchaseValue : null,
      selling: sellingValue,
      wholesale: wholesaleValue,
      stock: stockValue
    }
    const next = [...items, newProduct]
    saveItems(next)
    if (stockValue > 0) {
      saveAdjustments([{
        id: crypto.randomUUID(),
        date: localDateISO(),
        productId: newProduct.id,
        product: newProduct.name,
        change: stockValue,
        reason: 'Opening stock',
        movement: 'Stock In',
        stockAfter: stockValue
      }, ...adjustments])
    }
    setName('')
    setSku('')
    setHsn('')
    setGstRate('0')
    setPurchase('')
    setSelling('')
    setWholesale('')
    setQty('')
    addProductLock.current = false;
    alert('Product added successfully.')
  }

  function openEdit(product: Product) { setEditingProduct(product); setEditDraft({ ...product }); }

  function saveEdit() {
    if (!editingProduct || !editDraft) return;
    const draft = { ...editDraft, name: editDraft.name.trim(), sku: String(editDraft.sku || '').trim(), category: String(editDraft.category || 'General').trim() || 'General', purchase: Number(editDraft.purchase), averageCost: editDraft.averageCost === null || editDraft.averageCost === undefined ? null : Number(editDraft.averageCost), selling: Number(editDraft.selling), wholesale: Number(editDraft.wholesale || 0), stock: Number(editDraft.stock), gstRate: Number(editDraft.gstRate || 0) };
    if (!draft.name || ![draft.purchase,draft.selling,draft.wholesale,draft.stock,draft.gstRate].every(Number.isFinite) || (draft.averageCost !== null && (!Number.isFinite(draft.averageCost) || draft.averageCost < 0)) || draft.purchase < 0 || draft.selling < 0 || draft.wholesale < 0 || draft.stock < 0 || draft.gstRate < 0 || draft.gstRate > 100) { alert('Check item name, prices, stock and GST rate.'); return; }
    if (items.some(x => x.id !== editingProduct.id && x.name.trim().toLowerCase() === draft.name.toLowerCase())) { alert('Another item already uses this name.'); return; }
    if (draft.sku && items.some(x => x.id !== editingProduct.id && String(x.sku || '').toLowerCase() === draft.sku.toLowerCase())) { alert('This SKU / barcode is already used.'); return; }
    const history = read<any>('smartledger-pro-price-history'); const now = new Date().toISOString();
    if (Number(editingProduct.purchase) !== draft.purchase) history.unshift({ id: crypto.randomUUID(), productId: draft.id, productName: draft.name, field: 'purchase', oldPrice: Number(editingProduct.purchase)||0, newPrice: draft.purchase, date: localDateISO(), savedAt: now, source: 'Inventory item edit' });
    if (Number(editingProduct.selling) !== draft.selling) history.unshift({ id: crypto.randomUUID(), productId: draft.id, productName: draft.name, field: 'selling', oldPrice: Number(editingProduct.selling)||0, newPrice: draft.selling, date: localDateISO(), savedAt: now, source: 'Inventory item edit' });
    if (Number(editingProduct.averageCost ?? editingProduct.purchase) !== Number(draft.averageCost ?? draft.purchase)) history.unshift({ id: crypto.randomUUID(), productId: draft.id, productName: draft.name, field: 'averageCost', oldPrice: Number(editingProduct.averageCost ?? editingProduct.purchase)||0, newPrice: Number(draft.averageCost ?? draft.purchase)||0, date: localDateISO(), savedAt: now, source: 'Inventory item edit' });
    localStorage.setItem('smartledger-pro-price-history', JSON.stringify(history));
    const stockDelta = draft.stock - Number(editingProduct.stock || 0); const next = items.map(x => x.id === draft.id ? draft : x); saveItems(next);
    if (stockDelta) saveAdjustments([{ id: crypto.randomUUID(), date: localDateISO(), productId: draft.id, product: draft.name, change: stockDelta, movement: stockDelta > 0 ? 'Stock In' : 'Stock Out', stockAfter: draft.stock, reason: 'Manual item edit / stock correction' }, ...adjustments]);
    setEditingProduct(null); setEditDraft(null);
  }

  function changeStock() {
    if (stockAdjustLock.current) return;
    stockAdjustLock.current = true;
    const reject = (message: string) => { stockAdjustLock.current = false; alert(message); };
    const product = items.find(x => String(x.id) === adjustProduct)
    const change = Number(adjustQty)
    if (!product || !Number.isFinite(change) || change === 0) {
      return reject('Select a product and enter a non-zero stock change.')
    }
    if (!Number.isFinite(Number(product.stock)) || Number(product.stock) + change < 0) {
      return reject('Stock cannot become negative.')
    }

    saveItems(items.map(x =>
      x.id === product.id ? { ...x, stock: Number(x.stock) + change } : x
    ))

    saveAdjustments([{
      id: crypto.randomUUID(),
      date: localDateISO(),
      productId: product.id,
      product: product.name,
      change,
 movement: change > 0 ? 'Stock In' : 'Stock Out',
 stockAfter: Number(product.stock) + change,
 
      reason: reason.trim() || 'Stock correction'
    }, ...adjustments])

    setAdjustQty('')
    stockAdjustLock.current = false;
    alert('Stock adjusted and recorded.')
  }

  return (
    <section data-sl-inventory-root="true" className="sl-inventory-page space-y-5">
      <DataBackup />

      <div>
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <p className="text-sm text-[var(--text-2)]">Products, stock valuation, alerts and stock corrections.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Products', value: items.length, icon: Package },
          { label: 'Total Units', value: totalUnits.toLocaleString('en-IN'), icon: ClipboardList },
          { label: 'Stock Cost Value', value: money(stockValue), icon: IndianRupee },
          { label: 'Low Stock Items', value: lowStock.length, icon: AlertTriangle },
          { label: 'Out of Stock', value: outOfStock.length, icon: Package }
        ].map(card => {
          const Icon = card.icon
          return <div data-sl-page="true" data-sl-inventory="true" key={card.label} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-[var(--text-2)]">
              {card.label}<Icon size={19} />
            </div>
            <strong className="mt-2 block text-xl">{card.value}</strong>
          </div>
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setShowAddForm(v=>!v)} className="flex items-center gap-2 rounded-xl sl-primary px-4 py-3 text-sm font-semibold text-white"><Plus size={17}/>{showAddForm?'Close product form':'Add new item'}</button>
        <button type="button" onClick={()=>document.getElementById('stock-adjustment')?.scrollIntoView({behavior:'smooth',block:'start'})} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"><ClipboardList size={17}/>Adjust stock</button>
        <button type="button" onClick={exportInventoryCsv} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"><FileSpreadsheet size={17}/>Export CSV</button>
        <button type="button" onClick={exportInventoryPdf} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold"><FileDown size={17}/>Stock report</button>
      </div>

      {showAddForm && <div id="add-product" className="scroll-mt-28 rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Add New Product</h2><button type="button" onClick={()=>setShowAddForm(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">Close</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Product name
            <input className="mt-1 w-full rounded-lg border p-3" value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
          </label>
          <label className="text-sm">SKU / Barcode
            <input className="mt-1 w-full rounded-lg border p-3" value={sku} onChange={e => setSku(e.target.value)} placeholder="Optional code" />
          </label>
          <label className="text-sm">Category
            <input className="mt-1 w-full rounded-lg border p-3" value={group} onChange={e => setGroup(e.target.value)} placeholder="General" />
          </label>
          <label className="text-sm">HSN / SAC code
            <input className="mt-1 w-full rounded-lg border p-3" value={hsn} onChange={e => setHsn(e.target.value)} placeholder="Enter HSN / SAC" />
          </label>
          <label className="text-sm">GST rate
            <select className="mt-1 w-full rounded-lg border p-3" value={gstRate} onChange={e => setGstRate(e.target.value)}>
              {['0','5','12','18','28'].map(x => <option key={x} value={x}>{x}%</option>)}
            </select>
          </label>
          <label className="text-sm">Purchase price
            <input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={purchase} onChange={e => setPurchase(e.target.value)} placeholder="0.00" />
          </label>
          <label className="text-sm">Selling price
            <input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={selling} onChange={e => setSelling(e.target.value)} placeholder="0.00" />
          </label>
          <label className="text-sm">Opening stock
            <input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </label>
        </div>
          <label className="text-sm">Wholesale price
            <input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={wholesale} onChange={e => setWholesale(e.target.value)} placeholder="0.00" />
          </label>
        <button onClick={addProduct} className="flex items-center gap-2 rounded-lg sl-primary px-5 py-3 font-semibold text-white">
          <Plus size={18} /> Add Product
        </button>
      </div>}

      <div id="stock-adjustment" className="scroll-mt-28 rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Stock Adjustment</h2>
        <p className="text-sm text-[var(--text-2)]">Use positive quantity for stock inward and negative quantity for stock reduction. Every adjustment is recorded.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="rounded-lg border p-3" value={adjustProduct} onChange={e => setAdjustProduct(e.target.value)}>
            <option value="">Select product</option>
            {items.map(x => <option key={x.id} value={String(x.id)}>{x.name} — {x.stock} in stock</option>)}
          </select>
          <input type="number" step="any" className="rounded-lg border p-3" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Quantity change (+ / -)" />
          <input className="rounded-lg border p-3" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" />
        </div>
        <button onClick={changeStock} className="rounded-lg border border-[var(--indigo)] px-5 py-3 font-semibold text-[var(--indigo)]">Apply Adjustment</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-sm text-[var(--text-2)]">Estimated Retail Stock Value</p>
          <strong className="text-xl">{money(retailValue)}</strong>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <label className="text-sm text-[var(--text-2)]">Low stock alert threshold
            <input type="number" min="0" className="mt-1 block w-full rounded-lg border p-2" value={lowLimit} onChange={e => setLowLimit(e.target.value)} />
          </label>
          <p className="mt-2 text-sm text-[var(--amber)]">{lowStock.length} products at or below this quantity.</p>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Product Stock ({filtered.length})</h2>
            <p className="text-xs text-[var(--text-2)]">Inventory valuation, pricing and margin report</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportInventoryCsv} className="flex items-center gap-2 rounded-lg border border-[var(--indigo)] px-3 py-2 text-sm font-medium text-[var(--indigo)]">
              <FileSpreadsheet size={16} /> Export CSV
            </button>
            <button onClick={exportInventoryPdf} className="flex items-center gap-2 rounded-lg sl-primary px-3 py-2 text-sm font-medium text-white">
              <FileDown size={16} /> Download PDF
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-lg border px-3">
              <Search size={17} className="text-[var(--text-2)]" />
              <input className="min-w-0 p-2 outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or SKU" />
            </div>
            <select className="rounded-lg border p-2" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(x => <option key={x}>{x}</option>)}
            </select>
            <select className="rounded-lg border p-2" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="stock">Sort: Stock</option>
              <option value="purchase">Sort: Purchase Price</option>
              <option value="selling">Sort: Selling Price</option>
              <option value="margin">Sort: Profit / Unit</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['All Stock', 'Low Stock', 'Out of Stock'].map(filter => (
            <button key={filter} onClick={() => setStockFilter(filter)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${stockFilter === filter ? 'sl-primary text-white' : 'border border-[var(--indigo)] text-[var(--indigo)]'}`}>
              {filter}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-[var(--text-2)]">
              <th className="p-2">No.</th><th className="p-2">Product</th><th className="p-2">SKU</th><th className="p-2">HSN/SAC</th><th className="p-2">GST</th><th className="p-2">Category</th>
              <th className="p-2">Last Purchase</th><th className="p-2">Average Cost</th><th className="p-2">Wholesale</th><th className="p-2">Selling</th><th className="p-2">Profit / Unit</th><th className="p-2">Stock</th><th className="p-2">Stock Value</th><th className="p-2">Actions</th>
            </tr></thead>
            <tbody>{visibleItems.map((x, index) => <tr key={x.id} className="border-b hover:bg-[var(--surface-2)]">
              <td className="p-2 text-[var(--text-2)]">{index + 1}</td><td className="p-2 font-medium">{x.name}</td>
              <td className="p-2">{x.sku || '—'}</td>
              <td className="p-2">{x.hsn || '—'}</td>
              <td className="p-2">{Number(x.gstRate) || 0}%</td>
              <td className="p-2">{x.category || 'General'}</td>
              <td className="p-2">{money(Number(x.purchase) || 0)}</td>
              <td className="p-2">{money(Number(x.averageCost ?? x.purchase) || 0)}</td>
              <td className="p-2">{money(Number(x.wholesale) || 0)}</td>
              <td className="p-2">{money(Number(x.selling) || 0)}</td>
              <td className="p-2 font-medium">{money((Number(x.selling) || 0) - (Number(x.averageCost ?? x.purchase) || 0))}</td>
              <td className={`p-2 font-semibold ${Number(x.stock) <= Number(lowLimit) ? 'text-[var(--amber)]' : ''}`}>{x.stock}</td>
              <td className="p-2">{money(Math.max(0, Number(x.stock) || 0) * (Number(x.averageCost ?? x.purchase) || 0))}</td>
              <td className="p-2"><button type="button" onClick={() => openEdit(x)} title="Edit item and adjust stock" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"><Pencil size={14}/> Edit / Adjust</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-6 text-center text-[var(--text-2)]">No matching products found.</p>}
      </div>

      {editingProduct && editDraft && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Edit inventory item"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Edit item</h2><p className="text-xs text-[var(--text-2)]">Stock changes are recorded in audit history.</p></div><button type="button" onClick={()=>{setEditingProduct(null);setEditDraft(null)}} className="rounded-lg border p-2" aria-label="Close"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2">{([{key:'name',label:'Item name',type:'text'},{key:'sku',label:'SKU / Barcode',type:'text'},{key:'category',label:'Category',type:'text'},{key:'hsn',label:'HSN / SAC',type:'text'},{key:'purchase',label:'Last purchase price',type:'number'},{key:'averageCost',label:'Weighted average cost',type:'number'},{key:'selling',label:'Selling price',type:'number'},{key:'wholesale',label:'Wholesale price',type:'number'},{key:'stock',label:'Current stock (adjustable)',type:'number'},{key:'gstRate',label:'GST %',type:'number'}] as const).map(field=><label key={field.key} className="text-sm">{field.label}<input type={field.type} min={field.type==='number'?0:undefined} step={field.type==='number'?'any':undefined} value={String(editDraft[field.key] ?? '')} onChange={e=>setEditDraft({ ...editDraft, [field.key]: field.type==='number' ? (field.key==='averageCost' && e.target.value==='' ? null : Number(e.target.value)) : e.target.value })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"/></label>)}</div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>{setEditingProduct(null);setEditDraft(null)}} className="rounded-xl border px-4 py-3 text-sm">Cancel</button><button type="button" onClick={saveEdit} className="rounded-xl sl-primary px-5 py-3 text-sm font-semibold text-white">Save changes</button></div></div></div>}

      <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Stock Movement & Audit History</h2>
            <p className="text-sm text-[var(--text-2)]">Recorded stock inward, outward and corrections.</p>
          </div>
          <input className="rounded-lg border p-2" value={movementSearch}
            onChange={e => setMovementSearch(e.target.value)}
            placeholder="Search product, reason or date" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All Movements', 'Stock In', 'Stock Out', 'Correction'].map(x => (
            <button key={x} onClick={() => setMovementFilter(x)}
              className={`rounded-lg px-3 py-2 text-sm ${movementFilter === x ? 'sl-primary text-white' : 'border text-[var(--indigo)]'}`}>
              {x}
            </button>
          ))}
        </div>
        {filteredAdjustments.length ? <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-[var(--text-2)]">
              <th className="p-2">Date</th>
              <th className="p-2">Product</th>
              <th className="p-2">Movement</th>
              <th className="p-2">Qty Change</th>
              <th className="p-2">Stock After</th>
              <th className="p-2">Reason</th>
            </tr></thead>
            <tbody>{filteredAdjustments.slice(0, 100).map(x => {
              const movement = x.movement || (x.change > 0 ? 'Stock In' : 'Stock Out')
              return <tr key={x.id} className="border-b">
                <td className="p-2">{x.date}</td>
                <td className="p-2">{x.product}</td>
                <td className="p-2">{movement}</td>
                <td className={`p-2 font-semibold ${x.change > 0 ? 'text-[var(--emerald)]' : 'text-[var(--rose)]'}`}>{x.change > 0 ? '+' : ''}{x.change}</td>
                <td className="p-2">{x.stockAfter ?? '—'}</td>
                <td className="p-2">{x.reason}</td>
              </tr>
            })}</tbody>
          </table>
        </div> : <p className="py-4 text-sm text-[var(--text-2)]">No matching stock movements found.</p>}
      </div>
    </section>
  )
}
