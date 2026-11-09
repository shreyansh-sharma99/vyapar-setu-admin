import { docFromInvoice, amountInWords, inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { formatDate } from '@/utility/dateTiming';
import { PAYMENT_METHOD_LABELS } from './paymentMethods';

/** Width the receipt is drawn at (A5-ish, fits on an A4 page). */
export const RECEIPT_PX = 560;

const row = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '6px 0', borderBottom: '1px solid #e5e7eb' };
const label = { color: '#6b7280' };
const value = { fontWeight: 600, textAlign: 'right' };

/**
 * A payment receipt for one sales-invoice payment.
 * `invoice` = GET /sales-invoices/:id (with `print`), `receipt` = one entry of its `paymentHistory`.
 */
export function ReceiptDocument({ invoice, receipt }) {
  const { seller } = docFromInvoice(invoice);
  const customer = invoice.customerSnapshot || {};
  const customerName = customer.name || [invoice.customerId?.firstName, invoice.customerId?.lastName].filter(Boolean).join(' ') || 'Walk-in customer';
  return (
    <div style={{ width: RECEIPT_PX, padding: 28, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, color: '#111827', background: '#fff' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{seller.name || 'Payment Receipt'}</div>
        {seller.address && <div style={{ color: '#4b5563', marginTop: 2 }}>{seller.address}</div>}
        {seller.gstin && <div style={{ color: '#4b5563', marginTop: 2 }}>GSTIN: {seller.gstin}</div>}
        {seller.phone && <div style={{ color: '#4b5563', marginTop: 2 }}>Phone: {seller.phone}</div>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>PAYMENT RECEIPT</div>
      <div style={row}><span style={label}>Receipt No</span><span style={value}>{receipt.receiptNumber}</span></div>
      <div style={row}><span style={label}>Date</span><span style={value}>{formatDate(receipt.paymentDate)}</span></div>
      <div style={row}><span style={label}>Received from</span><span style={value}>{customerName}{customer.phone ? ` (${customer.phone})` : ''}</span></div>
      <div style={row}><span style={label}>Against invoice</span><span style={value}>{invoice.invoiceNumber}</span></div>
      <div style={row}><span style={label}>Payment mode</span><span style={value}>{PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}</span></div>
      {receipt.reference && <div style={row}><span style={label}>Reference</span><span style={value}>{receipt.reference}</span></div>}
      <div style={{ ...row, borderBottom: 'none', paddingTop: 12, fontSize: 16 }}>
        <span style={{ fontWeight: 700 }}>Amount received</span>
        <span style={{ fontWeight: 700 }}>{inr(receipt.amount)}</span>
      </div>
      <div style={{ color: '#374151', fontStyle: 'italic', marginTop: 2 }}>{amountInWords(receipt.amount, invoice.currency || 'INR')}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 48 }}>
        <div style={{ textAlign: 'center', borderTop: '1px solid #9ca3af', paddingTop: 4, minWidth: 180, color: '#4b5563' }}>Authorised Signatory</div>
      </div>
    </div>
  );
}

