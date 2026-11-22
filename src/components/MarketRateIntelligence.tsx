import { useMemo, useState } from "react";
import { toNumber, calculateMargin } from "../lib/businessCalculations";

const read = () => {
  try {
    const x = JSON.parse(localStorage.getItem("smartledger-products") || localStorage.getItem("products") || "[]");
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
};

export default function MarketRateIntelligence() {
  const products = useMemo(read, []);
  const [selected, setSelected] = useState("");
  const [marketRate, setMarketRate] = useState("");
  const [source, setSource] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  const product = products.find((p: any) => String(p.id ?? p.name) === selected);
  const cost = toNumber(product?.purchase ?? product?.purchasePrice ?? product?.costPrice);
  const retail = toNumber(product?.sellingPrice ?? product?.salePrice ?? product?.retail ?? product?.price);
  const wholesale = toNumber(product?.wholesale ?? product?.wholesalePrice);
  const market = toNumber(marketRate);
  const marketMargin = market !== null && cost !== null ? calculateMargin(market, cost) : null;
  const priceDifference = market !== null && retail !== null ? market - retail : null;

  return (
    <section style={{ margin: "18px 0", padding: 18, borderRadius: 18, background: "var(--card, #fff)", border: "1px solid var(--border, #ddd)" }}>
      <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>Market Rate Intelligence</h2>
      <p style={{ fontSize: 13, opacity: .7 }}>Compare your recorded rates with an independently checked market quotation.</p>

      <label style={{ display: "grid", gap: 6, fontSize: 13, marginTop: 12 }}>
        Select product
        <select value={selected} onChange={e => { setSelected(e.target.value); setMarketRate(""); setSource(""); setCheckedAt(""); }}
          style={{ padding: 11, borderRadius: 9, border: "1px solid var(--border, #ccc)", background: "var(--card, white)", color: "inherit" }}>
          <option value="">Choose a product</option>
          {products.map((p: any, i: number) => <option key={i} value={String(p.id ?? p.name)}>{p.name || p.productName || `Product ${i + 1}`}</option>)}
        </select>
      </label>

      {product && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 9, marginTop: 14 }}>
          {[
            ["Purchase", cost],
            ["Wholesale", wholesale],
            ["Retail", retail]
          ].map(([label, value]) => (
            <div key={String(label)} style={{ padding: 11, borderRadius: 10, background: "var(--surface, #f6f3ec)" }}>
              <div style={{ fontSize: 12, opacity: .7 }}>{label} rate</div>
              <strong>{value === null ? "Not recorded" : `₹${Number(value).toFixed(2)}`}</strong>
            </div>
          ))}
        </div>
      )}

      <label style={{ display: "grid", gap: 6, fontSize: 13, marginTop: 14 }}>
        Verified market quotation (₹)
        <input type="number" min="0" step="any" value={marketRate} onChange={e => setMarketRate(e.target.value)} placeholder="Enter checked market rate"
          style={{ padding: 11, borderRadius: 9, border: "1px solid var(--border, #ccc)", background: "var(--card, white)", color: "inherit" }} />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: 13, marginTop: 10 }}>
        Source / supplier / market
        <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source name or quotation reference"
          style={{ padding: 11, borderRadius: 9, border: "1px solid var(--border, #ccc)", background: "var(--card, white)", color: "inherit" }} />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: 13, marginTop: 10 }}>
        Date checked
        <input type="date" value={checkedAt} onChange={e => setCheckedAt(e.target.value)}
          style={{ padding: 11, borderRadius: 9, border: "1px solid var(--border, #ccc)", background: "var(--card, white)", color: "inherit" }} />
      </label>

      {product && market !== null && market >= 0 && (
        <button
          type="button"
          onClick={() => {
            try {
              const key = "smartledger-market-quotes";
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              const records = Array.isArray(existing) ? existing : [];
              records.push({
                productId: product.id ?? product.name,
                productName: product.name || product.productName || "Unnamed product",
                marketRate: market,
                source: source.trim(),
                checkedAt,
                savedAt: new Date().toISOString()
              });
              localStorage.setItem(key, JSON.stringify(records));
              window.alert("Market quotation saved.");
            } catch {
              window.alert("Could not save quotation. Check device storage.");
            }
          }}
          style={{ marginTop: 12, padding: "11px 16px", border: 0, borderRadius: 10, background: "var(--primary, #1f6f6b)", color: "white", fontWeight: 600, cursor: "pointer" }}
        >
          Save Market Quotation
        </button>
      )}

      {market !== null && market >= 0 && product && (
        <div style={{ marginTop: 14, padding: 13, borderRadius: 10, background: "var(--surface, #f6f3ec)" }}>
          <strong>Comparison</strong>
          <p style={{ margin: "7px 0", fontSize: 13 }}>Market versus your retail rate: {priceDifference === null ? "Retail rate unavailable" : `${priceDifference >= 0 ? "+" : "−"}₹${Math.abs(priceDifference).toFixed(2)}`}</p>
          <p style={{ margin: "7px 0", fontSize: 13 }}>Estimated margin at market rate: {marketMargin?.marginPercent === null || !marketMargin ? "Purchase cost unavailable" : `${marketMargin.marginPercent}%`}</p>
          <p style={{ margin: "7px 0", fontSize: 12, opacity: .7 }}>Source: {source.trim() || "Not provided"} · Checked: {checkedAt || "Date not provided"}</p>
        </div>
      )}
      <p style={{ fontSize: 12, opacity: .65, marginTop: 12 }}>Market rates entered here are user-provided quotations, not automatically verified live prices. Compare identical brands, pack sizes, taxes and delivery terms.</p>
    </section>
  );
}
