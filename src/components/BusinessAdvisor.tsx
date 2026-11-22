import { useMemo } from "react";
import { toNumber } from "../lib/businessCalculations";

function read(keys: string[]) {
  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(value) && value.length) return value;
    } catch {}
  }
  return [];
}

function get(item: any, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(item?.[key]);
    if (value !== null) return value;
  }
  return null;
}

export default function BusinessAdvisor() {
  const advice = useMemo(() => {
    const products = read(["smartledger-products", "products"]);
    const bills = read(["smartledger-pro-sales", "smartledger-bills", "bills"]);
    const returns = read(["smartledger-pro-returns"]);
    const sales = new Map<string, number>();
    const returned = new Map<string, number>();

    for (const bill of bills) {
      const lines = Array.isArray(bill.items) ? bill.items :
        Array.isArray(bill.products) ? bill.products : [bill];
      for (const line of lines) {
        const name = String(line.productName || line.product || line.name || "").trim().toLowerCase();
        const qty = get(line, ["quantity", "qty", "quantitySold"]);
        if (name && qty !== null && qty > 0) sales.set(name, (sales.get(name) || 0) + qty);
      }
    }

    for (const item of returns) {
      if (item.type !== "Sales Return") continue;
      const name = String(item.product || item.productName || "").trim().toLowerCase();
      const qty = get(item, ["qty", "quantity"]);
      if (name && qty !== null && qty > 0) returned.set(name, (returned.get(name) || 0) + qty);
    }

    const rows = products.map(p => {
      const name = String(p.name || p.productName || p.itemName || "Unnamed product");
      const cost = get(p, ["purchase", "purchasePrice", "costPrice", "buyPrice"]);
      const retail = get(p, ["selling", "sellingPrice", "salePrice", "retail", "price", "rate"]);
      const wholesale = get(p, ["wholesale", "wholesalePrice"]);
      const stock = get(p, ["stock", "quantity", "qty", "closingStock"]);
      const sold = Math.max(0, (sales.get(name.toLowerCase()) || 0) - (returned.get(name.toLowerCase()) || 0));
      const margin = cost !== null && retail !== null && retail > 0
        ? ((retail - cost) / retail) * 100 : null;
      return { name, cost, retail, wholesale, stock, sold, margin };
    });

    return {
      total: rows.length,
      lowMargin: rows.filter(p => p.margin !== null && p.margin < 5),
      missingCost: rows.filter(p => p.cost === null),
      lowStock: rows.filter(p => p.stock !== null && p.stock > 0 && p.stock <= 5),
      noSales: rows.filter(p => p.stock !== null && p.stock > 0 && p.sold === 0),
      rows
    };
  }, []);

  const section = (title: string, rows: typeof advice.rows, message: string) => (
    <div style={{ marginTop: 13 }}>
      <strong>{title} ({rows.length})</strong>
      {rows.length === 0 ? <p style={{ fontSize: 13, opacity: .65 }}>No matching records found.</p> :
        rows.slice(0, 8).map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border, #ddd)", fontSize: 13 }}>
            <span>{p.name}</span>
            <span style={{ textAlign: "right" }}>{message === "margin" ? `${p.margin?.toFixed(2)}% margin` : message === "stock" ? `${p.stock} in stock` : message === "cost" ? "Cost not recorded" : `${p.sold} sold`}</span>
          </div>
        ))}
    </div>
  );

  return (
    <section style={{ margin: "18px 0", padding: 18, borderRadius: 18, background: "var(--surface, #fff)", color: "var(--text, #0F172A)", border: "1px solid var(--border, #ddd)" }}>
      <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>Smart Business Advisor</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, opacity: .7 }}>Inventory diagnostics based on saved product and invoice records. No automatic price or stock changes.</p>
      <strong>{advice.total} products examined</strong>
      {section("Low-margin products (below 5%)", advice.lowMargin, "margin")}
      {section("Products missing purchase cost", advice.missingCost, "cost")}
      {section("Low-stock products (5 units or fewer)", advice.lowStock, "stock")}
      {section("Products with stock but no matched sales", advice.noSales, "sales")}
      <p style={{ fontSize: 12, opacity: .65, marginTop: 14 }}>Sales and customer returns are matched by product name. No-sales results may occur if invoice records use different product names or historical data is incomplete. These are review alerts, not proof of slow movement.</p>
    </section>
  );
}
