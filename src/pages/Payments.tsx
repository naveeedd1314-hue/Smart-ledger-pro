import { useEffect, useRef, useState } from 'react';
import { localDateISO } from '../lib/dateUtils';
import { jsPDF } from 'jspdf';

type Payment = { id: string; date: string; type: string; party: string; amount: number; method: string; reference: string; note: string; allocations?: { invoiceId: string; invoice: string; amount: number }[] };

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
  const [date, setDate] = useState(localDateISO());
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const savingRef = useRef(false);
  const [invoiceId, setInvoiceId] = useState('');

  useEffect(() => {
    const read = (key: string) => {
      try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
      catch { return []; }
    };
    setItems(read('smartledger-pro-payments'));
    setSalesInvoices(read('smartledger-pro-sales'));
    setPurchaseInvoices(read('smartledger-pro-purchases'));
    setReturns(read('smartledger-pro-returns'));
    setCustomers(read('smartledger-pro-customers'));
    setSuppliers(read('smartledger-pro-suppliers'));
  }, []);

  const invoiceList = type === 'Customer Receipt' ? salesInvoices : type === 'Supplier Payment' ? purchaseInvoices : [];
  const invoiceAllocations = items.flatMap((payment: any) => Array.isArray(payment.allocations) ? payment.allocations.map((a: any) => ({...a, type: payment.type, party: payment.party})) : []);
  const invoiceOptions = invoiceList.map((invoice: any) => {
    const id = String(invoice.id);
    const allocated = invoiceAllocations.filter((a: any) => String(a.invoiceId) === id && a.type === type).reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    const originalPaid = Number(invoice.paid) || 0;
    const total = Number(invoice.total) || 0;
    const returnType = type === 'Customer Receipt' ? 'Sales Return' : 'Purchase Return';
    const returnCredit = returns.filter(x => x.type === returnType && String(x.originalId) === id).reduce((sum, x) => sum + (Number(x.totalAmount ?? x.amount) || 0), 0);
    return { ...invoice, id, paidNow: originalPaid + allocated, returnCredit, dueNow: Math.max(0, total - originalPaid - allocated - returnCredit) };
  }).filter((invoice: any) => invoice.dueNow > 0);

  const customerCredit = (name: string) => {
    const key = name.trim().toLowerCase();
    const opening = customers.filter(x => String(x.name || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.opening) || 0), 0);
    const invoiceDue = salesInvoices.filter(x => String(x.customer || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (x.total !== undefined && x.total !== null && Number.isFinite(Number(x.total)) ? Math.max(0, Number(x.total) - (Number(x.paid) || 0)) : Math.max(0, Number(x.balance) || 0)), 0);
    const received = items.filter(x => x.type === 'Customer Receipt' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    const refunded = items.filter(x => x.type === 'Customer Refund' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    const returned = returns.filter(x => x.type === 'Sales Return' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.totalAmount ?? x.amount) || 0), 0);
    return Math.max(0, -(opening + invoiceDue + refunded - received - returned));
  };
  const supplierCredit = (name: string) => {
    const key = name.trim().toLowerCase();
    const opening = suppliers.filter(x => String(x.name || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.opening) || 0), 0);
    const invoiceDue = purchaseInvoices.filter(x => String(x.supplier || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (x.total !== undefined && x.total !== null && Number.isFinite(Number(x.total)) ? Math.max(0, Number(x.total) - (Number(x.paid) || 0)) : Math.max(0, Number(x.balance) || 0)), 0);
    const paid = items.filter(x => x.type === 'Supplier Payment' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    const refunded = items.filter(x => x.type === 'Supplier Refund' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    const returned = returns.filter(x => x.type === 'Purchase Return' && String(x.party || '').trim().toLowerCase() === key).reduce((sum, x) => sum + (Number(x.totalAmount ?? x.amount) || 0), 0);
    return Math.max(0, -(opening + invoiceDue + refunded - paid - returned));
  };

  function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    const reject = (message: string) => { savingRef.current = false; alert(message); };
    if (!Number.isFinite(amount) || amount <= 0 || !date) return reject('Enter a valid date and amount.');
    const selectedInvoice = invoiceOptions.find((x: any) => x.id === invoiceId);
    if (invoiceId && !selectedInvoice) return reject('Selected invoice is no longer available or is already settled.');
    const selectedParty = selectedInvoice
      ? (type === 'Customer Receipt' ? selectedInvoice.customer : selectedInvoice.supplier)
      : party.trim();
    if (!selectedParty) return reject('Enter a party name or select an invoice.');
    if (type === 'Customer Refund' && amount > customerCredit(selectedParty) + 0.01) return reject(`Refund exceeds the available customer credit of ₹${customerCredit(selectedParty).toLocaleString('en-IN',{maximumFractionDigits:2})}.`);
    if (type === 'Supplier Refund' && amount > supplierCredit(selectedParty) + 0.01) return reject(`Refund exceeds the available supplier credit of ₹${supplierCredit(selectedParty).toLocaleString('en-IN',{maximumFractionDigits:2})}.`);
    if (selectedInvoice && amount > selectedInvoice.dueNow) return reject('Payment cannot exceed the selected invoice balance.');
    const id = crypto.randomUUID();
    const payment: any = { id, date, type, party: selectedParty, amount, method, reference, note };
    if (selectedInvoice) payment.allocations = [{ invoiceId: selectedInvoice.id, invoice: selectedInvoice.invoice || selectedInvoice.id, amount }];
    const next = [payment, ...items];
    setItems(next);
    localStorage.setItem('smartledger-pro-payments', JSON.stringify(next));
    setParty(''); setAmount(0); setReference(''); setNote(''); setInvoiceId('');
    savingRef.current = false;
  }

  const receipts = items.filter(x=>x.type==='Customer Receipt').reduce((s,x)=>s+x.amount,0);
  const paid = items.filter(x=>x.type==='Supplier Payment').reduce((s,x)=>s+x.amount,0);
  const customerRefunds = items.filter(x=>x.type==='Customer Refund').reduce((s,x)=>s+x.amount,0);
  const supplierRefunds = items.filter(x=>x.type==='Supplier Refund').reduce((s,x)=>s+x.amount,0);
  const money = (n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;

  const invoiceHistoryRows = items.flatMap((raw: Payment) => {
    const payment = raw as Payment;
    const allocations = Array.isArray(payment.allocations) ? payment.allocations : [];
    const rows = allocations.map((allocation, index) => ({
      id: `${payment.id}-${allocation.invoiceId || allocation.invoice || index}`,
      invoice: allocation.invoice || allocation.invoiceId || 'Invoice',
      date: payment.date,
      type: payment.type,
      party: payment.party,
      method: payment.method,
      reference: payment.reference,
      amount: Math.max(0, Number(allocation.amount) || 0),
      linked: true,
    }));
    const allocated = allocations.reduce((sum, allocation) => sum + Math.max(0, Number(allocation.amount) || 0), 0);
    const remainder = Math.max(0, (Number(payment.amount) || 0) - allocated);
    if (!allocations.length || remainder > 0.009) rows.push({
      id: `${payment.id}-unallocated`,
      invoice: allocations.length ? 'Unallocated remainder' : 'Not linked to an invoice',
      date: payment.date,
      type: payment.type,
      party: payment.party,
      method: payment.method,
      reference: payment.reference,
      amount: allocations.length ? remainder : Math.max(0, Number(payment.amount) || 0),
      linked: false,
    });
    return rows;
  });
  
function downloadInvoiceHistoryPdf() {
  const doc = new jsPDF({ orientation: "landscape" });
  const rows = invoiceHistoryRows;
  const headers = ["Invoice", "Date", "Type", "Party", "Method", "Reference", "Amount"];
  const widths = [34, 24, 25, 43, 30, 48, 35];
  const left = 14;

  const heading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("SMARTLEDGER", left, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("INVOICE-WISE PAYMENT HISTORY", left, 21);
    doc.setDrawColor(110, 130, 110);
    doc.line(left, 25, 283, 25);
  };

  const tableHead = () => {
    let x = left;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(232, 238, 229);
    widths.forEach((w, i) => {
      doc.rect(x, 30, w, 10, "FD");
      doc.text(headers[i], x + 2, 36.5);
      x += w;
    });
    return 40;
  };

  heading();
  let y = tableHead();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row: any) => {
    const values = [
      row.invoice, row.date, row.type, row.party,
      row.method, row.reference, "INR " + Number(row.amount || 0).toLocaleString("en-IN", {maximumFractionDigits: 2})
    ];
    const cells = values.map((v, i) =>
      doc.splitTextToSize(String(v ?? "-"), widths[i] - 4).slice(0, 2)
    );
    const h = Math.max(10, ...cells.map((c: string[]) => c.length * 4 + 4));

    if (y + h > 190) {
      doc.addPage();
      heading();
      y = tableHead();
    }

    let x = left;
    widths.forEach((w, i) => {
      doc.rect(x, y, w, h);
      doc.text(cells[i], x + 2, y + 5);
      x += w;
    });
    y += h;
  });

  if (!rows.length) doc.text("No payment history found.", left, y + 8);

  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${doc.getNumberOfPages()}`, 283, 202, { align: "right" });
  }
  doc.save("SmartLedger-Invoice-Payment-History.pdf");
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
      paid: (Number(x.paid) || 0) + invoiceAllocations.filter((a: any) => String(a.invoiceId) === String(x.id) && a.type === 'Customer Receipt').reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0),
      credited: returns.filter(r => r.type === 'Sales Return' && String(r.originalId) === String(x.id)).reduce((sum, r) => sum + (Number(r.totalAmount ?? r.amount) || 0), 0),
      remaining: Math.max(0, (Number(x.total) || 0) - (Number(x.paid) || 0) - invoiceAllocations.filter((a: any) => String(a.invoiceId) === String(x.id) && a.type === 'Customer Receipt').reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0) - returns.filter(r => r.type === 'Sales Return' && String(r.originalId) === String(x.id)).reduce((sum, r) => sum + (Number(r.totalAmount ?? r.amount) || 0), 0)),
    })),
    ...readInvoices('smartledger-pro-purchases').map((x: any) => ({
      id: `purchase-${x.id}`,
      invoice: x.invoice || x.id,
      party: x.supplier || 'Supplier',
      type: 'Supplier',
      total: Number(x.total) || 0,
      paid: (Number(x.paid) || 0) + invoiceAllocations.filter((a: any) => String(a.invoiceId) === String(x.id) && a.type === 'Supplier Payment').reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0),
      credited: returns.filter(r => r.type === 'Purchase Return' && String(r.originalId) === String(x.id)).reduce((sum, r) => sum + (Number(r.totalAmount ?? r.amount) || 0), 0),
      remaining: Math.max(0, (Number(x.total) || 0) - (Number(x.paid) || 0) - invoiceAllocations.filter((a: any) => String(a.invoiceId) === String(x.id) && a.type === 'Supplier Payment').reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0) - returns.filter(r => r.type === 'Purchase Return' && String(r.originalId) === String(x.id)).reduce((sum, r) => sum + (Number(r.totalAmount ?? r.amount) || 0), 0)),
    })),
  ].map((x: any) => ({
    ...x,
    status: x.remaining <= 0 ? (x.credited > 0 && x.paid < x.total ? 'Settled by return' : 'Fully Paid') : x.paid > 0 || x.credited > 0 ? 'Partially Settled' : 'Unpaid',
  }));

  const filteredInvoiceStatusRows = invoiceStatusRows.filter((x: any) =>
    (invoiceTypeFilter === 'All' || x.type === invoiceTypeFilter) &&
    (invoiceStatusFilter === 'All' || x.status === invoiceStatusFilter) &&
    (`${x.invoice} ${x.party}`.toLowerCase().includes(invoiceSearch.trim().toLowerCase()))
  );


  function exportOutstandingCsv() {
    const rows = [
      ['Invoice', 'Party', 'Type', 'Total', 'Paid', 'Return Credit', 'Remaining', 'Status'],
      ...filteredInvoiceStatusRows.map((x: any) => [
        x.invoice, x.party, x.type, x.total, x.paid, x.credited, x.remaining, x.status
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
  const doc = new jsPDF({ orientation: "landscape" });
  const rows = filteredInvoiceStatusRows;
  const headers = ["Invoice", "Party", "Type", "Total", "Paid", "Return Credit", "Remaining", "Status"];
  const widths = [34, 42, 24, 32, 30, 36, 34, 32];
  const left = 14;

  const heading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("SMARTLEDGER", left, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("INVOICE OUTSTANDING REPORT", left, 21);
    doc.setDrawColor(110, 130, 110);
    doc.line(left, 25, 283, 25);
  };

  const tableHead = () => {
    let x = left;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(232, 238, 229);
    widths.forEach((w, i) => {
      doc.rect(x, 30, w, 10, "FD");
      doc.text(headers[i], x + 2, 36.5);
      x += w;
    });
    return 40;
  };

  heading();
  let y = tableHead();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row: any) => {
    const values = [
      row.invoice, row.party, row.type,
      "INR " + Number(row.total || 0).toLocaleString("en-IN", {maximumFractionDigits: 2}),
      "INR " + Number(row.paid || 0).toLocaleString("en-IN", {maximumFractionDigits: 2}),
      "INR " + Number(row.credited || 0).toLocaleString("en-IN", {maximumFractionDigits: 2}),
      "INR " + Number(row.remaining || 0).toLocaleString("en-IN", {maximumFractionDigits: 2}),
      row.status
    ];
    const cells = values.map((v, i) =>
      doc.splitTextToSize(String(v ?? "-"), widths[i] - 4).slice(0, 2)
    );
    const h = Math.max(10, ...cells.map((c: string[]) => c.length * 4 + 4));

    if (y + h > 180) {
      doc.addPage();
      heading();
      y = tableHead();
    }

    let x = left;
    widths.forEach((w, i) => {
      doc.rect(x, y, w, h);
      doc.text(cells[i], x + 2, y + 5);
      x += w;
    });
    y += h;
  });

  const remaining = rows.reduce(
    (sum: number, row: any) => sum + (Number(row.remaining) || 0), 0
  );
  if (y + 10 > 190) {
    doc.addPage();
    heading();
    y = 40;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`TOTAL OUTSTANDING: ${money(remaining)}`, left, y + 8);

  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${doc.getNumberOfPages()}`, 283, 202, { align: "right" });
  }
  doc.save("SmartLedger-Invoice-Outstanding.pdf");
}


