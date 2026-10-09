import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  Save,
  Truck,
  PackageCheck,
  AlertTriangle,
  Package,
  Loader2,
  Warehouse,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Loader from '@/components/loader/Loader';
import {
  getStoresLookupApi,
  getStockTransferByIdApi,
  createStockTransferApi,
  updateStockTransferApi,
  dispatchStockTransferApi,
  receiveStockTransferApi,
  getProductByIdApi,
} from './services/stockTransferService';
import { Field, ProductSearch, ToastStack, Modal, EmptyState } from './components/ui';
import useToasts from './components/useToasts';
import { fieldCls, fmtQty, toISODate, encId, decId, apiError } from './components/utils';

let lineSeq = 0;
const newKey = () => {
  lineSeq += 1;
  return `l${lineSeq}`;
};

const unitFactor = (line) => {
  if (!line.unit) return 1;
  const alt = (line.alternateUnits || []).find((u) => u.unit === line.unit);
  return alt ? Number(alt.factor) || 1 : 1;
};

const stockForStore = (product, storeId) => {
  const rows = product?.storeStocks || [];
  const row = rows.find((s) => String(s.storeId?._id || s.storeId) === String(storeId));
  if (row) return Number(row.stock) || 0;
  return rows.length ? 0 : Number(product?.currentStock) || 0;
};

const ACTION_COPY = {
  draft: { title: 'Save as draft?', body: 'No stock moves yet. You can edit the draft and dispatch it later.' },
  dispatch: {
    title: 'Dispatch now?',
    body: 'Stock leaves the source store now and shows as "in transit" until the destination store receives it.',
  },
  complete: {
    title: 'Transfer now (both stores)?',
    body: 'Stock is taken out of the source store and added to the destination store in one step. Use this when both stores are yours and the goods are already there.',
  },
};

