import { useEffect, useRef, useState } from 'react';
import { localDateISO } from '../lib/dateUtils';
import { downloadInvoicePdf } from '../utils/invoicePdf';

type Product = { id: string; name: string; selling: number; purchase: number; averageCost?: number | null; wholesale?: number; stock: number; sku?: string; category?: string; gstRate?: number; hsn?: string };
type Sale = { id: string; productId?: string; invoice: string; date: string; customer: string; product: string; qty: number; rate: number; total: number; paid: number; balance: number; purchasePrice?: number | null; taxableValue?: number; gstRate?: number; taxAmount?: number; cgst?: number; sgst?: number; utgst?: number; igst?: number; placeOfSupply?: string; hsn?: string; customerGstin?: string; customerAddress?: string };

const readArray = <T,>(key: string): T[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch { return []; }
};
const readBusinessState = () => {
  try { return JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}').state || 'Jammu and Kashmir'; }
  catch { return 'Jammu and Kashmir'; }
};

export default function Sales() {
  const [products, setProducts] = useState<Product[]>(() => readArray<Product>('smartledger-products'));
  const [sales, setSales] = useState<Sale[]>(() => readArray<Sale>('smartledger-pro-sales'));
  const [payments] = useState<any[]>(() => readArray<any>('smartledger-pro-payments'));
  const [returns] = useState<any[]>(() => readArray<any>('smartledger-pro-returns'));
  const [customers] = useState<any[]>(() => readArray<any>('smartledger-pro-customers'));
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);
  const [paid, setPaid] = useState(0);
  const [applyGST, setApplyGST] = useState(false);
  const [businessState] = useState(readBusinessState);
  const [placeOfSupply, setPlaceOfSupply] = useState(readBusinessState);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const savingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const selected = products.find(p => p.id === productId);
  const taxableValue = qty * rate;
  const gstRate = applyGST ? Number(selected?.gstRate) || 0 : 0;
  const taxAmount = taxableValue * gstRate / 100;
  const normalizeState = (value: string) => { const compact = value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''); return compact === 'jk' || compact === '01' || compact === 'jammukashmir' ? 'jammuandkashmir' : compact; };
  const normalizedBusinessState = normalizeState(businessState);
  const normalizedPlaceState = normalizeState(placeOfSupply);
  const sameState = Boolean(normalizedBusinessState && normalizedPlaceState && normalizedPlaceState === normalizedBusinessState);
  const isJammuKashmir = normalizedBusinessState === 'jammuandkashmir';
  const cgst = applyGST && sameState ? taxAmount / 2 : 0;
  const sgst = applyGST && sameState && !isJammuKashmir ? taxAmount / 2 : 0;
  const utgst = applyGST && sameState && isJammuKashmir ? taxAmount / 2 : 0;
  const igst = applyGST && !sameState ? taxAmount : 0;
  const total = taxableValue + taxAmount;
  const saleCost = selected ? Number(selected.averageCost ?? selected.purchase) : 0;
  const estimatedGrossProfit = selected && Number.isFinite(saleCost) && saleCost > 0 && Number.isFinite(rate) ? (rate - saleCost) * qty : null;

  function findProductByBarcode(rawCode: string) {
    const code = rawCode.trim().toLowerCase();
    if (!code) { setScanError('Enter a barcode or SKU.'); return; }
    const match = products.find(p => String(p.sku || '').trim().toLowerCase() === code || String((p as any).barcode || '').trim().toLowerCase() === code);
    if (!match) { setScanError(`No inventory item matches barcode/SKU: ${rawCode.trim()}`); return; }
    setProductId(String(match.id));
    setRate(Number(match.selling) || 0);
    setBarcodeInput(rawCode.trim());
    setScanError('');
  }

  function stopBarcodeScan() {
    if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
    scanStreamRef.current?.getTracks().forEach(track => track.stop());
    scanStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  async function startBarcodeScan() {
    setScanError('');
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) { setScanError('Camera barcode scanning is not supported by this browser. Enter the product SKU above.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setScanError('Camera access requires a secure HTTPS connection and browser permission.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      scanStreamRef.current = stream;
      if (!videoRef.current) { stopBarcodeScan(); setScanError('Camera preview could not be opened.'); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
      const scan = async () => {
        if (!videoRef.current || !scanStreamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results?.length && results[0]?.rawValue) {
            const code = String(results[0].rawValue);
            stopBarcodeScan();
            findProductByBarcode(code);
            return;
          }
        } catch {}
        scanFrameRef.current = requestAnimationFrame(scan);
      };
      scanFrameRef.current = requestAnimationFrame(scan);
    } catch (error) {
      stopBarcodeScan();
      const name = error instanceof Error ? error.name : '';
      setScanError(name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera permission was denied. Allow camera access for this site in Chrome settings, then try again.'
        : name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : 'Camera could not start. Check HTTPS, camera permission and whether another app is using the camera.');
    }
  }

  useEffect(() => () => {
    if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    scanStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  function saveSale() {
    if (savingRef.current) return;
    savingRef.current = true;
    const reject = (message: string) => { savingRef.current = false; alert(message); };
    if (!selected || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(paid) || paid < 0 || !Number.isFinite(total) || paid > total || qty > selected.stock) return reject('Check product, quantity, stock and payment amount.');
    if (applyGST && (!normalizedBusinessState || !normalizedPlaceState)) return reject('Enter the business state and place of supply before applying GST.');
    const customerName = customer.trim() || 'Walk-in Customer';
    let customerDetails: { gstin?: string; address?: string } = {};
    try {
      const saved = JSON.parse(localStorage.getItem('smartledger-pro-customers') || '[]');
      const customers = Array.isArray(saved) ? saved : [];
      let match = customers.find((x: any) => x.name?.trim().toLowerCase() === customerName.toLowerCase());
      if (!match) {
        match = { id: crypto.randomUUID(), name: customerName, phone: '', address: '', opening: 0 };
        localStorage.setItem('smartledger-pro-customers', JSON.stringify([match, ...customers]));
      }
      customerDetails = { gstin: match.gstin || '', address: match.address || '' };
    } catch {}

    const sale: Sale = {
      id: crypto.randomUUID(),
      productId: selected.id,
      invoice: `SL-${Date.now().toString().slice(-8)}`,
      date: localDateISO(),
      customer: customerName,
      product: selected.name,
      qty, rate, total, paid, balance: total - paid, purchasePrice: Number.isFinite(Number(selected.averageCost ?? selected.purchase)) && Number(selected.averageCost ?? selected.purchase) > 0 ? Number(selected.averageCost ?? selected.purchase) : null,
      taxableValue, gstRate, taxAmount, cgst, sgst, utgst, igst,
      placeOfSupply: applyGST ? placeOfSupply : '',
      hsn: selected.hsn || '',
      customerGstin: customerDetails.gstin || '',
      customerAddress: customerDetails.address || ''
    };
    const updatedProducts = products.map(p => p.id === selected.id ? { ...p, stock: p.stock - qty } : p);
    const stockLog = (() => { try { const saved = JSON.parse(localStorage.getItem('smartledger-pro-stock-adjustments') || '[]'); return Array.isArray(saved) ? saved : []; } catch { return []; } })();
    stockLog.unshift({ id: crypto.randomUUID(), date: sale.date, productId: selected.id, product: selected.name, change: -qty, movement: 'Stock Out', stockAfter: selected.stock - qty, reason: `Sales invoice ${sale.invoice}` });
    localStorage.setItem('smartledger-pro-stock-adjustments', JSON.stringify(stockLog));
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
    savingRef.current = false;
  }

  const totalReceipts = payments.filter(p => p.type === 'Customer Receipt').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const customerRefunds = payments.filter(p => p.type === 'Customer Refund').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const salesReturnCredits = returns.filter(x => x.type === 'Sales Return').reduce((sum, x) => sum + (Number(x.totalAmount ?? x.amount) || 0), 0);
  const baseReceivable = sales.reduce((sum, x) => sum + (Number.isFinite(Number(x.total)) ? Math.max(0, Number(x.total) - Number(x.paid || 0)) : Math.max(0, Number(x.balance) || 0)), 0);
  const customerOpening = customers.reduce((sum, x) => sum + (Number(x.opening) || 0), 0);
  const invoiceReturnCredit = (sale: Sale) => returns.filter(x => x.type === 'Sales Return' && String(x.originalId) === String(sale.id)).reduce((sum, x) => sum + (Number(x.totalAmount ?? x.amount) || 0), 0);
  const invoicePaid = (sale: Sale) => (Number(sale.paid) || 0) + payments.filter(p => p.type === 'Customer Receipt').reduce((sum, p) => sum + (Array.isArray(p.allocations) ? p.allocations.filter((a: any) => String(a.invoiceId) === String(sale.id)).reduce((part: number, a: any) => part + (Number(a.amount) || 0), 0) : 0), 0);
  const invoiceDue = (sale: Sale) => { const total = Number(sale.total); const storedDue = Number.isFinite(total) ? Math.max(0, total - Number(sale.paid || 0)) : Math.max(0, Number(sale.balance) || 0); const allocated = invoicePaid(sale) - (Number(sale.paid) || 0); return Math.max(0, storedDue - allocated - invoiceReturnCredit(sale)); };
  const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return <section className="space-y-6">
    <div><h1 className="text-2xl font-bold">Sales & Invoices</h1><p className="text-sm text-[var(--text-2)]">Create sales invoices and track customer balances.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Total Sales</p><strong className="text-xl">{money(sales.reduce((s, x) => s + x.total, 0))}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Received</p><strong className="text-xl">{money(sales.reduce((sum, x) => sum + x.paid, 0) + totalReceipts)}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">To Collect</p><strong className="text-xl">{money(Math.max(0, customerOpening + baseReceivable + customerRefunds - totalReceipts - salesReturnCredits))}</strong></div>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-lg">New Sales Invoice</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Customer name<input className="mt-1 w-full rounded-lg border p-3" value={customer} onChange={e => setCustomer(e.target.value)} /></label>
        <div className="space-y-2 sm:col-span-2">
        <div className="flex flex-wrap gap-2"><input className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" placeholder="Enter barcode / SKU" value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();findProductByBarcode(barcodeInput);}}}/><button type="button" onClick={()=>findProductByBarcode(barcodeInput)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">Find SKU</button><button type="button" onClick={scanning?stopBarcodeScan:startBarcodeScan} className="rounded-xl bg-[var(--indigo)] px-3 py-2 text-sm font-semibold text-white">{scanning?'Stop camera':'Scan barcode'}</button></div>
        <video ref={videoRef} autoPlay playsInline muted className={scanning?'w-full max-h-64 rounded-xl bg-black object-contain':'hidden'} />
        {scanError && <p role="status" className="text-xs text-[var(--amber)]">{scanError}</p>}
      </div>
      <label className="text-sm">Product<select className="mt-1 w-full rounded-lg border p-3" value={productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setProductId(e.target.value); setRate(p?.selling || 0); }}><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock}</option>)}</select></label>
        <label className="text-sm">Quantity<input type="number" min="0.01" step="any" className="mt-1 w-full rounded-lg border p-3" value={qty} onChange={e => setQty(Number(e.target.value))} /></label>
        <label className="text-sm">Selling rate<input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={rate} onChange={e => setRate(Number(e.target.value))} /></label>
        <div className="flex flex-wrap items-end gap-2"><button type="button" disabled={!selected} onClick={() => setRate(Number(selected?.selling) || 0)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40">Retail ₹{money(Number(selected?.selling) || 0)}</button><button type="button" disabled={!selected || !(Number(selected.wholesale) > 0)} onClick={() => setRate(Number(selected?.wholesale) || 0)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40">Wholesale ₹{money(Number(selected?.wholesale) || 0)}</button></div>
        <label className="text-sm">Amount received (initial payment)<input type="number" min="0" className="mt-1 w-full rounded-lg border p-3" value={paid} onChange={e => setPaid(Number(e.target.value))} /></label>
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
        <p>Weighted average cost: <strong>{selected && saleCost > 0 ? money(saleCost) : 'Not recorded'}</strong></p>
        <p>Estimated gross profit: <strong>{estimatedGrossProfit === null ? 'Cost required' : money(estimatedGrossProfit)}</strong></p>
      </div>
      <button onClick={saveSale} className="rounded-lg sl-primary px-5 py-3 font-semibold text-white">Save Invoice</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-lg">Recent Sales</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Invoice</th><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Product</th><th className="p-2">Total</th><th className="p-2">Paid</th><th className="p-2">Return Credit</th><th className="p-2">Due</th><th className="p-2">PDF</th></tr></thead>
        <tbody>{sales.map(s => <tr key={s.id} className="border-b border-[#eee9dd] hover:bg-[var(--surface-2)]"><td className="p-2">{s.invoice}</td><td className="p-2">{s.date}</td><td className="p-2">{s.customer}</td><td className="p-2">{s.product} × {s.qty}</td><td className="p-2">{money(s.total)}</td><td className="p-2">{money(invoicePaid(s))}</td><td className="p-2">{money(invoiceReturnCredit(s))}</td><td className="p-2">{money(invoiceDue(s))}</td><td className="p-2"><button onClick={() => { let b = {}; try { b = JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}'); } catch {} downloadInvoicePdf({ ...s, paid: invoicePaid(s), returnCredit: invoiceReturnCredit(s), balance: invoiceDue(s) }, b, 'sales'); }} className="rounded sl-primary px-3 py-2 text-white">Download PDF</button></td></tr>)}</tbody>
      </table></div>
      {sales.length === 0 && <p className="py-6 text-center text-[var(--text-2)]">No sales invoices yet.</p>}
    </div>
  </section>;
}
