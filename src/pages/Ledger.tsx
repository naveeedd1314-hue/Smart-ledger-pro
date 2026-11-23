import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;
type EntryKind = 'Invoice' | 'Receipt' | 'Payment' | 'Refund' | 'Return';
type Entry = { date: string; description: string; debit: number; credit: number; kind: EntryKind };

export default function Ledger() {
  const [type, setType] = useState<'Customer' | 'Supplier'>('Customer');
  const [party, setParty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entryFilter, setEntryFilter] = useState('All');
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
  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const inDateRange = (date: string) => (!fromDate || date >= fromDate) && (!toDate || date <= toDate);

  const entries = useMemo(() => {
    const rows: Entry[] = [];
    if (type === 'Customer') {
      sales.filter(x => x.customer === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Sales invoice ' + String(x.invoice || ''),
        debit: Number(x.total) || 0, credit: Number(x.paid) || 0, kind: 'Invoice'
      }));
      payments.filter(x => x.type === 'Customer Receipt' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Receipt - ' + String(x.method || 'Payment'),
        debit: 0, credit: Number(x.amount) || 0, kind: 'Receipt'
      }));
      payments.filter(x => x.type === 'Customer Refund' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Customer refund',
        debit: Number(x.amount) || 0, credit: 0, kind: 'Refund'
      }));
      returns.filter(x => x.type === 'Sales Return' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Sales return - ' + String(x.invoice || ''),
        debit: 0, credit: Number(x.totalAmount ?? x.amount) || 0, kind: 'Return'
      }));
    } else {
      purchases.filter(x => x.supplier === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Purchase invoice ' + String(x.invoice || ''),
        debit: Number(x.paid) || 0, credit: Number(x.total) || Number(x.qty) * Number(x.rate) || 0, kind: 'Invoice'
      }));
      payments.filter(x => x.type === 'Supplier Payment' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Payment - ' + String(x.method || 'Payment'),
        debit: Number(x.amount) || 0, credit: 0, kind: 'Payment'
      }));
      payments.filter(x => x.type === 'Supplier Refund' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Supplier refund received',
        debit: 0, credit: Number(x.amount) || 0, kind: 'Refund'
      }));
      returns.filter(x => x.type === 'Purchase Return' && x.party === party).forEach(x => rows.push({
        date: String(x.date || ''), description: 'Purchase return - Debit note ' + String(x.debitNoteNo || ''),
        debit: Number(x.totalAmount ?? x.amount) || 0, credit: 0, kind: 'Return'
      }));
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [type, party, sales, purchases, payments, returns]);

  const opening = Number(selected?.opening) || 0;
  const signedMovement = (entry: Entry) => type === 'Customer' ? entry.debit - entry.credit : entry.credit - entry.debit;
  const openingAtStart = opening + (fromDate ? entries.filter(x => x.date < fromDate).reduce((sum, x) => sum + signedMovement(x), 0) : 0);
  const dateEntries = entries.filter(x => inDateRange(x.date));
  const debit = dateEntries.reduce((sum, x) => sum + x.debit, 0);
  const credit = dateEntries.reduce((sum, x) => sum + x.credit, 0);
  const closing = openingAtStart + dateEntries.reduce((sum, x) => sum + signedMovement(x), 0);
  const balanceRows = (() => {
    let runningBalance = openingAtStart;
    return dateEntries.map(entry => {
      runningBalance += signedMovement(entry);
      return { ...entry, balance: runningBalance };
    });
  })();
  const visibleEntries = balanceRows.filter(x => entryFilter === 'All' || x.kind === entryFilter);

  const customerSales = type === 'Customer' ? sales.filter(x => x.customer === party && inDateRange(String(x.date || ''))) : [];
  const customerSalesGrossProfit = customerSales.reduce((sum, sale) => {
    const cost = sale.purchasePrice === undefined || sale.purchasePrice === null ? Number.NaN : Number(sale.purchasePrice);
    const quantity = Number(sale.qty) || 0;
    const rate = Number(sale.rate) || 0;
    return sum + (Number.isFinite(cost) && cost > 0 ? (rate - cost) * quantity : 0);
  }, 0);
  const customerReturnRows = type === 'Customer' ? returns.filter(x => x.type === 'Sales Return' && x.party === party && inDateRange(String(x.date || ''))) : [];
  const customerReturnProfit = customerReturnRows.reduce((sum, item) => {
    const cost = item.purchasePrice === undefined || item.purchasePrice === null ? Number.NaN : Number(item.purchasePrice);
    const quantity = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    return sum + (Number.isFinite(cost) && cost > 0 ? (rate - cost) * quantity : 0);
  }, 0);
  const customerGrossProfit = customerSalesGrossProfit - customerReturnProfit;
  const salesMissingCost = customerSales.filter(x => x.purchasePrice === undefined || x.purchasePrice === null || !Number.isFinite(Number(x.purchasePrice)) || Number(x.purchasePrice) <= 0).length
    + customerReturnRows.filter(x => x.purchasePrice === undefined || x.purchasePrice === null || !Number.isFinite(Number(x.purchasePrice)) || Number(x.purchasePrice) <= 0).length;

  function exportStatement() {
    const rows: (string | number)[][] = [
      ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
      ['Opening balance for selected period', '', '', '', openingAtStart],
      ...visibleEntries.map(x => [x.date, x.description, x.debit, x.credit, x.balance])
    ];
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = party.replace(/[^a-z0-9]+/gi, '-') + '-' + type.toLowerCase() + '-ledger.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Party Ledger</h1><p className="text-sm text-[var(--text-2)]">Date-filtered account statements with running balances and customer gross-profit analysis.</p></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['Customer', 'Supplier'] as const).map(x => <button key={x} onClick={() => { setType(x); setParty(''); setEntryFilter('All'); }} className={`rounded-lg px-5 py-3 text-sm font-semibold ${type === x ? 'sl-primary text-white' : 'bg-[var(--surface-2)] text-[var(--text)]'}`}>{x} Ledger</button>)}
      </div>
      <label className="block text-sm font-medium">Select {type}<select className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--text)]" value={party} onChange={e => setParty(e.target.value)}><option value="">Choose {type.toLowerCase()}</option>{parties.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</select></label>
    </div>
    {party && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Opening Balance (period)', openingAtStart],
          ['Total Debit', debit],
          ['Total Credit', credit],
          ['Closing Balance', Math.abs(closing)]
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm text-[var(--text-2)]">{label}</p><strong className="text-xl">{money(Number(value))}</strong>
          {label === 'Closing Balance' && <p className="text-xs text-[var(--text-2)]">{closing === 0 ? 'Settled' : closing > 0 ? (type === 'Customer' ? 'Receivable' : 'Payable') : (type === 'Customer' ? 'Advance received' : 'Advance paid')}</p>}
        </div>)}
      </div>
      {type === 'Customer' && <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-2)]">Gross profit before expenses</p><strong className="text-xl">{money(customerGrossProfit)}</strong>
          <p className="mt-1 text-xs text-[var(--text-2)]">Based on saved sale-time purchase costs; GST excluded from margin.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-2)]">Sales missing cost data</p><strong className="text-xl">{salesMissingCost}</strong>
          <p className="mt-1 text-xs text-[var(--text-2)]">Invoices or returns without saved cost snapshots are excluded from gross profit.</p>
        </div>
      </div>}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{party} — Statement</h2>
          <button type="button" onClick={exportStatement} className="rounded-lg border border-[var(--indigo)] px-3 py-2 text-xs font-semibold text-[var(--indigo-ink)]">Export CSV</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-[var(--text-2)]">From date<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label>
          <label className="text-xs font-medium text-[var(--text-2)]">To date<input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label>
          <label className="text-xs font-medium text-[var(--text-2)]">Transaction type<select value={entryFilter} onChange={e => setEntryFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]">
            <option value="All">All transactions</option><option value="Invoice">Invoices</option>
            {type === 'Customer' ? <option value="Receipt">Receipts</option> : <option value="Payment">Payments</option>}
            <option value="Refund">Refunds</option><option value="Return">Returns</option>
          </select></label>
        </div>
        {fromDate && toDate && fromDate > toDate && <p className="text-sm text-[var(--rose)]">From date must be on or before the To date.</p>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Debit</th><th className="p-2">Credit</th><th className="p-2">Balance</th></tr></thead>
          <tbody>
            <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><td className="p-2">—</td><td className="p-2">Opening balance for selected period</td><td className="p-2">—</td><td className="p-2">—</td><td className="p-2">{money(openingAtStart)}</td></tr>
            {visibleEntries.map((x, i) => <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]" key={i}><td className="p-2">{x.date}</td><td className="p-2">{x.description}</td><td className="p-2">{x.debit ? money(x.debit) : '—'}</td><td className="p-2">{x.credit ? money(x.credit) : '—'}</td><td className="p-2">{money(Math.abs(x.balance))}</td></tr>)}
          </tbody>
        </table></div>
        {visibleEntries.length === 0 && <p className="py-5 text-center text-[var(--text-2)]">No transactions match this party and filter range.</p>}
      </div>
    </>}
  </section>;
}
