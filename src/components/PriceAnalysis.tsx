import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { calculatePriceChange, calculateMargin } from "../lib/businessCalculations";

export default function PriceAnalysis() {
  const [oldPrice, setOldPrice] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [cost, setCost] = useState("");
  const [selling, setSelling] = useState("");

  const change = calculatePriceChange(oldPrice, newPrice);
  const margin = calculateMargin(selling, cost);
  const money = (n: number) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2
  }).format(n);

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[var(--text)]">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={e => set(e.target.value)}
        placeholder="0.00"
        className="w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[var(--text)] placeholder:text-[var(--text-2)] focus:border-[var(--indigo)] focus:outline-none focus:ring-2 focus:ring-[var(--indigo)]/20"
      />
    </label>
  );

  return (
    <section className="my-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-[var(--shadow-1)] sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--indigo)]">Pricing tools</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)]">Pricing &amp; Margin Analysis</h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">Compare rate changes and calculate product-level profitability.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
        <h3 className="mb-3 font-semibold text-[var(--text)]">Price change</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("Previous price (₹)", oldPrice, setOldPrice)}
          {field("New price (₹)", newPrice, setNewPrice)}
        </div>
        {change && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <span className={change.direction === "increase" ? "text-[var(--emerald)]" : change.direction === "decrease" ? "text-[var(--rose)]" : "text-[var(--text-2)]"}>
              {change.direction === "increase" ? <ArrowUpRight size={21}/> : change.direction === "decrease" ? <ArrowDownRight size={21}/> : <Minus size={21}/>}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-2)]">Absolute difference</p>
              <p className="font-bold text-[var(--text)]">{money(Math.abs(change.difference))}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-[var(--text-2)]">Change</p>
              <p className="font-bold text-[var(--text)]">{change.percentage === null ? "—" : `${Math.abs(change.percentage)}% ${change.direction}`}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
        <h3 className="mb-3 font-semibold text-[var(--text)]">Product profit and margin</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("Purchase cost per unit (₹)", cost, setCost)}
          {field("Selling price per unit (₹)", selling, setSelling)}
        </div>
        {margin && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-xs text-[var(--text-2)]">Profit per unit</p>
              <p className={`mt-1 text-lg font-bold ${margin.profit >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}>{money(margin.profit)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-xs text-[var(--text-2)]">Profit margin</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{margin.marginPercent === null ? "Unavailable" : `${margin.marginPercent}%`}</p>
              <p className="text-[11px] text-[var(--text-2)]">Profit ÷ selling price</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-xs text-[var(--text-2)]">Markup on cost</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{margin.markupPercent === null ? "Unavailable" : `${margin.markupPercent}%`}</p>
              <p className="text-[11px] text-[var(--text-2)]">Profit ÷ purchase cost</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[var(--text-2)]">Calculations use the entered per-unit values. GST, discounts, freight and other overheads are excluded unless included in purchase cost.</p>
    </section>
  );
}
