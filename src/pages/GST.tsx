import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react'

type Row = Record<string, any>

const read = (key: string): Row[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function GST() {
  const [sales, setSales] = useState<Row[]>([])
  const [purchases, setPurchases] = useState<Row[]>([])
  const [returns, setReturns] = useState<Row[]>([])
  const [settings, setSettings] = useState<Row>({})
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    setSales(read('smartledger-pro-sales'))
    setPurchases(read('smartledger-pro-purchases'))
    setReturns(read('smartledger-pro-returns'))
    try {
      setSettings(JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}'))
    } catch {}
  }, [])

  const inRange = (row: Row) => {
    const date = String(row.date || '')
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
  }
  const periodSales = sales.filter(inRange)
  const periodPurchases = purchases.filter(inRange)
  const periodReturns = returns.filter(inRange)
  const salesReturnTax = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.taxAmount) || 0), 0)
  const purchaseReturnTax = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.taxAmount) || 0), 0)
  const outputTax = Math.max(0, periodSales.reduce((s, x) => s + (Number(x.taxAmount) || 0), 0) - salesReturnTax)
  const inputTax = Math.max(0, periodPurchases.reduce((s, x) => s + (Number(x.taxAmount) || 0), 0) - purchaseReturnTax)
  const salesReturnCgst = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.cgst) || 0), 0)
  const salesReturnSgst = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.sgst) || 0), 0)
  const salesReturnUtgst = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.utgst) || 0), 0)
  const salesReturnIgst = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.igst) || 0), 0)
  const purchaseReturnCgst = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.cgst) || 0), 0)
  const purchaseReturnSgst = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.sgst) || 0), 0)
  const purchaseReturnUtgst = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.utgst) || 0), 0)
  const purchaseReturnIgst = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.igst) || 0), 0)
  const cgstOut = Math.max(0, periodSales.reduce((s, x) => s + (Number(x.cgst) || 0), 0) - salesReturnCgst)
  const sgstOut = Math.max(0, periodSales.reduce((s, x) => s + (Number(x.sgst) || 0), 0) - salesReturnSgst)
  const igstOut = Math.max(0, periodSales.reduce((s, x) => s + (Number(x.igst) || 0), 0) - salesReturnIgst)
  const utgstOut = Math.max(0, periodSales.reduce((s, x) => s + (Number(x.utgst) || 0), 0) - salesReturnUtgst)
  const cgstIn = Math.max(0, periodPurchases.reduce((s, x) => s + (Number(x.cgst) || 0), 0) - purchaseReturnCgst)
  const sgstIn = Math.max(0, periodPurchases.reduce((s, x) => s + (Number(x.sgst) || 0), 0) - purchaseReturnSgst)
  const igstIn = Math.max(0, periodPurchases.reduce((s, x) => s + (Number(x.igst) || 0), 0) - purchaseReturnIgst)
  const utgstIn = Math.max(0, periodPurchases.reduce((s, x) => s + (Number(x.utgst) || 0), 0) - purchaseReturnUtgst)
  const grossTaxableSales = periodSales.reduce((s, x) => s + (Number(x.taxableValue) || 0), 0)
  const grossTaxablePurchases = periodPurchases.reduce((s, x) => s + (Number(x.taxableValue) || 0), 0)
  const salesReturnTaxable = periodReturns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const purchaseReturnTaxable = periodReturns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const taxableSales = Math.max(0, grossTaxableSales - salesReturnTaxable)
  const taxablePurchases = Math.max(0, grossTaxablePurchases - purchaseReturnTaxable)
  const missingSales = periodSales.filter(x => x.taxAmount === undefined || x.taxAmount === null).length
  const missingPurchases = periodPurchases.filter(x => x.taxAmount === undefined || x.taxAmount === null).length

  const exportGstWorkbook = () => {
    const summary = [
      ['SmartLedger GST Summary'],
      ['Business', settings.name || ''],
      ['GSTIN', settings.gstin || ''],
      ['State', settings.state || ''],
      ['From date', fromDate || 'All'],
      ['To date', toDate || 'All'],
      [],
      ['Metric', 'Amount'],
      ...cards.map(([label, value]) => [String(label), Number(value) || 0]),
      [],
      ['Tax component', 'Output tax', 'Input tax', 'Net'],
      ...[
        ['CGST', cgstOut, cgstIn],
        ['SGST', sgstOut, sgstIn],
        ['UTGST', utgstOut, utgstIn],
        ['IGST', igstOut, igstIn],
        ['Total', outputTax, inputTax]
      ].map(([label, output, input]) => [String(label), Number(output) || 0, Number(input) || 0, (Number(output) || 0) - (Number(input) || 0)])
    ];
    const invoices = [
      ['Type', 'Date', 'Invoice', 'Party', 'Taxable value', 'GST rate', 'Tax amount', 'CGST', 'SGST', 'UTGST', 'IGST', 'Total'],
      ...periodSales.map(x => ['Sales', x.date || '', x.invoice || x.invoiceNo || '', x.customer || '', Number(x.taxableValue) || 0, Number(x.gstRate) || 0, Number(x.taxAmount) || 0, Number(x.cgst) || 0, Number(x.sgst) || 0, Number(x.utgst) || 0, Number(x.igst) || 0, Number(x.total) || 0]),
      ...periodPurchases.map(x => ['Purchase', x.date || '', x.invoice || x.invoiceNo || '', x.supplier || '', Number(x.taxableValue) || 0, Number(x.gstRate) || 0, Number(x.taxAmount) || 0, Number(x.cgst) || 0, Number(x.sgst) || 0, Number(x.utgst) || 0, Number(x.igst) || 0, Number(x.total ?? x.amount) || 0]),
      ...periodReturns.map(x => [x.type || 'Return', x.date || '', x.invoice || '', x.party || '', Number(x.amount) || 0, Number(x.gstRate) || 0, Number(x.taxAmount) || 0, Number(x.cgst) || 0, Number(x.sgst) || 0, Number(x.utgst) || 0, Number(x.igst) || 0, Number(x.totalAmount ?? x.amount) || 0])
    ];
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'GST Summary');
    const invoiceSheet = XLSX.utils.aoa_to_sheet(invoices);
    invoiceSheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 26 }, ...Array.from({ length: 8 }, () => ({ wch: 16 }))];
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoice Details');
    XLSX.writeFile(workbook, `SmartLedger-GST-${fromDate || 'All'}-to-${toDate || 'All'}.xlsx`);
  };

  const cards = [
    ['Output GST (Sales)', outputTax],
    ['Input GST (Purchases)', inputTax],
    ['Estimated Net GST', outputTax - inputTax],
    ['Net Taxable Sales', taxableSales],
    ['Net Taxable Purchases', taxablePurchases],
    ['Sales Return GST Reversal', salesReturnTax],
    ['Purchase Return GST Reversal', purchaseReturnTax]
  ]

  return <section className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold">GST & Tax Management</h1>
      <p className="text-sm text-[var(--text-2)]">GST overview after recorded returns, using invoice tax details for the selected period.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3 print:hidden"><label className="text-xs font-medium text-[var(--text-2)]">From date<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label><label className="text-xs font-medium text-[var(--text-2)]">To date<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label><button type="button" onClick={()=>{setFromDate('');setToDate('')}} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Clear dates</button><button type="button" onClick={exportGstWorkbook} className="rounded-lg bg-[var(--indigo-ink)] px-4 py-2 text-sm font-semibold text-white">Export GST Excel</button><button type="button" onClick={()=>window.print()} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold">Print report</button></div>
        <label className="text-xs font-medium text-[var(--text-2)]">From date<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label>
        <label className="text-xs font-medium text-[var(--text-2)]">To date<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label>
        <button type="button" onClick={()=>{setFromDate('');setToDate('')}} className="self-end rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Clear dates</button>
      </div>
      {fromDate&&toDate&&fromDate>toDate&&<p className="mt-2 text-sm text-[var(--rose)]">From date must be on or before the To date.</p>}
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="font-semibold text-[var(--text)]">Registered Business</h2>
      <p className="mt-2 text-sm">GSTIN: <strong>{settings.gstin || 'Not entered in Settings'}</strong></p>
      <p className="text-sm">Business state: <strong>{settings.state || 'Not configured'}</strong></p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <p className="text-sm text-[var(--text-2)]">{label}</p>
        <strong className="mt-2 block text-xl font-bold tracking-tight text-[var(--text)]">{money(Number(value))}</strong>
      </div>)}
    </div>

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">GST Component Summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]"><th className="p-3">Tax component</th><th className="p-3">Output tax</th><th className="p-3">Input tax</th><th className="p-3">Net</th></tr></thead>
          <tbody>
            {[
              ['CGST', cgstOut, cgstIn],
              ['SGST', sgstOut, sgstIn],
              ['UTGST', utgstOut, utgstIn],
              ['IGST', igstOut, igstIn],
              ['Total', outputTax, inputTax]
            ].map(([label, out, input]) => <tr className="border-b" key={String(label)}>
              <td className="p-3 font-medium">{label}</td>
              <td className="p-3">{money(Number(out))}</td>
              <td className="p-3">{money(Number(input))}</td>
              <td className="p-3 font-semibold">{money(Number(out) - Number(input))}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {(missingSales || missingPurchases) > 0 && <div className="rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-4 text-sm text-[var(--text)]">
      {missingSales} existing sales and {missingPurchases} existing purchase records do not contain GST details. They are excluded from GST totals. Do not use this summary for filing until invoices and tax classifications have been checked.
    </div>}

    <div className="rounded-2xl border border-[var(--border)] bg-[var(--border)] p-4 text-sm text-[var(--text-2)]">
      Net GST is an estimate of output tax minus recorded input tax. Actual GST liability and input tax credit depend on eligibility, place of supply, returns, credit notes, reversals and applicable tax rules. This page is not a GST return or filing utility.
    </div>
  </section>
}
