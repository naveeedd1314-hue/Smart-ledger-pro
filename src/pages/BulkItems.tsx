import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { localDateISO } from '../lib/dateUtils';
import { Download, Search } from 'lucide-react'

type Product = {
  id: string | number
  name: string
  selling: number
  purchase: number
  averageCost?: number | null
  stock: number
  sku?: string
  category?: string
  hsn?: string
  gstRate?: number
  wholesale?: number
}

const KEY = 'smartledger-products'
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const read = (key: string = KEY): Product[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = [',', '\t', ';'].sort((a,b) => firstLine.split(b).length - firstLine.split(a).length)[0]
  let row: string[] = [], value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' && quoted && text[i + 1] === '"') { value += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === delimiter && !quoted) { row.push(value.trim()); value = '' }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(value.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []; value = ''
    } else value += c
  }
  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export default function BulkItems() {
  const [items, setItems] = useState<Product[]>(read)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [preview, setPreview] = useState<Product[]>([])
  const [message, setMessage] = useState('')
  const [field, setField] = useState<'selling' | 'purchase'>('selling')
  const [mode, setMode] = useState<'increase' | 'decrease' | 'set'>('increase')
  const [amount, setAmount] = useState('')
  const [stockChange, setStockChange] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const save = (next: Product[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setItems(next)
    setSelected([])
  }
  const filtered = useMemo(() => items.filter(p =>
    `${p.name} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [items, search])

  const exportCSV = () => {
    const rows = [
      ['id','name','sku','category','hsn','gstRate','purchase','averageCost','selling','stock'],
      ...items.map(p => [p.id,p.name,p.sku || '',p.category || '',p.hsn || '',p.gstRate || 0,p.purchase,p.averageCost ?? p.purchase,p.selling,p.stock])
    ]
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'SmartLedger-Items.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const importCSV = async (file?: File) => {
    if (!file) return
    try {
      const extension = file.name.toLowerCase().split('.').pop()
      let rows: string[][] = []
      if (extension === 'xls' || extension === 'xlsx') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) throw new Error('The workbook does not contain a readable worksheet.')
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][]
      } else if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
        rows = parseCSV(await file.text())
      } else {
        throw new Error('Choose an Excel (.xls, .xlsx) or CSV/TSV file.')
      }
      rows = rows.map(row => row.map(value => String(value ?? '').trim()))
      const aliases: Record<string, string[]> = {
        name: ['name','product','item','itemname','productname','itemdescription','description','stockitem','particulars','itemparticulars'],
        sku: ['sku','barcode','itemcode','productcode','code','itemid','itemnumber','articlecode'],
        category: ['category','group','itemgroup','productgroup','brand','stockgroup'],
        hsn: ['hsn','hsncode','hsnsac','hsnsaccode'],
        gstRate: ['gstrate','gst','gstpercentage','gstpercent','taxpercentage','taxrate','igstpercent','taxpercent'],
        purchase: ['purchase','purchaseprice','purchasecost','cost','costprice','landingcost','buyprice','rateofpurchase','lastpurchaseprice','pricerate'],
        averageCost: ['averagecost','weightedaveragecost','avgcost','averagepurchaseprice'],
        selling: ['selling','sellingprice','salesprice','saleprice','retailprice','mrp','rate','unitprice','salesrate'],
        wholesale: ['wholesale','wholesaleprice','tradeprice','dealerprice'],
        stock: ['stock','qty','quantity','openingstock','currentstock','closingstock','availableqty','balanceqty','openingquantity','physicalstock'],
      }
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
      const headerRowIndex = rows.findIndex(row => {
        const normalized = row.map(normalize)
        return aliases.name.some(alias => normalized.includes(alias))
      })
      if (headerRowIndex < 0) throw new Error('Could not identify the product-name column. Use the SmartLedger Excel template or include a heading such as Item Name / Product Name.')
      const headers = rows[headerRowIndex].map(normalize)
      const get = (row: string[], field: string) => {
        const index = headers.findIndex(header => aliases[field].includes(header))
        return index < 0 ? '' : String(row[index] ?? '').trim()
      }
      const errors: string[] = []
      const parsed: Product[] = []
      rows.slice(headerRowIndex + 1).forEach((row, offset) => {
        if (!row.some(value => String(value ?? '').trim())) return
        const rowNumber = headerRowIndex + offset + 2
        const name = get(row, 'name')
        if (!name) { errors.push(`Row ${rowNumber}: product name is missing.`); return }
        const number = (field: string, label: string, optional = false) => {
          const raw = get(row, field).replace(/[₹,\s]/g, '').replace(/%$/, '')
          if (!raw && optional) return null
          if (!raw) return 0
          const value = Number(raw)
          if (!Number.isFinite(value) || value < 0) {
            errors.push(`Row ${rowNumber}: invalid ${label} value ("${get(row, field)}").`)
            return 0
          }
          return value
        }
        const gst = number('gstRate', 'GST rate', true)
        if (gst !== null && gst > 100) errors.push(`Row ${rowNumber}: GST rate cannot exceed 100%.`)
        const purchase = number('purchase', 'purchase price')
        const averageCost = number('averageCost', 'average cost', true)
        const selling = number('selling', 'selling price')
        const wholesale = number('wholesale', 'wholesale price')
        const stock = number('stock', 'opening stock')
        if (selling !== null && selling <= 0) errors.push(`Row ${rowNumber}: selling price must be greater than zero.`)
        parsed.push({
          id: crypto.randomUUID(),
          name,
          sku: get(row, 'sku'),
          category: get(row, 'category') || 'General',
          hsn: get(row, 'hsn'),
          gstRate: gst ?? 0,
          purchase: purchase ?? 0,
          averageCost: averageCost !== null && averageCost > 0 ? averageCost : null,
          selling: selling ?? 0,
          wholesale: wholesale ?? 0,
          stock: stock ?? 0,
        })
      })
      if (errors.length) {
        setPreview([])
        setMessage(`Import stopped: ${errors.slice(0, 8).join(' ')}${errors.length > 8 ? ` And ${errors.length - 8} more error(s).` : ''}`)
        return
      }
      if (!parsed.length) {
        setPreview([])
        setMessage('No product rows found below the heading row.')
        return
      }
      const existingConflicts = parsed.filter(product => {
        const sku = String(product.sku || '').trim().toLowerCase()
        const name = String(product.name || '').trim().toLowerCase()
        const skuMatch = sku ? items.find(x => String(x.sku || '').trim().toLowerCase() === sku) : undefined
        const nameMatch = items.find(x => String(x.name || '').trim().toLowerCase() === name)
        return Boolean(skuMatch && nameMatch && String(skuMatch.id) !== String(nameMatch.id))
      })
      if (existingConflicts.length) {
        setPreview([])
        setMessage(`Import stopped: ${existingConflicts.length} row(s) have an SKU/barcode that belongs to a different existing item than the product name. Correct those conflicts before importing.`)
        return
      }
      const seenSkus = new Set<string>()
      const seenNames = new Set<string>()
      const duplicates = parsed.filter(product => {
        const sku = String(product.sku || '').trim().toLowerCase()
        const name = String(product.name || '').trim().toLowerCase()
        const duplicate = (sku && seenSkus.has(sku)) || seenNames.has(name)
        if (sku) seenSkus.add(sku)
        seenNames.add(name)
        return duplicate
      })
      if (duplicates.length) {
        setPreview([])
        setMessage(`Import stopped: ${duplicates.length} duplicate product row(s) were found inside this file. Remove duplicates and retry.`)
        return
      }
      setPreview(parsed)
      setMessage(`${parsed.length} products read from ${file.name}. Review the preview, then apply import. Existing items match by barcode/SKU or name.`)
    } catch (error) {
      setPreview([])
      setMessage(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed. Check the file format and try again.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const downloadExcelTemplate = () => {
    const headers = [['Product Name','Barcode / SKU','Category','HSN Code','GST Rate','Purchase Price','Average Cost','Wholesale Price','Selling Price','Opening Stock']]
    const sample = [['Example Notebook','890000000001','Stationery','4820','12','20','20','22','25','100']]
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...sample])
    worksheet['!cols'] = [{wch:24},{wch:18},{wch:18},{wch:14},{wch:12},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
    XLSX.writeFile(workbook, 'SmartLedger-Bulk-Import-Template.xlsx')
  }

  const applyImport = () => {
    const next = [...items]
    const logs = read('smartledger-pro-stock-adjustments') as any[]
    const priceHistory = read('smartledger-pro-price-history') as any[]
    let added = 0, updated = 0
    preview.forEach(p => {
      const index = next.findIndex(x =>
        (p.sku && x.sku && p.sku.toLowerCase() === x.sku.toLowerCase()) ||
        x.name.toLowerCase() === p.name.toLowerCase()
      )
      const previous = index >= 0 ? next[index] : null
      const previousStock = Number(previous?.stock || 0)
      let savedProductId: string | number
      if (index >= 0) {
        const current = next[index]
        const savedAt = new Date().toISOString()
        if (Number(current.purchase) !== Number(p.purchase)) priceHistory.unshift({ id: crypto.randomUUID(), productId: current.id, productName: p.name, field: 'purchase', oldPrice: Number(current.purchase) || 0, newPrice: p.purchase, date: savedAt.slice(0,10), savedAt, source: 'Bulk item import' })
        if (Number(current.selling) !== Number(p.selling)) priceHistory.unshift({ id: crypto.randomUUID(), productId: current.id, productName: p.name, field: 'selling', oldPrice: Number(current.selling) || 0, newPrice: p.selling, date: savedAt.slice(0,10), savedAt, source: 'Bulk item import' })
        next[index] = { ...current, ...p, averageCost: p.averageCost ?? current.averageCost ?? (Number(current.purchase) > 0 ? Number(current.purchase) : null), id: current.id }; savedProductId = current.id; updated++
      }
      else { const imported = { ...p, averageCost: p.averageCost ?? (Number(p.purchase) > 0 ? Number(p.purchase) : null) }; const uniqueProduct = next.some(x => String(x.id) === String(p.id)) ? { ...imported, id: crypto.randomUUID() } : imported; next.push(uniqueProduct); savedProductId = uniqueProduct.id; added++ }
      const change = Number(p.stock || 0) - previousStock
      if (change !== 0) logs.unshift({ id: crypto.randomUUID(), date: localDateISO(), productId: savedProductId, product: p.name, change, movement: change > 0 ? 'Stock In' : 'Stock Out', stockAfter: Number(p.stock || 0), reason: 'Bulk item import' })
    })
    localStorage.setItem('smartledger-pro-stock-adjustments', JSON.stringify(logs))
    localStorage.setItem('smartledger-pro-price-history', JSON.stringify(priceHistory))
    save(next); setPreview([])
    setMessage(`${added} items added; ${updated} existing items updated. Stock changes were added to the audit history.`)
  }

  const updatePrices = () => {
    const n = Number(amount)
    if (!selected.length || amount === '' || !Number.isFinite(n) || n < 0 || (mode === 'decrease' && n > 100)) {
      setMessage(mode === 'decrease' && n > 100 ? 'A price decrease cannot exceed 100%.' : 'Select items and enter a valid value.'); return
    }
    const history = read('smartledger-pro-price-history') as any[]
    const next = items.map(p => {
      if (!selected.includes(String(p.id))) return p
      const old = Number(p[field]) || 0
      const value = mode === 'set' ? n : mode === 'increase' ? old * (1+n/100) : old * (1-n/100)
      const updated = Math.max(0, Number(value.toFixed(2)))
      if (updated !== old) history.unshift({ id: crypto.randomUUID(), productId: p.id, productName: p.name, field, oldPrice: old, newPrice: updated, date: localDateISO(), savedAt: new Date().toISOString(), source: 'Bulk Items price update' })
      return { ...p, [field]: updated }
    })
    localStorage.setItem('smartledger-pro-price-history', JSON.stringify(history))
    save(next)
    setAmount(''); setMessage('Selected item prices updated and dated price history recorded.')
  }

  const updateStock = () => {
    const n = Number(stockChange)
    if (!selected.length || !Number.isInteger(n) || !n) {
      setMessage('Select items and enter a non-zero whole number.'); return
    }
    if (items.some(p => selected.includes(String(p.id)) && Number(p.stock || 0) + n < 0)) {
      setMessage('Cancelled: this adjustment would create negative stock.'); return
    }
    const next = items.map(p => selected.includes(String(p.id)) ? { ...p, stock: Number(p.stock || 0) + n } : p)
    const logs = read('smartledger-pro-stock-adjustments') as any[]
    items.filter(p => selected.includes(String(p.id))).forEach(p => {
      const after = Number(p.stock || 0) + n
      logs.unshift({ id: crypto.randomUUID(), date: localDateISO(), productId: p.id, product: p.name, change: n, movement: n > 0 ? 'Stock In' : 'Stock Out', stockAfter: after, reason: 'Bulk stock adjustment' })
    })
    localStorage.setItem('smartledger-pro-stock-adjustments', JSON.stringify(logs))
    save(next)
    setStockChange(''); setMessage('Selected item stock updated and audit history recorded.')
  }

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s,id])

  return <div data-sl-page="true" className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Bulk Items</h2><p className="mt-1 text-sm text-[var(--text-2)]">Manage many inventory items together.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={downloadExcelTemplate} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold"><Download size={17}/> Excel Template</button><button onClick={exportCSV} className="flex items-center gap-2 rounded-xl bg-[var(--indigo-ink)] px-4 py-3 text-sm font-semibold text-white"><Download size={17}/> Export CSV</button></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-[var(--surface)] p-5"><p className="text-sm text-[var(--text-2)]">Products</p><p className="mt-2 text-2xl font-bold">{items.length}</p></div>
      <div className="rounded-2xl border bg-[var(--surface)] p-5"><p className="text-sm text-[var(--text-2)]">Stock units</p><p className="mt-2 text-2xl font-bold">{items.reduce((s,p)=>s+(Number(p.stock)||0),0).toLocaleString('en-IN')}</p></div>
      <div className="rounded-2xl border bg-[var(--surface)] p-5"><p className="text-sm text-[var(--text-2)]">Stock value at cost</p><p className="mt-2 text-2xl font-bold">{money(items.reduce((s,p)=>s+Math.max(0,Number(p.stock)||0)*(Number(p.averageCost ?? p.purchase)||0),0))}</p></div>
    </div>

    <section className="rounded-2xl border bg-[var(--surface)] p-5">
      <h3 className="font-bold">Bulk import · Vyapar · Marg Books · myBillBook</h3>
      <p className="mt-1 text-xs text-[var(--text-2)]">Import Excel (.xls/.xlsx), CSV or tab-separated exports from Vyapar, Marg Books, myBillBook or other apps. Columns are detected automatically even when reordered or preceded by report headings. Supports product name, SKU/barcode, category, HSN, GST, purchase/average/wholesale/selling prices and opening stock. Download the Excel template for the recommended format.</p>
      <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv,.tsv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values,text/plain" onChange={e=>importCSV(e.target.files?.[0])} className="mt-4 block max-w-full text-sm"/>
      {preview.length > 0 && <div className="mt-4">
        <p className="mb-2 text-sm font-semibold">{preview.length} rows to import</p>
        <div className="max-h-56 overflow-auto rounded-xl border">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[var(--bg)]"><tr>{['Name','SKU','Purchase','Selling','Stock'].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead>
          <tbody>{preview.slice(0,100).map((p,i)=><tr className="border-t" key={i}><td className="p-2">{p.name}</td><td className="p-2">{p.sku || '—'}</td><td className="p-2">{money(p.purchase)}</td><td className="p-2">{money(p.selling)}</td><td className="p-2">{p.stock}</td></tr>)}</tbody></table>
        </div>
        <button onClick={applyImport} className="mt-3 rounded-xl bg-[var(--indigo-ink)] px-4 py-2 text-sm font-semibold text-white">Apply import</button>
        <button onClick={()=>setPreview([])} className="ml-2 rounded-xl border px-4 py-2 text-sm">Cancel</button>
      </div>}
    </section>

    <section className="rounded-2xl border bg-[var(--surface)] p-5">
      <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">Bulk updates</h3><p className="mt-1 text-xs text-[var(--text-2)]">{selected.length} selected</p></div><button onClick={()=>setSelected(filtered.map(p=>String(p.id)))} className="text-xs font-semibold text-[var(--indigo)]">Select filtered</button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[var(--bg)] p-4"><p className="mb-3 text-sm font-semibold">Price update</p><div className="flex flex-wrap gap-2">
          <select value={field} onChange={e=>setField(e.target.value as 'selling'|'purchase')} className="min-w-0 flex-1 rounded-lg border bg-[var(--surface)] p-2 text-sm"><option value="selling">Selling</option><option value="purchase">Purchase</option></select>
          <select value={mode} onChange={e=>setMode(e.target.value as 'increase'|'decrease'|'set')} className="min-w-0 flex-1 rounded-lg border bg-[var(--surface)] p-2 text-sm"><option value="increase">Increase %</option><option value="decrease">Decrease %</option><option value="set">Set price</option></select>
          <input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={mode==='set'?'Price':'Percent'} className="w-24 rounded-lg border p-2 text-sm"/>
        </div><button onClick={updatePrices} className="mt-3 rounded-lg bg-[var(--indigo-ink)] px-3 py-2 text-xs font-semibold text-white">Apply price update</button></div>
        <div className="rounded-xl bg-[var(--bg)] p-4"><p className="mb-3 text-sm font-semibold">Stock adjustment</p><p className="text-xs text-[var(--text-2)]">Use positive to add stock and negative to remove stock.</p><div className="mt-2 flex gap-2"><input type="number" step="1" value={stockChange} onChange={e=>setStockChange(e.target.value)} placeholder="e.g. 5 or -2" className="w-36 rounded-lg border p-2 text-sm"/><button onClick={updateStock} className="rounded-lg bg-[var(--indigo-ink)] px-3 py-2 text-xs font-semibold text-white">Adjust</button></div></div>
      </div>
    </section>

    {message && <p className="rounded-xl bg-[var(--indigo-tint)] p-3 text-sm text-[var(--indigo)]">{message}</p>}

    <section className="overflow-hidden rounded-2xl border bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><h3 className="font-bold">Inventory list</h3><div className="flex items-center gap-2 rounded-xl border px-3 py-2"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items" className="w-40 text-sm outline-none"/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[var(--bg)] text-xs text-[#718075]"><tr><th className="p-3">Select</th><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Category</th><th className="p-3 text-right">Last Purchase</th><th className="p-3 text-right">Average Cost</th><th className="p-3 text-right">Selling</th><th className="p-3 text-right">Stock</th></tr></thead><tbody>
        {filtered.map(p=><tr key={p.id} className="border-t border-[var(--border)]"><td className="p-3"><input type="checkbox" checked={selected.includes(String(p.id))} onChange={()=>toggle(String(p.id))}/></td><td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.sku || '—'}</td><td className="p-3">{p.category || 'General'}</td><td className="p-3 text-right">{money(p.purchase)}</td><td className="p-3 text-right">{money(Number(p.averageCost ?? p.purchase) || 0)}</td><td className="p-3 text-right">{money(p.selling)}</td><td className="p-3 text-right font-semibold">{p.stock}</td></tr>)}
      </tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-[var(--text-2)]">No products found.</p>}</div>
    </section>
  </div>
}
