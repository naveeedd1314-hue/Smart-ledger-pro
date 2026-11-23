import { localDateISO } from './dateUtils';

type Row = Record<string, any>;

const MIGRATION_KEY = 'smartledger-pro-migration-v1';

function readArray(key: string): Row[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function numberFrom(row: Row, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function textFrom(row: Row, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function makeId(prefix: string, index: number): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {}
  return `${prefix}-${localDateISO()}-${index + 1}`;
}

function normalizeSales(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    const qty = numberFrom(row, ['qty', 'quantity', 'quantitySold'], 1);
    const rate = numberFrom(row, ['rate', 'sellingPrice', 'price'], 0);
    const total = numberFrom(row, ['total', 'grandTotal', 'billTotal', 'amount'], qty * rate);
    const paid = numberFrom(row, ['paid', 'received', 'amountPaid'], 0);
    const costRaw = row.purchasePrice ?? row.purchase ?? row.costPrice ?? row.buyPrice;
    const cost = costRaw === undefined || costRaw === null || costRaw === '' ? null : Number(costRaw);
    return {
      ...row,
      id: textFrom(row, ['id'], makeId('legacy-sale', index)),
      invoice: textFrom(row, ['invoice', 'invoiceNo', 'billNo', 'receiptNo'], `LEGACY-S-${String(index + 1).padStart(5, '0')}`),
      date: textFrom(row, ['date', 'createdAt'], localDateISO()).slice(0, 10),
      customer: textFrom(row, ['customer', 'customerName', 'party'], 'Walk-in Customer'),
      product: textFrom(row, ['product', 'productName', 'item', 'name'], 'Legacy item'),
      productId: row.productId ?? row.product_id,
      qty,
      rate,
      total,
      paid,
      balance: numberFrom(row, ['balance', 'due', 'outstanding'], Math.max(0, total - paid)),
      purchasePrice: cost !== null && Number.isFinite(cost) && cost > 0 ? cost : null,
    };
  });
}

function normalizePurchases(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    const qty = numberFrom(row, ['qty', 'quantity'], 1);
    const rate = numberFrom(row, ['rate', 'purchasePrice', 'costPrice', 'price'], 0);
    const total = numberFrom(row, ['total', 'grandTotal', 'billTotal', 'amount'], qty * rate);
    const paid = numberFrom(row, ['paid', 'amountPaid'], 0);
    return {
      ...row,
      id: textFrom(row, ['id'], makeId('legacy-purchase', index)),
      productId: row.productId ?? row.product_id,
      supplier: textFrom(row, ['supplier', 'supplierName', 'party'], 'Unknown supplier'),
      invoice: textFrom(row, ['invoice', 'invoiceNo', 'billNo', 'reference'], `LEGACY-P-${String(index + 1).padStart(5, '0')}`),
      date: textFrom(row, ['date', 'createdAt'], localDateISO()).slice(0, 10),
      product: textFrom(row, ['product', 'productName', 'item', 'name'], 'Legacy item'),
      qty,
      rate,
      total,
      paid,
      balance: numberFrom(row, ['balance', 'due', 'outstanding'], Math.max(0, total - paid)),
    };
  });
}

function normalizeParties(rows: Row[]): Row[] {
  return rows.map((row, index) => ({
    ...row,
    id: textFrom(row, ['id'], makeId('legacy-party', index)),
    name: textFrom(row, ['name', 'party', 'customer', 'supplier'], `Unnamed party ${index + 1}`),
    phone: textFrom(row, ['phone', 'mobile', 'contact']),
    address: textFrom(row, ['address']),
    opening: numberFrom(row, ['opening', 'openingBalance', 'opening_balance', 'balance'], 0),
    gstin: textFrom(row, ['gstin', 'GSTIN']),
  }));
}

