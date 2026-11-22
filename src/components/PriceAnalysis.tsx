import { useState } from "react";
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
    <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
      {label}
      <input type="number" min="0" step="any" value={value}
        onChange={e => set(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 9, border: "1px solid var(--border, #ccc)", background: "var(--card, white)", color: "inherit" }} />
    </label>
  );

  return (
    <section style={{ margin: "18px 0", padding: 18, borderRadius: 18, background: "var(--card, white)", border: "1px solid var(--border, #ddd)" }}>
      <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>Pricing & Margin Analysis</h2>
      <p style={{ margin: "0 0 15px", opacity: .7, fontSize: 13 }}>Enter actual rates to calculate exact changes and margins.</p>
      <h3 style={{ fontSize: 15 }}>Price change</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {field("Previous price (₹)", oldPrice, setOldPrice)}
        {field("New price (₹)", newPrice, setNewPrice)}
      </div>
      {change && <p style={{ fontSize: 14 }}>
        Difference: <strong>{money(Math.abs(change.difference))}</strong>
        {" · "}{change.percentage === null ? "Percentage unavailable (old price is zero)" : `${Math.abs(change.percentage)}% ${change.direction}`}
      </p>}
      <hr style={{ border: 0, borderTop: "1px solid var(--border, #ddd)", margin: "18px 0" }} />
      <h3 style={{ fontSize: 15 }}>Product profit and margin</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {field("Purchase cost (₹)", cost, setCost)}
        {field("Selling price (₹)", selling, setSelling)}
      </div>
      {margin && <div style={{ marginTop: 12, padding: 13, borderRadius: 10, background: "var(--surface, #f6f3ec)" }}>
        <p style={{ margin: "3px 0" }}>Profit per unit: <strong>{money(margin.profit)}</strong></p>
        <p style={{ margin: "3px 0" }}>Profit margin: <strong>{margin.marginPercent === null ? "Unavailable" : `${margin.marginPercent}%`}</strong></p>
        <p style={{ margin: "3px 0" }}>Markup on cost: <strong>{margin.markupPercent === null ? "Unavailable" : `${margin.markupPercent}%`}</strong></p>
      </div>}
      <p style={{ margin: "12px 0 0", fontSize: 12, opacity: .65 }}>Calculations use only the values entered. Taxes, discounts and other costs are excluded unless included in the purchase cost.</p>
    </section>
  );
}
