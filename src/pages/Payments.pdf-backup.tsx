import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';

type Payment = { id: string; date: string; type: string; party: string; amount: number; method: string; reference: string; note: string };

export default function Payments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('All');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const [type, setType] = useState('Customer Receipt');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('smartledger-pro-payments') || '[]'));
  }, []);

  function save() {
    if (!party.trim() || amount <= 0 || !date) return alert('Enter party, date and a valid amount.');
    const next = [{ id: crypto.randomUUID(), date, type, party: party.trim(), amount, method, reference, note }, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-payments', JSON.stringify(next));
    setParty(''); setAmount(0); setReference(''); setNote('');
  }

  const receipts = items.filter(x=>x.type==='Customer Receipt').reduce((s,x)=>s+x.amount,0);
  const paid = items.filter(x=>x.type==='Supplier Payment').reduce((s,x)=>s+x.amount,0);
  const money = (n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  const invoiceHistoryRows = items.flatMap((raw: Payment) => {
    const payment = raw as any;
    if (Array.isArray(payment.allocations) && payment.allocations.length) {
      return payment.allocations.map((allocation: any) => ({
        id: `${payment.id}-${allocation.invoiceId || allocation.invoice}`,
        invoice: allocation.invoice || allocation.invoiceId || 'Invoice',
        date: payment.date,
        type: payment.type,
        party: payment.party,
        method: payment.method,
        reference: payment.reference,
        amount: Number(allocation.amount) || 0,
        linked: true,
      }));
    }
    return [{
      id: payment.id,
      invoice: 'Not linked to an invoice',
      date: payment.date,
      type: payment.type,
      party: payment.party,
      method: payment.method,
      reference: payment.reference,
      amount: Number(payment.amount) || 0,
      linked: false,
    }];
  });

  function downloadInvoiceHistoryPdf() {
    const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SMARTLEDGER", 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PAYMENT & ACCOUNT STATEMENT", 14, 14);
  doc.setDrawColor(120, 140, 120);
  doc.line(14, 16, 196, 16);
    doc.setFontSize(16);
    doc.text('Invoice-wise Payment History', 14, 18);
    doc.setFontSize(9);
    let y = 30;
    doc.text('Invoice | Date | Type | Party | Method | Reference | Amount', 14, y);
    y += 8;
    invoiceHistoryRows.forEach((row: any) => {
      const line = `${row.invoice} | ${row.date} | ${row.type} | ${row.party} | ${row.method} | ${row.reference || '-'} | ${money(row.amount)}`;
      const lines = doc.splitTextToSize(line, 180);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 3;
    });
    doc.save('SmartLedger-Invoice-Payment-History.pdf');
  }

  function shareInvoiceHistoryWhatsApp() {
    const lines = [
      '*SmartLedger - Invoice Payment History*',
      '',
      ...invoiceHistoryRows.map((row: any) =>
        `Invoice: ${row.invoice}\nDate: ${row.date}\nParty: ${row.party}\nType: ${row.type}\nMethod: ${row.method}\nReference: ${row.reference || '-'}\nPaid: ${money(row.amount)}`
      )
    ];
    const message = lines.join('\n\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }


  const readInvoices = (key: string): any[] => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const invoiceStatusRows = [
    ...readInvoices('smartledger-pro-sales').map((x: any) => ({
      id: `sale-${x.id}`,
      invoice: x.invoice || x.id,
      party: x.customer || 'Customer',
      type: 'Customer',
      total: Number(x.total) || 0,
      paid: Number(x.paid) || 0,
      remaining: Math.max(0, Number(x.balance ?? ((Number(x.total) || 0) - (Number(x.paid) || 0))) || 0),
    })),
    ...readInvoices('smartledger-pro-purchases').map((x: any) => ({
      id: `purchase-${x.id}`,
      invoice: x.invoice || x.id,
      party: x.supplier || 'Supplier',
      type: 'Supplier',
      total: Number(x.total) || 0,
      paid: Number(x.paid) || 0,
      remaining: Math.max(0, Number(x.balance ?? ((Number(x.total) || 0) - (Number(x.paid) || 0))) || 0),
    })),
  ].map((x: any) => ({
    ...x,
    status: x.remaining <= 0 ? 'Fully Paid' : x.paid > 0 ? 'Partially Paid' : 'Unpaid',
  }));

  const filteredInvoiceStatusRows = invoiceStatusRows.filter((x: any) =>
    (invoiceTypeFilter === 'All' || x.type === invoiceTypeFilter) &&
    (invoiceStatusFilter === 'All' || x.status === invoiceStatusFilter) &&
    (`${x.invoice} ${x.party}`.toLowerCase().includes(invoiceSearch.trim().toLowerCase()))
  );


  function exportOutstandingCsv() {
    const rows = [
      ['Invoice', 'Party', 'Type', 'Total', 'Paid', 'Remaining', 'Status'],
      ...filteredInvoiceStatusRows.map((x: any) => [
        x.invoice, x.party, x.type, x.total, x.paid, x.remaining, x.status
      ])
    ];
    const csv = rows.map(row => row.map(value =>
      `"${String(value ?? '').replace(/"/g, '""')}"`
    ).join(',')).join('\\r\\n');
    const blob = new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartLedger-Invoice-Outstanding.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportOutstandingPdf() {
    const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SMARTLEDGER", 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PAYMENT & ACCOUNT STATEMENT", 14, 14);
  doc.setDrawColor(120, 140, 120);
  doc.line(14, 16, 196, 16);
    doc.setFontSize(15);
    doc.text('Invoice Outstanding Report', 14, 18);
    doc.setFontSize(8);
    let y = 29;
    const headers = 'Invoice | Party | Type | Total | Paid | Remaining | Status';
    doc.text(headers, 14, y);
    y += 7;
    filteredInvoiceStatusRows.forEach((x: any) => {
      const line = `${x.invoice} | ${x.party} | ${x.type} | ${money(x.total)} | ${money(x.paid)} | ${money(x.remaining)} | ${x.status}`;
      const lines = doc.splitTextToSize(line, 180);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 3;
    });
    doc.save('SmartLedger-Invoice-Outstanding.pdf');
  }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Payments & Receipts</h1><p className="text-sm text-gray-500">Record money received from customers and paid to suppliers.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm"><p className="text-sm text-gray-500">Customer Receipts</p><strong className="text-xl">{money(receipts)}</strong></div>
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm"><p className="text-sm text-gray-500">Supplier Payments</p><strong className="text-xl">{money(paid)}</strong></div>
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm"><p className="text-sm text-gray-500">Transactions</p><strong className="text-xl">{items.length}</strong></div>
    </div>
    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">New Transaction</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Transaction type<select className="mt-1 w-full rounded-lg border p-3" value={type} onChange={e=>setType(e.target.value)}><option>Customer Receipt</option><option>Supplier Payment</option></select></label>
        <label className="text-sm">Date<input type="date" className="mt-1 w-full rounded-lg border p-3" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <input className="rounded-lg border p-3" placeholder="Customer / Supplier name" value={party} onChange={e=>setParty(e.target.value)} />
        <input className="rounded-lg border p-3" type="number" min="0" placeholder="Amount" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
        <label className="text-sm">Payment method<select className="mt-1 w-full rounded-lg border p-3" value={method} onChange={e=>setMethod(e.target.value)}>{['Cash','UPI','Bank Transfer','Cheque','Card','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <input className="rounded-lg border p-3" placeholder="Reference / UTR / Cheque number" value={reference} onChange={e=>setReference(e.target.value)} />
        <input className="rounded-lg border p-3 sm:col-span-2" placeholder="Notes (optional)" value={note} onChange={e=>setNote(e.target.value)} />
      </div>
      <button onClick={save} className="rounded-lg bg-green-900 px-5 py-3 text-white">Save Transaction</button>
    </div>
    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">Transaction History</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Party</th><th className="p-2">Method</th><th className="p-2">Reference</th><th className="p-2">Amount</th></tr></thead><tbody>{items.map(x=><tr key={x.id} className="border-b"><td className="p-2">{x.date}</td><td className="p-2">{x.type}</td><td className="p-2">{x.party}</td><td className="p-2">{x.method}</td><td className="p-2">{x.reference}</td><td className="p-2">{money(x.amount)}</td></tr>)}</tbody></table></div>
      {items.length===0 && <p className="py-5 text-center text-gray-500">No transactions yet.</p>}
    </div>
      <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">Invoice-wise Payment History</h2>
      <button onClick={downloadInvoiceHistoryPdf} className="rounded-lg bg-green-900 px-4 py-2 text-sm text-white">
        Download PDF</button>
      <button onClick={shareInvoiceHistoryWhatsApp} className="rounded-lg border border-green-800 px-4 py-2 text-sm text-green-900">
        Share on WhatsApp
      
      </button>
      <p className="text-sm text-gray-500">Allocated payments recorded against individual invoices.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-gray-500">
            <th className="p-2">Invoice</th><th className="p-2">Date</th>
            <th className="p-2">Type</th><th className="p-2">Party</th>
            <th className="p-2">Method</th><th className="p-2">Reference</th>
            <th className="p-2">Paid</th>
          </tr></thead>
          <tbody>{invoiceHistoryRows.map(row => <tr key={row.id} className="border-b">
            <td className="p-2 font-medium">{row.invoice}</td>
            <td className="p-2">{row.date}</td><td className="p-2">{row.type}</td>
            <td className="p-2">{row.party}</td><td className="p-2">{row.method}</td>
            <td className="p-2">{row.reference || '—'}</td>
            <td className="p-2">{money(row.amount)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {invoiceHistoryRows.length === 0 && <p className="py-4 text-center text-gray-500">No invoice-linked payments yet.</p>}
    </div>

    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold">Invoice Outstanding & Payment Status</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportOutstandingPdf} className="rounded-lg bg-green-900 px-4 py-2 text-sm text-white">Export PDF</button>
        <button onClick={exportOutstandingCsv} className="rounded-lg border border-green-900 px-4 py-2 text-sm text-green-900">Export Excel (CSV)</button>
      </div>
      <input
        className="w-full rounded-lg border p-3 text-sm"
        placeholder="Search invoice number or party name"
        value={invoiceSearch}
        onChange={e=>setInvoiceSearch(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <select className="rounded-lg border p-3 text-sm" value={invoiceTypeFilter} onChange={e=>setInvoiceTypeFilter(e.target.value)}>
          <option value="All">All Parties</option>
          <option value="Customer">Customers</option>
          <option value="Supplier">Suppliers</option>
        </select>
        <select className="rounded-lg border p-3 text-sm" value={invoiceStatusFilter} onChange={e=>setInvoiceStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Fully Paid">Fully Paid</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-gray-500">
            <th className="p-2">Invoice</th><th className="p-2">Party</th>
            <th className="p-2">Type</th><th className="p-2">Total</th>
            <th className="p-2">Paid</th><th className="p-2">Remaining</th>
            <th className="p-2">Status</th>
          </tr></thead>
          <tbody>{filteredInvoiceStatusRows.map((x: any) => <tr key={x.id} className="border-b">
            <td className="p-2">{x.invoice}</td><td className="p-2">{x.party}</td>
            <td className="p-2">{x.type}</td><td className="p-2">{money(x.total)}</td>
            <td className="p-2">{money(x.paid)}</td><td className="p-2">{money(x.remaining)}</td>
            <td className="p-2 font-medium">{x.status}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {filteredInvoiceStatusRows.length === 0 && <p className="py-4 text-center text-gray-500">No invoices match these filters.</p>}
    </div>
</section>;
}
