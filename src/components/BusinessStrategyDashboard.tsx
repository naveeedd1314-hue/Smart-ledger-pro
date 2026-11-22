
import { useMemo } from "react";
import { calculateBusinessStrategy, generateStrategyRecommendations } from "../lib/businessStrategy";

export default function BusinessStrategyDashboard() {
  const result = useMemo(() => calculateBusinessStrategy(), []);
  const recommendations = useMemo(() => generateStrategyRecommendations(), []);

  const card = {
    padding: 14,
    borderRadius: 14,
    background: "var(--surface)",
    border: "1px solid var(--border, #ddd)"
  } as const;

  return (
    <section data-sl-strategy="true" className="sl-strategy" style={{ margin: "20px 0" }}>
      <h2>Business Strategy Engine</h2>
      <p style={{ opacity: .7, fontSize: 13 }}>
        Product profitability, stock investment and net inventory movement after customer returns.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 }}>
        <div style={card}>
          <small>Stock Investment</small>
          <h3>₹{result.totalStockInvestment.toLocaleString("en-IN", {maximumFractionDigits:2})}</h3>
        </div>
        <div style={card}>
          <small>Low-Margin Products</small>
          <h3>{result.lowMarginProducts}</h3>
        </div>
        <div style={card}>
          <small>Slow / Unsold Products</small>
          <h3>{result.slowMovingProducts}</h3>
        </div>
        <div style={card}>
          <small>Missing Cost Records</small>
          <h3>{result.productsMissingCost}</h3>
        </div>
        <div style={card}>
          <small>Negative Stock Alerts</small>
          <h3>{result.negativeStockProducts}</h3>
        </div>
      </div>

      <h3 style={{ marginTop: 22 }}>Product Strategy Report</h3>
      {result.products.length === 0 ? (
        <p>No products available for analysis.</p>
      ) : result.products.map((p, i) => (
        <div key={i} style={{ ...card, marginBottom: 9 }}>
          <strong>{p.name}</strong>
          <p style={{ fontSize: 13, margin: "7px 0" }}>
            Stock: {p.stock} · Cost: ₹{p.cost.toFixed(2)} · Selling: ₹{p.selling.toFixed(2)}
          </p>
          <p style={{ fontSize: 13, margin: "7px 0" }}>
            Margin: {p.margin === null ? "Unknown" : `${p.margin.toFixed(2)}%`}
            {" · "}Stock value: ₹{p.stockValue.toFixed(2)}
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Sold in 30 days: {p.soldQty30Days}
            {" · "}Estimated stock days: {p.estimatedDaysOfStock === null ? "Unknown" : p.estimatedDaysOfStock.toFixed(1)}
          </p>
          <strong style={{ fontSize: 12 }}>{p.status}</strong>
        </div>
      ))}

      <h3 style={{ marginTop: 22 }}>Recommended actions</h3>
      {recommendations.length === 0 ? (
        <p style={{ fontSize: 13, opacity: .7 }}>No priority actions were identified from the available records.</p>
      ) : recommendations.map((item, i) => (
        <div key={i} style={{ ...card, marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <strong>{item.name}</strong>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.priority === "High" ? "var(--rose)" : "var(--amber)" }}>{item.priority} priority</span>
          </div>
          <p style={{ fontSize: 13, margin: "7px 0 0" }}>{item.recommendation}</p>
        </div>
      ))}

      {result.warnings.map((warning, i) => (
        <p key={i} style={{ fontSize: 13, color: "var(--amber)" }}>{warning}</p>
      ))}

      <p style={{ fontSize: 12, opacity: .65, marginTop: 14 }}>
        Estimates depend on recorded product costs, stock and dated sales. No prices or stock quantities are changed automatically.
      </p>
    </section>
  );
}
