import { useEffect, useState } from 'react';
import { downloadInvoicePdf } from '../utils/invoicePdf';

type Product = { id: string; name: string; selling: number; purchase: number; stock: number; sku?: string; category?: string; gstRate?: number; hsn?: string };
type Sale = { id: string; invoice: string; date: string; customer: string; product: string; qty: number; rate: number; total: number; paid: number; balance: number; purchasePrice?: number | null; taxableValue?: number; gstRate?: number; taxAmount?: number; cgst?: number; sgst?: number; utgst?: number; igst?: number; placeOfSupply?: string; hsn?: string; customerGstin?: string; customerAddress?: string };

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);
  const [paid, setPaid] = useState(0);
  const [applyGST, setApplyGST] = useState(false);
  const [businessState, setBusinessState] = useState('Jammu and Kashmir');
  const [placeOfSupply, setPlaceOfSupply] = useState('Jammu and Kashmir');

  useEffect(() => {
    setProducts(JSON.parse(localStorage.getItem('smartledger-products') || '[]'));
    setSales(JSON.parse(localStorage.getItem('smartledger-pro-sales') || '[]'));
    try {
      const settings = JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}');
      const state = settings.state || 'Jammu and Kashmir';
      setBusinessState(state);
      setPlaceOfSupply(state);
    } catch {}
  }, []);

  const selected = products.find(p => p.id === productId);
  const taxableValue = qty * rate;
  const gstRate = applyGST ? Number(selected?.gstRate) || 0 : 0;
  const taxAmount = taxableValue * gstRate / 100;
  const sameState = placeOfSupply.trim().toLowerCase() === businessState.trim().toLowerCase();
  const isJammuKashmir = businessState.trim().toLowerCase().includes('jammu');
  const cgst = applyGST && sameState ? taxAmount / 2 : 0;
  const sgst = applyGST && sameState && !isJammuKashmir ? taxAmount / 2 : 0;
  const utgst = applyGST && sameState && isJammuKashmir ? taxAmount / 2 : 0;
  const igst = applyGST && !sameState ? taxAmount : 0;
  const total = taxableValue + taxAmount;

  function saveSale() {
    if (!selected || qty <= 0 || rate < 0 || paid < 0 || paid > total || qty > selected.stock) {
      alert('Check product, quantity, stock and payment amount.');
      return;
    }
    let customerDetails: { gstin?: string; address?: string } = {};
    try {
      const customers = JSON.parse(localStorage.getItem('smartledger-pro-customers') || '[]');
      const match = Array.isArray(customers)
        ? customers.find((x: any) => x.name?.trim().toLowerCase() === customer.trim().toLowerCase())
        : undefined;
      if (match) customerDetails = { gstin: match.gstin || '', address: match.address || '' };
    } catch {}

    const sale: Sale = {
      id: crypto.randomUUID(),
      invoice: `SL-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString().slice(0, 10),
      customer: customer.trim() || 'Walk-in Customer',
      product: selected.name,
      qty, rate, total, paid, balance: total - paid, purchasePrice: Number.isFinite(Number(selected.purchase)) && Number(selected.purchase) > 0 ? Number(selected.purchase) : null,
      taxableValue, gstRate, taxAmount, cgst, sgst, utgst, igst,
      placeOfSupply: applyGST ? placeOfSupply : '',
      hsn: selected.hsn || '',
      customerGstin: customerDetails.gstin || '',
      customerAddress: customerDetails.address || ''
    };
    const updatedProducts = products.map(p => p.id === selected.id ? { ...p, stock: p.stock - qty } : p);
    const updatedSales = [sale, ...sales];
    localStorage.setItem('smartledger-products', JSON.stringify(updatedProducts));
    localStorage.setItem('smartledger-pro-sales', JSON.stringify(updatedSales));
    setProducts(updatedProducts);
    setSales(updatedSales);
    setCustomer('Walk-in Customer');
    setProductId('');
    setQty(1);
    setRate(0);
    setPaid(0);
  }

  const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return <section className="space-y-6">
    <div><h1 className="text-2xl font-bold">Sales & Invoices</h1><p className="text-sm text-[var(--text-2)]">Create sales invoices and track customer balances.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Total Sales</p><strong className="text-xl">{money(sales.reduce((s, x) => s + x.total, 0))}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Received</p><strong className="text-xl">{money(sales.reduce((s, x) => s + x.paid, 0))}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">To Collect</p><strong className="text-xl">{money(sales.reduce((s, x) => s + x.balance, 0))}</strong></div>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-lg">New Sales Invoice</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Customer name<input className="mt-1 w-full rounded-lg border p-3" value={customer} onChange={e => setCustomer(e.target.value)} /></label>
        <label className="text-sm">Product<select className="mt-1 w-full rounded-lg border p-3" value={productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setProductId(e.target.value); setRate(p?.selling || 0); }}><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock}</option>)}</select></label>
        <label className="text-sm">Quantity<input type="number" min="1" className="mt-1 w-full rounded-lg border p-3" value={qty} onChange={e => setQty(Number(e.target.value))} /></label>
        <label className="text-sm">Selling rate<input type="number" min="0" className="mt-1 w-full rounded-lg border p-3" value={rate} onChange={e => setRate(Number(e.target.value))} /></label>
        <label className="text-sm">Amount received<input type="number" min="0" className="mt-1 w-full rounded-lg border p-3" value={paid} onChange={e => setPaid(Number(e.target.value))} /></label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={applyGST} onChange={e => setApplyGST(e.target.checked)} />
          Apply GST to this invoice
        </label>
        {applyGST && <label className="text-sm">Place of supply (state / UT)
          <input className="mt-1 w-full rounded-lg border p-3" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
        </label>}
      </div>
      <div className="rounded-lg bg-[var(--surface-2)] p-4 text-sm space-y-2">
        <p>Taxable value: <strong>{money(taxableValue)}</strong></p>
        {applyGST && <>
          <p>GST rate: <strong>{gstRate}%</strong></p>
          <p>CGST: <strong>{money(cgst)}</strong></p>
          {isJammuKashmir && sameState && <p>UTGST: <strong>{money(utgst)}</strong></p>}
          {!isJammuKashmir && sameState && <p>SGST: <strong>{money(sgst)}</strong></p>}
          {!sameState && <p>IGST: <strong>{money(igst)}</strong></p>}
          <p>Total GST: <strong>{money(taxAmount)}</strong></p>
        </>}
        <p>Invoice total: <strong>{money(total)}</strong></p>
        <p>Balance due: <strong>{money(total - paid)}</strong></p>
        <p>Available stock: <strong>{selected?.stock ?? '—'}</strong></p>
      </div>
      <button onClick={saveSale} className="rounded-lg sl-primary px-5 py-3 font-semibold text-white">Save Invoice</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-lg">Recent Sales</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Invoice</th><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Product</th><th className="p-2">Total</th><th className="p-2">Paid</th><th className="p-2">Due</th><th className="p-2">PDF</th></tr></thead>
        <tbody>{sales.map(s => <tr key={s.id} className="border-b border-[#eee9dd] hover:bg-[var(--surface-2)]"><td className="p-2">{s.invoice}</td><td className="p-2">{s.date}</td><td className="p-2">{s.customer}</td><td className="p-2">{s.product} × {s.qty}</td><td className="p-2">{money(s.total)}</td><td className="p-2">{money(s.paid)}</td><td className="p-2">{money(s.balance)}</td><td className="p-2"><button onClick={() => { let b = {}; try { b = JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}'); } catch {} downloadInvoicePdf(s, b, 'sales'); }} className="rounded sl-primary px-3 py-2 text-white">Download PDF</button></td></tr>)}</tbody>
      </table></div>
      {sales.length === 0 && <p className="py-6 text-center text-[var(--text-2)]">No sales invoices yet.</p>}
    </div>
  </section>;
}
