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

  useEffect(() => {
    setSales(read('smartledger-pro-sales'))
    setPurchases(read('smartledger-pro-purchases'))
    setReturns(read('smartledger-pro-returns'))
    try {
      setSettings(JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}'))
    } catch {}
  }, [])

  const salesReturnTax = returns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.taxAmount) || 0), 0)
  const purchaseReturnTax = returns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.taxAmount) || 0), 0)
  const outputTax = Math.max(0, sales.reduce((s, x) => s + (Number(x.taxAmount) || 0), 0) - salesReturnTax)
  const inputTax = Math.max(0, purchases.reduce((s, x) => s + (Number(x.taxAmount) || 0), 0) - purchaseReturnTax)
  const salesReturnCgst = returns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.cgst) || 0), 0)
  const salesReturnSgst = returns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.sgst) || 0), 0)
  const salesReturnUtgst = returns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.utgst) || 0), 0)
  const salesReturnIgst = returns.filter(x => x.type === 'Sales Return').reduce((s, x) => s + (Number(x.igst) || 0), 0)
  const purchaseReturnCgst = returns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.cgst) || 0), 0)
  const purchaseReturnSgst = returns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.sgst) || 0), 0)
  const purchaseReturnUtgst = returns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.utgst) || 0), 0)
  const purchaseReturnIgst = returns.filter(x => x.type === 'Purchase Return').reduce((s, x) => s + (Number(x.igst) || 0), 0)
  const cgstOut = sales.reduce((s, x) => s + (Number(x.cgst) || 0), 0) - salesReturnCgst
  const sgstOut = sales.reduce((s, x) => s + (Number(x.sgst) || 0), 0) - salesReturnSgst
  const igstOut = sales.reduce((s, x) => s + (Number(x.igst) || 0), 0) - salesReturnIgst
  const utgstOut = sales.reduce((s, x) => s + (Number(x.utgst) || 0), 0) - salesReturnUtgst
  const cgstIn = purchases.reduce((s, x) => s + (Number(x.cgst) || 0), 0) - purchaseReturnCgst
  const sgstIn = purchases.reduce((s, x) => s + (Number(x.sgst) || 0), 0) - purchaseReturnSgst
  const igstIn = purchases.reduce((s, x) => s + (Number(x.igst) || 0), 0) - purchaseReturnIgst
  const utgstIn = purchases.reduce((s, x) => s + (Number(x.utgst) || 0), 0) - purchaseReturnUtgst
  const taxableSales = sales.reduce((s, x) => s + (Number(x.taxableValue) || 0), 0)
  const taxablePurchases = purchases.reduce((s, x) => s + (Number(x.taxableValue) || 0), 0)
  const missingSales = sales.filter(x => x.taxAmount === undefined).length
  const missingPurchases = purchases.filter(x => x.taxAmount === undefined).length

  const cards = [
    ['Output GST (Sales)', outputTax],
    ['Input GST (Purchases)', inputTax],
    ['Estimated Net GST', outputTax - inputTax],
    ['Taxable Sales', taxableSales],
    ['Taxable Purchases', taxablePurchases],
    ['Sales Return GST Reversal', salesReturnTax],
    ['Purchase Return GST Reversal', purchaseReturnTax]
  ]

  return <section className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold">GST & Tax Management</h1>
      <p className="text-sm text-[#788579]">GST overview based on tax details saved in invoices.</p>
    </div>

    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
      <h2 className="font-semibold text-[#244632]">Registered Business</h2>
      <p className="mt-2 text-sm">GSTIN: <strong>{settings.gstin || 'Not entered in Settings'}</strong></p>
      <p className="text-sm">Business state: <strong>{settings.state || 'Not configured'}</strong></p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <p className="text-sm text-[#788579]">{label}</p>
        <strong className="mt-2 block text-xl font-bold tracking-tight text-[#244632]">{money(Number(value))}</strong>
      </div>)}
    </div>

    <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#244632]">GST Component Summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[#788579]"><th className="p-3">Tax component</th><th className="p-3">Output tax</th><th className="p-3">Input tax</th><th className="p-3">Net</th></tr></thead>
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

    {(missingSales || missingPurchases) > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {missingSales} existing sales and {missingPurchases} existing purchase records do not contain GST details. They are excluded from GST totals. Do not use this summary for filing until invoices and tax classifications have been checked.
    </div>}

    <div className="rounded-2xl border border-[#e6e0d2] bg-[#eeeadd] p-4 text-sm text-[#536256]">
      Net GST is an estimate of output tax minus recorded input tax. Actual GST liability and input tax credit depend on eligibility, place of supply, returns, credit notes, reversals and applicable tax rules. This page is not a GST return or filing utility.
    </div>
  </section>
}
