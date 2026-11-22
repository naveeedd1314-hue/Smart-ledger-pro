import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

type Row = Record<string, any>;

const read = (key: string): Row[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Analytics() {
  const [sales, setSales] = useState<Row[]>([]);
  const [purchases, setPurchases] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [returns, setReturns] = useState<Row[]>([]);
  const [period, setPeriod] = useState(12);

  useEffect(() => {
    setSales(read('smartledger-pro-sales'));
    setPurchases(read('smartledger-pro-purchases'));
    setExpenses(read('smartledger-pro-expenses'));
    setReturns(read('smartledger-pro-returns'));
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const months: { month: string; sales: number; purchases: number; expenses: number; salesReturns: number; purchaseReturns: number }[] = [];

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month, sales: 0, purchases: 0, expenses: 0, salesReturns: 0, purchaseReturns: 0 });
    }

    const selected = new Set(months.map(x => x.month));
    const findMonth = (date: unknown) => String(date || '').slice(0, 7);

    sales.forEach(x => {
      const m = months.find(v => v.month === findMonth(x.date));
      if (m) m.sales += Number(x.total) || 0;
    });

    purchases.forEach(x => {
      const m = months.find(v => v.month === findMonth(x.date));
      if (m) m.purchases += Number(x.total) || 0;
    });

    expenses.forEach(x => {
      const m = months.find(v => v.month === findMonth(x.date));
      if (m) m.expenses += Number(x.amount) || 0;
    });

    returns.forEach(x => {
      const m = months.find(v => v.month === findMonth(x.date));
      if (!m) return;
      const amount = Number(x.totalAmount ?? x.amount) || 0;
      if (x.type === 'Sales Return') m.salesReturns += amount;
      if (x.type === 'Purchase Return') m.purchaseReturns += amount;
    });

    const total = (key: 'sales' | 'purchases' | 'expenses' | 'salesReturns' | 'purchaseReturns') =>
      months.reduce((sum, x) => sum + x[key], 0);

    const productMap: Record<string, { product: string; qty: number; revenue: number }> = {};
    sales.filter(x => selected.has(findMonth(x.date))).forEach(x => {
      const name = String(x.product || 'Unknown');
      productMap[name] ||= { product: name, qty: 0, revenue: 0 };
      productMap[name].qty += Number(x.qty) || 0;
      productMap[name].revenue += Number(x.total) || 0;
    });

    const expenseMap: Record<string, number> = {};
    expenses.filter(x => selected.has(findMonth(x.date))).forEach(x => {
      const category = String(x.category || 'General');
      expenseMap[category] = (expenseMap[category] || 0) + (Number(x.amount) || 0);
    });

    const netSales = total('sales') - total('salesReturns');
    const netPurchases = total('purchases') - total('purchaseReturns');

    return {
      months,
      grossSales: total('sales'),
      grossPurchases: total('purchases'),
      expenseTotal: total('expenses'),
      salesReturns: total('salesReturns'),
      purchaseReturns: total('purchaseReturns'),
      netSales,
      netPurchases,
      products: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      categories: Object.entries(expenseMap).sort((a, b) => b[1] - a[1]),
      salesCount: sales.filter(x => selected.has(findMonth(x.date))).length,
      purchaseCount: purchases.filter(x => selected.has(findMonth(x.date))).length
    };
  }, [sales, purchases, expenses, returns, period]);

  const maxExpense = Math.max(1, ...analytics.categories.map(x => x[1]));
  const maxProduct = Math.max(1, ...analytics.products.map(x => x.revenue));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Business Analytics</h1>
          <p className="text-sm text-[#788579]">Sales, purchases, returns and expense performance.</p>
        </div>
        <select className="rounded-lg border bg-[var(--surface)] p-3" value={period} onChange={e => setPeriod(Number(e.target.value))}>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Net Sales', money(analytics.netSales)],
          ['Net Purchases', money(analytics.netPurchases)],
          ['Total Expenses', money(analytics.expenseTotal)],
          ['Sales Returns', money(analytics.salesReturns)],
          ['Sales Invoices', analytics.salesCount.toLocaleString('en-IN')],
          ['Purchase Invoices', analytics.purchaseCount.toLocaleString('en-IN')]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-[#788579]">{label}</p>
            <strong className="text-xl">{value}</strong>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Monthly Performance</h2>
        {analytics.months.some(x => x.sales || x.purchases || x.expenses) ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.months}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#1b4332" />
                <Bar dataKey="purchases" name="Purchases" fill="#b08968" />
                <Bar dataKey="expenses" name="Expenses" fill="#d97757" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="py-12 text-center text-[#788579]">No transactions in this period.</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Best-Selling Products</h2>
          {analytics.products.length ? analytics.products.map((x, i) => (
            <div key={x.product} className="mb-4">
              <div className="flex justify-between gap-3 text-sm">
                <span>{i + 1}. {x.product} <span className="text-[#788579]">({x.qty} units)</span></span>
                <strong>{money(x.revenue)}</strong>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#eeeadd]">
                <div className="h-2 rounded-full bg-[#315b42]" style={{ width: `${x.revenue / maxProduct * 100}%` }} />
              </div>
            </div>
          )) : <p className="text-sm text-[#788579]">No sales data available.</p>}
        </div>

        <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Expense Categories</h2>
          {analytics.categories.length ? analytics.categories.map(([category, amount]) => (
            <div key={category} className="mb-4">
              <div className="flex justify-between gap-3 text-sm">
                <span>{category}</span>
                <strong>{money(amount)}</strong>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#eeeadd]">
                <div className="h-2 rounded-full bg-[#b69a63]" style={{ width: `${amount / maxExpense * 100}%` }} />
              </div>
            </div>
          )) : <p className="text-sm text-[#788579]">No expenses recorded.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Return Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-[#eeeadd] p-4">
            <p className="text-sm text-[#788579]">Sales Return Value</p>
            <strong className="text-lg">{money(analytics.salesReturns)}</strong>
          </div>
          <div className="rounded-lg bg-[#eeeadd] p-4">
            <p className="text-sm text-[#788579]">Purchase Return Value</p>
            <strong className="text-lg">{money(analytics.purchaseReturns)}</strong>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e0d2] bg-[#fffdf7] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Monthly Data</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-[#e6e0d2] text-[#788579]">
              <th className="p-2">Month</th><th className="p-2">Sales</th>
              <th className="p-2">Sales Returns</th><th className="p-2">Net Sales</th>
              <th className="p-2">Purchases</th><th className="p-2">Expenses</th>
            </tr></thead>
            <tbody>{analytics.months.map(x => (
              <tr className="border-b" key={x.month}>
                <td className="p-2">{x.month}</td>
                <td className="p-2">{money(x.sales)}</td>
                <td className="p-2">{money(x.salesReturns)}</td>
                <td className="p-2 font-semibold">{money(x.sales - x.salesReturns)}</td>
                <td className="p-2">{money(x.purchases - x.purchaseReturns)}</td>
                <td className="p-2">{money(x.expenses)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#788579]">
        Figures are based on recorded transaction dates. Net sales and purchases deduct recorded returns.
        This report does not calculate accounting profit or cost of goods sold.
      </p>
    </section>
  );
}
