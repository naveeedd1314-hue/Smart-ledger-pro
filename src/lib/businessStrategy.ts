
export type StrategyProduct = {
  id?: string | number;
  name?: string;
  productName?: string;
  stock?: number | string;
  quantity?: number | string;
  qty?: number | string;
  purchase?: number | string;
  averageCost?: number | string | null;
  purchasePrice?: number | string;
  costPrice?: number | string;
  price?: number | string;
  salePrice?: number | string;
  sellingPrice?: number | string;
};

export type StrategyResult = {
  name: string;
  stock: number;
  cost: number;
  selling: number;
  stockValue: number;
  margin: number | null;
  soldQty30Days: number;
  estimatedDaysOfStock: number | null;
  status: string;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const firstPositive = (...values: unknown[]): number => {
  for (const value of values) {
    const n = num(value);
    if (n > 0) return n;
  }
  return 0;
};

const readArray = (key: string): any[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function calculateBusinessStrategy(): {
  products: StrategyResult[];
  totalStockInvestment: number;
  productsMissingCost: number;
  lowMarginProducts: number;
  slowMovingProducts: number;
  negativeStockProducts: number;
  warnings: string[];
} {
  const rawProducts = readArray("smartledger-products");
  const bills = readArray("smartledger-pro-sales").concat(readArray("smartledger-bills").filter(old => !readArray("smartledger-pro-sales").some(current => current.invoice && current.invoice === old.invoice)));
  const salesByProduct = new Map<string, number>();
  const returnedByProduct = new Map<string, number>();
  const returns = readArray("smartledger-pro-returns");
  const warnings: string[] = [];

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const bill of bills) {
    const dateValue = bill.date || bill.billDate || bill.invoiceDate || bill.createdAt;
    const timestamp = dateValue ? new Date(dateValue).getTime() : NaN;
    if (!Number.isFinite(timestamp) || timestamp < cutoff) continue;

    const items = Array.isArray(bill.items) ? bill.items :
      Array.isArray(bill.products) ? bill.products : [bill];

    for (const item of items) {
      const id = String(item.productId ?? item.product_id ?? "").trim();
      const name = String(item.product ?? item.name ?? item.productName ?? "").trim().toLowerCase();
      const qty = firstPositive(item.quantity, item.qty);
      if (qty > 0) {
        if (id) salesByProduct.set(id, (salesByProduct.get(id) || 0) + qty);
        if (name) salesByProduct.set(name, (salesByProduct.get(name) || 0) + qty);
      }
    }
  }

  for (const item of returns) {
    if (item.type !== "Sales Return") continue;
    const dateValue = item.date || item.createdAt;
    const timestamp = dateValue ? new Date(dateValue).getTime() : NaN;
    if (!Number.isFinite(timestamp) || timestamp < cutoff) continue;
    const id = String(item.productId ?? "").trim();
    const name = String(item.product ?? item.productName ?? "").trim().toLowerCase();
    const qty = firstPositive(item.qty, item.quantity);
    if (qty > 0) {
      if (id) returnedByProduct.set(id, (returnedByProduct.get(id) || 0) + qty);
      if (name) returnedByProduct.set(name, (returnedByProduct.get(name) || 0) + qty);
    }
  }

  const products: StrategyResult[] = rawProducts.map((p: StrategyProduct) => {
    const id = String(p.id ?? p.name ?? p.productName ?? "");
    const stock = num(p.stock ?? p.quantity ?? p.qty);
    const cost = firstPositive(p.averageCost, p.purchasePrice, p.purchase, p.costPrice);
    const selling = firstPositive(p.sellingPrice, p.salePrice, p.price);
    const productName = String(p.name ?? p.productName ?? "").trim().toLowerCase();
    const grossSold = salesByProduct.get(id) || salesByProduct.get(productName) || 0;
    const returned = returnedByProduct.get(id) || returnedByProduct.get(productName) || 0;
    const sold = Math.max(0, grossSold - returned);
    const margin = selling > 0 && cost > 0 ? ((selling - cost) / selling) * 100 : null;
    const days = sold > 0 ? (stock / (sold / 30)) : null;

    let status = "Normal";
    if (stock < 0) status = "Negative stock";
    else if (!cost) status = "Missing purchase cost";
    else if (margin !== null && margin < 5) status = "Low margin";
    else if (stock > 0 && sold === 0) status = "No recorded sales";
    else if (days !== null && days > 60) status = "Slow-moving stock";
    else if (stock <= 5 && sold > 0) status = "Low stock";

    return {
      name: p.name || p.productName || "Unnamed product",
      stock, cost, selling,
      stockValue: Math.max(0, stock) * cost,
      margin, soldQty30Days: sold,
      estimatedDaysOfStock: days,
      status
    };
  });

  if (!rawProducts.length) warnings.push("No products found in the standard product storage.");
  if (!bills.length) warnings.push("No sales records found.");
  if (bills.some((b: any) => !b.date && !b.billDate && !b.invoiceDate && !b.createdAt)) {
    warnings.push("Some sales have no date and are excluded from 30-day velocity.");
  }

  return {
    products,
    totalStockInvestment: products.reduce((sum, p) => sum + p.stockValue, 0),
    productsMissingCost: products.filter(p => !p.cost).length,
    lowMarginProducts: products.filter(p => p.margin !== null && p.margin < 5).length,
    slowMovingProducts: products.filter(p => p.status === "Slow-moving stock" || p.status === "No recorded sales").length,
    negativeStockProducts: products.filter(p => p.stock < 0).length,
    warnings
  };
}


export function generateStrategyRecommendations() {
  const result = calculateBusinessStrategy();
  return result.products.map(product => {
    let priority = "Normal";
    let recommendation = "Monitor sales and stock movement.";

    if (product.status === "Negative stock") {
      priority = "High";
      recommendation = "Investigate stock movements, invoices and returns. Correct the inventory record before making further sales.";
    } else if (product.status === "Missing purchase cost") {
      priority = "High";
      recommendation = "Record and verify the purchase cost before relying on profit figures.";
    } else if (product.status === "Low margin") {
      priority = "High";
      recommendation = "Review supplier cost and selling price. Check competitor rates before changing prices.";
    } else if (product.status === "Low stock") {
      priority = "High";
      recommendation = "Review recent demand, pending orders and supplier availability before reordering.";
    } else if (product.status === "Slow-moving stock") {
      priority = "Medium";
      recommendation = "Avoid unnecessary replenishment. Review demand and possible stock clearance.";
    } else if (product.status === "No recorded sales") {
      priority = "Medium";
      recommendation = "Check whether this product is inactive or whether sales records are incomplete.";
    }

    return { name: product.name, priority, recommendation, stockValue: product.stockValue };
  }).filter(item => item.priority !== "Normal");
}
