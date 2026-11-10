import { useEffect, useState } from 'react';
import { Button, ConfirmDialog, Section } from '@/components/ui';
import { inr } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import BatchPickerModal from '../components/BatchPickerModal';
import { batchLabel, datedFieldsFromSaved, getSaleBatchesApi } from '../components/datedPricing';
import { updateSalesInvoiceApi } from './services/salesInvoiceService';

/** A saved line as the server takes it back when a draft is saved again. */
const payloadFromSaved = (item) => {
  const dated = datedFieldsFromSaved(item);
  return {
    productId: item.productId?._id || item.productId,
    productName: item.productName,
    hsnCode: item.hsnCode || '',
    sku: item.sku || '',
    qty: item.qty,
    unit: item.unit,
    rate: item.rate,
    discountPercent: item.discountPercent || 0,
    isGstApplicable: item.isGstApplicable !== false,
    taxPercent: item.taxPercent || 0,
    cessPercent: item.cessPercent || 0,
    ...(dated.batchId ? { batchId: dated.batchId } : {}),
    ...(dated.priceOverride ? { priceOverride: true, priceOverrideReason: dated.priceOverrideReason } : {}),
    ...(item.groupKey ? { groupKey: item.groupKey } : {}),
    ...(item.includedOnBill ? { includedOnBill: true } : {}),
  };
};

/** The saved draft with other lines; its overall discount stays. */
const draftPayload = (invoice, lineItems) => ({
  customerId: invoice.customerId?._id || null,
  customerSnapshot: invoice.customerSnapshot,
  invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
  dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
  placeOfSupply: invoice.placeOfSupply || '',
  invoiceType: invoice.invoiceType || 'B2C',
  reverseCharge: !!invoice.reverseCharge,
  overallDiscountType: invoice.overallDiscountType || 'before_tax',
  overallDiscountPercent: invoice.overallDiscountPercent || 0,
  overallDiscountValue: invoice.overallDiscountAmount || 0,
  roundOff: (Number(invoice.roundOff) || 0) !== 0,
  paymentMethod: invoice.paymentMethod || 'none',
  status: 'draft',
  customFields: (invoice.customFields || []).map((f) => ({ key: f.key, value: f.value })),
  lineItems,
});

const isLinkedProduct = (line) => !!line.groupKey && line.itemType !== 'service';

/**
 * Invoice page: the products billed with each service.
 * A draft can drop a product or change its batch here. A confirmed bill goes through a sales return.
 */
export default function ServiceProductsPanel({ invoice, canEdit, canReturn, onReturn, onSaved, onError }) {
  const lines = invoice.lineItems || [];
  const groups = lines
    .filter((l) => l.itemType === 'service' && l.includedOnBill && l.groupKey)
    .map((service) => ({ service, products: lines.filter((l) => isLinkedProduct(l) && l.groupKey === service.groupKey) }))
    .filter((g) => g.products.length > 0);

  const isDraft = invoice.status === 'draft';
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(null); // { line, product, batches }
  const [removing, setRemoving] = useState(null);
  const [openBatches, setOpenBatches] = useState({});

  // A draft has taken no stock yet, so its batch names come from the open batches.
  const draftProductIds = isDraft
    ? [...new Set(groups.flatMap((g) => g.products.map((p) => String(p.productId?._id || p.productId))))].sort().join(',')
    : '';
  useEffect(() => {
    if (!draftProductIds) return undefined;
    let alive = true;
    Promise.all(draftProductIds.split(',').map(getSaleBatchesApi))
      .then((lists) => {
        if (alive) setOpenBatches(Object.fromEntries(lists.flat().map((b) => [String(b._id), b])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [draftProductIds, invoice.updatedAt]);

  if (groups.length === 0) return null;

  const batchText = (line) => {
    const used = (line.batches || []).filter((b) => b.batchNo);
    if (used.length) return used.map((b) => `Batch ${b.batchNo} (${b.qty})`).join(', ');
    const open = openBatches[String(line.batchId || line.priceBatchId)];
    return open ? batchLabel(open) : 'Oldest batch';
  };

  const save = async (lineItems, message) => {
    setBusy(true);
    try {
      await updateSalesInvoiceApi(invoice._id, draftPayload(invoice, lineItems));
      onSaved(message);
    } catch (err) {
      onError(err?.response?.data?.message || 'Could not update the invoice.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = () => {
    const line = removing;
    setRemoving(null);
    save(lines.filter((l) => l !== line).map(payloadFromSaved), `${line.productName} removed from this bill.`);
  };

  const openPicker = async (line) => {
    try {
      const productId = line.productId?._id || line.productId;
      const batches = await getSaleBatchesApi(productId);
      if (batches.length === 0) onError(`${line.productName} has no open batch.`);
      else setPicker({ line, product: { _id: productId, name: line.productName }, batches });
    } catch {
      onError('Could not load the batches.');
    }
  };

  const pickBatch = (batch) => {
    const { line } = picker;
    setPicker(null);
    save(lines.map((l) => (l === line ? { ...payloadFromSaved(l), batchId: batch._id } : payloadFromSaved(l))), `Batch changed for ${line.productName}.`);
  };

  return (
    <>
      <Section
        title="Products used in services"
        description={isDraft
          ? 'Remove a product or change its batch. The bill updates straight away.'
          : 'This bill is confirmed. To take a product off it, make a sales return.'}
      >
        <div className="flex flex-col gap-3">
          {groups.map(({ service, products }) => {
            const productsTotal = products.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
            return (
              <div key={service.groupKey} className="rounded-control bg-surface ring-1 ring-line">
                <div className="flex items-center justify-between gap-3 rounded-t-control bg-brand-soft px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-bold text-ink">{service.productName}</span>
                  <span className="text-sm font-bold tabular-nums text-ink">{inr(service.total)}</span>
                </div>
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {products.map((line, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">{line.productName}</div>
                        <div className="text-xs text-ink-muted">Qty {line.qty} {line.unit} · {batchText(line)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4">
                          {isDraft && canEdit && (
                            <>
                              <Button variant="link" size="xs" onClick={() => openPicker(line)} disabled={busy} className="font-semibold">Change batch</Button>
                              <Button variant="link" size="xs" onClick={() => setRemoving(line)} disabled={busy} aria-label={`Remove ${line.productName}`} className="font-semibold !text-danger">Remove</Button>
                            </>
                          )}
                          {!isDraft && canReturn && (
                            <Button variant="link" size="xs" onClick={() => onReturn(line)} aria-label={`Return ${line.productName}`} className="font-semibold">Return product</Button>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-ink">{inr(line.total)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line px-4 py-2.5">
                  <span className="text-xs tabular-nums text-ink-muted">Service {inr(service.total)} + Products {inr(productsTotal)}</span>
                  <span className="text-sm font-semibold text-ink">
                    Total <span className="font-bold tabular-nums text-brand-ink">{inr((Number(service.total) || 0) + productsTotal)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <BatchPickerModal picker={picker} onPick={pickBatch} onClose={() => setPicker(null)} />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Remove product"
        confirmLabel="Remove"
        message={removing ? `Remove ${removing.productName} from this bill? It will not be charged, and no stock will be taken for it.` : ''}
      />
    </>
  );
}
