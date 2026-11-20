import { Button, DetailList, LineItemsTable, LineRow, Modal, LINE_TD, LINE_TH } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { PAYMENT_METHOD_LABELS } from './paymentMethods';

const STATUS_LABELS = { draft: 'Draft', unpaid: 'Unpaid', partially_paid: 'Partly paid', paid: 'Paid', cancelled: 'Cancelled', void: 'Void' };
const num = (v) => Number(v) || 0;
const address = (a = {}) => [a.street, a.city, a.state, a.pincode].filter((p) => String(p || '').trim()).join(', ');

/** Batches a line was sold from; a draft has not taken stock yet. */
const batchText = (line) => {
  const used = (line.batches || []).filter((b) => b.batchNo);
  if (used.length) return `Batch ${used.map((b) => `${b.batchNo} (${b.qty})`).join(', ')}`;
  return line.batchId ? 'Picked batch' : 'Oldest batch';
};

function Block({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 border-b border-line pb-2 text-sm font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/** One table of lines; a service's products follow it, marked as used in that service. */
function LinesTable({ rows }) {
  return (
    <LineItemsTable
      minWidth={760}
      head={
        <tr>
          <th className={LINE_TH}>Item</th>
          <th className={`${LINE_TH} text-right`}>Qty</th>
          <th className={`${LINE_TH} text-right`}>Rate</th>
          <th className={`${LINE_TH} text-right`}>Disc</th>
          <th className={`${LINE_TH} text-right`}>Taxable</th>
          <th className={`${LINE_TH} text-right`}>GST</th>
          <th className={`${LINE_TH} text-right`}>Amount</th>
        </tr>
      }
    >
      {rows.map(({ line, inService, included }, i) => {
        if (included) {
          return (
            <LineRow key={i}>
              <td className={`${LINE_TD} pl-8`}>
                <div className="font-semibold text-ink">{line.productName}</div>
                <div className="text-xs text-ink-muted">Included in this service, not charged</div>
                {num(line.shortQty) > 0 && <div className="text-xs font-semibold text-warning">{line.shortQty} short in stock</div>}
              </td>
              <td className={`${LINE_TD} text-right tabular-nums`}>{line.qty} {line.unit || ''}</td>
              <td className={`${LINE_TD} text-right text-ink-subtle`} colSpan={4}>—</td>
              <td className={`${LINE_TD} text-right font-semibold text-ink-muted`}>Included</td>
            </LineRow>
          );
        }
        const isService = line.itemType === 'service';
        const meta = [
          line.hsnCode && `${isService ? 'SAC' : 'HSN'} ${line.hsnCode}`,
          line.sku && `SKU ${line.sku}`,
          !isService && batchText(line),
        ].filter(Boolean).join(' · ');
        return (
          <LineRow key={i}>
            <td className={`${LINE_TD} ${inService ? 'pl-8' : ''}`}>
              <div className="font-semibold text-ink">{line.productName}</div>
              {inService && <div className="text-xs text-ink-muted">Used in this service</div>}
              {meta && <div className="text-xs text-ink-muted">{meta}</div>}
            </td>
            <td className={`${LINE_TD} text-right tabular-nums`}>{line.qty} {line.unit || ''}</td>
            <td className={`${LINE_TD} text-right tabular-nums`}>{inr(line.rate)}</td>
            <td className={`${LINE_TD} text-right tabular-nums`}>{num(line.discountPercent) ? `${line.discountPercent}%` : '—'}</td>
            <td className={`${LINE_TD} text-right tabular-nums`}>{inr(line.taxableValue ?? num(line.total) - num(line.taxAmount))}</td>
            <td className={`${LINE_TD} text-right tabular-nums`}>
              {line.isGstApplicable === false ? 'No GST' : `${num(line.taxPercent)}%`}
              {num(line.taxAmount) > 0 && <div className="text-xs text-ink-muted">{inr(line.taxAmount)}</div>}
            </td>
            <td className={`${LINE_TD} text-right font-semibold tabular-nums`}>{inr(line.total)}</td>
          </LineRow>
        );
      })}
    </LineItemsTable>
  );
}

/**
 * Invoice page → "View Full Details": everything entered on the Create Invoice form
 * (customer, invoice details, bill details, products, services, bill summary) in one place.
 */
export default function InvoiceFullDetails({ open, onClose, invoice }) {
  if (!invoice) return null;
  const c = invoice.customerSnapshot || {};
  const lines = invoice.lineItems || [];
  const serviceKeys = new Set(lines.filter((l) => l.itemType === 'service' && l.groupKey).map((l) => l.groupKey));
  const inServiceOf = (l) => l.itemType !== 'service' && l.groupKey && serviceKeys.has(l.groupKey);
  const goods = lines.filter((l) => l.itemType !== 'service' && !inServiceOf(l)).map((line) => ({ line }));
  const services = lines
    .filter((l) => l.itemType === 'service')
    .flatMap((s) => [
      { line: s },
      ...lines.filter((l) => inServiceOf(l) && l.groupKey === s.groupKey).map((line) => ({ line, inService: true })),
      // Not charged: what was used (confirmed) or will be used (draft)
      ...(s.consumedItems?.length ? s.consumedItems : s.includedGoods || []).map((line) => ({ line, included: true })),
    ]);
  const shipping = address(c.shippingAddress);
  const fields = invoice.customFields || [];

  const summary = [
    { label: 'Subtotal', value: inr(invoice.subtotal) },
    num(invoice.discountAmount) > 0 && {
      label: num(invoice.overallDiscountPercent) > 0 ? `Discount (overall ${invoice.overallDiscountPercent}%)` : 'Discount',
      value: `- ${inr(invoice.discountAmount)}`,
      tone: 'danger',
    },
    num(invoice.taxableValue) > 0 && { label: 'Taxable value', value: inr(invoice.taxableValue) },
    num(invoice.cgstTotal) > 0 && { label: 'CGST', value: inr(invoice.cgstTotal) },
    num(invoice.sgstTotal) > 0 && { label: 'SGST', value: inr(invoice.sgstTotal) },
    num(invoice.igstTotal) > 0 && { label: 'IGST', value: inr(invoice.igstTotal) },
    num(invoice.cessTotal) > 0 && { label: 'Cess', value: inr(invoice.cessTotal) },
    { label: 'GST total', value: inr(invoice.taxAmount) },
    num(invoice.roundOff) !== 0 && { label: 'Round off', value: inr(invoice.roundOff) },
    { label: 'Invoice total', value: inr(invoice.totalAmount), tone: 'brand' },
    { label: 'Paid', value: inr(invoice.paidAmount) },
    { label: 'Balance', value: inr(invoice.balanceAmount), tone: num(invoice.balanceAmount) > 0 ? 'warning' : 'success' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Full details"
      subtitle={`Invoice ${invoice.invoiceNumber}`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-6">
        <Block title="Customer">
          <DetailList
            cols={3}
            items={[
              { label: 'Customer name', value: c.name },
              { label: 'Mobile no.', value: c.phone, mono: true },
              { label: 'Email', value: c.email },
              { label: 'GSTIN', value: c.gstin, mono: true },
              { label: 'Billing pin code', value: c.billingAddress?.pincode, mono: true },
              { label: 'City', value: c.billingAddress?.city },
              { label: 'State', value: c.billingAddress?.state },
              { label: 'Billing address (street)', value: c.billingAddress?.street, wide: true },
              shipping && { label: 'Shipping address', value: shipping, wide: true },
            ]}
          />
        </Block>

        <Block title="Invoice details">
          <DetailList
            cols={3}
            items={[
              { label: 'Invoice no.', value: invoice.invoiceNumber, mono: true },
              { label: 'Invoice date', value: invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '' },
              { label: 'Due date', value: invoice.dueDate ? formatDate(invoice.dueDate) : '' },
              { label: 'Place of supply (state)', value: [invoice.placeOfSupply, invoice.placeOfSupplyCode && `(${invoice.placeOfSupplyCode})`].filter(Boolean).join(' ') },
              { label: 'Invoice type', value: invoice.invoiceType === 'B2B' ? 'B2B (Business)' : invoice.invoiceType === 'B2C' ? 'B2C (Retail)' : invoice.invoiceType },
              { label: 'Reverse charge', value: invoice.reverseCharge ? 'Yes' : 'No' },
              { label: 'Status', value: STATUS_LABELS[invoice.status] || invoice.status },
              { label: 'Payment method', value: invoice.paymentMethod && invoice.paymentMethod !== 'none' ? PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod : '' },
              { label: 'Tax', value: invoice.isInterState ? 'IGST (other state)' : 'CGST + SGST (same state)' },
            ]}
          />
        </Block>

        {fields.length > 0 && (
          <Block title="Bill details">
            <DetailList
              cols={3}
              items={fields.map((f) => ({ key: f.key, label: f.printOnBill === false ? `${f.label} (not printed)` : f.label, value: f.value }))}
            />
          </Block>
        )}

        {goods.length > 0 && (
          <Block title={`Products (${goods.length})`}>
            <LinesTable rows={goods} />
          </Block>
        )}

        {services.length > 0 && (
          <Block title={`Services (${lines.filter((l) => l.itemType === 'service').length})`}>
            <LinesTable rows={services} />
          </Block>
        )}

        <Block title="Bill summary">
          <DetailList cols={4} items={summary} />
        </Block>

        {(invoice.notes || invoice.terms) && (
          <Block title="Notes and terms">
            <DetailList
              cols={1}
              items={[
                invoice.notes && { label: 'Notes', value: invoice.notes },
                invoice.terms && { label: 'Terms', value: invoice.terms },
              ]}
            />
          </Block>
        )}
      </div>
    </Modal>
  );
}
