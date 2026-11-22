import { useMemo } from "react";
import { validateBusinessRecords } from "../lib/businessData";

export default function DataQualityMonitor() {
  const audit = useMemo(() => validateBusinessRecords(), []);

  return (
    <section style={{ padding: 18, borderRadius: 16, background: "var(--card, #fff)", margin: "16px 0" }}>
      <h3>Data Quality Monitor</h3>
      <p>{audit.valid ? "No data-quality warnings detected." : `${audit.warnings.length} item(s) need review.`}</p>
      <p>Products: {audit.checked.products} · Sales: {audit.checked.sales}</p>
      <p>Purchases: {audit.checked.purchases} · Expenses: {audit.checked.expenses}</p>
      {audit.warnings.slice(0, 10).map((warning, index) => (
        <p key={index} style={{ fontSize: 13 }}>{warning}</p>
      ))}
    </section>
  );
}
