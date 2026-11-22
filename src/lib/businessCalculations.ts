export type PriceChange = {
  oldPrice: number;
  newPrice: number;
  difference: number;
  percentage: number | null;
  direction: "increase" | "decrease" | "unchanged";
};

export type MarginResult = {
  profit: number;
  marginPercent: number | null;
  markupPercent: number | null;
};

export type SalesLine = {
  quantity: number;
  sellingPrice: number;
  purchasePrice?: number | null;
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculatePriceChange(oldValue: unknown, newValue: unknown): PriceChange | null {
  const oldPrice = toNumber(oldValue);
  const newPrice = toNumber(newValue);
  if (oldPrice === null || newPrice === null || oldPrice < 0 || newPrice < 0) return null;
  const difference = round(newPrice - oldPrice);
  return {
    oldPrice,
    newPrice,
    difference,
    percentage: oldPrice === 0 ? null : round((difference / oldPrice) * 100),
    direction: difference > 0 ? "increase" : difference < 0 ? "decrease" : "unchanged"
  };
}

export function calculateMargin(sellingValue: unknown, costValue: unknown): MarginResult | null {
  const selling = toNumber(sellingValue);
  const cost = toNumber(costValue);
  if (selling === null || cost === null || selling < 0 || cost < 0) return null;
  const profit = round(selling - cost);
  return {
    profit,
    marginPercent: selling === 0 ? null : round((profit / selling) * 100),
    markupPercent: cost === 0 ? null : round((profit / cost) * 100)
  };
}

export function calculateWeightedCost(items: Array<{ quantity: unknown; purchasePrice: unknown }>) {
  let quantity = 0;
  let totalCost = 0;
  for (const item of items) {
    const q = toNumber(item.quantity);
    const p = toNumber(item.purchasePrice);
    if (q === null || p === null || q <= 0 || p < 0) continue;
    quantity += q;
    totalCost += q * p;
  }
  return {
    quantity: round(quantity),
    totalCost: round(totalCost),
    averageCost: quantity > 0 ? round(totalCost / quantity) : null
  };
}

export function calculateSalesProfit(lines: SalesLine[]) {
  let revenue = 0;
  let knownCost = 0;
  let costedQuantity = 0;
  let missingCostLines = 0;

  for (const line of lines) {
    const quantity = toNumber(line.quantity);
    const selling = toNumber(line.sellingPrice);
    const cost = toNumber(line.purchasePrice);
    if (quantity === null || selling === null || quantity <= 0 || selling < 0) continue;
    revenue += quantity * selling;
    if (cost === null || cost < 0) {
      missingCostLines++;
      continue;
    }
    knownCost += quantity * cost;
    costedQuantity += quantity;
  }

  return {
    revenue: round(revenue),
    knownCost: round(knownCost),
    knownGrossProfit: round(revenue - knownCost),
    costedQuantity: round(costedQuantity),
    missingCostLines,
    complete: missingCostLines === 0
  };
}

export function calculateStockValue(items: Array<{ stock: unknown; purchasePrice: unknown }>) {
  let value = 0;
  let valuedItems = 0;
  let missingCostItems = 0;

  for (const item of items) {
    const stock = toNumber(item.stock);
    const cost = toNumber(item.purchasePrice);
    if (stock === null || stock <= 0) continue;
    if (cost === null || cost < 0) {
      missingCostItems++;
      continue;
    }
    value += stock * cost;
    valuedItems++;
  }

  return {
    stockValue: round(value),
    valuedItems,
    missingCostItems,
    complete: missingCostItems === 0
  };
}

export function calculateBreakEven(monthlyExpenses: unknown, contributionPerUnit: unknown) {
  const expenses = toNumber(monthlyExpenses);
  const contribution = toNumber(contributionPerUnit);
  if (expenses === null || contribution === null || expenses < 0 || contribution <= 0) return null;
  return Math.ceil(expenses / contribution);
}
