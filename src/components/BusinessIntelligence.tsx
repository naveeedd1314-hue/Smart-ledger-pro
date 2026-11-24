import { useMemo } from "react";
import { getBusinessSnapshot } from "../lib/businessData";

export default function BusinessIntelligence() {
  const data = useMemo(() => getBusinessSnapshot(), []);

  const money = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value);

  const metrics = [
    ["Products", data.counts.products.toString()],
    ["Sales invoices", data.counts.bills.toString()],
    ["Purchase records", data.counts.purchases.toString()],
    ["Stock value", money(data.stock.stockValue)],
    ["Recorded sales", money(data.sales.revenue)],
    ["Known gross profit", money(data.sales.knownGrossProfit)],
    ["Recorded expenses", money(data.expenseTotal)],
    ["Recorded purchases", money(data.purchaseTotal)]
  ];

  return (
    <section style={{ margin: "18px 0", padding: 18, borderRadius: 18, background: "var(--surface, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #ddd)" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Business Intelligence</h2>
      <p style={{ margin: "0 0 16px", opacity: .7, fontSize: 13 }}>Calculated from records saved in this SmartLedger device.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ padding: 13, borderRadius: 12, background: "var(--surface, #f6f3ec)" }}>
            <div style={{ fontSize: 12, opacity: .7 }}>{label}</div>
            <strong style={{ display: "block", marginTop: 7, fontSize: 16, overflowWrap: "anywhere" }}>{value}</strong>
          </div>
        ))}
      </div>
      {data.warnings.length > 0 && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "var(--amber-tint)", color: "var(--amber-ink)", border: "1px solid var(--amber)" }}>
          <strong>Data quality warnings</strong>
          {data.warnings.map((warning, i) => <p key={i} style={{ margin: "6px 0 0", fontSize: 13 }}>{warning}</p>)}
        </div>
      )}
      <p style={{ margin: "12px 0 0", fontSize: 12, opacity: .65 }}>
        Known gross profit excludes sales lines without recorded purchase costs. This is not net profit.
      </p>
    </section>
  );
}
