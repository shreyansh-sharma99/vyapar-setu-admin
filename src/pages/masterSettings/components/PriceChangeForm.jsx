import { Fragment, useState } from 'react';
import { DatePicker, Input as AntInput } from 'antd';
import dayjs from 'dayjs';
import { AlertTriangle, ArrowRight, IndianRupee, Layers, Loader2, Wand2, X } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { useStockInPricing } from '@/pages/purchase/components/stockInPricing';
import { saveBatchWisePricesApi } from '../services/priceMasterService';
import ProductPicker from './ProductPicker';
import ProductThumb from './ProductThumb';
import { formatDay } from './gstUtils';
import { formatMoney } from './priceUtils';
import { FieldError, FieldHint } from './formBits';

const tomorrow = () => dayjs().add(1, 'day').startOf('day');
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const fmtDay = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '—');

const ALL_MODES = [
  { value: 'set', label: 'Set price', unit: '₹', placeholder: 'e.g. 120', hint: 'Same new price' },
  { value: 'percent', label: '± %', unit: '%', placeholder: 'e.g. 10 or -5', hint: 'Raise (10) or cut (-5) each price by %' },
  { value: 'amount', label: '± ₹', unit: '₹', placeholder: 'e.g. 5 or -2', hint: 'Add (5) or take off (-2) rupees from each price' },
];
const GST_BASIS = [
  { value: 'same', label: 'As now' },
  { value: 'yes', label: 'Incl. GST' },
  { value: 'no', label: '+ GST' },
];

const th = 'py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] whitespace-nowrap border border-[var(--vs-border)]';
const td = 'py-2 px-3 align-middle border border-[var(--vs-border)]';
const cellInput =
  'h-9 w-28 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60 disabled:opacity-40';

/** Price incl. GST. */
const inclOf = (price, includesGst, gstRate) => (includesGst ? num(price) : round2(num(price) * (1 + num(gstRate) / 100)));

