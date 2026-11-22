import { useEffect, useState } from 'react';
import { downloadInvoicePdf } from '../utils/invoicePdf';

type Product = { id: string; name: string; purchase: number; selling: number; stock: number; sku?: string; category?: string; gstRate?: number; hsn?: string; };
type Supplier = { id: string; name: string; gstin?: string; address?: string };
type Purchase = { id: string; supplier: string; invoice: string; date: string; product: string; qty: number; rate: number; total: number; paid: number; balance: number; taxableValue?: number; gstRate?: number; taxAmount?: number; cgst?: number; sgst?: number; utgst?: number; igst?: number; placeOfSupply?: string; hsn?: string; supplierGstin?: string; supplierAddress?: string };

export default function Purchases() {
  const [products,setProducts] = useState<Product[]>([]);
  const [suppliers,setSuppliers] = useState<Supplier[]>([]);
  const [items,setItems] = useState<Purchase[]>([]);
  const [supplier,setSupplier] = useState('');
  const [invoice,setInvoice] = useState('');
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));
  const [productId,setProductId] = useState('');
  const [qty,setQty] = useState(1);
  const [rate,setRate] = useState(0);
  const [paid,setPaid] = useState(0);
  const [applyGST, setApplyGST] = useState(false);
  const [businessState, setBusinessState] = useState('Jammu and Kashmir');
  const [placeOfSupply, setPlaceOfSupply] = useState('Jammu and Kashmir');


  const read = <T,>(key:string):T[] => {
    try { const v=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v:[]; } catch { return []; }
  };

  useEffect(()=>{
    setProducts(read<Product>('smartledger-products'));
    setSuppliers(read<Supplier>('smartledger-pro-suppliers'));
    setItems(read<Purchase>('smartledger-pro-purchases'));
try {
  const settings = JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}');
  const state = settings.state || 'Jammu and Kashmir';
  setBusinessState(state);
  setPlaceOfSupply(state);
} catch {}
  },[]);

  const selected=products.find(p=>p.id===productId);
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
  const money=(n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  function save() {
    if(!supplier || !selected || qty<=0 || rate<=0 || paid<0 || paid>total || qty>100000) {
      alert('Check supplier, product, quantity, rate and payment.');
      return;
    }
    if(!invoice.trim()) { alert('Enter supplier invoice number.'); return; }

    const supplierDetails = suppliers.find(x =>
      x.name.trim().toLowerCase() === supplier.trim().toLowerCase()
    );
    const updatedProducts=products.map(p=>p.id===productId?{...p,stock:p.stock+qty,purchase:rate}:p);
    const record:Purchase={id:Date.now().toString(),supplier,invoice:invoice.trim(),date,product:selected.name,qty,rate,total,paid,balance:total-paid,taxableValue,gstRate,taxAmount,cgst,sgst,utgst,igst,placeOfSupply:applyGST?placeOfSupply:'',hsn:selected.hsn||'',supplierGstin:supplierDetails?.gstin||'',supplierAddress:supplierDetails?.address||''};
    const updatedItems=[record,...items];

    localStorage.setItem('smartledger-products',JSON.stringify(updatedProducts));
    localStorage.setItem('smartledger-pro-purchases',JSON.stringify(updatedItems));
    setProducts(updatedProducts);
    setItems(updatedItems);
    setInvoice('');
    setQty(1);
    setRate(0);
    setPaid(0);
    setProductId('');
    alert('Purchase saved and stock updated.');
  }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Purchases</h1><p className="text-sm text-[#788579]">Supplier invoices, stock inward and payments.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#788579]">Purchase Value</p><strong className="text-xl">{money(items.reduce((s,x)=>s+x.total,0))}</strong></div>
      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#788579]">Paid</p><strong className="text-xl">{money(items.reduce((s,x)=>s+x.paid,0))}</strong></div>
      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[#788579]">Outstanding</p><strong className="text-xl">{money(items.reduce((s,x)=>s+x.balance,0))}</strong></div>
    </div>
    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm space-y-5">
      <h2 className="font-semibold">Record Purchase Invoice</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Supplier<select className="mt-1 w-full rounded-lg border p-3" value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Select supplier</option>{suppliers.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
        <label className="text-sm">Invoice number<input className="mt-1 w-full rounded-lg border p-3" value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Supplier invoice number"/></label>
        <label className="text-sm">Date<input type="date" className="mt-1 w-full rounded-lg border p-3" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label className="text-sm">Product<select className="mt-1 w-full rounded-lg border p-3" value={productId} onChange={e=>{setProductId(e.target.value);setRate(Number(products.find(p=>p.id===e.target.value)?.purchase)||0);}}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}</select></label>
        <label className="text-sm">Quantity<input type="number" min="0.01" step="any" className="mt-1 w-full rounded-lg border p-3" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label>
        <label className="text-sm">Purchase rate<input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyGST} onChange={e=>setApplyGST(e.target.checked)}/> Apply GST to this purchase</label>
{applyGST && <label className="text-sm">Place of supply (state / UT)<input className="mt-1 w-full rounded-lg border p-3" value={placeOfSupply} onChange={e=>setPlaceOfSupply(e.target.value)}/></label>}
<label className="text-sm">Amount paid<input type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" value={paid} onChange={e=>setPaid(Number(e.target.value))}/></label>
      </div>
      <div className="rounded-2xl border border-[#e6e0d2] bg-[#eeeadd] p-4 text-sm text-[#435648]"><p>Taxable value: <strong>{money(taxableValue)}</strong></p>
{applyGST && <><p>GST rate: <strong>{gstRate}%</strong></p>
<p>CGST: <strong>{money(cgst)}</strong></p>
{isJammuKashmir && sameState && <p>UTGST: <strong>{money(utgst)}</strong></p>}
{!isJammuKashmir && sameState && <p>SGST: <strong>{money(sgst)}</strong></p>}
{!sameState && <p>IGST: <strong>{money(igst)}</strong></p>}
<p>Total GST: <strong>{money(taxAmount)}</strong></p></>}
<p>Invoice total: <strong>{money(total)}</strong></p><p>Remaining payable: <strong>{money(total-paid)}</strong></p><p>Stock after purchase: <strong>{(selected?.stock||0)+qty}</strong></p></div>
      <button onClick={save} className="rounded-xl bg-[#183b2b] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#315b42]">Save Purchase</button>
    </div>
    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">Purchase History ({items.length})</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[#788579]"><th className="p-2">Date</th><th className="p-2">Invoice</th><th className="p-2">Supplier</th><th className="p-2">Product</th><th className="p-2">Qty</th><th className="p-2">Total</th><th className="p-2">Paid</th><th className="p-2">Due</th><th className="p-2">PDF</th></tr></thead><tbody>{items.map(x=><tr className="border-b border-[#eee9dd] hover:bg-[#f7f4eb]" key={x.id}><td className="p-2">{x.date}</td><td className="p-2">{x.invoice}</td><td className="p-2">{x.supplier}</td><td className="p-2">{x.product}</td><td className="p-2">{x.qty}</td><td className="p-2">{money(x.total)}</td><td className="p-2">{money(x.paid)}</td><td className="p-2">{money(x.balance)}</td><td className="p-2"><button onClick={() => { let b = {}; try { b = JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}'); } catch {} downloadInvoicePdf(x, b, 'purchase'); }} className="rounded-lg bg-[#183b2b] px-3 py-2 text-white transition hover:bg-[#315b42]">Download PDF</button></td></tr>)}</tbody></table></div>
      {items.length===0&&<p className="py-5 text-center text-[#788579]">No purchases recorded yet.</p>}
    </div>
  </section>;
}
