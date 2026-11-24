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
import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, ArrowLeft,
  Users, Truck, Wallet, ChartNoAxesCombined, FileText,
  Settings, Bell, Search, Menu, Plus, ArrowUpRight,
  ArrowDownRight, Boxes, CreditCard,
  Receipt, ChevronDown, BookOpen, Sun, Moon, X, Zap, PackagePlus, RotateCcw, ClipboardList, FileDown
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
  const activeRef = useRef('Dashboard')
  const pageStack = useRef<string[]>(['Dashboard'])
  const [menuOpen, setMenuOpenState] = useState(false)
  const [searchOpen, setSearchOpenState] = useState(false)
  const menuOpenRef = useRef(false)
  const searchOpenRef = useRef(false)
  const setMenuOpen = (value: boolean) => { menuOpenRef.current = value; setMenuOpenState(value); }
  const setSearchOpen = (value: boolean) => { searchOpenRef.current = value; setSearchOpenState(value); }
  const [searchQuery, setSearchQuery] = useState('')
  const setCurrentPage = (page: string) => { activeRef.current = page; setActive(page); };
  const navigate = (page: string) => {
    if (page === activeRef.current) return;
    pageStack.current = [...pageStack.current, page];
    window.history.pushState({ smartLedgerPage: page }, '', '#page=' + encodeURIComponent(page));
    setCurrentPage(page);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const goBack = () => {
    if (menuOpen) { setMenuOpen(false); return; }
    if (pageStack.current.length > 1) pageStack.current = pageStack.current.slice(0, -1);
    const previous = pageStack.current[pageStack.current.length - 1] || 'Dashboard';
    setCurrentPage(previous);
    window.history.replaceState({ smartLedgerPage: previous }, '', '#page=' + encodeURIComponent(previous));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  // Keep one permanent hardware-back listener. Re-registering this listener
  // whenever a menu/search state changes creates a brief window where Android
  // can fall through to its default app-exit behaviour.
  useEffect(() => {
    const onNativeBack = () => {
      if (menuOpenRef.current) { setMenuOpen(false); return; }
      if (searchOpenRef.current) { setSearchOpen(false); setSearchQuery(''); return; }
      if (pageStack.current.length > 1) {
        pageStack.current = pageStack.current.slice(0, -1);
        const previous = pageStack.current[pageStack.current.length - 1] || 'Dashboard';
        setCurrentPage(previous);
        window.history.replaceState({ smartLedgerPage: previous }, '', '#page=' + encodeURIComponent(previous));
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      // The registered native listener consumes Back at Dashboard as well.
    };
    window.addEventListener('smartledger:native-back', onNativeBack);
    return () => window.removeEventListener('smartledger:native-back', onNativeBack);
  }, []);
  useEffect(() => {
    window.history.replaceState({ smartLedgerPage: 'Dashboard' }, '', window.location.pathname + window.location.search + '#page=Dashboard');
    const onBack = (event: PopStateEvent) => {
      const page = typeof event.state?.smartLedgerPage === 'string' ? event.state.smartLedgerPage : 'Dashboard';
      const index = pageStack.current.lastIndexOf(page);
      pageStack.current = index >= 0 ? pageStack.current.slice(0, index + 1) : [page];
      setCurrentPage(page);
      setMenuOpen(false);
      if (!event.state?.smartLedgerPage) window.history.pushState({ smartLedgerPage: 'Dashboard' }, '', '#page=Dashboard');
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

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
  const outstandingChartData = metrics.filter(x => x.label === 'To Collect' || x.label === 'To Pay').map(x => ({ name: x.label, amount: Number(String(x.value).replace(/[^0-9.-]/g, '')) || 0 }))
  const recentTransactions = getRecentTransactions()
  const monthlyPerformance = getMonthlyPerformance()
  const dashboardInventory = readData('smartledger-products').slice(0, 6).map((item: any, index: number) => {
    const qty = Number(item.qty ?? item.stock ?? item.quantity) || 0
    const price = Number(item.salePrice ?? item.sellingPrice ?? item.sale ?? item.price) || 0
    const status = qty <= 0 ? 'Out of stock' : qty <= 5 ? 'Low stock' : 'In stock'
    return { id: String(item.id ?? item.sku ?? index), name: String(item.name || item.productName || 'Unnamed item'), sku: String(item.sku || item.code || '—'), qty, price, status }
  })
  const [detailType, setDetailType] = useState<'Customer' | 'Supplier' | null>(null)
  const [expandedChart, setExpandedChart] = useState<string | null>(null)
  const salesByProduct = Object.values(readData('smartledger-pro-sales').reduce((map: Record<string, { name: string; amount: number }>, item: any) => {
    const name = String(item.product || 'Other')
    map[name] ||= { name, amount: 0 }
    map[name].amount += Number(item.taxableValue ?? item.total ?? ((Number(item.qty) || 0) * (Number(item.rate) || 0))) || 0
    return map
  }, {})).sort((a,b)=>b.amount-a.amount).slice(0,6)
  const expensesByCategory = Object.values(readData('smartledger-pro-expenses').reduce((map: Record<string, { name: string; amount: number }>, item: any) => {
    const name = String(item.category || 'General')
    map[name] ||= { name, amount: 0 }
    map[name].amount += Number(item.amount) || 0
    return map
  }, {})).sort((a,b)=>b.amount-a.amount).slice(0,6)
  const partyDetails = detailType ? (() => {
    const isCustomer = detailType === 'Customer'
    const parties = readData(isCustomer ? 'smartledger-pro-customers' : 'smartledger-pro-suppliers')
    const invoices = readData(isCustomer ? 'smartledger-pro-sales' : 'smartledger-pro-purchases')
    const payments = readData('smartledger-pro-payments')
    const returns = readData('smartledger-pro-returns')
    return parties.map((party: any) => {
      const name = String(party.name || '')
      const invoiceDue = invoices.filter((x: any) => (isCustomer ? x.customer : x.supplier) === name).reduce((sum: number, x: any) => {
        const total = Number(x.total)
        return sum + (Number.isFinite(total) ? Math.max(0, total - (Number(x.paid) || 0)) : Math.max(0, Number(x.balance) || 0))
      }, 0)
      const paid = payments.filter((x: any) => x.party === name && x.type === (isCustomer ? 'Customer Receipt' : 'Supplier Payment')).reduce((s: number,x: any)=>s+(Number(x.amount)||0),0)
      const refunds = payments.filter((x: any) => x.party === name && x.type === (isCustomer ? 'Customer Refund' : 'Supplier Refund')).reduce((s: number,x: any)=>s+(Number(x.amount)||0),0)
      const returnCredit = returns.filter((x: any) => x.party === name && x.type === (isCustomer ? 'Sales Return' : 'Purchase Return')).reduce((s: number,x: any)=>s+(Number(x.totalAmount ?? x.amount)||0),0)
      const balance = Math.max(0, (Number(party.opening)||0) + invoiceDue + refunds - paid - returnCredit)
      return { name, phone: party.phone || '', balance }
    }).filter((x: any)=>x.balance>0).sort((a: any,b: any)=>b.balance-a.balance)
  })() : []

  return (
    <div data-sl-dashboard="true" className="min-h-screen bg-[var(--bg)] text-[var(--text)]">


      <aside className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-transform md:translate-x-0`}>
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[var(--border)] px-5">
          <div className="sl-brand-mark" aria-label="SmartLedger logo">
            <img src={`${import.meta.env.BASE_URL}smartledger-mark.svg`} alt="SmartLedger Pro" width="48" height="48" />
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
                    <button key={item.name} onClick={() => { navigate(item.name) }}
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
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Back to previous screen" title="Back" onClick={goBack} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)]"><ArrowLeft size={18}/></button>
            <button aria-label="Toggle colour theme" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode(v => !v)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)]">
              {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button type="button" aria-label="Search business records" title="Search (Ctrl+K)" onClick={() => setSearchOpen(true)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] transition hover:bg-[var(--surface-2)]"><Search size={18}/></button>
            <button type="button" aria-label="Open business command centre" title="Business alerts and insights" onClick={() => navigate("Command Centre")} className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] transition hover:bg-[var(--surface-2)]"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--amber)]"/></button>
            <button type="button" onClick={() => navigate("Settings")} title="Business settings" className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] transition hover:bg-[var(--surface-2)] sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-bold">S</div>
              <span className="hidden text-xs font-semibold sm:block">My Business</span>
              <ChevronDown size={14}/>
            </button>
          </div>
        </header>

        {(() => {
          const shortcuts: Record<string, {label:string;page:string;icon:any;event?:string}[]> = {
            Dashboard:[{label:'Dashboard',page:'Dashboard',icon:LayoutDashboard},{label:'Inventory',page:'Inventory',icon:Package},{label:'Sales',page:'Sales',icon:ShoppingCart},{label:'Reports',page:'Reports',icon:FileText},{label:'Parties',page:'Customers',icon:Users},{label:'Cash',page:'Payments',icon:Wallet}],
            Inventory:[{label:'Add Item',page:'Inventory',icon:PackagePlus,event:'smartledger:inventory-add'},{label:'Bulk Import',page:'Bulk Items',icon:Boxes},{label:'Stock Adjustment',page:'Inventory',icon:ClipboardList,event:'smartledger:inventory-adjust'},{label:'Export CSV',page:'Inventory',icon:FileText,event:'smartledger:inventory-export-csv'},{label:'Stock Report',page:'Inventory',icon:FileDown,event:'smartledger:inventory-export-pdf'}],
            'Bulk Items':[{label:'Inventory',page:'Inventory',icon:Package},{label:'Import Items',page:'Bulk Items',icon:Boxes}],
            Sales:[{label:'New Sale',page:'Sales',icon:ShoppingCart,event:'smartledger:sales-new'},{label:'Customers',page:'Customers',icon:Users},{label:'Sales Returns',page:'Returns',icon:RotateCcw}],
            Purchases:[{label:'New Purchase',page:'Purchases',icon:ShoppingBag,event:'smartledger:purchases-new'},{label:'Suppliers',page:'Suppliers',icon:Truck},{label:'Purchase Returns',page:'Returns',icon:RotateCcw}],
            Customers:[{label:'Add Customer',page:'Customers',icon:Users,event:'smartledger:customers-add'},{label:'Customer Ledger',page:'Ledger',icon:BookOpen}],
            Suppliers:[{label:'Add Supplier',page:'Suppliers',icon:Truck,event:'smartledger:suppliers-add'},{label:'Supplier Ledger',page:'Ledger',icon:BookOpen}],
            Expenses:[{label:'Add Expense',page:'Expenses',icon:Wallet,event:'smartledger:expenses-add'},{label:'Expense Reports',page:'Reports',icon:FileText}],
            Payments:[{label:'New Payment',page:'Payments',icon:CreditCard,event:'smartledger:payments-add'},{label:'Customer List',page:'Customers',icon:Users},{label:'Supplier List',page:'Suppliers',icon:Truck}],
            Reports:[{label:'Analytics',page:'Analytics',icon:ChartNoAxesCombined},{label:'Ledger',page:'Ledger',icon:BookOpen}],
            Ledger:[{label:'Customers',page:'Customers',icon:Users},{label:'Suppliers',page:'Suppliers',icon:Truck}],
            Returns:[{label:'Sales',page:'Sales',icon:ShoppingCart},{label:'Purchases',page:'Purchases',icon:ShoppingBag}],
            'GST & Tax':[{label:'GST Reports',page:'Reports',icon:FileText}],
            Analytics:[{label:'Reports',page:'Reports',icon:FileText}],
            'Command Centre':[{label:'Inventory Alerts',page:'Inventory',icon:Package},{label:'Reports',page:'Reports',icon:FileText}],
            Settings:[{label:'Dashboard',page:'Dashboard',icon:LayoutDashboard}]
          };;
          const actions=shortcuts[active]||shortcuts.Dashboard;
          return <nav aria-label={active + ' shortcuts'} className="sticky top-20 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 px-3 py-2 backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-full items-center gap-2 overflow-x-auto pb-1">
              <span className="sticky left-0 z-10 flex shrink-0 items-center gap-1 bg-[var(--bg)] pr-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-2)]"><Zap size={14}/>{active}</span>
              {actions.map(action=>{const Icon=action.icon;return <button key={action.label} type="button" onClick={()=>{ if(action.event) window.dispatchEvent(new Event(action.event)); if(action.page!==active) navigate(action.page); }} aria-label={action.label} title={action.label} className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--indigo)] hover:bg-[var(--indigo-tint)] hover:text-[var(--indigo-ink)]"><Icon size={15}/>{action.label}</button>})}
            </div>
          </nav>;
        })()}

        {active === 'Command Centre' ? <BusinessCommandCentre /> : active === 'Analytics' ? <Analytics /> : active === 'Sales' ? <Sales /> : active === 'Purchases' ? <Purchases /> : active === 'Inventory' ? <Inventory /> : active === 'Bulk Items' ? <BulkItems /> : active === 'Customers' ? <Customers /> : active === 'Suppliers' ? <Suppliers /> : active === 'Expenses' ? <Expenses /> : active === 'Payments' ? <Payments /> : active === 'Reports' ? <Reports /> : active === 'Ledger' ? <Ledger /> : active === 'Returns' ? <Returns /> : active === 'GST & Tax' ? <GST /> : active === 'Settings' ? <SettingsPage /> : (
        <div className="sl-dashboard-content mx-auto max-w-7xl p-4 md:p-8">
          <div className="sl-dashboard-heading mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border)] p-5 md:p-6">
            <div>
              <p className="text-sm text-[var(--text-2)]">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Business overview</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">Monitor your business performance from one place.</p>
            </div>
            <button onClick={() => navigate('Sales')} className="sl-new-transaction flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white">
              <Plus size={17}/> New transaction
            </button>
          </div>

          <div className="sl-section-heading"><div><h3>Overview</h3><p>Key business figures at a glance</p></div><span>{new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></div>
          <section className="sl-overview-chips grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {metrics.map((metric) => {
              const Icon = metric.icon
              const detail = metric.label === 'To Collect' ? 'Customer' : metric.label === 'To Pay' ? 'Supplier' : null
              return (
                <button key={metric.label} type="button" onClick={() => detail && setDetailType(detail)} disabled={!detail}
                  className={`sl-metric-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-sm transition ${detail ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[var(--indigo)] hover:shadow-md' : 'cursor-default'}`}
                  aria-label={detail ? `Open full ${detail.toLowerCase()} outstanding details` : metric.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-2)]">{metric.label}</span>
                    <span className="sl-metric-icon rounded-2xl p-3"><Icon size={20}/></span>
                  </div>
                  <p className="mt-5 text-2xl font-bold tracking-tight">{metric.value}</p>
                  <p className="mt-2 text-xs text-[var(--text-2)]">{metric.change}{detail ? ' · Tap to view details' : ''}</p>
                </button>
              )
            })}
          </section>

          <div className="sl-section-heading sl-analytics-heading"><div><h3>Analytics</h3><p>Tap any chart to view full details</p></div><span>View details ↗</span></div>
          <section className="sl-charts-shell mt-3 grid grid-cols-2 gap-3 sm:gap-5" aria-label="Business charts">
            <div className="sl-dashboard-panel sl-chart-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" role="button" tabIndex={0} aria-label="Expand Monthly business performance details" onClick={()=>setExpandedChart('Monthly business performance')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setExpandedChart('Monthly business performance')}}}>
              <h3 className="font-bold">Monthly business performance</h3><p className="mt-1 text-xs text-[var(--text-2)]">Sales, purchases and expenses</p>
              <div className="mt-3 h-28 sm:h-36">{monthlyPerformance.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyPerformance}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fill:'var(--text-2)',fontSize:10}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><YAxis tick={{fill:'var(--text-2)',fontSize:10}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><Tooltip formatter={(v)=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{backgroundColor:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)'}} labelStyle={{color:'var(--text)'}} itemStyle={{color:'var(--text)'}}/><Legend wrapperStyle={{fontSize:10,color:'var(--text-2)'}}/><Bar dataKey="sales" name="Sales" fill="var(--indigo)"/><Bar dataKey="purchases" name="Purchases" fill="var(--emerald)"/><Bar dataKey="expenses" name="Expenses" fill="var(--rose)"/></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-2)]">Add dated transactions to view performance.</p>}</div>
            </div>
            <div className="sl-dashboard-panel sl-chart-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" role="button" tabIndex={0} aria-label="Expand Top-selling products details" onClick={()=>setExpandedChart('Top-selling products')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setExpandedChart('Top-selling products')}}}>
              <h3 className="font-bold">Top-selling products</h3><p className="mt-1 text-xs text-[var(--text-2)]">Ranked by recorded sales value</p>
              <div className="mt-3 h-28 sm:h-36">{salesByProduct.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={salesByProduct} layout="vertical" margin={{left:12}}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:'var(--text-2)',fontSize:10}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><YAxis type="category" dataKey="name" width={72} tick={{fill:'var(--text-2)',fontSize:9}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><Tooltip formatter={(v)=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{backgroundColor:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)'}} labelStyle={{color:'var(--text)'}} itemStyle={{color:'var(--text)'}}/><Bar dataKey="amount" name="Sales value" fill="var(--indigo)" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-2)]">No product sales recorded.</p>}</div>
            </div>
            <div className="sl-dashboard-panel sl-chart-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" role="button" tabIndex={0} aria-label="Expand Expense breakdown details" onClick={()=>setExpandedChart('Expense breakdown')} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setExpandedChart('Expense breakdown')}}}>
              <h3 className="font-bold">Expense breakdown</h3><p className="mt-1 text-xs text-[var(--text-2)]">Expenses grouped by category</p>
              <div className="mt-3 h-28 sm:h-36">{expensesByCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={expensesByCategory}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis tick={{fill:'var(--text-2)',fontSize:10}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><Tooltip formatter={(v)=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{backgroundColor:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)'}} labelStyle={{color:'var(--text)'}} itemStyle={{color:'var(--text)'}}/><Bar dataKey="amount" name="Expense" fill="var(--rose)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-2)]">No expenses recorded.</p>}</div>
            </div>
            <div className="sl-dashboard-panel sl-chart-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" role="button" tabIndex={0} aria-label="Expand Outstanding balances details" onClick={event=>{if((event.target as HTMLElement).closest('.recharts-bar-rectangle'))return;setExpandedChart('Outstanding balances')}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setExpandedChart('Outstanding balances')}}}>
              <h3 className="font-bold">Outstanding balances</h3><p className="mt-1 text-xs text-[var(--text-2)]">Select a bar to open the complete party-wise details.</p>
              <div className="mt-3 h-28 sm:h-36">{outstandingChartData.some(x=>x.amount>0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={outstandingChartData} layout="vertical" margin={{left:8,right:12}}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:'var(--text-2)',fontSize:10}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><YAxis type="category" dataKey="name" width={76} tick={{fill:'var(--text-2)',fontSize:9}} axisLine={{stroke:'var(--border)'}} tickLine={{stroke:'var(--border)'}}/><Tooltip formatter={(v)=>`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})}`} contentStyle={{backgroundColor:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)'}} labelStyle={{color:'var(--text)'}} itemStyle={{color:'var(--text)'}}/><Bar dataKey="amount" name="Outstanding" fill="var(--indigo)" radius={[0,7,7,0]} onClick={(entry:any)=>{const label=entry?.name || entry?.payload?.name; if(label==='To Collect'||label==='To Pay') setDetailType(label==='To Collect'?'Customer':'Supplier')}} cursor="pointer"/></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-2)]">No outstanding balances.</p>}</div>
            </div>
          </section>

          <div className="sl-section-heading sl-inventory-heading"><div><h3>Inventory</h3><p>Quick view of your saved stock items</p></div><button type="button" onClick={()=>navigate('Inventory')}>Manage stock ↗</button></div>
          <section className="sl-dashboard-panel sl-inventory-preview mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="overflow-x-auto">
              {dashboardInventory.length ? <table className="w-full text-left text-sm">
                <thead><tr><th className="p-3">#</th><th className="p-3">Item name</th><th className="p-3">SKU</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3">Status</th></tr></thead>
                <tbody>{dashboardInventory.map((item,i)=><tr key={item.id}>
                  <td className="p-3">{i+1}</td><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.sku}</td>
                  <td className="p-3 text-right font-bold">{item.qty}</td><td className="p-3 text-right">{item.price ? '₹'+item.price.toLocaleString('en-IN',{maximumFractionDigits:2}) : '—'}</td>
                  <td className="p-3"><span className={item.qty<=0?'sl-stock-badge is-out':item.qty<=5?'sl-stock-badge is-low':'sl-stock-badge is-ok'}>{item.status}</span></td>
                </tr>)}</tbody>
              </table> : <div className="flex h-28 items-center justify-center text-sm text-[var(--text-2)]">No inventory items saved yet. <button type="button" className="ml-2 font-bold text-[var(--teal)]" onClick={()=>navigate('Inventory')}>Open inventory</button></div>}
            </div>
          </section>

          <section className="sl-dashboard-panel mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold">Recent transactions</h3><p className="mt-1 text-xs text-[var(--text-2)]">Your latest business activity</p></div>
              <button onClick={() => navigate('Reports')} className="text-xs font-semibold text-[var(--indigo)]">View reports →</button>
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
          {searchQuery.trim().length<2?<p className="p-4 text-sm text-[var(--text-2)]">Enter at least two characters to search your saved business records.</p>:searchResults.length?searchResults.map(result=><button type="button" key={result.page+result.id} onClick={()=>{navigate(result.page);setSearchOpen(false);setSearchQuery('')}} className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--surface-2)]"><span className="mt-0.5 rounded-lg bg-[var(--indigo-tint)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--indigo-ink)]">{result.page}</span><span className="min-w-0"><strong className="block truncate text-sm">{result.title}</strong><span className="block truncate text-xs text-[var(--text-2)]">{result.detail}</span></span><ArrowUpRight size={15} className="ml-auto shrink-0 text-[var(--text-2)]"/></button>):<p className="p-4 text-sm text-[var(--text-2)]">No matching records found.</p>}
        </div>
      </div>
    </div>}
    {expandedChart && <div className="sl-chart-detail-backdrop fixed inset-0 z-[10002] flex items-start justify-center overflow-y-auto p-3 pt-[6vh]" role="dialog" aria-modal="true" aria-label={expandedChart + ' full details'} onMouseDown={event=>{if(event.target===event.currentTarget)setExpandedChart(null)}}>
      <div className="sl-chart-detail w-full max-w-5xl overflow-hidden rounded-2xl border p-4 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--teal)]">Detailed analytics</p><h2 className="mt-1 text-xl font-extrabold">{expandedChart}</h2><p className="mt-1 text-sm text-[var(--text-2)]">Full recorded values and breakdown</p></div><button type="button" onClick={()=>setExpandedChart(null)} className="rounded-xl border px-3 py-2 text-sm font-semibold">Close</button></div>
        {expandedChart==='Monthly business performance' ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Month</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Purchases</th><th className="p-3 text-right">Expenses</th></tr></thead><tbody>{monthlyPerformance.map(x=><tr key={x.month}><td className="p-3 font-semibold">{x.month}</td><td className="p-3 text-right">{'₹'+x.sales.toLocaleString('en-IN')}</td><td className="p-3 text-right">{'₹'+x.purchases.toLocaleString('en-IN')}</td><td className="p-3 text-right">{'₹'+x.expenses.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div> : expandedChart==='Top-selling products' ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Rank</th><th className="p-3">Product</th><th className="p-3 text-right">Recorded sales value</th></tr></thead><tbody>{salesByProduct.map((x,i)=><tr key={x.name}><td className="p-3">{i+1}</td><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right">{'₹'+x.amount.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div> : expandedChart==='Expense breakdown' ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Category</th><th className="p-3 text-right">Recorded expenses</th></tr></thead><tbody>{expensesByCategory.map(x=><tr key={x.name}><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right">{'₹'+x.amount.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Type</th><th className="p-3 text-right">Outstanding amount</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{outstandingChartData.map(x=><tr key={x.name}><td className="p-3 font-semibold">{x.name}</td><td className="p-3 text-right">{'₹'+x.amount.toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td className="p-3 text-right"><button type="button" onClick={()=>{setExpandedChart(null);setDetailType(x.name==='To Collect'?'Customer':'Supplier')}} className="rounded-lg border px-3 py-2 text-xs font-bold">View parties</button></td></tr>)}</tbody></table></div>}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-2)]"><span className="rounded-full border px-3 py-1">Values from recorded transactions</span><span className="rounded-full border px-3 py-1">Currency: INR</span></div>
      </div>
    </div>}
    {detailType && <div className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-[8vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={detailType + ' outstanding details'} onMouseDown={event=>{if(event.target===event.currentTarget)setDetailType(null);}}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4"><div><h2 className="text-lg font-bold">{detailType === 'Customer' ? 'To Collect — Customer Receivables' : 'To Pay — Supplier Payables'}</h2><p className="text-xs text-[var(--text-2)]">Party-wise outstanding balances</p></div><button type="button" onClick={()=>setDetailType(null)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Close</button></div>
        <div className="max-h-[65vh] overflow-auto p-4">
          <div className="mb-3 flex justify-between text-sm"><span>{partyDetails.length} parties with outstanding balances</span><strong>{`₹${partyDetails.reduce((s,x)=>s+x.balance,0).toLocaleString('en-IN',{maximumFractionDigits:2})}`}</strong></div>
          {partyDetails.length ? <table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-[var(--text-2)]"><th className="p-2">#</th><th className="p-2">Party</th><th className="p-2">Phone</th><th className="p-2 text-right">Outstanding</th></tr></thead><tbody>{partyDetails.map((x,i)=><tr key={x.name} className="border-b border-[var(--border)]"><td className="p-2">{i+1}</td><td className="p-2 font-medium">{x.name}</td><td className="p-2">{x.phone||'—'}</td><td className="p-2 text-right font-semibold">{`₹${x.balance.toLocaleString('en-IN',{maximumFractionDigits:2})}`}</td></tr>)}</tbody></table> : <p className="py-10 text-center text-sm text-[var(--text-2)]">No outstanding balances found.</p>}
        </div>
        <div className="flex justify-end border-t border-[var(--border)] p-4"><button type="button" onClick={()=>{navigate(detailType==='Customer'?'Customers':'Suppliers');setDetailType(null)}} className="rounded-xl bg-[var(--indigo-ink)] px-4 py-2 text-sm font-semibold text-white">Open {detailType} List</button></div>
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
