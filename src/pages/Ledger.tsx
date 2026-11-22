import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;
type Entry = { date: string; description: string; debit: number; credit: number };

export default function Ledger() {
  const [type, setType] = useState<'Customer' | 'Supplier'>('Customer');
  const [party, setParty] = useState('');
  const [sales, setSales] = useState<Row[]>([]);
  const [purchases, setPurchases] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [returns, setReturns] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Row[]>([]);

  useEffect(() => {
    const read = (key: string): Row[] => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
      } catch { return []; }
    };
    setSales(read('smartledger-pro-sales'));
    setPurchases(read('smartledger-pro-purchases'));
    setPayments(read('smartledger-pro-payments'));
    setReturns(read('smartledger-pro-returns'));
    setCustomers(read('smartledger-pro-customers'));
    setSuppliers(read('smartledger-pro-suppliers'));
  }, []);

  const parties = type === 'Customer' ? customers : suppliers;
  const selected = parties.find(x => x.name === party);

  const entries = useMemo(() => {
    const rows: Entry[] = [];
    if (type === 'Customer') {
      sales.filter(x => x.customer === party).forEach(x => rows.push({
        date: x.date, description: `Sales invoice ${x.invoice || ''}`,
        debit: Number(x.total) || 0, credit: Number(x.paid) || 0
      }));
      payments.filter(x => x.type === 'Customer Receipt' && x.party === party).forEach(x => rows.push({
        date: x.date, description: `Receipt - ${x.method || 'Payment'}`,
        debit: 0, credit: x.allocations ? (Number(x.unallocatedAmount) || 0) : (Number(x.amount) || 0)
      }));
      returns.filter(x => x.type === 'Sales Return' && x.party === party).forEach(x => rows.push({
        date: x.date, description: `Sales return - ${x.invoice || ''}`,
        debit: 0, credit: Number(x.totalAmount ?? x.amount) || 0
      }));
    } else {
      purchases.filter(x => x.supplier === party).forEach(x => rows.push({
        date: x.date, description: `Purchase invoice ${x.invoice || ''}`,
        debit: Number(x.paid) || 0, credit: Number(x.total) || Number(x.qty) * Number(x.rate) || 0
      }));
      payments.filter(x => x.type === 'Supplier Payment' && x.party === party).forEach(x => rows.push({
        date: x.date, description: `Payment - ${x.method || 'Payment'}`,
        debit: x.allocations ? (Number(x.unallocatedAmount) || 0) : (Number(x.amount) || 0), credit: 0
      }));
      returns.filter(x => x.type === 'Purchase Return' && x.party === party).forEach(x => rows.push({
        date: x.date, description: `Purchase return - Debit note ${x.debitNoteNo || ''}`,
        debit: Number(x.totalAmount ?? x.amount) || 0, credit: 0
      }));
    }
    return rows.sort((a,b) => a.date.localeCompare(b.date));
  }, [type, party, sales, purchases, payments, returns]);

  const customerSales = type === 'Customer' ? sales.filter(x => x.customer === party) : [];
  const customerSalesGrossProfit = customerSales.reduce((sum, sale) => {
    const cost = sale.purchasePrice === undefined || sale.purchasePrice === null ? Number.NaN : Number(sale.purchasePrice);
    const quantity = Number(sale.qty) || 0;
    const rate = Number(sale.rate) || 0;
    return sum + (Number.isFinite(cost) && cost >= 0 ? (rate - cost) * quantity : 0);
  }, 0);
  const customerReturnProfit = type === 'Customer' ? returns.filter(x => x.type === 'Sales Return' && x.party === party).reduce((sum, item) => {
    const cost = item.purchasePrice === undefined || item.purchasePrice === null ? Number.NaN : Number(item.purchasePrice);
    const quantity = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + (Number.isFinite(cost) && cost >= 0 ? (rate - cost) * quantity : 0);
  }, 0) : 0;
  const customerGrossProfit = customerSalesGrossProfit - customerReturnProfit;
  const salesMissingCost = customerSales.filter(x => x.purchasePrice === undefined || x.purchasePrice === null || !Number.isFinite(Number(x.purchasePrice))).length;
  const opening = Number(selected?.opening) || 0;
  const debit = entries.reduce((s,x)=>s+x.debit,0);
  const credit = entries.reduce((s,x)=>s+x.credit,0);
  const closing = type === 'Customer' ? opening + debit - credit : opening + credit - debit;
  const money = (n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  let running = opening;

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Party Ledger</h1><p className="text-sm text-[var(--text-2)]">Account statements and outstanding balances.</p></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['Customer','Supplier'] as const).map(x=><button key={x} onClick={()=>{setType(x);setParty('');}} className={`rounded-lg px-5 py-3 text-sm font-semibold ${type===x?'sl-primary text-white':'bg-[var(--surface-2)] text-[var(--text)]'}`}>{x} Ledger</button>)}
      </div>
      <label className="block text-sm font-medium">Select {type}<select className="mt-1 w-full rounded-lg border p-3" value={party} onChange={e=>setParty(e.target.value)}><option value="">Choose {type.toLowerCase()}</option>{parties.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
    </div>
    {party && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Opening Balance',opening],['Total Debit',debit],['Total Credit',credit],['Closing Balance',Math.abs(closing)]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">{label}</p><strong className="text-xl">{money(Number(value))}</strong>{label==='Closing Balance'&&<p className="text-xs text-[var(--text-2)]">{closing===0?'Settled':closing>0?(type==='Customer'?'Receivable':'Payable'):(type==='Customer'?'Advance received':'Advance paid')}</p>}</div>)}
      </div>
      {type === "Customer" && <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-2)]">Gross profit before expenses</p>
          <strong className="text-xl">{money(customerGrossProfit)}</strong>
          <p className="mt-1 text-xs text-[var(--text-2)]">Based on saved sale-time purchase costs; GST excluded from margin.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-2)]">Sales missing cost data</p>
          <strong className="text-xl">{salesMissingCost}</strong>
          <p className="mt-1 text-xs text-[var(--text-2)]">Older invoices without cost snapshots are excluded from gross profit.</p>
        </div>
      </div>}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">{party} — Statement</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Debit</th><th className="p-2">Credit</th><th className="p-2">Balance</th></tr></thead>
          <tbody>
            <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><td className="p-2">—</td><td className="p-2">Opening balance</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">{money(opening)}</td></tr>
            {entries.map((x,i)=>{
              running += type==='Customer' ? x.debit-x.credit : x.credit-x.debit;
              return <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]" key={i}><td className="p-2">{x.date}</td><td className="p-2">{x.description}</td><td className="p-2">{x.debit?money(x.debit):'—'}</td><td className="p-2">{x.credit?money(x.credit):'—'}</td><td className="p-2">{money(Math.abs(running))}</td></tr>;
            })}
          </tbody>
        </table></div>
        {entries.length===0&&<p className="py-5 text-center text-[var(--text-2)]">No transactions recorded for this party.</p>}
      </div>
    </>}
  </section>;
}
