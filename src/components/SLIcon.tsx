import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck,
  Wallet, Receipt, ChartNoAxesCombined, BookOpen, FileText,
  Settings, Search, Plus, Download, Printer, Bell, ArrowUpRight,
  ArrowDownRight, TrendingUp, TrendingDown, CreditCard, Banknote,
  Barcode, ShieldCheck, CircleHelp, type LucideIcon
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, sales: ShoppingCart, products: Package,
  inventory: Boxes, customers: Users, suppliers: Truck, payments: Wallet,
  expenses: Receipt, analytics: ChartNoAxesCombined, ledger: BookOpen,
  reports: FileText, settings: Settings, search: Search, add: Plus,
  download: Download, print: Printer, notifications: Bell,
  receivable: ArrowDownRight, payable: ArrowUpRight,
  profit: TrendingUp, loss: TrendingDown, credit: CreditCard,
  cash: Banknote, barcode: Barcode, security: ShieldCheck, help: CircleHelp
};

type Props = {
  name: keyof typeof icons;
  size?: number;
  className?: string;
};

export default function SLIcon({ name, size = 20, className = "" }: Props) {
  const Icon = icons[name] || CircleHelp;
  return (
    <span className={`sl-icon-shell ${className}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.8} />
    </span>
  );
}
