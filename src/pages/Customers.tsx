import { useEffect, useState } from 'react';

type Customer = { id: string; name: string; phone: string; address: string; opening: number; gstin?: string };

export default function Customers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [opening, setOpening] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('smartledger-pro-customers') || '[]'));
  }, []);

  function save() {
    if (!name.trim()) return alert('Enter customer name.');
    const next = [{ id: crypto.randomUUID(), name: name.trim(), phone, gstin: gstin.trim(), address, opening }, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-customers', JSON.stringify(next));
    setName(''); setPhone(''); setGstin(''); setAddress(''); setOpening(0);
  }

  const filtered = items.filter(x => `${x.name} ${x.phone} ${x.address}`.toLowerCase().includes(search.toLowerCase()));
  const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-[#788579]">Manage customer accounts and opening balances.</p></div>
    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Add Customer</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 transition focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" placeholder="Customer name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 transition focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 transition focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" placeholder="Customer GSTIN (optional)" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} />
        <input className="rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 transition focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <input className="rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 transition focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" type="number" placeholder="Opening balance" value={opening} onChange={e => setOpening(Number(e.target.value))} />
      </div>
      <button onClick={save} className="rounded-xl bg-[#183b2b] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#315b42]">Save Customer</button>
    </div>
    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Customer List ({items.length})</h2><strong>Opening balances: {money(items.reduce((s,x)=>s+x.opening,0))}</strong></div>
      <input className="w-full rounded-xl border border-[#e6e0d2] bg-[#fffdf7] p-3 focus:border-[#315b42] focus:outline-none focus:ring-2 focus:ring-[#315b42]/15" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[#788579]"><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Address</th><th className="p-2">Opening Balance</th></tr></thead><tbody>{filtered.map(x=><tr className="border-b border-[#eee9dd] transition hover:bg-[#f7f4eb]" key={x.id}><td className="p-2 font-medium">{x.name}</td><td className="p-2">{x.phone}</td><td className="p-2">{x.address}</td><td className="p-2">{money(x.opening)}</td></tr>)}</tbody></table></div>
      {filtered.length===0 && <p className="py-5 text-center text-[#788579]">No customers found.</p>}
    </div>
  </section>;
}
