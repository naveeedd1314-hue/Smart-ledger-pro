import { useRef, useState } from 'react';

type Supplier = { id: string; name: string; phone: string; address: string; opening: number; gstin?: string };

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('smartledger-pro-suppliers') || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [opening, setOpening] = useState(0);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const savingRef = useRef(false);

  function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    const reject = (message: string) => { savingRef.current = false; alert(message); };
    if (!name.trim()) return reject('Enter supplier name.');
    if (!Number.isFinite(opening)) return reject('Enter a valid opening balance.');
    if (items.some(x => x.id !== editingId && String(x.name || '').trim().toLowerCase() === name.trim().toLowerCase())) return reject('A supplier with this name already exists.');
    const next = editingId
      ? items.map(x => x.id === editingId ? { ...x, name: name.trim(), phone: phone.trim(), gstin: gstin.trim(), address: address.trim(), opening } : x)
      : [{ id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), gstin: gstin.trim(), address: address.trim(), opening }, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-suppliers', JSON.stringify(next));
    setName(''); setPhone(''); setGstin(''); setAddress(''); setOpening(0); setEditingId(null);
    savingRef.current = false;
  }

  const filtered = items.filter(x => `${x.name} ${x.phone} ${x.address}`.toLowerCase().includes(search.toLowerCase()));
  const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  function editParty(item: Supplier) { setEditingId(item.id); setName(item.name); setPhone(item.phone || ''); setGstin(item.gstin || ''); setAddress(item.address || ''); setOpening(Number(item.opening) || 0); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function cancelEdit() { setEditingId(null); setName(''); setPhone(''); setGstin(''); setAddress(''); setOpening(0); }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-sm text-[var(--text-2)]">Manage supplier accounts and opening payables.</p></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Supplier name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Supplier GSTIN (optional)" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" type="number" placeholder="Opening payable" value={opening} onChange={e => setOpening(Number(e.target.value))} />
      </div>
      <button onClick={save} className="rounded-xl bg-[var(--indigo-ink)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo)]" >{editingId ? 'Update Supplier' : 'Save Supplier'} </button>{editingId && <button type="button" onClick={cancelEdit} className="ml-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm">Cancel</button>}
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Supplier List ({items.length})</h2><strong>Opening payables: {money(items.reduce((s,x)=>s+x.opening,0))}</strong></div>
      <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Address</th><th className="p-2">Opening Payable</th><th className="p-2">Action</th></tr></thead><tbody>{filtered.map(x=><tr className="border-b border-[var(--border)] transition hover:bg-[var(--surface-2)]" key={x.id}><td className="p-2 font-medium">{x.name}</td><td className="p-2">{x.phone}</td><td className="p-2">{x.address}</td><td className="p-2">{money(x.opening)}</td><td className="p-2"><button type="button" onClick={() => editParty(x)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Edit</button></td></tr>)}</tbody></table></div>
      {filtered.length===0 && <p className="py-5 text-center text-[var(--text-2)]">No suppliers found.</p>}
    </div>
  </section>;
}
