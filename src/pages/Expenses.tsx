import { useEffect, useState } from 'react';

type Expense = { id: string; date: string; category: string; description: string; amount: number };

export default function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem('smartledger-pro-expenses') || '[]'); setItems(Array.isArray(value) ? value : []); } catch { setItems([]); }
  }, []);

  function save() {
    if (!date || !description.trim() || !Number.isFinite(amount) || amount <= 0) return alert('Enter a date, description and valid amount.');
    const next = [{ id: crypto.randomUUID(), date, category, description: description.trim(), amount }, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-expenses', JSON.stringify(next));
    setDescription(''); setAmount(0);
  }

  const filtered = items.filter(x => `${x.category} ${x.description} ${x.date}`.toLowerCase().includes(search.toLowerCase()));
  const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-[var(--text-2)]">Record and review business expenses.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Total Expenses</p><strong className="text-xl">{money(items.reduce((s,x)=>s+x.amount,0))}</strong></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Expense Entries</p><strong className="text-xl">{items.length}</strong></div></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Add Expense</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Date<input type="date" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label className="text-sm">Category<select className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={category} onChange={e=>setCategory(e.target.value)}>{['General','Transport','Fuel','Electricity','Rent','Salary','Packaging','Maintenance','Telephone','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" type="number" min="0" placeholder="Amount" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
      </div>
      <button onClick={save} className="rounded-xl bg-[var(--indigo-ink)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo)]">Save Expense</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Expense History</h2>
      <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Search expenses..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Category</th><th className="p-2">Description</th><th className="p-2">Amount</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><td className="p-2">{x.date}</td><td className="p-2">{x.category}</td><td className="p-2">{x.description}</td><td className="p-2">{money(x.amount)}</td></tr>)}</tbody></table></div>
      {filtered.length===0 && <p className="py-5 text-center text-[var(--text-2)]">No expenses found.</p>}
    </div>
  </section>;
}
