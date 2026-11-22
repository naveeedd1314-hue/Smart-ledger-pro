import { useMemo, useState } from "react";
import { toNumber } from "../lib/businessCalculations";

const read = (keys: string[]) => {
  for (const key of keys) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(v) && v.length) return v;
    } catch {}
  }
  return [];
};

const number = (obj: any, keys: string[]) => {
  for (const key of keys) {
    const n = toNumber(obj?.[key]);
    if (n !== null) return n;
  }
  return null;
};

const dateOf = (obj: any) => {
  for (const key of ["date", "billDate", "invoiceDate", "createdAt", "created_at"]) {
    const raw = obj?.[key];
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
};

export default function ReorderAdvisor() {
  const [now] = useState(() => Date.now());
  const result = useMemo(() => {
    const products = read(["smartledger-products", "products"]);
    const bills = read(["smartledger-pro-sales", "smartledger-bills", "bills"]);
    const cutoff = now - 30 * 86400000;
    const sold = new Map<string, number>();
    let undatedInvoices = 0;

    for (const bill of bills) {
      const date = dateOf(bill);
      if (!date) {
        undatedInvoices++;
        continue;
      }
      if (date.getTime() < cutoff || date.getTime() > now + 86400000) continue;

      const lines = Array.isArray(bill.items) ? bill.items :
        Array.isArray(bill.products) ? bill.products : [bill];

      for (const line of lines) {
        const name = String(line.productName || line.product || line.name || "").trim().toLowerCase();
        const qty = number(line, ["quantity", "qty", "quantitySold"]);
        if (name && qty !== null && qty > 0) {
          sold.set(name, (sold.get(name) || 0) + qty);
        }
      }
    }

    const rows = products.map(p => {
      const name = String(p.name || p.productName || p.itemName || "Unnamed product");
      const stock = number(p, ["stock", "quantity", "qty", "closingStock"]);
      const daily = (sold.get(name.toLowerCase()) || 0) / 30;
      const target = Math.ceil(daily * 14);
      const reorder = stock === null ? null : Math.max(0, target - stock);
      return { name, stock, daily, target, reorder };
    });

    return {
      rows: rows.filter(p => p.reorder !== null && p.reorder > 0)
        .sort((a, b) => (b.reorder || 0) - (a.reorder || 0)),
      missingStock: rows.filter(p => p.stock === null).length,
      undatedInvoices
    };
  }, [now]);

  return (
    <section style={{ margin: "18px 0", padding: 18, borderRadius: 18, background: "var(--card, #fff)", border: "1px solid var(--border, #ddd)" }}>
      <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>Automatic Reorder Advisor</h2>
      <p style={{ fontSize: 13, opacity: .7, margin: "0 0 14px" }}>
        Suggested quantities use recorded sales over 30 days and a 14-day target stock cover.
      </p>
      <strong>{result.rows.length} products may need replenishment</strong>
      {result.rows.length === 0 ? (
        <p style={{ fontSize: 13, opacity: .7 }}>No reorder suggestions from the available dated sales and stock records.</p>
      ) : result.rows.slice(0, 15).map((p, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--border, #ddd)", fontSize: 13 }}>
          <span><strong>{p.name}</strong><br /><span style={{ opacity: .65 }}>Stock: {p.stock} · Average sales: {p.daily.toFixed(2)}/day</span></span>
          <span style={{ textAlign: "right" }}>Suggested order<br /><strong>{p.reorder} units</strong></span>
        </div>
      ))}
      {(result.missingStock > 0 || result.undatedInvoices > 0) && (
        <p style={{ fontSize: 12, color: "#a45a32", marginTop: 12 }}>
          Data limitations: {result.missingStock} products have no readable stock quantity; {result.undatedInvoices} invoices have no recognised date and were excluded.
        </p>
      )}
      <p style={{ fontSize: 12, opacity: .65, marginTop: 12 }}>
        This is a basic demand estimate, not a supplier lead-time forecast. Review suggestions before ordering.
      </p>
    </section>
  );
}
