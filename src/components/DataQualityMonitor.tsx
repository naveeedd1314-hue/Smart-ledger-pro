import { useMemo } from "react";
import { validateBusinessRecords } from "../lib/businessData";

export default function DataQualityMonitor() {
  const audit = useMemo(() => validateBusinessRecords(), []);

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Data Quality Monitor</h2>
        <p className="text-sm text-[var(--text-2)]">{audit.valid ? "No data-quality warnings detected." : `${audit.warnings.length} item(s) need review.`}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["Products",audit.checked.products],["Sales",audit.checked.sales],["Purchases",audit.checked.purchases],["Expenses",audit.checked.expenses],["Payments",audit.checked.payments],["Returns",audit.checked.returns],["Price changes",audit.checked.priceHistory],["Market quotes",audit.checked.marketQuotes],["Stock movements",audit.checked.stockMovements]] as const).map(([label,value])=>
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="text-xs text-[var(--text-2)]">{label}</p>
            <strong className="text-lg text-[var(--text)]">{value}</strong>
          </div>
        )}
      </div>
      {!audit.valid && <div className="space-y-2" role="status">{audit.warnings.slice(0,20).map((warning,index)=>
        <p key={index} className="rounded-lg border border-[var(--amber)]/25 bg-[var(--amber)]/10 px-3 py-2 text-sm text-[var(--text)]">{warning}</p>
      )}</div>}
    </section>
  );
}
