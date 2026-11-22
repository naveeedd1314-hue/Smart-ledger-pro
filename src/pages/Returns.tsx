import { useEffect, useState } from 'react';

type RecordItem = Record<string, any>;
type ReturnItem = {
  id: string;
  originalId: string;
  type: 'Sales Return' | 'Purchase Return';
  invoice: string;
  party: string;
  product: string;
  productId?: string | number;
  qty: number;
  rate: number;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  utgst?: number;
  igst?: number;
  purchasePrice?: number | null;
  date: string;
  reason: string;
};

export default function Returns() {
  const [type,setType] = useState<'Sales Return'|'Purchase Return'>('Sales Return');
  const [sales,setSales] = useState<RecordItem[]>([]);
  const [purchases,setPurchases] = useState<RecordItem[]>([]);
  const [products,setProducts] = useState<RecordItem[]>([]);
  const [returns,setReturns] = useState<ReturnItem[]>([]);
  const [sourceId,setSourceId] = useState('');
  const [qty,setQty] = useState(1);
  const [reason,setReason] = useState('Damaged goods');
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));

  const read = (key:string) => {
    try {
      const value=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(value)?value:[];
    } catch { return []; }
  };

  useEffect(()=>{
    setSales(read('smartledger-pro-sales'));
    setPurchases(read('smartledger-pro-purchases'));
    setProducts(read('smartledger-products'));
    setReturns(read('smartledger-pro-returns'));
  },[]);

  const sources=type==='Sales Return'?sales:purchases;
  const source=sources.find(x=>x.id===sourceId);
  const alreadyReturned=returns.filter(x=>x.originalId===sourceId && x.type===type).reduce((s,x)=>s+x.qty,0);
  const remaining=Math.max(0,Number(source?.qty||0)-alreadyReturned);
  const rate=Number(source?.rate)||0;
  const amount=qty*rate;
  const gstRate=Number(source?.gstRate)||0;
  const returnRatio = source && Number(source.qty) > 0 ? qty / Number(source.qty) : 0;
  const taxAmount = source?.taxAmount !== undefined ? (Number(source.taxAmount) || 0) * returnRatio : amount * gstRate / 100;
  const cgst = (Number(source?.cgst) || 0) * returnRatio;
  const sgst = (Number(source?.sgst) || 0) * returnRatio;
  const utgst = (Number(source?.utgst) || 0) * returnRatio;
  const igst = (Number(source?.igst) || 0) * returnRatio;
  const totalAmount=amount+taxAmount;
  const money=(n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  function changeType(next:'Sales Return'|'Purchase Return') {
    setType(next);
    setSourceId('');
    setQty(1);
  }

  function saveReturn() {
    if(!source || qty<=0 || qty>remaining) {
      alert('Select an invoice and enter a valid return quantity.');
      return;
    }

    const product=products.find(p=>source.productId ? String(p.id)===String(source.productId) : p.name===source.product);
    if(!product) {
      alert('The original product was not found in inventory. No changes were made.');
      return;
    }

    if(type==='Purchase Return' && Number(product.stock)<qty) {
      alert('Insufficient stock for this purchase return.');
      return;
    }

    const updatedProducts=products.map(p=>{
      if(p.id!==product.id) return p;
      const currentStock=Math.max(0,Number(p.stock)||0);
      const nextStock=currentStock+(type==='Sales Return'?qty:-qty);
      if(type!=='Sales Return') return {...p,stock:nextStock};
      const currentCost=Number(p.averageCost ?? p.purchase);
      const returnCost=Number(source.purchasePrice);
      const currentCostKnown=Number.isFinite(currentCost)&&currentCost>0;
      const returnCostKnown=Number.isFinite(returnCost)&&returnCost>0;
      const averageCost=currentStock>0&&currentCostKnown&&returnCostKnown
        ? ((currentStock*currentCost)+(qty*returnCost))/nextStock
        : returnCostKnown ? returnCost : (currentCostKnown ? currentCost : null);
      return {...p,stock:nextStock,averageCost:averageCost===null?null:Number(averageCost.toFixed(4))};
    });

    const record:ReturnItem={
      id:crypto.randomUUID(),
      originalId:source.id,
      type,
      invoice:source.invoice||'',
      party:type==='Sales Return'?source.customer:source.supplier,
      product:source.product,
      productId:product.id,
      qty,
      rate,
      amount,
      taxAmount,
      totalAmount,
      gstRate,
      cgst,
      sgst,
      utgst,
      igst,
      purchasePrice: type === 'Sales Return' ? (source.purchasePrice !== undefined && source.purchasePrice !== null && Number.isFinite(Number(source.purchasePrice)) ? Number(source.purchasePrice) : null) : undefined,
      date,
      reason
    };

    const updatedReturns=[record,...returns];
    const stockLog=read('smartledger-pro-stock-adjustments');
    const stockChange=type==='Sales Return'?qty:-qty;
    stockLog.unshift({id:crypto.randomUUID(),date,productId:product.id,product:product.name,change:stockChange,movement:stockChange>0?'Stock In':'Stock Out',stockAfter:Number(product.stock)+stockChange,reason:`${type} for invoice ${record.invoice}`});
    localStorage.setItem('smartledger-pro-stock-adjustments',JSON.stringify(stockLog));
    localStorage.setItem('smartledger-products',JSON.stringify(updatedProducts));
    localStorage.setItem('smartledger-pro-returns',JSON.stringify(updatedReturns));
    setProducts(updatedProducts);
    setReturns(updatedReturns);
    setSourceId('');
    setQty(1);
    alert('Return recorded and inventory adjusted.');
  }

  const totalSales=returns.filter(x=>x.type==='Sales Return').reduce((s,x)=>s+(x.totalAmount ?? x.amount),0);
  const totalPurchases=returns.filter(x=>x.type==='Purchase Return').reduce((s,x)=>s+(x.totalAmount ?? x.amount),0);

  return <section className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold">Sales & Purchase Returns</h1>
      <p className="text-sm text-[var(--text-2)]">Record returned goods and automatically adjust stock.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm text-[var(--text-2)]">Sales Returns</p>
        <strong className="text-xl">{money(totalSales)}</strong>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-sm text-[var(--text-2)]">Purchase Returns</p>
        <strong className="text-xl">{money(totalPurchases)}</strong>
      </div>
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Record a Return</h2>
      <div className="flex flex-wrap gap-2">
        {(['Sales Return','Purchase Return'] as const).map(x=>
          <button key={x} onClick={()=>changeType(x)}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${type===x?'bg-[var(--indigo-ink)] text-white shadow-sm':'bg-[var(--border)] text-[#435648]'}`}>
            {x}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Original invoice
          <select className="mt-1 w-full rounded-lg border p-3" value={sourceId}
            onChange={e=>{setSourceId(e.target.value);setQty(1);}}>
            <option value="">Select original invoice</option>
            {sources.map(x=><option key={x.id} value={x.id}>
              {x.invoice||'Invoice'} — {type==='Sales Return'?x.customer:x.supplier} — {x.product}
            </option>)}
          </select>
        </label>
        <label className="text-sm">Return date
          <input type="date" className="mt-1 w-full rounded-lg border p-3"
            value={date} onChange={e=>setDate(e.target.value)}/>
        </label>
        <label className="text-sm">Return quantity
          <input type="number" min="0.01" step="any" max={remaining}
            className="mt-1 w-full rounded-lg border p-3" value={qty}
            onChange={e=>setQty(Number(e.target.value))}/>
        </label>
        <label className="text-sm">Reason
          <select className="mt-1 w-full rounded-lg border p-3" value={reason}
            onChange={e=>setReason(e.target.value)}>
            <option>Damaged goods</option>
            <option>Wrong product</option>
            <option>Excess quantity</option>
            <option>Quality issue</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      {source&&<div className="rounded-2xl border border-[var(--border)] bg-[var(--border)] p-4 text-sm space-y-2">
        <p>Product: <strong>{source.product}</strong></p>
        <p>Original quantity: <strong>{source.qty}</strong></p>
        <p>Already returned: <strong>{alreadyReturned}</strong></p>
        <p>Remaining returnable quantity: <strong>{remaining}</strong></p>
        <p>Return value: <strong>{money(amount)}</strong></p>
        <p>Inventory after return: <strong>
          {Number(products.find(p=>p.name===source.product)?.stock||0)+(type==='Sales Return'?qty:-qty)}
        </strong></p>
      </div>}

      <button onClick={saveReturn}
        className="rounded-xl bg-[var(--indigo-ink)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo)]">
        Save Return
      </button>
      <p className="text-xs text-[var(--text-2)]">
        This records the return against the original invoice, adjusts inventory and reflects the return credit in the party ledger. Cash refunds or cash settlements are not recorded automatically.
      </p>
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">Return History ({returns.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Date</th><th className="p-2">Type</th>
            <th className="p-2">Invoice</th><th className="p-2">Party</th>
            <th className="p-2">Product</th><th className="p-2">Qty</th>
            <th className="p-2">Value</th>
          </tr></thead>
          <tbody>{returns.map(x=><tr key={x.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
            <td className="p-2">{x.date}</td><td className="p-2">{x.type}</td>
            <td className="p-2">{x.invoice}</td><td className="p-2">{x.party}</td>
            <td className="p-2">{x.product}</td><td className="p-2">{x.qty}</td>
            <td className="p-2">{money(x.amount)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {returns.length===0&&<p className="py-5 text-center text-[var(--text-2)]">No returns recorded yet.</p>}
    </div>
  </section>;
}
