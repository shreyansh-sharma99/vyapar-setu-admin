import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2, PackageCheck, Plus, Save, Trash2, X } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '../components/PurchaseToaster';
import AsyncSelect from '../components/AsyncSelect';
import SupplierPicker from '../components/SupplierPicker';
import { Field, FormError, NativeSelect, PageLoading, PageShell, Section, StatusBadge, TextArea } from '../components/ui';
import useApi from '../components/useApi';
import useStores from '../components/useStores';
import useSupplierInfo from '../components/useSupplierInfo';
import { productOptionsLoader } from '../components/lookupService';
import { notify, notifyError } from '../components/toast';
import { decId, errMsg, fmtDate, formatINR, formatQty, newKey, num, refId, round2, supplierName, toInputDate, todayISO, unitsOf, viewPath } from '../components/helpers';
import { getPurchaseOrderByIdApi, getPurchaseOrdersApi } from '../purchaseOrders/services/purchaseOrderService';
import { createGoodsReceipt, fetchGoodsReceipt, postGoodsReceipt, updateGoodsReceipt } from './services/goodsReceiptSlice';

const round4 = (n) => Math.round(num(n) * 10000) / 10000;

const emptyGrnLine = () => ({
  key: newKey(),
  productId: '',
  productName: '',
  sku: '',
  poItemId: null,
  unit: '',
  units: [],
  orderedQty: 0,
  pendingQty: null,
  receivedQty: '',
  rejectedQty: 0,
  rejectReason: '',
  unitCost: 0,
});

const linesFromPo = (po) =>
  (po.items || [])
    .filter((i) => num(i.pendingQty) > 0)
    .map((i) => {
      const p = typeof i.productId === 'object' ? i.productId : null;
      return {
        ...emptyGrnLine(),
        productId: refId(i.productId),
        productName: i.productName,
        sku: i.sku || p?.sku || '',
        poItemId: i._id,
        unit: i.unit,
        units: [{ unit: i.unit, factor: num(i.unitFactor) || 1 }],
        orderedQty: num(i.qty),
        pendingQty: num(i.pendingQty),
        receivedQty: num(i.pendingQty),
        unitCost: round4(num(i.rate) * (1 - num(i.discountPercent) / 100)),
      };
    });

const linesFromGrn = (grn) =>
  (grn.items || []).map((i) => {
    const p = typeof i.productId === 'object' ? i.productId : null;
    return {
      ...emptyGrnLine(),
      productId: refId(i.productId),
      productName: i.productName,
      sku: i.sku || p?.sku || '',
      poItemId: i.poItemId || null,
      unit: i.unit,
      units: [{ unit: i.unit, factor: num(i.unitFactor) || 1 }],
      orderedQty: num(i.orderedQty),
      receivedQty: num(i.receivedQty),
      rejectedQty: num(i.rejectedQty),
      rejectReason: i.rejectReason || '',
      unitCost: num(i.unitCost),
    };
  });

const accepted = (l) => Math.max(0, num(l.receivedQty) - num(l.rejectedQty));

const lineProblem = (l) => {
  if (!l.productId || num(l.receivedQty) <= 0) return '';
  if (num(l.rejectedQty) < 0 || num(l.rejectedQty) > num(l.receivedQty)) return `"${l.productName}": rejected quantity can't be more than received.`;
  if (num(l.rejectedQty) > 0 && !String(l.rejectReason).trim()) return `"${l.productName}": enter a reason for the rejected quantity.`;
  if (num(l.unitCost) < 0) return `"${l.productName}": unit cost can't be negative.`;
  return '';
};

const cellInput =
  'h-9 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60';
const th = 'py-2.5 px-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] border-b border-[var(--vs-border)] whitespace-nowrap';
const td = 'py-2 px-2 align-top border-b border-[var(--vs-border)]';