function normalizePayments(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    const rawType = textFrom(row, ['type', 'transactionType', 'paymentType'], '');
    const typeText = rawType.toLowerCase();
    let type = rawType;
    if (typeText.includes('supplier') && typeText.includes('refund')) type = 'Supplier Refund';
    else if (typeText.includes('customer') && typeText.includes('refund')) type = 'Customer Refund';
    else if (typeText.includes('supplier') || typeText === 'payment' || typeText === 'paid') type = 'Supplier Payment';
    else if (typeText.includes('customer') || typeText.includes('receipt') || typeText === 'received') type = 'Customer Receipt';
    else if (!rawType && row.supplier) type = 'Supplier Payment';
    else if (!rawType && row.customer) type = 'Customer Receipt';
    return {
      ...row,
      id: textFrom(row, ['id'], makeId('legacy-payment', index)),
      date: textFrom(row, ['date', 'createdAt'], localDateISO()).slice(0, 10),
      type,
      party: textFrom(row, ['party', 'customer', 'supplier', 'partyName'], 'Unknown party'),
      amount: numberFrom(row, ['amount', 'total', 'value'], 0),
      method: textFrom(row, ['method', 'paymentMethod', 'mode'], 'Cash'),
      reference: textFrom(row, ['reference', 'utr', 'receiptNo', 'chequeNo', 'billNo']),
      note: textFrom(row, ['note', 'description', 'remarks']),
    };
  });
}

function normalizeExpenses(rows: Row[]): Row[] {
  return rows.map((row, index) => ({
    ...row,
    id: textFrom(row, ['id'], makeId('legacy-expense', index)),
    date: textFrom(row, ['date', 'createdAt'], localDateISO()).slice(0, 10),
    category: textFrom(row, ['category', 'type'], 'Other'),
    description: textFrom(row, ['description', 'note', 'details', 'name']),
    amount: numberFrom(row, ['amount', 'total', 'value'], 0),
  }));
}

function normalizeProducts(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    const purchase = numberFrom(row, ['purchase', 'purchasePrice', 'costPrice', 'buyPrice'], 0);
    return {
      ...row,
      id: textFrom(row, ['id'], makeId('legacy-product', index)),
      name: textFrom(row, ['name', 'product', 'productName'], `Unnamed product ${index + 1}`),
      sku: textFrom(row, ['sku', 'code', 'barcode']),
      category: textFrom(row, ['category', 'group'], 'General'),
      hsn: textFrom(row, ['hsn', 'hsnCode']),
      gstRate: numberFrom(row, ['gstRate', 'gst'], 0),
      purchase,
      averageCost: row.averageCost !== undefined && row.averageCost !== null ? Number(row.averageCost) : purchase > 0 ? purchase : null,
      selling: numberFrom(row, ['selling', 'sellingPrice', 'rate', 'retail'], 0),
      stock: numberFrom(row, ['stock', 'quantity', 'qty'], 0),
    };
  });
}

function migrateArray(targetKey: string, legacyKeys: string[], normalize: (rows: Row[]) => Row[], migrated: Record<string, number>) {
  const existing = readArray(targetKey);
  if (existing.length > 0) return;
  const sourceKey = legacyKeys.find(key => readArray(key).length > 0);
  if (!sourceKey) return;
  const source = readArray(sourceKey);
  const normalized = normalize(source);
  if (!normalized.length) return;
  localStorage.setItem(targetKey, JSON.stringify(normalized));
  migrated[targetKey] = normalized.length;
  // Keep every legacy key intact; migration is a copy, never a destructive move.
}

export function migrateLegacyData(force = false): void {
  try {
    if (!force && localStorage.getItem(MIGRATION_KEY)) return;
    const migrated: Record<string, number> = {};
    migrateArray('smartledger-pro-sales', ['smartledger-bills'], normalizeSales, migrated);
    migrateArray('smartledger-pro-purchases', ['smartledger-purchases'], normalizePurchases, migrated);
    migrateArray('smartledger-pro-payments', ['smartledger-payments'], normalizePayments, migrated);
    migrateArray('smartledger-pro-customers', ['smartledger-customers'], normalizeParties, migrated);
    migrateArray('smartledger-pro-suppliers', ['smartledger-suppliers'], normalizeParties, migrated);
    migrateArray('smartledger-pro-expenses', ['smartledger-expenses'], normalizeExpenses, migrated);
    const products = readArray('smartledger-products');
    if (products.length) {
      const normalizedProducts = normalizeProducts(products);
      localStorage.setItem('smartledger-products', JSON.stringify(normalizedProducts));
      migrated['smartledger-products'] = normalizedProducts.length;
    }
    localStorage.setItem(MIGRATION_KEY, JSON.stringify({ completedAt: new Date().toISOString(), migrated }));
  } catch (error) {
    // Do not block app startup if local storage is unavailable or malformed.
    console.warn('SmartLedger legacy data migration could not complete.', error);
  }
}