const Change = ({ from, to }) => {
  if (!(num(to) > 0) || !(num(from) > 0)) return <span className="text-[var(--vs-text-secondary)]">—</span>;
  const d = round2(num(to) - num(from));
  if (Math.abs(d) < 0.005) return <span className="text-[var(--vs-text-secondary)]">Same</span>;
  const pct = round2((d / num(from)) * 100);
  return (
    <span className={`font-semibold ${d < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
      {d > 0 ? '+' : ''}
      {formatMoney(d)} ({pct > 0 ? '+' : ''}
      {pct}%)
    </span>
  );
};

/**
 * Change selling prices batch-wise. Pick products: each shows its default price (what new
 * batches get, from the chosen date) and every open batch on the shelf with its own SP.
 * Tick the batches whose price should change and type their new price (each batch can get
 * its own); the default price changes only when a new one is typed. "Change all" fills the
 * default prices and the ticked batches at once.
 */
export default function PriceChangeForm({ notify, onApplied }) {
  const [products, setProducts] = useState([]);
  const [defaults, setDefaults] = useState({}); // productId → typed new default price
  const [picked, setPicked] = useState({}); // batchId → true
  const [batchPrices, setBatchPrices] = useState({}); // batchId → typed new SP
  const [allMode, setAllMode] = useState('set');
  const [allValue, setAllValue] = useState('');
  const [gstBasis, setGstBasis] = useState('same');
  const [effectiveFrom, setEffectiveFrom] = useState(tomorrow);
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [lastResult, setLastResult] = useState('');

  const pricing = useStockInPricing(products.map((p) => p._id));
  const modeInfo = ALL_MODES.find((m) => m.value === allMode) || ALL_MODES[0];

  const rows = products.map((p) => {
    const id = String(p._id);
    const info = pricing.prices[id];
    const gstRate = num(info?.gstRate);
    const currentIncl = info?.priceIncludesGst !== false;
    const newIncl = gstBasis === 'same' ? currentIncl : gstBasis === 'yes';
    const current = num(info?.sellingPrice);
    const typed = defaults[id] ?? '';
    const next = num(typed);
    const defaultChanged = next > 0 && (Math.abs(next - current) >= 0.005 || newIncl !== currentIncl);
    const batches = (Array.isArray(info?.batches) ? info.batches : []).map((b) => {
      const bid = String(b._id);
      const on = !!picked[bid];
      const bTyped = batchPrices[bid] ?? '';
      // a ticked batch without its own price takes the new default price
      const bNext = num(bTyped) > 0 ? num(bTyped) : next;
      const incl = b.priceIncludesGst !== false;
      const aboveMrp = on && bNext > 0 && num(b.mrp) > 0 && inclOf(bNext, incl, gstRate) > num(b.mrp) + 0.005;
      return { ...b, bid, on, bTyped, bNext, incl, aboveMrp, changed: on && bNext > 0 && Math.abs(bNext - num(b.sellingPrice)) >= 0.005 };
    });
    return { id, product: p, info, gstRate, current, currentIncl, newIncl, typed, next, defaultChanged, batches };
  });

  const defaultsToSave = rows.filter((r) => r.defaultChanged);
  const batchesToSave = rows.flatMap((r) => r.batches.filter((b) => b.changed).map((b) => ({ ...b, row: r })));
  const tickedWithoutPrice = rows.flatMap((r) => r.batches.filter((b) => b.on && !(b.bNext > 0)).map((b) => ({ ...b, row: r })));
  const aboveMrp = rows.flatMap((r) => r.batches.filter((b) => b.aboveMrp).map((b) => ({ ...b, row: r })));

  const errors = {
    products: products.length ? '' : 'Choose at least one product.',
    effectiveFrom: effectiveFrom ? '' : 'Choose the date the new default prices apply from.',
    prices: defaultsToSave.length || batchesToSave.length ? '' : 'Type a new default price, or tick a batch and type its new price.',
    batches: tickedWithoutPrice.length
      ? `Type a new price for batch ${tickedWithoutPrice[0].batchNo || '(no batch no)'} of "${tickedWithoutPrice[0].row.product.name}" (or untick it).`
      : aboveMrp.length
        ? `Batch ${aboveMrp[0].batchNo || '(no batch no)'} of "${aboveMrp[0].row.product.name}": the new price is above its MRP ₹${num(aboveMrp[0].mrp)}.`
        : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const shown = (k) => (attempted ? errors[k] : '');

  const toggleBatch = (bid) => setPicked((prev) => ({ ...prev, [bid]: !prev[bid] }));
  const tickAll = (r, on) => setPicked((prev) => ({ ...prev, ...Object.fromEntries(r.batches.map((b) => [b.bid, on])) }));

  /** Fill the default prices and the ticked batches from the main input. */
  const applyToAll = () => {
    const v = Number(allValue);
    if (!Number.isFinite(v) || allValue === '') return;
    const calc = (from) => {
      if (allMode === 'set') return v > 0 ? String(round2(v)) : '';
      if (!(num(from) > 0)) return '';
      const p = allMode === 'percent' ? num(from) * (1 + v / 100) : num(from) + v;
      return p > 0 ? String(round2(p)) : '';
    };
    setDefaults((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.id, calc(r.current)])) }));
    setBatchPrices((prev) => ({
      ...prev,
      ...Object.fromEntries(rows.flatMap((r) => r.batches.filter((b) => b.on).map((b) => [b.bid, calc(num(b.sellingPrice) || r.current)]))),
    }));
  };

  const removeProduct = (id) => {
    const r = rows.find((x) => x.id === id);
    setProducts((prev) => prev.filter((p) => String(p._id) !== id));
    setDefaults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (r) {
      setPicked((prev) => {
        const next = { ...prev };
        r.batches.forEach((b) => delete next[b.bid]);
        return next;
      });
    }
  };

  const reset = () => {
    setProducts([]);
    setDefaults({});
    setPicked({});
    setBatchPrices({});
    setAllValue('');
    setNote('');
    setAttempted(false);
  };

  const save = () => {
    setAttempted(true);
    if (hasErrors) return;
    setConfirmOpen(true);
  };

  const runApply = async () => {
    setApplying(true);
    try {
      const res = await saveBatchWisePricesApi({
        effectiveFrom: dayjs(effectiveFrom).format('YYYY-MM-DD'),
        note: note.trim(),
        ...(gstBasis !== 'same' ? { priceIncludesGst: gstBasis === 'yes' } : {}),
        defaults: defaultsToSave.map((r) => ({ productId: r.id, sellingPrice: round2(r.next) })),
        batches: batchesToSave.map((b) => ({ batchId: b.bid, sellingPrice: round2(b.bNext) })),
      });
      notify(res?.message || 'New prices saved', 'success');
      setLastResult(res?.message || '');
      onApplied?.(rows.map((r) => r.id));
      setConfirmOpen(false);
      reset();
    } catch (err) {
      setConfirmOpen(false);
      notify(await getApiErrorMessage(err, 'Could not save the new prices'), 'danger');
    } finally {
      setApplying(false);
    }
  };

  const startsTodayOrEarlier = effectiveFrom && !dayjs(effectiveFrom).isAfter(dayjs(), 'day');
  const changeCount = defaultsToSave.length + batchesToSave.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="price-products">
          Products <span className="text-rose-500">*</span>
        </Label>
        <ProductPicker
          id="price-products"
          multiple
          value={products}
          onChange={setProducts}
          invalid={!!shown('products')}
          placeholder="Search by name, SKU or barcode — pick one or many"
        />
        <FieldError>{shown('products')}</FieldError>
      </div>

      {products.length > 0 && (
        <>
          {/* one input fills the default prices and the ticked batches */}
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.04] p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mr-1">Change all</span>
              <div className="flex rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] overflow-hidden h-9" role="group" aria-label="How to change">
                {ALL_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setAllMode(m.value)}
                    className={`px-3 text-xs font-semibold cursor-pointer ${allMode === m.value ? 'bg-indigo-600 text-white' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-secondary)]'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex h-9 rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] overflow-hidden focus-within:border-indigo-500/60">
                <span className="px-2.5 flex items-center text-sm font-semibold text-[var(--vs-text-secondary)] bg-[var(--vs-bg-secondary)] border-r border-[var(--vs-border)]">{modeInfo.unit}</span>
                <input
                  id="price-all-value"
                  type="number"
                  step="0.01"
                  aria-label="Value for all"
                  value={allValue}
                  onChange={(e) => setAllValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyToAll()}
                  placeholder={modeInfo.placeholder}
                  className="w-32 px-2 text-sm bg-transparent text-gray-900 dark:!text-white outline-none"
                />
                <button
                  type="button"
                  onClick={applyToAll}
                  disabled={allValue === ''}
                  className="px-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Fill
                </button>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs font-semibold text-[var(--vs-text-secondary)]">Default price is</span>
                <div className="flex rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] overflow-hidden h-9" role="group" aria-label="Does the new default price include GST?">
                  {GST_BASIS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGstBasis(g.value)}
                      className={`px-3 text-xs font-semibold cursor-pointer ${gstBasis === g.value ? 'bg-indigo-600 text-white' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-secondary)]'}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-[11px] text-[var(--vs-text-secondary)]">
              {modeInfo.hint} — fills every default price and every <b>ticked</b> batch. Tick the batches whose price should change; untouched batches keep their price.
            </span>
          </div>

          <div className="max-h-[60vh] overflow-auto rounded-xl border border-[var(--vs-border)]">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead className="bg-[var(--vs-bg-secondary)] sticky top-0 z-[1]">
                <tr>
                  <th className={`${th} w-10 text-center`} aria-label="Change" />
                  <th className={th}>Product / batch</th>
                  <th className={th}>Store</th>
                  <th className={`${th} text-right`}>Qty left</th>
                  <th className={`${th} text-right`}>MRP</th>
                  <th className={`${th} text-right`}>Current price</th>
                  <th className={th}>New price (₹)</th>
                  <th className={th}>Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const allOn = r.batches.length > 0 && r.batches.every((b) => b.on);
                  return (
                    <Fragment key={r.id}>
                      {/* product: its default price (what new batches get) */}
                      <tr className="bg-indigo-50/40 dark:bg-indigo-500/[0.05]">
                        <td className={`${td} text-center`}>
                          {r.batches.length > 0 && (
                            <input type="checkbox" checked={allOn} onChange={() => tickAll(r, !allOn)} title="Tick every batch of this product" className="h-4 w-4 cursor-pointer" />
                          )}
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ProductThumb product={r.product} size="sm" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[var(--vs-text-primary)] break-words">{r.product.name}</span>
                              <span className="text-[10px] text-[var(--vs-text-secondary)]">
                                Default price — for new batches{r.gstRate > 0 ? ` · GST ${r.gstRate}%` : ' · No GST'}
                              </span>
                            </div>
                            <button
                              type="button"
                              title="Remove from the list"
                              onClick={() => removeProduct(r.id)}
                              className="ml-auto p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className={`${td} text-xs text-[var(--vs-text-secondary)]`}>All stores</td>
                        <td className={`${td} text-right text-xs`}>{r.batches.length ? `${r.batches.reduce((s, b) => s + num(b.qtyRemaining), 0)} in ${r.batches.length} batch${r.batches.length === 1 ? '' : 'es'}` : 'No stock'}</td>
                        <td className={`${td} text-right`}>—</td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          {r.current > 0 ? (
                            <>
                              <span className="font-mono font-semibold">{formatMoney(r.current)}</span>
                              <div className="text-[10px] text-[var(--vs-text-secondary)]">{r.currentIncl ? 'incl. GST' : '+ GST'}</div>
                            </>
                          ) : (
                            <span className="text-xs italic text-[var(--vs-text-secondary)]">Not set yet</span>
                          )}
                        </td>
                        <td className={td}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={r.typed}
                            onChange={(e) => setDefaults((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            placeholder={r.current > 0 ? String(r.current) : 'e.g. 120'}
                            className={cellInput}
                          />
                          {r.defaultChanged && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">From {fmtDay(effectiveFrom)}{r.newIncl ? ' · incl. GST' : ' · + GST'}</div>}
                        </td>
                        <td className={`${td} text-xs whitespace-nowrap`}>
                          {r.defaultChanged ? r.current > 0 ? <Change from={r.current} to={r.next} /> : <span className="font-semibold text-indigo-600 dark:text-indigo-400">First price</span> : '—'}
                        </td>
                      </tr>
                      {/* its open batches: tick to change, each with its own new price */}
                      {r.batches.map((b) => (
                        <tr key={b.bid} className={b.on ? 'bg-emerald-50/40 dark:bg-emerald-500/[0.04]' : 'hover:bg-gray-50/60 dark:hover:bg-white/[0.02]'}>
                          <td className={`${td} text-center`}>
                            <input type="checkbox" checked={b.on} onChange={() => toggleBatch(b.bid)} aria-label={`Change batch ${b.batchNo}`} className="h-4 w-4 cursor-pointer" />
                          </td>
                          <td className={td}>
                            <div className="pl-9 flex items-center gap-1.5 text-xs">
                              <Layers className="w-3.5 h-3.5 text-[var(--vs-text-secondary)]" />
                              <span className="font-mono font-semibold">{b.batchNo || '(no batch no)'}</span>
                              <span className="text-[var(--vs-text-secondary)]">
                                · received {fmtDay(b.receivedAt)}
                                {b.expiryDate ? ` · exp ${fmtDay(b.expiryDate)}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className={`${td} text-xs`}>{b.storeName || '—'}</td>
                          <td className={`${td} text-right font-semibold`}>{num(b.qtyRemaining)}</td>
                          <td className={`${td} text-right`}>{num(b.mrp) > 0 ? formatMoney(b.mrp) : '—'}</td>
                          <td className={`${td} text-right whitespace-nowrap`}>
                            {num(b.sellingPrice) > 0 ? (
                              <>
                                <span className="font-mono">{formatMoney(b.sellingPrice)}</span>
                                <div className="text-[10px] text-[var(--vs-text-secondary)]">{b.incl ? 'incl. GST' : '+ GST'}</div>
                              </>
                            ) : (
                              <span className="text-xs italic text-[var(--vs-text-secondary)]">Default</span>
                            )}
                          </td>
                          <td className={td}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={b.bTyped}
                              disabled={!b.on}
                              onChange={(e) => setBatchPrices((prev) => ({ ...prev, [b.bid]: e.target.value }))}
                              placeholder={b.on ? (r.next > 0 ? String(r.next) : 'New price') : 'Tick to change'}
                              className={`${cellInput} ${b.aboveMrp ? '!border-red-500' : ''}`}
                            />
                            {b.on && !(num(b.bTyped) > 0) && r.next > 0 && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">Takes the new default price</div>}
                            {b.aboveMrp && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Above its MRP
                              </div>
                            )}
                          </td>
                          <td className={`${td} text-xs whitespace-nowrap`}>{b.changed ? <Change from={num(b.sellingPrice) || r.current} to={b.bNext} /> : '—'}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <FieldError>{shown('prices') || shown('batches')}</FieldError>
          <FieldHint>Batch prices change right away. The default price applies from the date below and is what new stock (purchases) gets.</FieldHint>
        </>
      )}

      {/* date, note and save on one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[200px_minmax(0,1fr)_auto] gap-3 items-start">
        <div>
          <Label htmlFor="price-effective-from">
            Default price from <span className="text-rose-500">*</span>
          </Label>
          <DatePicker
            id="price-effective-from"
            size="large"
            value={effectiveFrom}
            onChange={setEffectiveFrom}
            format="DD MMM YYYY"
            allowClear={false}
            inputReadOnly
            status={shown('effectiveFrom') ? 'error' : undefined}
            className="w-full"
          />
          <FieldError>{shown('effectiveFrom')}</FieldError>
          {!shown('effectiveFrom') && startsTodayOrEarlier && <FieldHint>Applies right away.</FieldHint>}
        </div>
        <div>
          <Label htmlFor="price-note">Note</Label>
          <AntInput id="price-note" size="large" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. New rate list from the distributor" />
        </div>
        <div className="flex flex-col">
          <span className="hidden lg:block text-sm mb-1.5 invisible" aria-hidden="true">
            Save
          </span>
          <Button onClick={save} disabled={applying} startIcon={applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}>
            Save {changeCount > 0 ? `${changeCount} change${changeCount === 1 ? '' : 's'}` : 'new prices'}
          </Button>
        </div>
      </div>
      {lastResult && <span className="text-xs text-[var(--vs-text-secondary)]">Last save: {lastResult}</span>}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runApply}
        isLoading={applying}
        title={`Save ${changeCount} price change${changeCount === 1 ? '' : 's'}?`}
        message={
          <div className="flex flex-col gap-2 text-left">
            {defaultsToSave.length > 0 && (
              <>
                <p className="m-0 font-semibold">Default price from {effectiveFrom ? formatDay(effectiveFrom) : '—'} (new batches)</p>
                <ul className="list-none m-0 p-0 max-h-32 overflow-y-auto divide-y divide-[var(--vs-border)] rounded-lg border border-[var(--vs-border)]">
                  {defaultsToSave.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="font-medium break-words min-w-0">{r.product.name}</span>
                      <span className="flex items-center gap-1 font-mono whitespace-nowrap">
                        {r.current > 0 ? formatMoney(r.current) : 'Not set'} <ArrowRight className="w-3 h-3" />
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatMoney(r.next)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {batchesToSave.length > 0 && (
              <>
                <p className="m-0 font-semibold">Batches — right away</p>
                <ul className="list-none m-0 p-0 max-h-40 overflow-y-auto divide-y divide-[var(--vs-border)] rounded-lg border border-[var(--vs-border)]">
                  {batchesToSave.map((b) => (
                    <li key={b.bid} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                      <span className="min-w-0 break-words">
                        <span className="font-medium">{b.row.product.name}</span> · {b.batchNo || '(no batch no)'} · {b.storeName}
                      </span>
                      <span className="flex items-center gap-1 font-mono whitespace-nowrap">
                        {num(b.sellingPrice) > 0 ? formatMoney(b.sellingPrice) : 'Default'} <ArrowRight className="w-3 h-3" />
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatMoney(b.bNext)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="m-0 text-[11px]">Batches you did not tick keep their price. Bills already saved do not change.</p>
          </div>
        }
        confirmText="Save"
        loadingText="Saving..."
        maxWidth="max-w-lg"
      />
    </div>
  );
}
