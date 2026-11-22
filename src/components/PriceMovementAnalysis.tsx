type Quote = {
  productId?: string | number;
  productName?: string;
  marketRate?: number | string;
  source?: string;
  checkedAt?: string;
  savedAt?: string;
};

export default function PriceMovementAnalysis() {
  const movements = (() => {
    try {
      const data: Quote[] = JSON.parse(
        localStorage.getItem("smartledger-market-quotes") || "[]"
      );
      if (!Array.isArray(data)) return [];

      const groups = new Map<string, Quote[]>();

      data.forEach((quote) => {
        const key = String(quote.productId ?? quote.productName ?? "unknown");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(quote);
      });

      return Array.from(groups.values()).map((quotes) => {
        const sorted = [...quotes].sort((a, b) =>
          String(a.savedAt || a.checkedAt || "").localeCompare(
            String(b.savedAt || b.checkedAt || "")
          )
        );
        const previous = Number(sorted.at(-2)?.marketRate);
        const current = Number(sorted.at(-1)?.marketRate);
        const valid = sorted.length >= 2 &&
          Number.isFinite(previous) && previous > 0 &&
          Number.isFinite(current) && current >= 0;
        const change = valid ? current - previous : 0;

        return {
          name: sorted.at(-1)?.productName || "Unnamed product",
          source: sorted.at(-1)?.source || "Source not recorded",
          date: sorted.at(-1)?.checkedAt || sorted.at(-1)?.savedAt || "Date unavailable",
          previous,
          current,
          change,
          percent: valid ? (change / previous) * 100 : 0,
          valid,
        };
      }).reverse();
    } catch {
      return [];
    }
  })();

  return (
    <section style={{ padding: 18, borderRadius: 16, background: "var(--card, #fff)", margin: "16px 0" }}>
      <h3>Price Movement Analysis</h3>
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Comparisons use saved quotations only. At least two quotations are required.
      </p>
      {movements.length === 0 ? (
        <p>No saved market quotations available.</p>
      ) : movements.map((item, index) => (
        <div key={index} style={{ padding: "12px 0", borderBottom: "1px solid var(--border, #ddd)" }}>
          <strong>{item.name}</strong>
          {item.valid ? (
            <>
              <p>Previous: ₹{item.previous.toFixed(2)} → Latest: ₹{item.current.toFixed(2)}</p>
              <strong>
                {item.change > 0 ? "↑ Increase" : item.change < 0 ? "↓ Decrease" : "→ No change"}
                {" "}₹{Math.abs(item.change).toFixed(2)} ({item.percent.toFixed(2)}%)
              </strong>
            </>
          ) : (
            <p>Insufficient valid quotation history for comparison.</p>
          )}
          <p style={{ fontSize: 12, opacity: 0.65 }}>{item.source} · {item.date}</p>
        </div>
      ))}
    </section>
  );
}
