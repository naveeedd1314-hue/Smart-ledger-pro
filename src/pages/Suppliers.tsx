import { useEffect, useState } from 'react';

type Supplier = { id: string; name: string; phone: string; address: string; opening: number; gstin?: string };

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [opening, setOpening] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('smartledger-pro-suppliers') || '[]'));
  }, []);

  function save() {
    if (!name.trim()) return alert('Enter supplier name.');
    const next = [{ id: crypto.randomUUID(), name: name.trim(), phone, gstin: gstin.trim(), address, opening }, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-suppliers', JSON.stringify(next));
    setName(''); setPhone(''); setGstin(''); setAddress(''); setOpening(0);
  }

  const filtered = items.filter(x => `${x.name} ${x.phone} ${x.address}`.toLowerCase().includes(search.toLowerCase()));
  const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-sm text-[var(--text-2)]">Manage supplier accounts and opening payables.</p></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Add Supplier</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Supplier name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Supplier GSTIN (optional)" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" type="number" placeholder="Opening payable" value={opening} onChange={e => setOpening(Number(e.target.value))} />
      </div>
      <button onClick={save} className="rounded-xl bg-[var(--indigo-ink)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo)]">Save Supplier</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Supplier List ({items.length})</h2><strong>Opening payables: {money(items.reduce((s,x)=>s+x.opening,0))}</strong></div>
      <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Address</th><th className="p-2">Opening Payable</th></tr></thead><tbody>{filtered.map(x=><tr className="border-b border-[var(--border)] transition hover:bg-[var(--surface-2)]" key={x.id}><td className="p-2 font-medium">{x.name}</td><td className="p-2">{x.phone}</td><td className="p-2">{x.address}</td><td className="p-2">{money(x.opening)}</td></tr>)}</tbody></table></div>
      {filtered.length===0 && <p className="py-5 text-center text-[var(--text-2)]">No suppliers found.</p>}
    </div>
  </section>;
}
