import { toNumber, calculateSalesProfit, calculateStockValue } from "./businessCalculations";

const read = (...keys: string[]): any[] => {
  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(value) && value.length) return value;
    } catch {
      continue;
    }
  }
  return [];
};

const pick = (item: any, keys: string[]) => {
  for (const key of keys) {
    const value = toNumber(item?.[key]);
    if (value !== null) return value;
  }
  return null;
};

export function getBusinessSnapshot() {
  const products = read("smartledger-products", "products");
  const bills = read("smartledger-bills", "bills");
  const purchases = read("smartledger-purchases", "purchases");
  const expenses = read("smartledger-expenses", "expenses");

  const stock = calculateStockValue(products.map(p => ({
    stock: pick(p, ["stock", "quantity", "qty", "closingStock"]),
    purchasePrice: pick(p, ["purchase", "purchasePrice", "costPrice", "buyPrice"])
  })));

  const sales = calculateSalesProfit(bills.flatMap(b => {
    const lines = Array.isArray(b.items) ? b.items : Array.isArray(b.products) ? b.products : [b];
    return lines.map((item: any) => ({
      quantity: pick(item, ["quantity", "qty", "quantitySold"]),
      sellingPrice: pick(item, ["sellingPrice", "price", "rate", "salePrice"]),
      purchasePrice: pick(item, ["purchasePrice", "purchase", "costPrice"])
    }));
  }));

  const expenseTotal = expenses.reduce((sum, e) => {
    const amount = pick(e, ["amount", "total", "expenseAmount"]);
    return sum + (amount ?? 0);
  }, 0);

  const purchaseTotal = purchases.reduce((sum, p) => {
    const amount = pick(p, ["total", "grandTotal", "amount", "netAmount"]);
    return sum + (amount ?? 0);
  }, 0);

  return {
    counts: {
      products: products.length,
      bills: bills.length,
      purchases: purchases.length,
      expenses: expenses.length
    },
    stock,
    sales,
    expenseTotal: Math.round(expenseTotal * 100) / 100,
    purchaseTotal: Math.round(purchaseTotal * 100) / 100,
    warnings: [
      ...(sales.missingCostLines ? [`Purchase cost missing on ${sales.missingCostLines} sales line(s).`] : []),
      ...(stock.missingCostItems ? [`Purchase cost missing for ${stock.missingCostItems} stocked product(s).`] : [])
    ]
  };
}


// SMARTLEDGER_DATA_QUALITY_AUDIT
export function validateBusinessRecords() {
  const warnings: string[] = [];
  const read = (key: string) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      warnings.push(key + ": invalid stored data");
      return [];
    }
  };
  const products = read("smartledger-products");
  const bills = read("smartledger-bills");
  const purchases = read("smartledger-purchases");
  const expenses = read("smartledger-expenses");

  if (!products.length) warnings.push("No product records found.");
  if (!bills.length) warnings.push("No sales records found.");
  if (!purchases.length) warnings.push("No purchase records found.");
  if (!expenses.length) warnings.push("No expense records found.");

  products.forEach((p: any, i: number) => {
    const stock = Number(p.stock ?? p.quantity ?? p.qty);
    if (!Number.isFinite(stock)) warnings.push("Product " + (i + 1) + ": stock value missing or invalid.");
    if (stock < 0) warnings.push("Product " + (i + 1) + ": negative stock.");
  });
  bills.forEach((b: any, i: number) => {
    const total = Number(b.total ?? b.grandTotal ?? b.amount);
    if (!Number.isFinite(total)) warnings.push("Sale " + (i + 1) + ": total missing or invalid.");
  });
  return { valid: warnings.length === 0, warnings, checked: {
    products: products.length, sales: bills.length,
    purchases: purchases.length, expenses: expenses.length
  }};
}
