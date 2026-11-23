import { jsPDF } from 'jspdf';

type Business = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  logo?: string;
  signature?: string;
};

type InvoiceRecord = {
  invoice: string;
  date: string;
  customer?: string;
  supplier?: string;
  customerGstin?: string;
  customerAddress?: string;
  supplierGstin?: string;
  supplierAddress?: string;
  hsn?: string;
  product: string;
  qty: number;
  rate: number;
  total: number;
  paid: number;
  balance: number;
  returnCredit?: number;
  taxableValue?: number;
  gstRate?: number;
  taxAmount?: number;
  cgst?: number;
  sgst?: number;
  utgst?: number;
  igst?: number;
  placeOfSupply?: string;
};

const money = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export function downloadInvoicePdf(
  record: InvoiceRecord,
  business: Business,
  type: 'sales' | 'purchase',
  theme: 'classic' | 'modern' | 'minimal' | 'bold' = 'modern',
  returnBlob = false
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 15;
  const right = pageWidth - 15;
  const palettes = { classic: { primary: [40, 55, 75] as [number, number, number], accent: [190, 150, 75] as [number, number, number] }, modern: { primary: [43, 72, 145] as [number, number, number], accent: [75, 115, 210] as [number, number, number] }, minimal: { primary: [65, 65, 65] as [number, number, number], accent: [145, 145, 145] as [number, number, number] }, bold: { primary: [20, 95, 75] as [number, number, number], accent: [25, 145, 105] as [number, number, number] } };
  const palette = palettes[theme];
  let y = 20;

  const title = type === 'sales'
    ? (Number(record.taxAmount) > 0 ? 'TAX INVOICE' : 'SALES INVOICE')
    : 'PURCHASE RECORD';

  doc.setFillColor(...palette.primary);
  if (theme !== 'minimal') doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setTextColor(...palette.primary);
  if (business.logo) { try { doc.addImage(business.logo, business.logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', left, 9, 18, 18, undefined, 'FAST'); } catch {} }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(business.name || 'SmartLedger Business', business.logo ? left + 22 : left, y);

  y += 8;
  doc.setTextColor(65, 65, 65);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  [business.address, business.phone, business.email,
   business.gstin ? `GSTIN: ${business.gstin}` : '',
   business.state ? `State: ${business.state}` : ''
  ].filter(Boolean).forEach(line => {
    doc.text(String(line), left, y);
    y += 5;
  });

  y += 7;
  doc.setTextColor(...palette.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, right, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Invoice: ${record.invoice || '-'}`, right, 29, { align: 'right' });
  doc.text(`Date: ${record.date || '-'}`, right, 36, { align: 'right' });

  y = Math.max(y, 65);
  doc.setDrawColor(170);
  doc.line(left, y, right, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.text(type === 'sales' ? 'Bill To:' : 'Supplier:', left, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  const partyLines = type === 'sales'
    ? [record.customer || 'Walk-in Customer', record.customerAddress || '',
       record.customerGstin ? `GSTIN: ${record.customerGstin}` : '']
    : [record.supplier || '-', record.supplierAddress || '',
       record.supplierGstin ? `GSTIN: ${record.supplierGstin}` : ''];

  partyLines.filter(Boolean).forEach(line => {
    const wrapped = doc.splitTextToSize(String(line), pageWidth - 30);
    doc.text(wrapped, left, y);
    y += wrapped.length * 5;
  });

  y += 8;
  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', left, y);
  doc.text('HSN/SAC', 85, y, { align: 'right' });
  doc.text('Qty', 108, y, { align: 'right' });
  doc.text('Rate', 145, y, { align: 'right' });
  doc.text('Amount', right, y, { align: 'right' });
  y += 3;
  doc.line(left, y, right, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(record.product || '-', left, y);
  doc.text(record.hsn || '-', 85, y, { align: 'right' });
  doc.text(String(record.qty || 0), 108, y, { align: 'right' });
  doc.text(money(record.rate), 145, y, { align: 'right' });
  doc.text(money(record.taxableValue ?? record.qty * record.rate), right, y, { align: 'right' });

  y += 12;
  doc.line(105, y, right, y);
  y += 8;

  const addRow = (label: string, value: number) => {
    doc.text(label, 110, y);
    doc.text(money(value), right, y, { align: 'right' });
    y += 7;
  };

  addRow('Taxable value', record.taxableValue ?? record.qty * record.rate);

  if (Number(record.taxAmount) > 0) {
    const hasBreakdown = Number(record.cgst) > 0 ||
      Number(record.sgst) > 0 || Number(record.utgst) > 0 ||
      Number(record.igst) > 0;

    if (hasBreakdown) {
      if (record.cgst) addRow('CGST', record.cgst);
      if (record.sgst) addRow('SGST', record.sgst);
      if (record.utgst) addRow('UTGST', record.utgst);
      if (record.igst) addRow('IGST', record.igst);
    } else {
      addRow(`GST (${record.gstRate || 0}%)`, record.taxAmount || 0);
    }
    addRow('Total GST', record.taxAmount || 0);
  }

  doc.setFont('helvetica', 'bold');
  addRow('Invoice total', record.total);
  doc.setFont('helvetica', 'normal');
  addRow('Amount paid', record.paid);
  if (Number(record.returnCredit) > 0) addRow('Return credit', record.returnCredit || 0);
  doc.setFont('helvetica', 'bold');
  addRow('Balance due', record.balance);

  if (record.placeOfSupply) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.text(`Place of supply: ${record.placeOfSupply}`, left, y);
  }

  y = Math.max(y + 20, 260);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    type === 'sales'
      ? 'Thank you for your business.'
      : 'Purchase entry recorded in SmartLedger.',
    left, y
  );
  doc.text('Computer-generated document', right, y, { align: 'right' });
  if (type === 'sales' && business.signature) { try { doc.addImage(business.signature, business.signature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', right - 42, y - 25, 38, 17, undefined, 'FAST'); doc.setFontSize(8); doc.text('Authorised Signatory', right, y - 5, { align: 'right' }); } catch {} }

  const safeName = String(record.invoice || 'invoice').replace(/[^a-z0-9-_]/gi, '_');
  if (returnBlob) return doc.output('blob');
  doc.save(`${type === 'sales' ? 'Sales' : 'Purchase'}-${safeName}.pdf`);
}
