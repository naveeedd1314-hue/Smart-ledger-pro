import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

export default function Reports() {
  const [sales, setSales] = useState<Row[]>([]);
  const [purchases, setPurchases] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [returns, setReturns] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);

  useEffect(() => {
    const read = (key: string): Row[] => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
      } catch { return []; }
    };
    setSales(read('smartledger-pro-sales'));
    setPurchases(read('smartledger-pro-purchases'));
    setExpenses(read('smartledger-pro-expenses'));
    setPayments(read('smartledger-pro-payments'));
    setReturns(read('smartledger-pro-returns'));
    setProducts(read('smartledger-products'));
  }, []);

  const num = (v: unknown) => Number(v) || 0;
  const salesTotal = sales.reduce((s,x)=>s+(x.taxableValue !== undefined && x.taxableValue !== null ? num(x.taxableValue) : (num(x.qty)*num(x.rate) || num(x.total))),0);
  const purchaseTotal = purchases.reduce((s,x)=>s+(num(x.total || x.amount) || num(x.qty)*num(x.rate)),0);
  const salesReturns = returns.filter(x=>x.type==='Sales Return');
  const purchaseReturns = returns.filter(x=>x.type==='Purchase Return');
  const salesReturnTotal = salesReturns.reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const purchaseReturnTotal = purchaseReturns.reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const netSales = Math.max(0,salesTotal-salesReturnTotal);
  const netPurchases = Math.max(0,purchaseTotal-purchaseReturnTotal);
  const expenseTotal = expenses.reduce((s,x)=>s+num(x.amount),0);
  const received = payments.filter(x=>x.type==='Customer Receipt').reduce((s,x)=>s+(x.allocations ? num(x.unallocatedAmount) : num(x.amount)),0);
  const supplierPaid = payments.filter(x=>x.type==='Supplier Payment').reduce((s,x)=>s+(x.allocations ? num(x.unallocatedAmount) : num(x.amount)),0);
  const salesPaid = sales.reduce((s,x)=>s+num(x.paid),0);
  const purchasePaid = purchases.reduce((s,x)=>s+num(x.paid),0);
  const customerDue = Math.max(0, sales.reduce((s,x)=>s+num(x.balance),0) - received - salesReturnTotal);
  const supplierDue = Math.max(0, purchases.reduce((s,x)=>s+(num(x.balance) || Math.max(0,num(x.total || x.amount || num(x.qty)*num(x.rate))-num(x.paid))),0) - supplierPaid - purchaseReturnTotal);
  const netMovement = salesPaid + received - purchasePaid - supplierPaid - expenseTotal;
  const money = (n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;


  const invoiceProfitRows = sales.map((x, index) => {
    const qty = num(x.qty);
    const rate = num(x.rate);
    const revenue = num(x.taxableValue) || qty * rate;
    const costPrice = num(x.purchasePrice);
    const hasCost = x.purchasePrice !== undefined && x.purchasePrice !== null && x.purchasePrice !== '';
    const cost = hasCost ? qty * costPrice : 0;
    return {
      invoice: String(x.invoice || x.invoiceNo || x.billNo || `Invoice ${index + 1}`),
      date: String(x.date || '—'),
      customer: String(x.customer || 'Walk-in Customer'),
      revenue,
      cost,
      profit: revenue - cost,
      hasCost
    };
  });
  const salesReturnProfitRows = salesReturns.map(x => {
    const hasCost = x.purchasePrice !== undefined && x.purchasePrice !== null && x.purchasePrice !== '';
    const qty = num(x.qty);
    const rate = num(x.rate);
    return { profit: hasCost ? (rate - num(x.purchasePrice)) * qty : 0, hasCost };
  });
  const returnsMissingCost = salesReturnProfitRows.filter(x => !x.hasCost).length;
  const salesReturnGrossProfit = salesReturnProfitRows.filter(x => x.hasCost).reduce((sum, x) => sum + x.profit, 0);
  const invoiceGrossProfit = invoiceProfitRows.filter(x => x.hasCost).reduce((sum, x) => sum + x.profit, 0) - salesReturnGrossProfit;
  const invoicesWithCost = invoiceProfitRows.filter(x => x.hasCost).length;
  const invoicesMissingCost = invoiceProfitRows.length - invoicesWithCost;
  const estimatedNetProfit = invoiceGrossProfit - expenseTotal;


  const productMarginRows = products.map((x, i) => {
    const cost = num(x.purchase);
    const wholesale = num(x.wholesale);
    const retail = num(x.selling);
    const stock = num(x.stock);
    const unitProfit = retail - cost;
    return {
      id: String(x.id ?? i),
      name: String(x.name || 'Unnamed product'),
      cost, wholesale, retail, stock, unitProfit,
      margin: retail > 0 ? unitProfit / retail * 100 : 0,
      stockProfit: unitProfit * stock
    };
  });
  const totalPotentialStockProfit = productMarginRows.reduce((sum, x) => sum + x.stockProfit, 0);

  const cards = [
    ['Net Sales Revenue',netSales],
    ['Net Purchase Value',netPurchases],
    ['Business Expenses',expenseTotal],
    ['Customer Outstanding',customerDue],
    ['Supplier Outstanding',supplierDue],
    ['Estimated Cash Movement',netMovement]
  ];

  return <section className="space-y-5">
      <style>{`
        @media print {
          body { background: white !important; }
          button, input, select, nav, aside { display: none !important; }
          section { padding: 0 !important; }
          .rounded-xl { break-inside: avoid; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #ccc !important; padding: 6px !important; }
          h1, h2 { color: black !important; }
          @page { size: auto; margin: 12mm; }
        }
      `}</style>
    
    <div><h1 className="text-2xl font-bold">Financial Reports</h1>
      <button type="button" onClick={() => window.print()} className="mt-3 rounded-lg sl-primary px-5 py-3 font-semibold text-white print:hidden">
        Print Financial Report
      </button><p className="text-sm text-[var(--text-2)]">Summary based on records currently stored in this device.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">{label}</p><strong className="text-xl">{money(Number(value))}</strong></div>)}
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold text-lg">Transaction Summary</h2>
      <div className="divide-y text-sm">
        {[
          ['Sales invoices',sales.length],
          ['Purchase entries',purchases.length],
          ['Sales returns',salesReturns.length],
          ['Purchase returns',purchaseReturns.length],
          ['Sales return value',money(salesReturnTotal)],
          ['Purchase return value',money(purchaseReturnTotal)],
          ['Expense entries',expenses.length],
          ['Payment transactions',payments.length],
          ['Customer receipts',money(received)],
          ['Supplier payments',money(supplierPaid)]
        ].map(([label,value])=><div key={String(label)} className="flex justify-between gap-3 py-3"><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </div>

    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Invoice-wise Profit &amp; Loss</h2>
        <p className="text-sm text-[var(--text-2)]">Profit uses sale-time purchase costs, excludes GST from sales revenue and reverses known sales-return margin.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-[var(--surface-2)] p-3"><p className="text-sm text-[var(--text-2)]">Gross Profit</p><strong className="text-xl">{money(invoiceGrossProfit)}</strong></div>
        <div className="rounded-lg bg-[var(--surface-2)] p-3"><p className="text-sm text-[var(--text-2)]">Estimated Profit After Expenses</p><strong className="text-xl">{money(estimatedNetProfit)}</strong></div>
        <div className="rounded-lg bg-[var(--surface-2)] p-3"><p className="text-sm text-[var(--text-2)]">Invoices Missing Cost</p><strong className="text-xl">{invoicesMissingCost}</strong></div>
        <div className="rounded-lg bg-[var(--surface-2)] p-3"><p className="text-sm text-[var(--text-2)]">Returns Missing Cost</p><strong className="text-xl">{returnsMissingCost}</strong></div>
      </div>
      <p className="text-xs text-[var(--text-2)]">Estimate excludes unrecorded costs, overhead allocations, financing charges and income tax. Missing historical cost records are not treated as zero-cost stock.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Invoice</th><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Sales</th><th className="p-2">Cost</th><th className="p-2">Profit</th>
          </tr></thead>
          <tbody>
            {invoiceProfitRows.map((x, i) => <tr key={`${x.invoice}-${i}`} className="border-b">
              <td className="p-2">{x.invoice}</td><td className="p-2">{x.date}</td><td className="p-2">{x.customer}</td>
              <td className="p-2">{money(x.revenue)}</td>
              <td className="p-2">{x.hasCost ? money(x.cost) : 'Cost missing'}</td>
              <td className="p-2 font-semibold">{x.hasCost ? money(x.profit) : '—'}</td>
            </tr>)}
          </tbody>
        </table>
        {invoiceProfitRows.length === 0 && <p className="py-5 text-center text-[var(--text-2)]">No sales invoices recorded.</p>}
      </div>
      <p className="text-xs text-[var(--text-2)]">{invoicesWithCost} invoices have recorded purchase costs. {invoicesMissingCost} invoices need cost information before their profit can be calculated.</p>
    </div>


    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Product-wise Margin Analysis</h2>
        <p className="text-sm text-[var(--text-2)]">Margins are based on current product prices and recorded purchase costs.</p>
      </div>
      <div className="rounded-lg bg-[var(--surface-2)] p-3">
        <p className="text-sm text-[var(--text-2)]">Potential profit on current stock at retail prices</p>
        <strong className="text-xl">{money(totalPotentialStockProfit)}</strong>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Product</th><th className="p-2">Purchase</th><th className="p-2">Wholesale</th><th className="p-2">Retail</th><th className="p-2">Profit / Unit</th><th className="p-2">Margin</th><th className="p-2">Stock</th><th className="p-2">Stock Profit</th>
          </tr></thead>
          <tbody>
            {productMarginRows.map(x => <tr key={x.id} className="border-b">
              <td className="p-2 font-medium">{x.name}</td>
              <td className="p-2">{money(x.cost)}</td>
              <td className="p-2">{x.wholesale > 0 ? money(x.wholesale) : '—'}</td>
              <td className="p-2">{money(x.retail)}</td>
              <td className="p-2">{money(x.unitProfit)}</td>
              <td className="p-2">{x.margin.toFixed(2)}%</td>
              <td className="p-2">{x.stock}</td>
              <td className="p-2">{money(x.stockProfit)}</td>
            </tr>)}
          </tbody>
        </table>
        {productMarginRows.length === 0 && <p className="py-5 text-center text-[var(--text-2)]">No products found.</p>}
      </div>
    </div>

    <div className="rounded-xl bg-[var(--amber-tint)] p-4 text-sm text-[var(--amber-ink)]">
      These figures are operational summaries, not a finalized profit-and-loss statement. Accurate profit requires item-level cost of goods sold, returns, opening stock, tax treatment and reconciled party ledgers. Cash movement is an estimate and may include duplicate receipts or payments if the same transaction is recorded in both an invoice and Payments.
    </div>
  </section>;
}
