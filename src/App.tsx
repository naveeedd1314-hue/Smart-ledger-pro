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
import BusinessCommandCentre from './pages/BusinessCommandCentre'
import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package,
  Users, Truck, Wallet, ChartNoAxesCombined, FileText,
  Settings, Bell, Search, Menu, Plus, ArrowUpRight,
  ArrowDownRight, Boxes, CreditCard,
  Receipt, ChevronDown, BookOpen, Sun, Moon, X
} from 'lucide-react'

const navigation = [
  { title: 'OVERVIEW', items: [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Command Centre', icon: ChartNoAxesCombined },
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
  const returns = readData('smartledger-pro-returns')

  const sum = (items: any[], field: string) =>
    items.reduce((total, item) => total + (Number(item[field]) || 0), 0)

  const money = (value: number) =>
    `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  const collected = sum(payments.filter(x => x.type === 'Customer Receipt'), 'amount')
  const supplierPaid = sum(payments.filter(x => x.type === 'Supplier Payment'), 'amount')
  const customerRefunds = sum(payments.filter(x => x.type === 'Customer Refund'), 'amount')
  const supplierRefunds = sum(payments.filter(x => x.type === 'Supplier Refund'), 'amount')
  const salesDue = sales.reduce((total, item) => { const invoiceTotal = Number(item.total); const due = item.total !== undefined && item.total !== null && Number.isFinite(invoiceTotal) ? Math.max(0, invoiceTotal - (Number(item.paid) || 0)) : Math.max(0, Number(item.balance) || 0); return total + due; }, 0)
  const purchaseDue = purchases.reduce((total, item) => { const invoiceTotal = Number(item.total); const due = item.total !== undefined && item.total !== null && Number.isFinite(invoiceTotal) ? Math.max(0, invoiceTotal - (Number(item.paid) || 0)) : Math.max(0, Number(item.balance) || 0); return total + due; }, 0)
  const salesReturnCredit = sum(returns.filter(x => x.type === 'Sales Return').map(x => ({ amount: Number(x.totalAmount ?? x.amount) || 0 })), 'amount')
  const purchaseReturnCredit = sum(returns.filter(x => x.type === 'Purchase Return').map(x => ({ amount: Number(x.totalAmount ?? x.amount) || 0 })), 'amount')

  return [
    { label: 'Net Sales', value: money(Math.max(0, sum(sales, 'total') - salesReturnCredit)), change: 'Invoice value after sales returns', icon: ShoppingCart },
    { label: 'Net Purchases', value: money(Math.max(0, sum(purchases, 'total') - purchaseReturnCredit)), change: 'Invoice value after purchase returns', icon: ShoppingBag },
    { label: 'To Collect', value: money(Math.max(0, sum(customers, 'opening') + salesDue + customerRefunds - collected - salesReturnCredit)), change: 'Customer receivables', icon: ArrowDownRight },
    { label: 'To Pay', value: money(Math.max(0, sum(suppliers, 'opening') + purchaseDue + supplierRefunds - supplierPaid - purchaseReturnCredit)), change: 'Supplier payables', icon: ArrowUpRight },
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
    })),
    ...readData('smartledger-pro-returns').map(x => ({
      date: x.date, title: `${x.type || 'Return'} — ${x.party || ''}`,
      detail: `${x.invoice || 'Invoice'} · ${x.product || 'Product'}`, amount: Number(x.totalAmount ?? x.amount) || 0, kind: 'Return'
    }))
  ]
  return records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 8)
}

type GlobalSearchResult = { title: string; detail: string; page: string; id: string };
function searchBusinessRecords(query: string): GlobalSearchResult[] {
  const q=query.trim().toLowerCase(); if(q.length<2)return [];
  const results:GlobalSearchResult[]=[];
  const add=(key:string,page:string,title:(x:any)=>string,detail:(x:any)=>string,searchable:(x:any)=>string)=>{
    readData(key).forEach((item,index)=>{if(searchable(item).toLowerCase().includes(q))results.push({title:title(item),detail:detail(item),page,id:String(item.id??index)});});
  };
  add("smartledger-products","Inventory",x=>String(x.name||"Product"),x=>[x.sku,x.category].filter(Boolean).join(" · ")||"Inventory item",x=>[x.name,x.sku,x.category,x.hsn].join(" "));
  add("smartledger-pro-sales","Sales",x=>String(x.invoice||"Sales invoice"),x=>[x.customer,x.product].filter(Boolean).join(" · "),x=>[x.invoice,x.customer,x.product].join(" "));
  add("smartledger-pro-purchases","Purchases",x=>String(x.invoice||"Purchase invoice"),x=>[x.supplier,x.product].filter(Boolean).join(" · "),x=>[x.invoice,x.supplier,x.product].join(" "));
  add("smartledger-pro-customers","Customers",x=>String(x.name||"Customer"),x=>[x.phone,x.address].filter(Boolean).join(" · "),x=>[x.name,x.phone,x.address,x.gstin].join(" "));
  add("smartledger-pro-suppliers","Suppliers",x=>String(x.name||"Supplier"),x=>[x.phone,x.address].filter(Boolean).join(" · "),x=>[x.name,x.phone,x.address,x.gstin].join(" "));
  add("smartledger-pro-payments","Payments",x=>String(x.type||"Payment"),x=>[x.party,x.reference,x.date].filter(Boolean).join(" · "),x=>[x.type,x.party,x.reference,x.note,x.date].join(" "));
  add("smartledger-pro-expenses","Expenses",x=>String(x.category||"Expense"),x=>[x.description,x.date].filter(Boolean).join(" · "),x=>[x.category,x.description,x.date].join(" "));
  add("smartledger-pro-returns","Returns",x=>String(x.invoice||x.type||"Return"),x=>[x.type,x.party,x.product,x.date].filter(Boolean).join(" · "),x=>[x.invoice,x.type,x.party,x.product,x.reason].join(" "));
  return results.slice(0,12);
}



function getMonthlyPerformance() {
  const groups: Record<string, { month: string; sales: number; purchases: number; expenses: number; salesReturns: number; purchaseReturns: number }> = {}
  const add = (key: string, field: 'sales' | 'purchases' | 'expenses', amount: (x: any) => number) => {
    readData(key).forEach(x => {
      const date = String(x.date || '')
      if (!/^\d{4}-\d{2}/.test(date)) return
      const month = date.slice(0, 7)
      groups[month] ||= { month, sales: 0, purchases: 0, expenses: 0, salesReturns: 0, purchaseReturns: 0 }
      groups[month][field] += amount(x)
    })
  }
  const taxable = (x: any) => x.taxableValue !== undefined && x.taxableValue !== null ? Number(x.taxableValue) || 0 : ((Number(x.qty) || 0) * (Number(x.rate) || 0) || Number(x.total) || 0)
  add('smartledger-pro-sales', 'sales', taxable)
  add('smartledger-pro-purchases', 'purchases', taxable)
  add('smartledger-pro-expenses', 'expenses', x => Number(x.amount) || 0)
  readData('smartledger-pro-returns').forEach(x => {
    const date = String(x.date || '')
    if (!/^\d{4}-\d{2}/.test(date)) return
    const month = date.slice(0, 7)
    groups[month] ||= { month, sales: 0, purchases: 0, expenses: 0, salesReturns: 0, purchaseReturns: 0 }
    if (x.type === 'Sales Return') groups[month].salesReturns += Number(x.amount ?? x.totalAmount) || 0
    if (x.type === 'Purchase Return') groups[month].purchaseReturns += Number(x.amount ?? x.totalAmount) || 0
  })
  return Object.values(groups).map(x => ({
    ...x,
    sales: Math.max(0, x.sales - x.salesReturns),
    purchases: Math.max(0, x.purchases - x.purchaseReturns)
  })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
}

function App() {
  const [active, setActive] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchResults = searchBusinessRecords(searchQuery)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('smartledger-theme') === 'dark')
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [])
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
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[var(--border)] px-5">
          <div className="sl-brand-mark" aria-label="SmartLedger logo">
            <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
              <path d="M8 10.5c5.8-2.4 11.1-1.8 16 1.8v27c-4.9-3.6-10.2-4.2-16-1.8z" />
              <path d="M40 10.5c-5.8-2.4-11.1-1.8-16 1.8v27c4.9-3.6 10.2-4.2 16-1.8z" />
              <path d="M13 17.5c3.1-.7 6-.1 8.5 1.5M13 24c3.1-.7 6-.1 8.5 1.5M35 17.5c-3.1-.7-6-.1-8.5 1.5M35 24c-3.1-.7-6-.1-8.5 1.5" />
              <path d="m18.5 32 3.2 3.2 7.8-8.1" />
            </svg>
          </div>
          <div className="sl-brand-copy">
            <h1 className="text-lg font-extrabold tracking-tight">SmartLedger<span> Pro</span></h1>
            <p className="text-[10px] uppercase tracking-[3px] text-[var(--text-2)]">BUSINESS MANAGEMENT</p>
          </div>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="ml-auto rounded-lg p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] md:hidden"><X size={19}/></button>
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5">
          {navigation.map((group, groupIndex) => (
            <div key={group.title} className={`sl-nav-group sl-nav-group-${groupIndex}`}>
              <p className="mb-3 flex items-center gap-2 px-3 text-[10px] font-extrabold tracking-[2px] text-[var(--text-2)]"><span className="sl-nav-group-dot" />{group.title}</p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.name} onClick={() => { setActive(item.name); setMenuOpen(false) }}
                      className={`sl-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active === item.name ? 'is-active border-[var(--indigo)]/20 bg-[var(--indigo-tint)] font-semibold text-[var(--indigo-ink)] shadow-sm' : 'border-transparent text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'}`}>
                      <span className="sl-nav-icon"><Icon size={17} strokeWidth={2.2} /></span><span>{item.name}</span><span className="sl-nav-chevron">›</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="sl-sidebar-footer m-3 rounded-2xl border border-[var(--border)] p-4">
          <p className="text-xs font-semibold">SmartLedger Pro</p><p className="mt-1 text-[10px] font-bold tracking-[.16em] text-[var(--text-2)]">VERSION 5.0</p>
          <p className="mt-1 text-[11px] text-[var(--text-2)]">Your business. Under control.</p>
        </div>
      </aside>
      {menuOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] md:hidden" />}

      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] md:hidden" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20}/></button>
            <div>
              <p className="text-xs text-[var(--text-2)]">Business management / {active}</p>
              <h2 className="text-lg font-bold">{active}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Toggle colour theme" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode(v => !v)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)]">
              {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button type="button" aria-label="Search business records" title="Search (Ctrl+K)" onClick={() => setSearchOpen(true)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] transition hover:bg-[var(--surface-2)]"><Search size={18}/></button>
            <button type="button" aria-label="Open business command centre" title="Business alerts and insights" onClick={() => setActive("Command Centre")} className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] transition hover:bg-[var(--surface-2)]"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--amber)]"/></button>
            <button type="button" onClick={() => setActive("Settings")} title="Business settings" className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] transition hover:bg-[var(--surface-2)] sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-bold">S</div>
              <span className="hidden text-xs font-semibold sm:block">My Business</span>
              <ChevronDown size={14}/>
            </button>
          </div>
        </header>

        {active === 'Command Centre' ? <BusinessCommandCentre /> : active === 'Analytics' ? <Analytics /> : active === 'Sales' ? <Sales /> : active === 'Purchases' ? <Purchases /> : active === 'Inventory' ? <Inventory /> : active === 'Bulk Items' ? <BulkItems /> : active === 'Customers' ? <Customers /> : active === 'Suppliers' ? <Suppliers /> : active === 'Expenses' ? <Expenses /> : active === 'Payments' ? <Payments /> : active === 'Reports' ? <Reports /> : active === 'Ledger' ? <Ledger /> : active === 'Returns' ? <Returns /> : active === 'GST & Tax' ? <GST /> : active === 'Settings' ? <SettingsPage /> : (
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <div className="sl-dashboard-heading mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border)] p-5 md:p-6">
            <div>
              <p className="text-sm text-[var(--text-2)]">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Business overview</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">Monitor your business performance from one place.</p>
            </div>
            <button onClick={() => setActive('Sales')} className="sl-new-transaction flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white">
              <Plus size={17}/> New transaction
            </button>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="sl-metric-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-2)]">{metric.label}</span>
                    <span className="sl-metric-icon rounded-2xl p-3"><Icon size={20}/></span>
                  </div>
                  <p className="mt-5 text-2xl font-bold tracking-tight">{metric.value}</p>
                  <p className="mt-2 text-xs text-[var(--text-2)]">{metric.change}</p>
                </div>
              )
            })}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="sl-dashboard-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div><h3 className="font-bold">Business performance</h3><p className="mt-1 text-xs text-[var(--text-2)]">Your financial activity will appear here.</p></div>
                <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-2)]">Last 6 months</span>
              </div>
              <div className="mt-5 h-56 w-full">
                {monthlyPerformance.length ? <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="sales" name="Net sales (before GST)" fill="var(--indigo)" />
                    <Bar dataKey="purchases" name="Net purchases (before GST)" fill="var(--emerald)" />
                    <Bar dataKey="expenses" name="Expenses" fill="var(--rose)" />
                  </BarChart>
                </ResponsiveContainer> : <p className="pt-20 text-center text-sm text-[var(--text-2)]">Add dated transactions to view performance.</p>}
              </div>
            </div>
            <div className="sl-dashboard-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-bold">Quick actions</h3>
              <p className="mt-1 text-xs text-[var(--text-2)]">Common business operations</p>
              <div className="mt-5 space-y-3">
                {[
                  {name:'Create sales invoice',icon:Receipt,page:'Sales'},
                  {name:'Record purchase',icon:ShoppingBag,page:'Purchases'},
                  {name:'Add new product',icon:Boxes,page:'Inventory'},
                  {name:'Add customer',icon:Users,page:'Customers'},
                  {name:'Record payment / receipt',icon:CreditCard,page:'Payments'},
                ].map(action => {
                  const Icon = action.icon
                  return <button key={action.name} onClick={() => setActive(action.page)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left text-sm font-medium hover:bg-[var(--bg)]"><Icon size={18} className="text-[var(--indigo)]"/>{action.name}<ArrowUpRight size={15} className="ml-auto text-[var(--text-2)]"/></button>
                })}
              </div>
            </div>
          </section>

          <section className="sl-dashboard-panel mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
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
              </table> : <div className="flex h-32 items-center justify-center text-sm text-[var(--text-2)]">No transactions recorded yet.</div>}
            </div>
          </section>

          <footer className="py-8 text-center text-xs text-[var(--text-2)]">SmartLedger Pro 5.0 · Business management platform</footer>
        </div>
        )}
      </main>
    {searchOpen && <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/60 p-3 pt-[12vh] backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Search business records" onMouseDown={event=>{if(event.target===event.currentTarget)setSearchOpen(false);}}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4"><Search size={20} className="text-[var(--text-2)]"/><input autoFocus value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="Search products, invoices, customers, suppliers…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--text-2)]"/><button type="button" onClick={()=>{setSearchOpen(false);setSearchQuery('')}} className="rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]">Esc</button></div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {searchQuery.trim().length<2?<p className="p-4 text-sm text-[var(--text-2)]">Enter at least two characters to search your saved business records.</p>:searchResults.length?searchResults.map(result=><button type="button" key={result.page+result.id} onClick={()=>{setActive(result.page);setSearchOpen(false);setSearchQuery('')}} className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--surface-2)]"><span className="mt-0.5 rounded-lg bg-[var(--indigo-tint)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--indigo-ink)]">{result.page}</span><span className="min-w-0"><strong className="block truncate text-sm">{result.title}</strong><span className="block truncate text-xs text-[var(--text-2)]">{result.detail}</span></span><ArrowUpRight size={15} className="ml-auto shrink-0 text-[var(--text-2)]"/></button>):<p className="p-4 text-sm text-[var(--text-2)]">No matching records found.</p>}
        </div>
      </div>
    </div>}
    <BusinessAI />
<BusinessIntelligence />
<PriceAnalysis />
<BusinessAdvisor />
</div>
  )
}

export default App