return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Payments & Receipts</h1><p className="text-sm text-[var(--text-2)]">Record customer receipts and refunds, plus supplier payments and refunds.</p><p className="mt-2 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-3 text-sm text-[var(--text)]">Accounting rule: enter the initial amount paid inside the sales or purchase invoice. Use this page for later receipts, payments and cash refunds. Customer Refund records money returned to a customer; Supplier Refund records money received back from a supplier. Never record the same cash transaction twice.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Customer Receipts</p><strong className="text-xl">{money(receipts)}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Supplier Payments</p><strong className="text-xl">{money(paid)}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Customer Refunds</p><strong className="text-xl">{money(customerRefunds)}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Supplier Refunds</p><strong className="text-xl">{money(supplierRefunds)}</strong></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">Transactions</p><strong className="text-xl">{items.length}</strong></div>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">New Transaction</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Transaction type<select className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={type} onChange={e=>{setType(e.target.value);setInvoiceId('');setParty('');}}><option>Customer Receipt</option><option>Supplier Payment</option><option>Customer Refund</option><option>Supplier Refund</option></select></label>
        <label className="text-sm">Date<input type="date" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={date} onChange={e=>setDate(e.target.value)} /></label>
        {(type === 'Customer Receipt' || type === 'Supplier Payment') && <label className="text-sm sm:col-span-2">Allocate to invoice (optional)<select className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" value={invoiceId} onChange={e=>{const id=e.target.value;setInvoiceId(id);const selected=invoiceOptions.find((x:any)=>x.id===id);if(selected)setParty(type==='Customer Receipt'?selected.customer:selected.supplier);}}><option value="">Unallocated party payment</option>{invoiceOptions.map((x:any)=><option key={x.id} value={x.id}>{x.invoice||x.id} — {type==='Customer Receipt'?x.customer:x.supplier} — Due ₹{x.dueNow.toLocaleString('en-IN',{maximumFractionDigits:2})}</option>)}</select></label>}
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder={type.includes("Customer") ? "Customer name" : "Supplier name"} value={party} onChange={e=>{setParty(e.target.value);setInvoiceId('');}} />
        {party.trim() && type === 'Customer Refund' && <p className="text-xs text-[var(--text-2)]">Available customer credit: <strong>{money(customerCredit(party))}</strong></p>}
        {party.trim() && type === 'Supplier Refund' && <p className="text-xs text-[var(--text-2)]">Available supplier credit: <strong>{money(supplierCredit(party))}</strong></p>}
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
        <label className="text-sm">Payment method<select className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={method} onChange={e=>setMethod(e.target.value)}>{['Cash','UPI','Bank Transfer','Cheque','Card','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
        <input className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" placeholder="Reference / UTR / Cheque number" value={reference} onChange={e=>setReference(e.target.value)} />
        <input className="rounded-lg border p-3 sm:col-span-2" placeholder="Notes (optional)" value={note} onChange={e=>setNote(e.target.value)} />
      </div>
      <button onClick={save} className="rounded-xl bg-[var(--indigo-ink)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo)]">Save Transaction</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Transaction History</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Party</th><th className="p-2">Method</th><th className="p-2">Reference</th><th className="p-2">Amount</th></tr></thead><tbody>{items.map(x=><tr key={x.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><td className="p-2">{x.date}</td><td className="p-2">{x.type}</td><td className="p-2">{x.party}</td><td className="p-2">{x.method}</td><td className="p-2">{x.reference}</td><td className="p-2">{money(x.amount)}</td></tr>)}</tbody></table></div>
      {items.length===0 && <p className="py-5 text-center text-[var(--text-2)]">No transactions yet.</p>}
    </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Invoice-wise Payment History</h2>
      <button onClick={downloadInvoiceHistoryPdf} className="rounded-lg bg-[var(--indigo-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--indigo)]">
        Download PDF</button>
      <button onClick={shareInvoiceHistoryWhatsApp} className="rounded-lg border border-[var(--indigo)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--indigo-ink)] hover:bg-[var(--border)]">
        Share on WhatsApp
      
      </button>
      <p className="text-sm text-[var(--text-2)]">Allocated payments recorded against individual invoices.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Invoice</th><th className="p-2">Date</th>
            <th className="p-2">Type</th><th className="p-2">Party</th>
            <th className="p-2">Method</th><th className="p-2">Reference</th>
            <th className="p-2">Paid</th>
          </tr></thead>
          <tbody>{invoiceHistoryRows.map(row => <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
            <td className="p-2 font-medium">{row.invoice}</td>
            <td className="p-2">{row.date}</td><td className="p-2">{row.type}</td>
            <td className="p-2">{row.party}</td><td className="p-2">{row.method}</td>
            <td className="p-2">{row.reference || '—'}</td>
            <td className="p-2">{money(row.amount)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {invoiceHistoryRows.length === 0 && <p className="py-4 text-center text-[var(--text-2)]">No invoice-linked payments yet.</p>}
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Invoice Outstanding & Payment Status</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportOutstandingPdf} className="rounded-lg bg-[var(--indigo-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--indigo)]">Export PDF</button>
        <button onClick={exportOutstandingCsv} className="rounded-lg border border-[var(--indigo)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--indigo-ink)] hover:bg-[var(--border)]">Export Excel (CSV)</button>
      </div>
      <input
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15"
        placeholder="Search invoice number or party name"
        value={invoiceSearch}
        onChange={e=>setInvoiceSearch(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <select className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={invoiceTypeFilter} onChange={e=>setInvoiceTypeFilter(e.target.value)}>
          <option value="All">All Parties</option>
          <option value="Customer">Customers</option>
          <option value="Supplier">Suppliers</option>
        </select>
        <select className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/15" value={invoiceStatusFilter} onChange={e=>setInvoiceStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Partially Settled">Partially Settled</option>
          <option value="Settled by return">Settled by return</option>
          <option value="Fully Paid">Fully Paid</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Invoice</th><th className="p-2">Party</th>
            <th className="p-2">Type</th><th className="p-2">Total</th>
            <th className="p-2">Paid</th><th className="p-2">Return Credit</th><th className="p-2">Remaining</th>
            <th className="p-2">Status</th>
          </tr></thead>
          <tbody>{filteredInvoiceStatusRows.map((x: any) => <tr key={x.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
            <td className="p-2">{x.invoice}</td><td className="p-2">{x.party}</td>
            <td className="p-2">{x.type}</td><td className="p-2">{money(x.total)}</td>
            <td className="p-2">{money(x.paid)}</td><td className="p-2">{money(x.credited)}</td><td className="p-2">{money(x.remaining)}</td>
            <td className="p-2 font-medium">{x.status}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {filteredInvoiceStatusRows.length === 0 && <p className="py-4 text-center text-[var(--text-2)]">No invoices match these filters.</p>}
    </div>
</section>;
}
