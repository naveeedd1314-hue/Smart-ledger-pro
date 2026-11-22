import PremiumIcon from "./components/PremiumIcon";
import BusinessAdvisor from "./components/BusinessAdvisor";
import PriceAnalysis from "./components/PriceAnalysis";
import BusinessIntelligence from "./components/BusinessIntelligence";
import BusinessAI from "./components/BusinessAI";
import GST from './pages/GST'
import SettingsPage from './pages/Settings'
import Ledger from './pages/Ledger'
import Reports from './pages/Reports'
import Payments from './pages/Payments'
import Expenses from './pages/Expenses'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import Analytics from './pages/Analytics'
import Returns from './pages/Returns'
import Purchases from './pages/Purchases'
import Inventory from './pages/Inventory'
import BulkItems from './pages/BulkItems'
import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package,
  Users, Truck, Wallet, ChartNoAxesCombined, FileText,
  Settings, Bell, Search, Menu, Plus, ArrowUpRight,
  ArrowDownRight, Boxes, CreditCard,
  Receipt, ChevronDown, BookOpen, Sun, Moon
} from 'lucide-react'

const navigation = [
  { title: 'OVERVIEW', items: [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Analytics', icon: ChartNoAxesCombined },
  ]},
  { title: 'BUSINESS', items: [
    { name: 'Sales', icon: ShoppingCart },
    { name: 'Purchases', icon: ShoppingBag },
    { name: 'Inventory', icon: Package },
    { name: 'Bulk Items', icon: Boxes },
    { name: 'Customers', icon: Users },
    { name: 'Suppliers', icon: Truck },
  ]},
  { title: 'FINANCE', items: [
    { name: 'Expenses', icon: Wallet },
    { name: 'Payments', icon: CreditCard },
    { name: 'Reports', icon: FileText },
    { name: 'Ledger', icon: BookOpen },
    { name: 'Returns', icon: Receipt },
    { name: 'GST & Tax', icon: FileText },
  ]},
  { title: 'SYSTEM', items: [
    { name: 'Settings', icon: Settings },
  ]},
]


