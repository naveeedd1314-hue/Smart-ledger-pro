import * as XLSX from 'xlsx';
import { useState } from 'react';

type Row = Record<string, unknown>;

function readRecords(key: string): Row[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export default function Reports() {
  const [sales] = useState<Row[]>(() => readRecords('smartledger-pro-sales'));
  const [purchases] = useState<Row[]>(() => readRecords('smartledger-pro-purchases'));
  const [expenses] = useState<Row[]>(() => readRecords('smartledger-pro-expenses'));
  const [payments] = useState<Row[]>(() => readRecords('smartledger-pro-payments'));
  const [returns] = useState<Row[]>(() => readRecords('smartledger-pro-returns'));
  const [products] = useState<Row[]>(() => readRecords('smartledger-products'));
  const [customers] = useState<Row[]>(() => readRecords('smartledger-pro-customers'));
  const [suppliers] = useState<Row[]>(() => readRecords('smartledger-pro-suppliers'));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const num = (v: unknown) => Number(v) || 0;
  const inRange = (row: Row) => {
    const date = String(row.date || '');
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  };
  const periodSales = sales.filter(inRange);
  const periodPurchases = purchases.filter(inRange);
  const periodExpenses = expenses.filter(inRange);
  const periodPayments = payments.filter(inRange);
  const periodReturns = returns.filter(inRange);
  const salesTotal = periodSales.reduce((s,x)=>s+(x.taxableValue !== undefined && x.taxableValue !== null ? num(x.taxableValue) : Math.max(0, (num(x.qty)*num(x.rate) || num(x.total)) - num(x.discountAmount))),0);
  const purchaseTotal = periodPurchases.reduce((s,x)=>s+(x.taxableValue !== undefined && x.taxableValue !== null ? num(x.taxableValue) : (num(x.qty)*num(x.rate) || num(x.total || x.amount))),0);
  const salesReturns = periodReturns.filter(x=>x.type==='Sales Return');
  const purchaseReturns = periodReturns.filter(x=>x.type==='Purchase Return');
  const salesReturnTotal = salesReturns.reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const salesReturnRevenue = salesReturns.reduce((s,x)=>s+num(x.amount),0);
  const purchaseReturnTotal = purchaseReturns.reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const purchaseReturnValue = purchaseReturns.reduce((s,x)=>s+num(x.amount),0);
  const netSales = Math.max(0,salesTotal-salesReturnRevenue);
  const netPurchases = Math.max(0,purchaseTotal-purchaseReturnValue);
  const expenseTotal = periodExpenses.reduce((s,x)=>s+num(x.amount),0);
  const periodReceived = periodPayments.filter(x=>x.type==='Customer Receipt').reduce((s,x)=>s+num(x.amount),0);
  const periodSupplierPaid = periodPayments.filter(x=>x.type==='Supplier Payment').reduce((s,x)=>s+num(x.amount),0);
  const periodCustomerRefunds = periodPayments.filter(x=>x.type==='Customer Refund').reduce((s,x)=>s+num(x.amount),0);
  const periodSupplierRefunds = periodPayments.filter(x=>x.type==='Supplier Refund').reduce((s,x)=>s+num(x.amount),0);
  const salesPaid = periodSales.reduce((s,x)=>s+num(x.paid),0);
  const purchasePaid = periodPurchases.reduce((s,x)=>s+num(x.paid),0);
  const allSalesReturns = returns.filter(x=>x.type==='Sales Return').reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const allPurchaseReturns = returns.filter(x=>x.type==='Purchase Return').reduce((s,x)=>s+num(x.totalAmount ?? x.amount),0);
  const allReceived = payments.filter(x=>x.type==='Customer Receipt').reduce((s,x)=>s+num(x.amount),0);
  const allSupplierPaid = payments.filter(x=>x.type==='Supplier Payment').reduce((s,x)=>s+num(x.amount),0);
  const allCustomerRefunds = payments.filter(x=>x.type==='Customer Refund').reduce((s,x)=>s+num(x.amount),0);
  const allSupplierRefunds = payments.filter(x=>x.type==='Supplier Refund').reduce((s,x)=>s+num(x.amount),0);
  const customerOpening = customers.reduce((sum,x)=>sum+num(x.opening),0);
  const supplierOpening = suppliers.reduce((sum,x)=>sum+num(x.opening),0);
  const customerDue = Math.max(0, customerOpening + sales.reduce((s,x)=>s+(x.total !== undefined && x.total !== null ? Math.max(0,num(x.total)-num(x.paid)) : num(x.balance)),0) + allCustomerRefunds - allReceived - allSalesReturns);
  const supplierDue = Math.max(0, supplierOpening + purchases.reduce((s,x)=>s+(x.total !== undefined && x.total !== null ? Math.max(0,num(x.total)-num(x.paid)) : (x.amount !== undefined ? Math.max(0,num(x.amount)-num(x.paid)) : Math.max(0,num(x.qty)*num(x.rate)-num(x.paid)))),0) + allSupplierRefunds - allSupplierPaid - allPurchaseReturns);
  const netMovement = salesPaid + periodReceived + periodSupplierRefunds - purchasePaid - periodSupplierPaid - periodCustomerRefunds - expenseTotal;
  const money = (n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})}`;


  const invoiceProfitRows = periodSales.map((x, index) => {
    const qty = num(x.qty);
    const revenue = x.taxableValue !== undefined && x.taxableValue !== null ? num(x.taxableValue) : Math.max(0, qty * rate - num(x.discountAmount));
    const costPrice = num(x.purchasePrice);
    const hasCost = x.purchasePrice !== undefined && x.purchasePrice !== null && x.purchasePrice !== '' && Number.isFinite(Number(x.purchasePrice)) && Number(x.purchasePrice) > 0;
    const cost = hasCost ? qty * costPrice : 0;
    return {
      invoice: String(x.invoice || x.invoiceNo || x.billNo || `Invoice ${index + 1}`),
      date: String(x.date || '—'),
      customer: String(x.customer || 'Walk-in Customer'),
      product: String(x.product || ''),
      qty,
      rate,
      costPrice,
      discountAmount: num(x.discountAmount),
      discountPercent: num(x.discountPercent),
      revenue,
      cost,
      profit: revenue - cost,
      hasCost
    };
  });
  const salesReturnProfitRows = salesReturns.map(x => {
    const hasCost = x.purchasePrice !== undefined && x.purchasePrice !== null && x.purchasePrice !== '' && Number.isFinite(Number(x.purchasePrice)) && Number(x.purchasePrice) > 0;
    const qty = num(x.qty);
    const rate = num(x.rate);
    return { profit: hasCost ? num(x.amount) - num(x.purchasePrice) * qty : 0, hasCost };
  });
  const returnsMissingCost = salesReturnProfitRows.filter(x => !x.hasCost).length;
  const salesReturnGrossProfit = salesReturnProfitRows.filter(x => x.hasCost).reduce((sum, x) => sum + x.profit, 0);
  const invoiceGrossProfit = invoiceProfitRows.filter(x => x.hasCost).reduce((sum, x) => sum + x.profit, 0) - salesReturnGrossProfit;
  const invoicesWithCost = invoiceProfitRows.filter(x => x.hasCost).length;
  const invoicesMissingCost = invoiceProfitRows.length - invoicesWithCost;
  const estimatedNetProfit = invoiceGrossProfit - expenseTotal;


  const productMarginRows = products.map((x, i) => {
    const cost = num(x.averageCost ?? x.purchase);
    const wholesale = num(x.wholesale);
    const retail = num(x.selling);
    const stock = num(x.stock);
    const unitProfit = retail - cost;
    return {
      id: String(x.id ?? i),
      name: String(x.name || 'Unnamed product'),
      cost, wholesale, retail, stock, unitProfit,
      margin: retail > 0 ? unitProfit / retail * 100 : 0,
      stockProfit: unitProfit * Math.max(0, stock)
    };
  });
  const totalPotentialStockProfit = productMarginRows.reduce((sum, x) => sum + x.stockProfit, 0);

  const exportFinancialWorkbook = () => {
    const summary = [
      ['SmartLedger Financial Report'],
      ['From date', fromDate || 'All'],
      ['To date', toDate || 'All'],
      [],
      ['Metric', 'Amount'],
      ['Net Sales Revenue', netSales],
      ['Net Purchase Value', netPurchases],
      ['Business Expenses', expenseTotal],
      ['Customer Outstanding (all time)', customerDue],
      ['Supplier Outstanding (all time)', supplierDue],
      ['Estimated Cash Movement', netMovement],
      ['Gross Profit (recorded costs only)', invoiceGrossProfit],
      ['Estimated Profit After Expenses', estimatedNetProfit],
      ['Invoices Missing Cost', invoicesMissingCost],
      ['Returns Missing Cost', returnsMissingCost]
    ];
    const salesRows = [
      ['Invoice','Date','Customer','Product','Quantity','Rate','Discount %','Discount Amount','Net Revenue','Purchase Cost / Unit','Cost','Profit','Cost Recorded'],
      ...invoiceProfitRows.map(x => [x.invoice,x.date,x.customer,x.product,x.qty,x.rate,x.discountPercent,x.discountAmount,x.revenue,x.hasCost ? x.costPrice : '',x.hasCost ? x.cost : '',x.hasCost ? x.profit : '',x.hasCost ? 'Yes' : 'No'])
    ];
    const stockRows = [
      ['Product','Average Cost','Wholesale','Retail','Profit / Unit','Margin %','Stock','Potential Stock Profit'],
      ...productMarginRows.map(x => [x.name,x.cost,x.wholesale,x.retail,x.unitProfit,x.margin,x.stock,x.stockProfit])
    ];
    const purchaseRows = [
      ['Invoice','Date','Supplier','Product','Quantity','Rate','Taxable Value','GST Rate %','Invoice Total','Initially Paid','Return Credit','Balance Before Later Payments'],
      ...periodPurchases.map(x => {
        const credit = periodReturns.filter(r => r.type === 'Purchase Return' && String(r.originalId) === String(x.id)).reduce((s,r) => s + num(r.totalAmount ?? r.amount), 0);
        const total = num(x.total || x.amount || num(x.qty) * num(x.rate));
        return [String(x.invoice || x.invoiceNo || x.id || ''),String(x.date || ''),String(x.supplier || ''),String(x.product || ''),num(x.qty),num(x.rate),num(x.taxableValue ?? num(x.qty)*num(x.rate)),num(x.gstRate),total,num(x.paid),credit,Math.max(0,total-num(x.paid)-credit)];
      })
    ];
    const expenseRows = [
      ['Date','Category','Description','Amount'],
      ...periodExpenses.map(x => [String(x.date || ''),String(x.category || ''),String(x.description || ''),num(x.amount)])
    ];
    const paymentRows = [
      ['Date','Type','Party','Amount','Method','Reference','Note','Invoice Allocations'],
      ...periodPayments.map(x => [String(x.date || ''),String(x.type || ''),String(x.party || ''),num(x.amount),String(x.method || ''),String(x.reference || ''),String(x.note || ''),Array.isArray(x.allocations) ? x.allocations.map((a:any) => String(a.invoice || a.invoiceId || '') + ': ₹' + num(a.amount)).join(' | ') : ''])
    ];
    const returnRows = [
      ['Date','Type','Original Invoice','Party','Product','Quantity','Rate','Taxable Credit','Tax Credit','Total Credit','Purchase Cost / Unit','Reason'],
      ...periodReturns.map(x => [String(x.date || ''),String(x.type || ''),String(x.invoice || ''),String(x.party || ''),String(x.product || ''),num(x.qty),num(x.rate),num(x.amount),num(x.taxAmount),num(x.totalAmount ?? x.amount),x.purchasePrice == null ? '' : num(x.purchasePrice),String(x.reason || '')])
    ];
    const workbook = XLSX.utils.book_new();
    const add = (name: string, rows: (string | number)[][]) => {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };
    add('Summary', summary);
    add('Sales Profit', salesRows);
    add('Purchase Detail', purchaseRows);
    add('Expenses', expenseRows);
    add('Payments', paymentRows);
    add('Returns', returnRows);
    add('Stock Margins', stockRows);
    XLSX.writeFile(workbook, `SmartLedger-Financial-Report-${fromDate || 'All'}-to-${toDate || 'All'}.xlsx`);
  };

  const cards = [
    ['Net Sales Revenue',netSales],
    ['Net Purchase Value',netPurchases],
    ['Business Expenses',expenseTotal],
    ['Customer Outstanding (all time)',customerDue],
    ['Supplier Outstanding (all time)',supplierDue],
    ['Estimated Cash Movement (period)',netMovement]
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
    
    <div><h1 className="text-2xl font-bold">Financial Reports</h1><p className="mt-1 text-sm text-[var(--text-2)]">Financial performance and cash movement for the selected period; outstanding balances remain all-time.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 print:hidden"><label className="text-xs font-medium text-[var(--text-2)]">From date<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label><label className="text-xs font-medium text-[var(--text-2)]">To date<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--text)]"/></label><button type="button" onClick={()=>{setFromDate("");setToDate("")}} className="self-end rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Clear dates</button></div>{fromDate&&toDate&&fromDate>toDate&&<p className="mt-2 text-sm text-[var(--rose)]">From date must be on or before the To date.</p>}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden"><button type="button" onClick={exportFinancialWorkbook} className="rounded-lg sl-primary px-5 py-3 font-semibold text-white">Export Excel Workbook</button><button type="button" onClick={() => window.print()} className="rounded-lg border border-[var(--border)] px-5 py-3 font-semibold">Print Financial Report</button></div><p className="text-sm text-[var(--text-2)]">Summary based on records currently stored in this device.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-[var(--text-2)]">{label}</p><strong className="text-xl">{money(Number(value))}</strong></div>)}
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="font-semibold text-lg">Transaction Summary</h2>
      <div className="divide-y text-sm">
        {[
          ['Sales invoices',periodSales.length],
          ['Purchase entries',periodPurchases.length],
          ['Sales returns',salesReturns.length],
          ['Purchase returns',purchaseReturns.length],
          ['Sales return value',money(salesReturnTotal)],
          ['Purchase return value',money(purchaseReturnTotal)],
          ['Expense entries',periodExpenses.length],
          ['Payment transactions',periodPayments.length],
          ['Customer receipts',money(periodReceived)],
          ['Supplier payments',money(periodSupplierPaid)],
          ['Customer refunds',money(periodCustomerRefunds)],
          ['Supplier refunds',money(periodSupplierRefunds)]
        ].map(([label,value])=><div key={String(label)} className="flex justify-between gap-3 py-3"><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </div>

    <div className="rounded-xl bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Invoice-wise Profit &amp; Loss</h2>
        <p className="text-sm text-[var(--text-2)]">Profit uses the cost captured on each sale (weighted average for new transactions; legacy transactions retain their saved purchase rate), excludes GST from sales revenue and reverses known sales-return margin.</p>
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
        <p className="text-sm text-[var(--text-2)]">Margins use current selling prices and weighted average inventory cost.</p>
      </div>
      <div className="rounded-lg bg-[var(--surface-2)] p-3">
        <p className="text-sm text-[var(--text-2)]">Potential profit on current stock at retail prices</p>
        <strong className="text-xl">{money(totalPotentialStockProfit)}</strong>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[var(--text-2)]">
            <th className="p-2">Product</th><th className="p-2">Average Cost</th><th className="p-2">Wholesale</th><th className="p-2">Retail</th><th className="p-2">Profit / Unit</th><th className="p-2">Margin</th><th className="p-2">Stock</th><th className="p-2">Stock Profit</th>
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
      These figures are operational summaries, not a finalized profit-and-loss statement. Accurate profit requires item-level cost of goods sold, returns, opening stock, tax treatment and reconciled party ledgers. Cash movement is an estimate. Record the initial payment in the invoice and later payments in Payments only; duplicate entries will overstate cash movement.
    </div>
  </section>;
}
