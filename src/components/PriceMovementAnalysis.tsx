type RatePoint = { productId?: string | number; product?: string; productName?: string; rate: number; date: string; source: string; kind: 'Supplier purchase' | 'Market quotation' | 'Recorded selling rate' | 'Purchase cost update' | 'Retail price update' };

function read(key: string): any[] {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

function buildSeries() {
  const products = read('smartledger-products');
  const productNames = new Map(products.map((p: any) => [String(p.id), String(p.name || p.productName || 'Product')]));
  const points: RatePoint[] = [];
  read('smartledger-pro-price-history').forEach((change: any) => {
    const rate = Number(change.newPrice);
    const date = String(change.date || '');
    if (!Number.isFinite(rate) || rate <= 0 || !date) return;
    const field = change.field === 'purchase' ? 'Purchase cost update' : 'Retail price update';
    points.push({ productId: change.productId, product: change.productName || 'Unknown product', rate, date, source: change.source || 'Manual price update', kind: field });
  });
  read('smartledger-pro-sales').forEach((sale: any) => {
    const rate = Number(sale.rate);
    const date = String(sale.date || '');
    if (!Number.isFinite(rate) || rate <= 0 || !date) return;
    points.push({ productId: sale.productId, product: sale.product || 'Unknown product', rate, date, source: `Sales invoice ${sale.invoice || ''}`, kind: 'Recorded selling rate' });
  });
  read('smartledger-pro-purchases').forEach((p: any) => {
    const rate = Number(p.rate);
    const date = String(p.date || '');
    if (!Number.isFinite(rate) || rate <= 0 || !date) return;
    points.push({
      productId: p.productId,
      product: p.product || productNames.get(String(p.productId)) || 'Unknown product',
      rate,
      date,
      source: p.supplier || 'Supplier not recorded',
      kind: 'Supplier purchase'
    });
  });
  read('smartledger-market-quotes').forEach((q: any) => {
    const rate = Number(q.marketRate);
    const date = String(q.checkedAt || q.savedAt || '').slice(0, 10);
    if (!Number.isFinite(rate) || rate <= 0 || !date) return;
    points.push({
      productId: q.productId,
      product: q.productName || productNames.get(String(q.productId)) || 'Unknown product',
      rate,
      date,
      source: q.source || 'Source not recorded',
      kind: 'Market quotation'
    });
  });
  const groups = new Map<string, RatePoint[]>();
  points.forEach(point => {
    const identity = String(point.productId ?? point.product ?? 'unknown');
    const key = point.kind + '|' + identity;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  });
  return Array.from(groups.values()).map(series => {
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const current = sorted[sorted.length - 1];
    const change = previous ? current.rate - previous.rate : 0;
    return {
      ...current,
      previous: previous?.rate ?? null,
      change,
      percent: previous && previous.rate > 0 ? change / previous.rate * 100 : null,
      observations: sorted.length
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export default function PriceMovementAnalysis() {
  const movements = buildSeries();
  return (
    <section className="my-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Price Movement Analysis</h2>
        <p className="text-sm text-[var(--text-2)]">Supplier invoice rates and independently recorded market quotations are analysed separately. At least two dated records are required to calculate a movement.</p>
      </div>
      {movements.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">No dated purchase rates or market quotations available yet.</p>
      ) : movements.map((item, index) => (
        <div key={`${item.kind}-${item.productId ?? item.product}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{item.product}</strong>
            <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-2)]">{item.kind}</span>
          </div>
          {item.previous === null ? (
            <p className="mt-2 text-sm text-[var(--text-2)]">Only one dated record — add another to calculate a change. Latest: ₹{item.rate.toFixed(2)}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--text-2)]">₹{item.previous.toFixed(2)} → ₹{item.rate.toFixed(2)}</p>
              <strong className={item.change > 0 ? "text-[var(--rose)]" : item.change < 0 ? "text-[var(--emerald)]" : "text-[var(--text)]"}>
                {item.change > 0 ? "↑ Increased" : item.change < 0 ? "↓ Decreased" : "→ Unchanged"} ₹{Math.abs(item.change).toFixed(2)}
                {item.percent === null ? "" : ` (${Math.abs(item.percent).toFixed(2)}%)`}
              </strong>
            </>
          )}
          <p className="mt-1 text-xs text-[var(--text-2)]">{item.source} · {item.date} · {item.observations} records</p>
        </div>
      ))}
      <p className="text-xs text-[var(--text-2)]">These calculations use saved supplier invoices and market quotations. They do not claim to fetch live market prices.</p>
    </section>
  );
}