function readData(key: string): any[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function getDashboardMetrics() {
  const sales = readData('smartledger-pro-sales')
  const purchases = readData('smartledger-pro-purchases')
  const customers = readData('smartledger-pro-customers')
  const suppliers = readData('smartledger-pro-suppliers')
  const payments = readData('smartledger-pro-payments')

  const sum = (items: any[], field: string) =>
    items.reduce((total, item) => total + (Number(item[field]) || 0), 0)

  const money = (value: number) =>
    `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  const collected = sum(payments.filter(x => x.type === 'Customer Receipt'), 'amount')
  const supplierPaid = sum(payments.filter(x => x.type === 'Supplier Payment'), 'amount')

  return [
    { label: 'Total Sales', value: money(sum(sales, 'total')), change: 'Sales revenue', icon: ShoppingCart },
    { label: 'Total Purchases', value: money(sum(purchases, 'total')), change: 'Purchase value', icon: ShoppingBag },
    { label: 'To Collect', value: money(Math.max(0, sum(customers, 'opening') + sum(sales, 'balance') - collected)), change: 'Customer receivables', icon: ArrowDownRight },
    { label: 'To Pay', value: money(Math.max(0, sum(suppliers, 'opening') + sum(purchases, 'balance') - supplierPaid)), change: 'Supplier payables', icon: ArrowUpRight },
  ]
}


function getRecentTransactions() {
  const records = [
    ...readData('smartledger-pro-sales').map(x => ({
      date: x.date, title: `Sale — ${x.customer || x.product || 'Customer'}`,
      detail: x.invoice || 'Sales invoice', amount: Number(x.total) || 0, kind: 'Sales'
    })),
    ...readData('smartledger-pro-purchases').map(x => ({
      date: x.date, title: `Purchase — ${x.supplier || x.product || 'Supplier'}`,
      detail: x.invoice || 'Purchase invoice', amount: Number(x.total) || 0, kind: 'Purchase'
    })),
    ...readData('smartledger-pro-expenses').map(x => ({
      date: x.date, title: x.category || 'Expense',
      detail: x.description || 'Business expense', amount: Number(x.amount) || 0, kind: 'Expense'
    })),
    ...readData('smartledger-pro-payments').map(x => ({
      date: x.date, title: `${x.type || 'Payment'} — ${x.party || ''}`,
      detail: x.method || 'Payment transaction', amount: Number(x.amount) || 0, kind: 'Payment'
    }))
  ]
  return records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 8)
}



function getMonthlyPerformance() {
  const groups: Record<string, { month: string; sales: number; purchases: number; expenses: number }> = {}
  const add = (key: string, field: 'sales' | 'purchases' | 'expenses', amount: (x: any) => number) => {
    readData(key).forEach(x => {
      const date = String(x.date || '')
      if (!/^\d{4}-\d{2}/.test(date)) return
      const month = date.slice(0, 7)
      groups[month] ||= { month, sales: 0, purchases: 0, expenses: 0 }
      groups[month][field] += amount(x)
    })
  }
  add('smartledger-pro-sales', 'sales', x => Number(x.total) || 0)
  add('smartledger-pro-purchases', 'purchases', x => Number(x.total) || Number(x.qty) * Number(x.rate) || 0)
  add('smartledger-pro-expenses', 'expenses', x => Number(x.amount) || 0)
  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
}

function App() {
  const [active, setActive] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('smartledger-theme') === 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('smartledger-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])
  const metrics = getDashboardMetrics()
  const recentTransactions = getRecentTransactions()
  const monthlyPerformance = getMonthlyPerformance()

  return (
    <div data-sl-dashboard="true" className="min-h-screen bg-[var(--bg)] text-[var(--text)]">


      <aside className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-transform md:translate-x-0`}>
        <div className="flex h-20 items-center gap-3 border-b border-[var(--border)] px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--indigo-tint)] text-xl font-black text-[var(--indigo-ink)]">S</div>
          <div>
            <h1 className="text-lg font-bold tracking-wide"><PremiumIcon name="dashboard" tone="emerald" size={38} />SmartLedger</h1>
            <p className="text-[10px] uppercase tracking-[3px] text-[var(--text-2)]">PRO BUSINESS ERP</p>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          {navigation.map(group => (
            <div key={group.title}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[2px] text-[var(--text-2)]">{group.title}</p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.name} onClick={() => { setActive(item.name); setMenuOpen(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active === item.name ? 'bg-[var(--indigo-tint)] font-semibold text-[var(--indigo-ink)]' : 'text-[var(--text-2)] hover:bg-[var(--surface)]/10'}`}>
                      <Icon size={18} /> {item.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/5 p-4">
          <p className="text-xs font-semibold">SmartLedger Pro</p>
          <p className="mt-1 text-[11px] text-[var(--text-2)]">Your business. Under control.</p>
        </div>
      </aside>

      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
            <div>
              <p className="text-xs text-[var(--text-2)]">Business management / {active}</p>
              <h2 className="text-lg font-bold">{active}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Toggle colour theme" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode(v => !v)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)]">
              {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 sm:block"><Search size={18}/></button>
            <button className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--amber)]"/></button>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-bold">S</div>
              <span className="hidden text-xs font-semibold sm:block">My Business</span>
              <ChevronDown size={14}/>
            </div>
          </div>
        </header>

        {active === 'Analytics' ? <Analytics /> : active === 'Sales' ? <Sales /> : active === 'Purchases' ? <Purchases /> : active === 'Inventory' ? <Inventory /> : active === 'Bulk Items' ? <BulkItems /> : active === 'Customers' ? <Customers /> : active === 'Suppliers' ? <Suppliers /> : active === 'Expenses' ? <Expenses /> : active === 'Payments' ? <Payments /> : active === 'Reports' ? <Reports /> : active === 'Ledger' ? <Ledger /> : active === 'Returns' ? <Returns /> : active === 'GST & Tax' ? <GST /> : active === 'Settings' ? <SettingsPage /> : (
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--text-2)]">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <h2 className="mt-1 text-2xl font-bold">Business overview</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">Monitor your business performance from one place.</p>
            </div>
            <button onClick={() => setActive('Sales')} className="flex items-center gap-2 rounded-xl bg-[var(--indigo)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--indigo-ink)]">
              <Plus size={17}/> New transaction
            </button>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-2)]">{metric.label}</span>
                    <span className="rounded-xl bg-[var(--indigo-tint)] p-2.5 text-[var(--indigo)]"><Icon size={19}/></span>
                  </div>
                  <p className="mt-5 text-2xl font-bold tracking-tight">{metric.value}</p>
                  <p className="mt-2 text-xs text-[var(--text-2)]">{metric.change}</p>
                </div>
              )
            })}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div><h3 className="font-bold">Business performance</h3><p className="mt-1 text-xs text-[var(--text-2)]">Your financial activity will appear here.</p></div>
                <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">This month <ChevronDown className="ml-2 inline" size={13}/></button>
              </div>
              <div className="mt-5 h-56 w-full">
                {monthlyPerformance.length ? <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="sales" name="Sales" fill="var(--indigo)" />
                    <Bar dataKey="purchases" name="Purchases" fill="var(--emerald)" />
                    <Bar dataKey="expenses" name="Expenses" fill="var(--rose)" />
                  </BarChart>
                </ResponsiveContainer> : <p className="pt-20 text-center text-sm text-[var(--text-2)]">Add dated transactions to view performance.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-bold">Quick actions</h3>
              <p className="mt-1 text-xs text-[var(--text-2)]">Common business operations</p>
              <div className="mt-5 space-y-3">
                {[
                  {name:'Create sales invoice',icon:Receipt,page:'Sales'},
                  {name:'Record purchase',icon:ShoppingBag,page:'Purchases'},
                  {name:'Add new product',icon:Boxes,page:'Inventory'},
                  {name:'Add customer',icon:Users,page:'Customers'},
                ].map(action => {
                  const Icon = action.icon
                  return <button key={action.name} onClick={() => setActive(action.page)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left text-sm font-medium hover:bg-[var(--bg)]"><Icon size={18} className="text-[var(--indigo)]"/>{action.name}<ArrowUpRight size={15} className="ml-auto text-[var(--text-2)]"/></button>
                })}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold">Recent transactions</h3><p className="mt-1 text-xs text-[var(--text-2)]">Your latest business activity</p></div>
              <button onClick={() => setActive('Reports')} className="text-xs font-semibold text-[var(--indigo)]">View reports →</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              {recentTransactions.length ? <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Transaction</th><th className="p-2">Reference</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody>{recentTransactions.map((x, i) => <tr className="border-b border-[var(--border)]" key={`${x.kind}-${x.date}-${i}`}>
                  <td className="p-3 whitespace-nowrap">{x.date || '—'}</td>
                  <td className="p-3"><span className="font-medium">{x.title}</span><p className="text-xs text-[var(--text-2)]">{x.kind}</p></td>
                  <td className="p-3">{x.detail}</td>
                  <td className="p-3 text-right font-semibold">₹{x.amount.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                </tr>)}</tbody>
              </table> : <div className="mt-4 overflow-x-auto">
              {recentTransactions.length ? <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-[var(--text-2)]"><th className="p-2">Date</th><th className="p-2">Transaction</th><th className="p-2">Reference</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody>{recentTransactions.map((x, i) => <tr className="border-b border-[var(--border)]" key={`${x.kind}-${x.date}-${i}`}>
                  <td className="p-3 whitespace-nowrap">{x.date || '—'}</td>
                  <td className="p-3"><span className="font-medium">{x.title}</span><p className="text-xs text-[var(--text-2)]">{x.kind}</p></td>
                  <td className="p-3">{x.detail}</td>
                  <td className="p-3 text-right font-semibold">₹{x.amount.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                </tr>)}</tbody>
              </table> : <div className="flex h-32 items-center justify-center text-sm text-[var(--text-2)]">No transactions recorded yet.</div>}
            </div>}
            </div>
          </section>

          <footer className="py-8 text-center text-xs text-[var(--text-2)]">SmartLedger Pro · Business management platform</footer>
        </div>
        )}
      </main>
      {menuOpen && <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden"/>}
    <BusinessAI />
<BusinessIntelligence />
<PriceAnalysis />
<BusinessAdvisor />
</div>
  )
}

export default App