export default function CreateStockTransfer() {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decId(rawId);
  const isEdit = !!id;
  const { toasts, showToast } = useToasts();

  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [transferDate, setTransferDate] = useState(() => toISODate());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);

  /* Re-reads stock of each line from the given store */
  const refreshAvailability = async (currentLines, storeId) => {
    if (!storeId || !currentLines.length) return currentLines;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        currentLines.map(async (l) => {
          try {
            const res = await getProductByIdApi(l.productId);
            return { ...l, available: stockForStore(res.data, storeId) };
          } catch {
            return { ...l, available: null };
          }
        })
      );
      return updated;
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getStoresLookupApi({ isActive: true })
      .then((res) => {
        const list = res.data || [];
        setStores(list);
        if (!isEdit) {
          const def = list.find((s) => s.isDefault);
          if (def) setFromStoreId(def._id);
        }
      })
      .catch((err) => showToast(apiError(err, 'Could not load stores'), 'danger'))
      .finally(() => setStoresLoading(false));
  }, [isEdit, showToast]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await getStockTransferByIdApi(id);
        const t = res.data;
        if (!alive) return;
        if (t.status !== 'draft') {
          navigate(`/inventory/transfers/view/${encId(t._id)}`, {
            state: { message: 'Only draft transfers can be edited.', color: 'warning' },
          });
          return;
        }
        const from = t.fromStoreId?._id || t.fromStoreId;
        setFromStoreId(from);
        setToStoreId(t.toStoreId?._id || t.toStoreId);
        setTransferDate(t.transferDate ? toISODate(t.transferDate) : toISODate());
        setVehicleNumber(t.vehicleNumber || '');
        setNotes(t.notes || '');
        const base = (t.items || []).map((it) => ({
          key: newKey(),
          productId: it.productId?._id || it.productId,
          name: it.productId?.name || it.productName,
          sku: it.productId?.sku || it.sku,
          baseUnit: it.productId?.unit || it.unit || 'pcs',
          unit: '',
          alternateUnits: [],
          qty: String(it.qty),
          available: null,
        }));
        setLines(base);
        const withStock = await refreshAvailability(base, from);
        if (alive) setLines(withStock);
      } catch (err) {
        if (alive) showToast(apiError(err, 'Could not load the transfer'), 'danger');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  /* ── handlers ── */

  const changeFromStore = async (value) => {
    setFromStoreId(value);
    if (value && value === toStoreId) setToStoreId('');
    if (lines.length) setLines(await refreshAvailability(lines, value));
  };

  const addProduct = (p) => {
    const existing = lines.find((l) => l.productId === p._id);
    if (existing) {
      setLines((prev) =>
        prev.map((l) => (l.key === existing.key ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l))
      );
      showToast(`${p.name} is already in the list — quantity increased by 1`, 'info');
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        productId: p._id,
        name: p.name,
        sku: p.sku,
        baseUnit: p.unit || 'pcs',
        unit: '',
        alternateUnits: p.alternateUnits || [],
        qty: '1',
        available: p.storeStock ?? null,
      },
    ]);
  };

  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  /* ── validation ── */

  const errors = useMemo(() => {
    const e = {};
    if (!fromStoreId) e.fromStoreId = 'Select the store sending the stock';
    if (!toStoreId) e.toStoreId = 'Select the store receiving the stock';
    if (fromStoreId && toStoreId && fromStoreId === toStoreId) e.toStoreId = 'Choose a different store';
    if (!lines.length) e.lines = 'Add at least one product';
    const seen = new Set();
    lines.forEach((l) => {
      if (!(Number(l.qty) > 0)) e[`qty_${l.key}`] = 'Enter a quantity';
      if (seen.has(l.productId)) e[`dup_${l.key}`] = 'This product is listed twice';
      seen.add(l.productId);
    });
    return e;
  }, [fromStoreId, toStoreId, lines]);

  const overStock = lines.filter((l) => l.available !== null && Number(l.qty) * unitFactor(l) > Number(l.available));
  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0) * unitFactor(l), 0);
  const hasErrors = Object.keys(errors).length > 0;

  const askAction = (action) => {
    setSubmitted(true);
    if (hasErrors) {
      showToast('Please fix the highlighted fields', 'danger');
      return;
    }
    setConfirm(action);
  };

  const runAction = async () => {
    const action = confirm;
    setSaving(action);
    const payload = {
      fromStoreId,
      toStoreId,
      transferDate,
      vehicleNumber: vehicleNumber.trim(),
      notes: notes.trim(),
      items: lines.map((l) => ({
        productId: l.productId,
        qty: Number(l.qty),
        ...(l.unit ? { unit: l.unit } : {}),
      })),
    };
    try {
      let doc;
      let message;
      if (isEdit) {
        const res = await updateStockTransferApi(id, payload);
        doc = res.data;
        message = res.message || 'Transfer updated';
        if (action === 'dispatch' || action === 'complete') {
          const r2 = await dispatchStockTransferApi(id);
          doc = r2.data;
          message = r2.message || 'Stock dispatched';
        }
        if (action === 'complete') {
          const r3 = await receiveStockTransferApi(id, {});
          doc = r3.data;
          message = 'Stock transferred';
        }
      } else {
        const res = await createStockTransferApi({ ...payload, action });
        doc = res.data;
        message = res.message;
      }
      navigate(`/inventory/transfers/view/${encId(doc?._id || id)}`, {
        state: { message: message || 'Saved', color: 'success' },
      });
    } catch (err) {
      showToast(apiError(err, 'Could not save the transfer'), 'danger');
      setSaving('');
      setConfirm(null);
    }
  };

  const fromStore = stores.find((s) => s._id === fromStoreId);
  const toStore = stores.find((s) => s._id === toStoreId);

  if (loading) {
    return (
      <Card h1="Edit Transfer" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
        <Loader className="my-10" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <Card
        h1={isEdit ? 'Edit Draft Transfer' : 'New Stock Transfer'}
        description="Send stock from one store or warehouse to another."
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6"
      >
        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-start">
          <Field label="From store" required error={submitted ? errors.fromStoreId : null}>
            <select
              value={fromStoreId}
              onChange={(e) => changeFromStore(e.target.value)}
              className={fieldCls}
              disabled={storesLoading}
            >
              <option value="">{storesLoading ? 'Loading stores…' : 'Select source store'}</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ''}
                  {s.isDefault ? ' — default' : ''}
                </option>
              ))}
            </select>
          </Field>
          <div className="hidden md:flex items-center justify-center pt-7">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <Field label="To store" required error={submitted ? errors.toStoreId : null}>
            <select
              value={toStoreId}
              onChange={(e) => setToStoreId(e.target.value)}
              className={fieldCls}
              disabled={storesLoading}
            >
              <option value="">Select destination store</option>
              {stores
                .filter((s) => s._id !== fromStoreId)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        {!storesLoading && stores.length < 2 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You need at least two active stores to transfer stock. Add another store under Stores & Warehouses.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <Field label="Transfer date">
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Vehicle number" hint="Optional">
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH12AB1234"
              className={fieldCls}
              maxLength={20}
            />
          </Field>
          <Field label="Notes" hint="Optional — shows on the transfer slip">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason or instructions"
              className={fieldCls}
              maxLength={500}
            />
          </Field>
        </div>
      </Card>

      {/* Items */}
      <Card
        h1="Products"
        description={
          fromStore
            ? `Available stock is shown for ${fromStore.name}.`
            : 'Pick the source store to see available stock.'
        }
        bodyClassName="p-4 sm:p-6"
        rightNode={
          refreshing ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--vs-text-secondary)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating stock…
            </span>
          ) : null
        }
      >
        <ProductSearch storeId={fromStoreId} disabled={!fromStoreId} onSelect={addProduct} />

        {submitted && errors.lines && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 mb-0">{errors.lines}</p>
        )}

        {lines.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No products added"
            message="Search above by name, SKU or barcode. A USB barcode scanner works here too."
          />
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_150px_40px] gap-3 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
              <span>Product</span>
              <span className="text-right">Available</span>
              <span>Quantity</span>
              <span />
            </div>
            {lines.map((l, idx) => {
              const baseQty = (Number(l.qty) || 0) * unitFactor(l);
              const over = l.available !== null && baseQty > Number(l.available);
              const qtyErr = submitted && (errors[`qty_${l.key}`] || errors[`dup_${l.key}`]);
              return (
                <div
                  key={l.key}
                  className={`grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_110px_150px_40px] gap-2 md:gap-3 items-center rounded-xl border px-3 py-2.5 ${over
                    ? 'border-amber-400/70 bg-amber-50/60 dark:bg-amber-500/5'
                    : 'border-[var(--vs-border)] bg-[var(--vs-bg-primary)]'
                    }`}
                >
                  <div className="col-span-2 md:col-span-1 min-w-0 flex items-start gap-2">
                    <span className="text-[11px] font-bold text-[var(--vs-text-secondary)] mt-0.5 w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--vs-text-primary)] truncate">{l.name}</div>
                      <div className="text-[11px] font-mono text-[var(--vs-text-secondary)] truncate">
                        {l.sku || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="md:text-right">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[var(--vs-text-secondary)] mr-1">
                      Available:
                    </span>
                    {l.available === null ? (
                      <span className="text-xs text-[var(--vs-text-secondary)]">—</span>
                    ) : (
                      <span
                        className={`text-sm font-bold ${Number(l.available) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                      >
                        {fmtQty(l.available)} <span className="text-[10px] font-medium">{l.baseUnit}</span>
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={l.qty}
                        onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                        className={`${fieldCls} !h-9 text-right font-semibold ${qtyErr ? '!border-rose-500' : ''}`}
                        aria-label={`Quantity for ${l.name}`}
                      />
                      {l.alternateUnits?.length > 0 ? (
                        <select
                          value={l.unit}
                          onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                          className={`${fieldCls} !h-9 !w-auto !px-2`}
                          aria-label="Unit"
                        >
                          <option value="">{l.baseUnit}</option>
                          {l.alternateUnits.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.unit} (×{u.factor})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-[var(--vs-text-secondary)] w-8">{l.baseUnit}</span>
                      )}
                    </div>
                    {over && (
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1 mb-0 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> More than available
                      </p>
                    )}
                    {qtyErr && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1 mb-0">{qtyErr}</p>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      title="Remove"
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-sm">
              <span className="text-[var(--vs-text-secondary)]">
                {lines.length} product{lines.length === 1 ? '' : 's'} · Total qty{' '}
                <b className="text-[var(--vs-text-primary)]">{fmtQty(totalQty)}</b> (base units)
              </span>
              {overStock.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {overStock.length} line{overStock.length === 1 ? '' : 's'} exceed available stock — dispatch may fail
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Actions — sticky on phones */}
      <div className="fixed sm:static bottom-0 left-0 right-0 z-30 sm:z-auto bg-[var(--vs-bg-primary)] sm:bg-transparent border-t sm:border-0 border-[var(--vs-border)] p-3 sm:p-0 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => askAction('draft')}
          disabled={!!saving}
          startIcon={<Save className="w-4 h-4" />}
          className="flex-1 sm:flex-none"
        >
          Save draft
        </Button>
        <Button
          variant="outline"
          onClick={() => askAction('dispatch')}
          disabled={!!saving}
          startIcon={<Truck className="w-4 h-4" />}
          className="flex-1 sm:flex-none !border-amber-400 !text-amber-700 dark:!text-amber-300"
        >
          Dispatch now
        </Button>
        <Button
          onClick={() => askAction('complete')}
          disabled={!!saving}
          startIcon={<PackageCheck className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Transfer now (both stores)
        </Button>
      </div>

      <Modal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        busy={!!saving}
        size="sm"
        icon={confirm === 'draft' ? <Save className="w-4 h-4" /> : confirm === 'dispatch' ? <Truck className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
        title={ACTION_COPY[confirm]?.title}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={!!saving}>
              Go back
            </Button>
            <Button
              onClick={runAction}
              disabled={!!saving}
              startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--vs-text-secondary)] mb-3">{ACTION_COPY[confirm]?.body}</p>
        <div className="rounded-xl border border-[var(--vs-border)] p-3 text-sm flex items-center gap-2 flex-wrap">
          <Warehouse className="w-4 h-4 text-indigo-500" />
          <b>{fromStore?.name || '—'}</b>
          <ArrowRight className="w-4 h-4 text-indigo-500" />
          <b>{toStore?.name || '—'}</b>
          <span className="text-[var(--vs-text-secondary)]">
            · {lines.length} product{lines.length === 1 ? '' : 's'}, {fmtQty(totalQty)} units
          </span>
        </div>
        {confirm !== 'draft' && overStock.length > 0 && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-3 mb-0 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {overStock.length} line{overStock.length === 1 ? ' asks' : 's ask'} for more than the source store has.
            The transfer will be rejected unless stock has changed.
          </p>
        )}
      </Modal>

      <ToastStack toasts={toasts} />
    </div>
  );
}
