import { useMemo, useRef, useState } from 'react'
import { Download, Search } from 'lucide-react'

type Product = {
  id: string | number
  name: string
  selling: number
  purchase: number
  stock: number
  sku?: string
  category?: string
  hsn?: string
  gstRate?: number
}

const KEY = 'smartledger-products'
const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const read = (): Product[] => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' && quoted && text[i + 1] === '"') { value += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) { row.push(value.trim()); value = '' }
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
      ['id','name','sku','category','hsn','gstRate','purchase','selling','stock'],
      ...items.map(p => [p.id,p.name,p.sku || '',p.category || '',p.hsn || '',p.gstRate || 0,p.purchase,p.selling,p.stock])
    ]
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'SmartLedger-Items.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const importCSV = async (file?: File) => {
    if (!file) return
    const rows = parseCSV(await file.text())
    if (rows.length < 2) { setMessage('No item rows found in CSV.'); return }
    const headers = rows[0].map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ''))
    const get = (r: string[], names: string[], fallback = '') => {
      const i = headers.findIndex(h => names.includes(h))
      return i < 0 ? fallback : r[i] || fallback
    }
    const parsed = rows.slice(1).map((r, i): Product => ({
      id: get(r,['id'],`bulk-${Date.now()}-${i}`),
      name: get(r,['name','product','item']),
      sku: get(r,['sku','barcode']),
      category: get(r,['category','group'],'General'),
      hsn: get(r,['hsn']),
      gstRate: Number(get(r,['gstrate','gst'])) || 0,
      purchase: Number(get(r,['purchase','purchaseprice','cost'])) || 0,
      selling: Number(get(r,['selling','sellingprice','rate'])) || 0,
      stock: Number(get(r,['stock','qty','quantity'])) || 0
    })).filter(p => p.name)
    setPreview(parsed)
    setMessage(`${parsed.length} rows ready. Existing products will be matched by SKU or name.`)
  }

  const applyImport = () => {
    const next = [...items]
    let added = 0, updated = 0
    preview.forEach(p => {
      const index = next.findIndex(x =>
        (p.sku && x.sku && p.sku.toLowerCase() === x.sku.toLowerCase()) ||
        x.name.toLowerCase() === p.name.toLowerCase()
      )
      if (index >= 0) { next[index] = { ...next[index], ...p, id: next[index].id }; updated++ }
      else { next.push(p); added++ }
    })
    save(next); setPreview([])
    setMessage(`${added} items added; ${updated} existing items updated.`)
  }

  const updatePrices = () => {
    const n = Number(amount)
    if (!selected.length || amount === '' || !Number.isFinite(n) || n < 0) {
      setMessage('Select items and enter a valid value.'); return
    }
    save(items.map(p => {
      if (!selected.includes(String(p.id))) return p
      const old = Number(p[field]) || 0
      const value = mode === 'set' ? n : mode === 'increase' ? old * (1+n/100) : old * (1-n/100)
      return { ...p, [field]: Math.max(0, Number(value.toFixed(2))) }
    }))
    setAmount(''); setMessage('Selected item prices updated.')
  }

  const updateStock = () => {
    const n = Number(stockChange)
    if (!selected.length || !Number.isInteger(n) || !n) {
      setMessage('Select items and enter a non-zero whole number.'); return
    }
    if (items.some(p => selected.includes(String(p.id)) && Number(p.stock || 0) + n < 0)) {
      setMessage('Cancelled: this adjustment would create negative stock.'); return
    }
    save(items.map(p => selected.includes(String(p.id)) ? { ...p, stock: Number(p.stock || 0) + n } : p))
    setStockChange(''); setMessage('Selected item stock updated.')
  }

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s,id])

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Bulk Items</h2><p className="mt-1 text-sm text-[#849187]">Manage many inventory items together.</p></div>
      <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl bg-[#183b2b] px-4 py-3 text-sm font-semibold text-white"><Download size={17}/> Export CSV</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#849187]">Products</p><p className="mt-2 text-2xl font-bold">{items.length}</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#849187]">Stock units</p><p className="mt-2 text-2xl font-bold">{items.reduce((s,p)=>s+(Number(p.stock)||0),0).toLocaleString('en-IN')}</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#849187]">Stock value at cost</p><p className="mt-2 text-2xl font-bold">{money(items.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.purchase)||0),0))}</p></div>
    </div>

    <section className="rounded-2xl border bg-white p-5">
      <h3 className="font-bold">CSV import</h3>
      <p className="mt-1 text-xs text-[#849187]">Columns: name, sku, category, hsn, gstRate, purchase, selling, stock. Export CSV to get a template.</p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>importCSV(e.target.files?.[0])} className="mt-4 block max-w-full text-sm"/>
      {preview.length > 0 && <div className="mt-4">
        <p className="mb-2 text-sm font-semibold">{preview.length} rows to import</p>
        <div className="max-h-56 overflow-auto rounded-xl border">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[#f5f3eb]"><tr>{['Name','SKU','Purchase','Selling','Stock'].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead>
          <tbody>{preview.slice(0,100).map((p,i)=><tr className="border-t" key={i}><td className="p-2">{p.name}</td><td className="p-2">{p.sku || '—'}</td><td className="p-2">{money(p.purchase)}</td><td className="p-2">{money(p.selling)}</td><td className="p-2">{p.stock}</td></tr>)}</tbody></table>
        </div>
        <button onClick={applyImport} className="mt-3 rounded-xl bg-[#183b2b] px-4 py-2 text-sm font-semibold text-white">Apply import</button>
        <button onClick={()=>setPreview([])} className="ml-2 rounded-xl border px-4 py-2 text-sm">Cancel</button>
      </div>}
    </section>

    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">Bulk updates</h3><p className="mt-1 text-xs text-[#849187]">{selected.length} selected</p></div><button onClick={()=>setSelected(filtered.map(p=>String(p.id)))} className="text-xs font-semibold text-[#31583e]">Select filtered</button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[#f5f3eb] p-4"><p className="mb-3 text-sm font-semibold">Price update</p><div className="flex flex-wrap gap-2">
          <select value={field} onChange={e=>setField(e.target.value as 'selling'|'purchase')} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"><option value="selling">Selling</option><option value="purchase">Purchase</option></select>
          <select value={mode} onChange={e=>setMode(e.target.value as 'increase'|'decrease'|'set')} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"><option value="increase">Increase %</option><option value="decrease">Decrease %</option><option value="set">Set price</option></select>
          <input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={mode==='set'?'Price':'Percent'} className="w-24 rounded-lg border p-2 text-sm"/>
        </div><button onClick={updatePrices} className="mt-3 rounded-lg bg-[#183b2b] px-3 py-2 text-xs font-semibold text-white">Apply price update</button></div>
        <div className="rounded-xl bg-[#f5f3eb] p-4"><p className="mb-3 text-sm font-semibold">Stock adjustment</p><p className="text-xs text-[#849187]">Use positive to add stock and negative to remove stock.</p><div className="mt-2 flex gap-2"><input type="number" step="1" value={stockChange} onChange={e=>setStockChange(e.target.value)} placeholder="e.g. 5 or -2" className="w-36 rounded-lg border p-2 text-sm"/><button onClick={updateStock} className="rounded-lg bg-[#183b2b] px-3 py-2 text-xs font-semibold text-white">Adjust</button></div></div>
      </div>
    </section>

    {message && <p className="rounded-xl bg-[#edf1e9] p-3 text-sm text-[#31583e]">{message}</p>}

    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><h3 className="font-bold">Inventory list</h3><div className="flex items-center gap-2 rounded-xl border px-3 py-2"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items" className="w-40 text-sm outline-none"/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f5f3eb] text-xs text-[#718075]"><tr><th className="p-3">Select</th><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Category</th><th className="p-3 text-right">Purchase</th><th className="p-3 text-right">Selling</th><th className="p-3 text-right">Stock</th></tr></thead><tbody>
        {filtered.map(p=><tr key={p.id} className="border-t border-[#eeeae0]"><td className="p-3"><input type="checkbox" checked={selected.includes(String(p.id))} onChange={()=>toggle(String(p.id))}/></td><td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.sku || '—'}</td><td className="p-3">{p.category || 'General'}</td><td className="p-3 text-right">{money(p.purchase)}</td><td className="p-3 text-right">{money(p.selling)}</td><td className="p-3 text-right font-semibold">{p.stock}</td></tr>)}
      </tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-[#849187]">No products found.</p>}</div>
    </section>
  </div>
}
