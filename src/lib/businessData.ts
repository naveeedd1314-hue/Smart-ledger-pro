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
  const bills = read("smartledger-pro-sales", "smartledger-bills", "bills");
  const purchases = read("smartledger-pro-purchases", "smartledger-purchases", "purchases");
  const expenses = read("smartledger-pro-expenses", "smartledger-expenses", "expenses");

  const stock = calculateStockValue(products.map(p => ({
    stock: pick(p, ["stock", "quantity", "qty", "closingStock"]),
    purchasePrice: pick(p, ["averageCost", "purchase", "purchasePrice", "costPrice", "buyPrice"])
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
  const read = (...keys: string[]) => {
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        const value = JSON.parse(raw);
        if (Array.isArray(value)) return value;
        warnings.push(key + ": expected a list of records");
        return [];
      } catch {
        warnings.push(key + ": invalid stored data");
        return [];
      }
    }
    return [];
  };
  const products = read("smartledger-products");
  const customers = read("smartledger-pro-customers");
  const suppliers = read("smartledger-pro-suppliers");
  const sales = read("smartledger-pro-sales", "smartledger-pro-bills", "smartledger-bills");
  const purchases = read("smartledger-pro-purchases", "smartledger-purchases");
  const expenses = read("smartledger-pro-expenses", "smartledger-expenses");
  const payments = read("smartledger-pro-payments");
  const returns = read("smartledger-pro-returns");
  const priceHistory = read("smartledger-pro-price-history");
  const marketQuotes = read("smartledger-market-quotes");
  const stockAdjustments = read("smartledger-pro-stock-adjustments");
  const salesIds = new Set(sales.map((item: any) => String(item.id)));
  const purchaseIds = new Set(purchases.map((item: any) => String(item.id)));

  const duplicateIds = (rows: any[]) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    rows.forEach(item => { const id = String(item?.id ?? ""); if (id && seen.has(id)) duplicates.add(id); else if (id) seen.add(id); });
    return duplicates.size;
  };
  [["Products", products], ["Customers", customers], ["Suppliers", suppliers], ["Sales", sales], ["Purchases", purchases], ["Payments", payments], ["Returns", returns], ["Price history", priceHistory], ["Stock adjustments", stockAdjustments]].forEach(([label, rows]) => {
    const count = duplicateIds(rows as any[]);
    if (count) warnings.push(String(label) + ": " + count + " duplicate record ID(s) found.");
  });
  const duplicateValues = (rows: any[], valueOf: (item: any) => string) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    rows.forEach(item => { const value = valueOf(item).trim().toLowerCase(); if (value && seen.has(value)) duplicates.add(value); else if (value) seen.add(value); });
    return duplicates.size;
  };
  const duplicateSkus = duplicateValues(products, item => String(item.sku || item.barcode || ""));
  const duplicateCustomerNames = duplicateValues(customers, item => String(item.name || ""));
  const duplicateSupplierNames = duplicateValues(suppliers, item => String(item.name || ""));
  const duplicateSalesInvoices = duplicateValues(sales, item => String(item.invoice || item.invoiceNo || ""));
  const duplicatePurchaseInvoices = duplicateValues(purchases, item => item.invoice ? String(item.supplier || "") + "|" + String(item.invoice) : "");
  if (duplicateSkus) warnings.push("Products: " + duplicateSkus + " duplicate SKU/barcode value(s) found.");
  if (duplicateCustomerNames) warnings.push("Customers: " + duplicateCustomerNames + " duplicate names may merge ledger balances.");
  if (duplicateSupplierNames) warnings.push("Suppliers: " + duplicateSupplierNames + " duplicate names may merge ledger balances.");
  if (duplicateSalesInvoices) warnings.push("Sales: " + duplicateSalesInvoices + " duplicate invoice number(s) found.");
  if (duplicatePurchaseInvoices) warnings.push("Purchases: " + duplicatePurchaseInvoices + " duplicate supplier invoice number(s) found.");

  if (!products.length) warnings.push("No product records found.");
  if (!sales.length) warnings.push("No sales records found.");
  if (!purchases.length) warnings.push("No purchase records found.");
  if (!expenses.length) warnings.push("No expense records found.");

  const validAmount = (value: unknown) => Number.isFinite(Number(value)) && Number(value) >= 0;
  customers.forEach((item: any, i: number) => { if (!item.name || !Number.isFinite(Number(item.opening ?? 0))) warnings.push("Customer " + (i + 1) + ": name or opening balance is invalid."); });
  suppliers.forEach((item: any, i: number) => { if (!item.name || !Number.isFinite(Number(item.opening ?? 0))) warnings.push("Supplier " + (i + 1) + ": name or opening balance is invalid."); });
  products.forEach((p: any, i: number) => {
    const stock = Number(p.stock ?? p.quantity ?? p.qty);
    if (!Number.isFinite(stock)) warnings.push("Product " + (i + 1) + ": stock value missing or invalid.");
    else if (stock < 0) warnings.push("Product " + (i + 1) + ": negative stock.");
    const cost = p.averageCost ?? p.purchase ?? p.purchasePrice ?? p.costPrice;
    if (cost !== undefined && cost !== null && !validAmount(cost)) warnings.push("Product " + (i + 1) + ": purchase cost is invalid.");
    if (Number.isFinite(stock) && stock > 0 && (cost === undefined || cost === null || Number(cost) <= 0)) warnings.push("Product " + (i + 1) + ": stocked inventory has no usable purchase cost.");
    const selling = p.selling ?? p.sellingPrice ?? p.salePrice;
    if (selling !== undefined && selling !== null && (!validAmount(selling) || Number(selling) <= 0)) warnings.push("Product " + (i + 1) + ": selling price is invalid.");
    const gstRate = p.gstRate ?? p.gst;
    if (gstRate !== undefined && gstRate !== null && (!validAmount(gstRate) || Number(gstRate) > 100)) warnings.push("Product " + (i + 1) + ": GST rate is invalid.");
  });
  sales.forEach((sale: any, i: number) => {
    const total = Number(sale.total ?? sale.grandTotal ?? sale.amount);
    const qty = Number(sale.qty ?? sale.quantity);
    const paid = Number(sale.paid ?? 0);
    if (!Number.isFinite(total) || total < 0) warnings.push("Sale " + (i + 1) + ": total missing or invalid.");
    const rate = Number(sale.rate ?? sale.sellingPrice);
    if (!Number.isFinite(qty) || qty <= 0) warnings.push("Sale " + (i + 1) + ": quantity missing or invalid.");
    if (!Number.isFinite(rate) || rate < 0) warnings.push("Sale " + (i + 1) + ": selling rate is missing or invalid.");
    if (!Number.isFinite(paid) || paid < 0 || (Number.isFinite(total) && paid > total + 0.01)) warnings.push("Sale " + (i + 1) + ": payment exceeds invoice total or is invalid.");
  });
  purchases.forEach((purchase: any, i: number) => {
    const total = Number(purchase.total ?? purchase.grandTotal ?? purchase.amount);
    const qty = Number(purchase.qty ?? purchase.quantity);
    const paid = Number(purchase.paid ?? 0);
    if (!Number.isFinite(total) || total < 0) warnings.push("Purchase " + (i + 1) + ": total missing or invalid.");
    const rate = Number(purchase.rate ?? purchase.purchasePrice);
    if (!Number.isFinite(qty) || qty <= 0) warnings.push("Purchase " + (i + 1) + ": quantity missing or invalid.");
    if (!Number.isFinite(rate) || rate <= 0) warnings.push("Purchase " + (i + 1) + ": purchase rate is missing or invalid.");
    if (!Number.isFinite(paid) || paid < 0 || (Number.isFinite(total) && paid > total + 0.01)) warnings.push("Purchase " + (i + 1) + ": payment exceeds invoice total or is invalid.");
  });
  expenses.forEach((expense: any, i: number) => {
    const amount = Number(expense.amount ?? expense.total);
    if (!Number.isFinite(amount) || amount <= 0) warnings.push("Expense " + (i + 1) + ": amount missing or invalid.");
  });
  payments.forEach((payment: any, i: number) => {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) warnings.push("Payment " + (i + 1) + ": amount missing or invalid.");
    if (!["Customer Receipt", "Supplier Payment"].includes(String(payment.type))) warnings.push("Payment " + (i + 1) + ": transaction type is invalid.");
    if (Array.isArray(payment.allocations)) {
      const allocated = payment.allocations.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
      if (payment.allocations.some((item: any) => !item.invoiceId || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0)) warnings.push("Payment " + (i + 1) + ": an invoice allocation is missing its invoice link or has an invalid amount.");
      if (allocated > amount + 0.01) warnings.push("Payment " + (i + 1) + ": allocated amount exceeds the payment total.");
      const invoiceIds = payment.type === "Customer Receipt" ? salesIds : purchaseIds;
      payment.allocations.forEach((item: any) => {
        if (item.invoiceId && !invoiceIds.has(String(item.invoiceId))) warnings.push("Payment " + (i + 1) + ": allocation points to an invoice that cannot be found.");
        const target = payment.type === "Customer Receipt" ? sales.find((invoice: any) => String(invoice.id) === String(item.invoiceId)) : purchases.find((invoice: any) => String(invoice.id) === String(item.invoiceId));
        const targetParty = payment.type === "Customer Receipt" ? target?.customer : target?.supplier;
        if (targetParty && String(targetParty).trim().toLowerCase() !== String(payment.party || "").trim().toLowerCase()) warnings.push("Payment " + (i + 1) + ": allocated invoice belongs to a different party.");
        if (target && Number.isFinite(Number(target.total))) {
          const totalAllocated = payments.filter((record: any) => record.type === payment.type).reduce((sum: number, record: any) => sum + (Array.isArray(record.allocations) ? record.allocations.filter((allocation: any) => String(allocation.invoiceId) === String(item.invoiceId)).reduce((part: number, allocation: any) => part + (Number(allocation.amount) || 0), 0) : 0), 0);
          if (totalAllocated > Math.max(0, Number(target.total) - (Number(target.paid) || 0)) + 0.01) warnings.push("Invoice " + (target.invoice || target.id) + ": allocated payments exceed the invoice balance.");
        }
      });
    }
  });
  stockAdjustments.forEach((item: any, i: number) => {
    if (!Number.isFinite(Number(item.change)) || Number(item.change) === 0) warnings.push("Stock movement " + (i + 1) + ": quantity change is missing or invalid.");
    if (item.stockAfter !== undefined && !Number.isFinite(Number(item.stockAfter))) warnings.push("Stock movement " + (i + 1) + ": resulting stock is invalid.");
    if (!item.date || !item.product) warnings.push("Stock movement " + (i + 1) + ": date or product name is missing.");
    if (item.productId && !products.some((product: any) => String(product.id) === String(item.productId))) warnings.push("Stock movement " + (i + 1) + ": product link cannot be found.");
  });
  priceHistory.forEach((item: any, i: number) => {
    if (!["purchase", "selling"].includes(String(item.field))) warnings.push("Price history " + (i + 1) + ": price type is invalid.");
    if (!validAmount(item.oldPrice) || !validAmount(item.newPrice)) warnings.push("Price history " + (i + 1) + ": old or new price is invalid.");
    if (!item.date || !item.productId) warnings.push("Price history " + (i + 1) + ": product link or date is missing.");
  });
  marketQuotes.forEach((item: any, i: number) => {
    if (!Number.isFinite(Number(item.marketRate)) || Number(item.marketRate) <= 0) warnings.push("Market quotation " + (i + 1) + ": rate is invalid.");
    if (!item.checkedAt || !item.source) warnings.push("Market quotation " + (i + 1) + ": checked date or source is missing.");
  });
  returns.forEach((item: any, i: number) => {
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) warnings.push("Return " + (i + 1) + ": quantity missing or invalid.");
    if (!item.originalId) warnings.push("Return " + (i + 1) + ": original invoice link is missing.");
  });
  return { valid: warnings.length === 0, warnings, checked: {
    products: products.length, customers: customers.length, suppliers: suppliers.length, sales: sales.length,
    purchases: purchases.length, expenses: expenses.length,
    payments: payments.length, returns: returns.length,
    priceHistory: priceHistory.length, marketQuotes: marketQuotes.length,
    stockMovements: stockAdjustments.length
  }};
}