function GoodsReceiptForm({ doc, po, onPickPo }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.goodsReceipt.saving);
  const { options: storeOptions, defaultId: defaultStoreId, loading: storesLoading } = useStores();
  const isEdit = !!doc;
  const fromPo = !!po || !!doc?.purchaseOrderId;

  const [supplier, setSupplier] = useState(() => {
    if (doc) return { value: refId(doc.supplierId), label: supplierName(doc) };
    if (po) return { value: refId(po.supplierId), label: supplierName(po) };
    return null;
  });
  const [storeId, setStoreId] = useState(() => (doc ? refId(doc.storeId) : po ? refId(po.storeId) : ''));
  const [grnDate, setGrnDate] = useState(() => (doc ? toInputDate(doc.grnDate) : todayISO()));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(() => doc?.supplierInvoiceNo || '');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(() => toInputDate(doc?.supplierInvoiceDate));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [lines, setLines] = useState(() => (doc ? linesFromGrn(doc) : po ? linesFromPo(po) : [emptyGrnLine()]));
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const effectiveStoreId = storeId || defaultStoreId;
  const loader = productOptionsLoader(effectiveStoreId);

  // Open POs of the chosen supplier (direct mode only) so the user can switch to "receive against PO".
  const { data: openPos } = useApi(!fromPo && !isEdit && supplier?.value ? `openpos:${supplier.value}` : null, () =>
    getPurchaseOrdersApi({ supplierId: supplier.value, status: 'sent,partially_received', limit: 50, page: 1, sort: 'poDate', order: 'desc' })
  );
  const openPoOptions = (openPos?.data || []).map((p) => ({ value: p._id, label: `${p.poNumber} · ${fmtDate(p.poDate)} · ${formatINR(p.totalAmount)}` }));

  const update = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (line, opt) => {
    if (!opt) {
      update(line.key, { ...emptyGrnLine(), key: line.key });
      return;
    }
    const p = opt.data;
    const units = unitsOf(p);
    update(line.key, {
      productId: p._id,
      productName: p.name,
      sku: p.sku || '',
      unit: units[0]?.unit || 'pcs',
      units,
      unitCost: round2(num(p.lastPurchasePrice) || num(p.costPrice)),
      receivedQty: line.receivedQty === '' ? 1 : line.receivedQty,
    });
  };

  const changeUnit = (line, unit) => {
    const from = line.units.find((u) => u.unit === line.unit)?.factor || 1;
    const to = line.units.find((u) => u.unit === unit)?.factor || 1;
    update(line.key, { unit, unitCost: round4((num(line.unitCost) / from) * to) });
  };

  const totalValue = lines.reduce((s, l) => s + accepted(l) * num(l.unitCost), 0);
  const totalAccepted = lines.reduce((s, l) => s + accepted(l), 0);

  const save = async (post) => {
    setSubmitted(true);
    const used = lines.filter((l) => l.productId && num(l.receivedQty) > 0);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (!effectiveStoreId) problem = 'Select the store receiving the goods.';
    else if (!used.length) problem = 'Enter the received quantity for at least one item.';
    else problem = used.map(lineProblem).find(Boolean) || '';
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }

    const payload = {
      storeId: effectiveStoreId,
      grnDate,
      supplierInvoiceNo,
      supplierInvoiceDate: supplierInvoiceDate || null,
      notes,
      items: used.map((l) => ({
        productId: l.productId,
        poItemId: l.poItemId || null,
        unit: l.unit || undefined,
        receivedQty: num(l.receivedQty),
        rejectedQty: num(l.rejectedQty),
        acceptedQty: accepted(l),
        rejectReason: l.rejectReason || '',
        unitCost: num(l.unitCost),
      })),
    };
    // The API needs either the PO or the supplier (also on edit).
    if (po) payload.purchaseOrderId = po._id;
    else if (doc?.purchaseOrderId) payload.purchaseOrderId = refId(doc.purchaseOrderId);
    else payload.supplierId = supplier.value;

    try {
      let saved;
      if (isEdit) {
        const res = await dispatch(updateGoodsReceipt({ id: doc._id, payload })).unwrap();
        saved = res?.data;
        if (post) {
          const posted = await dispatch(postGoodsReceipt(doc._id)).unwrap();
          notify(posted?.message || 'Goods added to stock');
        } else {
          notify(res?.message || 'Goods receipt updated');
        }
      } else {
        const res = await dispatch(createGoodsReceipt({ ...payload, post })).unwrap();
        saved = res?.data;
        notify(res?.message || (post ? 'Goods received and added to stock' : 'Goods receipt saved as draft'));
      }
      navigate(viewPath('receipts', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const title = isEdit ? `Edit goods receipt - ${doc.grnNumber}` : po ? `Receive goods - ${po.poNumber}` : 'Receive goods';

  return (
    <PageShell title={title}>
      {isEdit && (
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} size="lg" />
          {doc.poNumber && <span className="text-sm text-[var(--vs-text-secondary)]">Against PO {doc.poNumber}</span>}
        </div>
      )}
      {po && !isEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
          <span>
            Receiving against purchase order <strong className="font-mono">{po.poNumber}</strong> ({fmtDate(po.poDate)}). Pending quantities are filled in; change them to what actually arrived.
          </span>
          {onPickPo && (
            <Button size="xs" variant="outline" onClick={() => onPickPo(null)} startIcon={<X className="w-3.5 h-3.5" />}>
              Receive without PO
            </Button>
          )}
        </div>
      )}
      <FormError message={formError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Receipt details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Supplier" required className="md:col-span-2">
            <SupplierPicker
              value={supplier}
              onChange={(opt) => {
                setSupplier(opt ? { value: opt.value, label: opt.label } : null);
              }}
              info={supplierInfo}
              infoLoading={supplierLoading}
              disabled={fromPo || isEdit}
              error={submitted && !supplier?.value}
            />
          </Field>
          {!fromPo && !isEdit && openPoOptions.length > 0 && (
            <Field label="Receive against an open purchase order?" className="md:col-span-2" hint="Picking an order fills in its pending items.">
              <NativeSelect value="" onChange={(v) => v && onPickPo?.(v)} options={[{ value: '', label: `${openPoOptions.length} open order(s) - select one` }, ...openPoOptions]} />
            </Field>
          )}
          <Field label="Receive into store" required>
            <NativeSelect
              value={effectiveStoreId}
              onChange={setStoreId}
              error={submitted && !effectiveStoreId}
              options={[{ value: '', label: storesLoading ? 'Loading stores...' : 'Select store' }, ...storeOptions]}
            />
          </Field>
          <Field label="Receipt date" required>
            <Input type="date" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} />
          </Field>
          <Field label="Supplier invoice / challan no">
            <Input value={supplierInvoiceNo} maxLength={50} onChange={(e) => setSupplierInvoiceNo(e.target.value)} placeholder="As printed on the supplier's document" />
          </Field>
          <Field label="Supplier invoice date">
            <Input type="date" value={supplierInvoiceDate} onChange={(e) => setSupplierInvoiceDate(e.target.value)} />
          </Field>
        </Section>

        <Section title="Summary" bodyClassName="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Lines received</span>
              <span>{lines.filter((l) => l.productId && num(l.receivedQty) > 0).length}</span>
            </div>
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Accepted quantity</span>
              <span>{formatQty(totalAccepted)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--vs-border)] pt-3 text-base font-bold">
              <span>Stock value</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(totalValue)}</span>
            </div>
            <p className="text-[11px] text-[var(--vs-text-secondary)]">Value = accepted qty x unit cost (excluding GST you can claim). The bill is recorded separately.</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--vs-border)] pt-4">
            <Button onClick={() => save(true)} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}>
              Receive &amp; add to stock
            </Button>
            <Button variant="outline" onClick={() => save(false)} disabled={saving} className="w-full" startIcon={<Save className="w-4 h-4" />}>
              Save draft
            </Button>
          </div>
        </Section>
      </div>

      <Section title="Items received" bodyClassName="p-3 sm:p-4 flex flex-col gap-3">
        <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="bg-[var(--vs-bg-secondary)]">
              <tr>
                <th className={`${th} min-w-[220px]`}>Product</th>
                <th className={`${th} w-24`}>Unit</th>
                {fromPo && <th className={`${th} w-24 text-right`}>Ordered / pending</th>}
                <th className={`${th} w-24`}>Received</th>
                <th className={`${th} w-24`}>Rejected</th>
                <th className={`${th} w-40`}>Reject reason</th>
                <th className={`${th} w-20 text-right`}>Accepted</th>
                <th className={`${th} w-28`}>Unit cost (₹)</th>
                <th className={`${th} w-28 text-right`}>Value</th>
                {!fromPo && <th className={`${th} w-10`} />}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[var(--vs-text-secondary)]">
                    Nothing is pending on this purchase order.
                  </td>
                </tr>
              )}
              {lines.map((l) => {
                const bad = submitted && !!lineProblem(l);
                const over = l.pendingQty !== null && num(l.receivedQty) > num(l.pendingQty);
                return (
                  <tr key={l.key} className={bad ? 'bg-rose-50/60 dark:bg-rose-500/5' : ''}>
                    <td className={td}>
                      {fromPo ? (
                        <div className="pt-1.5 font-medium">{l.productName}</div>
                      ) : (
                        <AsyncSelect size="sm" value={l.productId ? { value: l.productId, label: l.productName } : null} onChange={(opt) => pickProduct(l, opt)} loadOptions={loader} placeholder="Search product" />
                      )}
                      <div className="mt-1 text-[11px] text-[var(--vs-text-secondary)] flex gap-2">
                        {l.sku && <span>SKU {l.sku}</span>}
                      </div>
                    </td>
                    <td className={td}>
                      {l.units.length > 1 && !fromPo ? (
                        <select value={l.unit} onChange={(e) => changeUnit(l, e.target.value)} className={`${cellInput} cursor-pointer`}>
                          {l.units.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.unit}
                              {u.factor !== 1 ? ` (${u.factor})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="pt-2">{l.unit || '—'}</div>
                      )}
                    </td>
                    {fromPo && (
                      <td className={`${td} pt-3 text-right text-xs whitespace-nowrap`}>
                        {formatQty(l.orderedQty)} / <span className="font-semibold text-amber-600 dark:text-amber-400">{l.pendingQty !== null ? formatQty(l.pendingQty) : '—'}</span>
                      </td>
                    )}
                    <td className={td}>
                      <input type="number" min="0" step="any" value={l.receivedQty} onChange={(e) => update(l.key, { receivedQty: e.target.value })} className={cellInput} />
                      {over && <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">More than pending</div>}
                    </td>
                    <td className={td}>
                      <input type="number" min="0" step="any" value={l.rejectedQty} onChange={(e) => update(l.key, { rejectedQty: e.target.value })} className={cellInput} />
                    </td>
                    <td className={td}>
                      <input
                        type="text"
                        value={l.rejectReason}
                        disabled={num(l.rejectedQty) <= 0}
                        placeholder={num(l.rejectedQty) > 0 ? 'Damaged, wrong item...' : '—'}
                        onChange={(e) => update(l.key, { rejectReason: e.target.value })}
                        className={`${cellInput} disabled:opacity-50`}
                      />
                    </td>
                    <td className={`${td} pt-3 text-right font-semibold`}>{formatQty(accepted(l))}</td>
                    <td className={td}>
                      <input type="number" min="0" step="0.01" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} className={cellInput} />
                    </td>
                    <td className={`${td} pt-3 text-right font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap`}>{formatINR(accepted(l) * num(l.unitCost))}</td>
                    {!fromPo && (
                      <td className={`${td} pt-2.5`}>
                        <button
                          type="button"
                          title="Remove line"
                          onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : [emptyGrnLine()]))}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!fromPo && (
          <div>
            <Button size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, emptyGrnLine()])} startIcon={<Plus className="w-3.5 h-3.5" />}>
              Add item
            </Button>
          </div>
        )}
        <p className="text-[11px] text-[var(--vs-text-secondary)]">
          Accepted = received - rejected. Only the accepted quantity goes into stock. Lines with 0 received are skipped.
        </p>
      </Section>

      <Section title="Notes">
        <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Vehicle number, delivered by, condition of goods..." />
      </Section>
      <PurchaseToaster />
    </PageShell>
  );
}

/** Loads the purchase order (if any) and renders the form for it. */
function NewReceipt({ initialPoId }) {
  const [poId, setPoId] = useState(initialPoId);
  const { data: poRes, error } = useApi(poId ? `po:${poId}` : null, () => getPurchaseOrderByIdApi(poId));
  const po = poRes?.data || null;

  if (poId && !po) return <PageLoading title="Receive goods" error={error} />;
  if (po && ['cancelled', 'closed', 'received', 'draft'].includes(po.status)) {
    return (
      <PageLoading
        title="Receive goods"
        error={po.status === 'draft' ? `Purchase order ${po.poNumber} is still a draft. Mark it as sent before receiving goods.` : `Purchase order ${po.poNumber} is ${po.status}; nothing more can be received against it.`}
      />
    );
  }
  return <GoodsReceiptForm key={po ? `po:${po._id}` : 'direct'} doc={null} po={po} onPickPo={setPoId} />;
}

/**
 * purchase/receipts/create   (optional location.state.purchaseOrderId)
 * purchase/receipts/edit/:id
 */
export default function CreateGoodsReceipt() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const location = useLocation();
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.goodsReceipt);
  const [initialPoId] = useState(() => location.state?.purchaseOrderId || null);

  useEffect(() => {
    if (id) dispatch(fetchGoodsReceipt(id));
  }, [dispatch, id]);

  if (!encryptedId) return <NewReceipt initialPoId={initialPoId} />;
  if (!id) return <PageLoading title="Edit goods receipt" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit goods receipt" error={currentError} />;
  if (current.status !== 'draft') return <PageLoading title={`Goods receipt ${current.grnNumber}`} error="Only draft goods receipts can be edited." />;
  return <GoodsReceiptForm key={current._id} doc={current} po={null} onPickPo={null} />;
}
