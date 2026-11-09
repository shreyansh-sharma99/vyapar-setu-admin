import { Fragment, useState } from 'react';
import dayjs from 'dayjs';
import { AlertTriangle, ArrowRight, IndianRupee, Layers, Wand2, X } from 'lucide-react';
import {
  Badge, Button, Checkbox, DatePicker, Field, FormGrid, Input, Label, LINE_TD, LINE_TH, LineItemsTable, LineRow, Modal, Section, Segmented,
} from '@/components/ui';
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

const th = LINE_TH;
const td = LINE_TD;
const num2 = 'text-right tabular-nums whitespace-nowrap';

/** Price incl. GST. */
const inclOf = (price, includesGst, gstRate) => (includesGst ? num(price) : round2(num(price) * (1 + num(gstRate) / 100)));

const Change = ({ from, to }) => {
  if (!(num(to) > 0) || !(num(from) > 0)) return <span className="text-ink-subtle">—</span>;
  const d = round2(num(to) - num(from));
  if (Math.abs(d) < 0.005) return <Badge tone="neutral">Same</Badge>;
  const pct = round2((d / num(from)) * 100);
  return (
    <Badge tone={d < 0 ? 'danger' : 'success'} className="tabular-nums">
      {d > 0 ? '+' : ''}
      {formatMoney(d)} ({pct > 0 ? '+' : ''}
      {pct}%)
    </Badge>
  );
};

/** Old → new price in the confirm list. */
const OldNew = ({ from, to }) => (
  <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
    <span className="text-ink-subtle">{from}</span>
    <ArrowRight className="size-3 text-ink-subtle" />
    <Badge tone="primary" className="tabular-nums">
      {to}
    </Badge>
  </span>
);

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
    <div className="flex flex-col gap-5">
      <Section title="Products" description="Each shows its default price (for new batches) and every open batch with its own price.">
        <div className="flex flex-col gap-4">
          <Field label="Products" required error={shown('products')}>
            <ProductPicker
              id="price-products"
              multiple
              value={products}
              onChange={setProducts}
              invalid={!!shown('products')}
              placeholder="Search by name, SKU or barcode — pick one or many"
            />
          </Field>

          {products.length > 0 && (
            <>
              {/* one input fills the default prices and the ticked batches */}
              <div className="flex flex-col gap-2.5 rounded-control bg-fill-2 p-3.5 ring-1 ring-line">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-bold uppercase tracking-wider text-brand-ink">Change all</span>
                  <Segmented size="sm" aria-label="How to change" options={ALL_MODES} value={allMode} onChange={setAllMode} />
                  <Input
                    id="price-all-value"
                    size="sm"
                    type="number"
                    step="0.01"
                    aria-label="Value for all"
                    value={allValue}
                    onChange={(e) => setAllValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyToAll()}
                    placeholder={modeInfo.placeholder}
                    startIcon={<span className="text-sm font-semibold">{modeInfo.unit}</span>}
                    wrapperClassName="w-40"
                    className="tabular-nums"
                  />
                  <Button size="sm" variant="soft" onClick={applyToAll} disabled={allValue === ''} startIcon={<Wand2 />}>
                    Fill
                  </Button>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <span className="text-xs font-semibold text-ink-muted">Default price is</span>
                    <Segmented size="sm" aria-label="Does the new default price include GST?" options={GST_BASIS} value={gstBasis} onChange={setGstBasis} />
                  </div>
                </div>
                <span className="text-xs text-ink-subtle">
                  {modeInfo.hint} — fills every default price and every <b className="text-ink-muted">ticked</b> batch. Tick the batches whose price should change; untouched
                  batches keep their price.
                </span>
              </div>

              <LineItemsTable
                minWidth={980}
                className="max-h-[60vh] overflow-auto"
                head={
                  <tr>
                    <th className={`${th} sticky top-0 z-[1] w-10 text-center`} aria-label="Change" />
                    <th className={`${th} sticky top-0 z-[1]`}>Product / batch</th>
                    <th className={`${th} sticky top-0 z-[1] text-right`}>Qty left</th>
                    <th className={`${th} sticky top-0 z-[1] text-right`}>MRP</th>
                    <th className={`${th} sticky top-0 z-[1] text-right`}>Current price</th>
                    <th className={`${th} sticky top-0 z-[1]`}>New price (₹)</th>
                    <th className={`${th} sticky top-0 z-[1]`}>Change</th>
                  </tr>
                }
              >
                {rows.map((r) => {
                  const allOn = r.batches.length > 0 && r.batches.every((b) => b.on);
                  return (
                    <Fragment key={r.id}>
                      {/* product: its default price (what new batches get) */}
                      <LineRow className="[&>td]:bg-fill-2">
                        <td className={`${td} text-center`}>
                          {r.batches.length > 0 && (
                            <Checkbox checked={allOn} onChange={() => tickAll(r, !allOn)} title="Tick every batch of this product" aria-label="Tick every batch of this product" />
                          )}
                        </td>
                        <td className={td}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ProductThumb product={r.product} size="sm" />
                            <div className="flex min-w-0 flex-col">
                              <span className="break-words font-semibold text-ink">{r.product.name}</span>
                              <span className="text-[11px] text-ink-subtle">
                                Default price — for new batches{r.gstRate > 0 ? ` · GST ${r.gstRate}%` : ' · No GST'}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Remove from the list"
                              aria-label={`Remove ${r.product.name} from the list`}
                              onClick={() => removeProduct(r.id)}
                              className="ml-auto hover:bg-danger-soft hover:text-danger"
                            >
                              <X />
                            </Button>
                          </div>
                        </td>
                        <td className={`${td} ${num2} text-xs text-ink-muted`}>
                          {r.batches.length
                            ? `${r.batches.reduce((s, b) => s + num(b.qtyRemaining), 0)} in ${r.batches.length} batch${r.batches.length === 1 ? '' : 'es'}`
                            : 'No stock'}
                        </td>
                        <td className={`${td} ${num2} text-ink-subtle`}>—</td>
                        <td className={`${td} ${num2}`}>
                          {r.current > 0 ? (
                            <>
                              <span className="font-semibold">{formatMoney(r.current)}</span>
                              <div className="text-[11px] text-ink-subtle">{r.currentIncl ? 'incl. GST' : '+ GST'}</div>
                            </>
                          ) : (
                            <span className="text-xs italic text-ink-subtle">Not set yet</span>
                          )}
                        </td>
                        <td className={td}>
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`New default price of ${r.product.name}`}
                            value={r.typed}
                            onChange={(e) => setDefaults((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            placeholder={r.current > 0 ? String(r.current) : 'e.g. 120'}
                            wrapperClassName="w-32"
                            className="tabular-nums"
                          />
                          {r.defaultChanged && (
                            <div className="mt-1 text-[11px] font-medium text-brand-ink">
                              From {fmtDay(effectiveFrom)}
                              {r.newIncl ? ' · incl. GST' : ' · + GST'}
                            </div>
                          )}
                        </td>
                        <td className={`${td} whitespace-nowrap text-xs`}>
                          {r.defaultChanged ? r.current > 0 ? <Change from={r.current} to={r.next} /> : <Badge tone="primary">First price</Badge> : <span className="text-ink-subtle">—</span>}
                        </td>
                      </LineRow>
                      {/* its open batches: tick to change, each with its own new price */}
                      {r.batches.map((b) => (
                        <LineRow key={b.bid} tone={b.aboveMrp ? 'danger' : undefined} className={b.on && !b.aboveMrp ? '[&>td]:bg-success-soft/50' : ''}>
                          <td className={`${td} text-center`}>
                            <Checkbox checked={b.on} onChange={() => toggleBatch(b.bid)} aria-label={`Change batch ${b.batchNo}`} />
                          </td>
                          <td className={td}>
                            <div className="flex items-center gap-1.5 pl-9 text-xs">
                              <Layers className="size-3.5 text-ink-subtle" />
                              <span className="font-mono font-semibold text-ink">{b.batchNo || '(no batch no)'}</span>
                              <span className="text-ink-subtle">
                                · received {fmtDay(b.receivedAt)}
                                {b.expiryDate ? ` · exp ${fmtDay(b.expiryDate)}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className={`${td} ${num2} font-semibold`}>{num(b.qtyRemaining)}</td>
                          <td className={`${td} ${num2} text-ink-muted`}>{num(b.mrp) > 0 ? formatMoney(b.mrp) : '—'}</td>
                          <td className={`${td} ${num2}`}>
                            {num(b.sellingPrice) > 0 ? (
                              <>
                                <span>{formatMoney(b.sellingPrice)}</span>
                                <div className="text-[11px] text-ink-subtle">{b.incl ? 'incl. GST' : '+ GST'}</div>
                              </>
                            ) : (
                              <span className="text-xs italic text-ink-subtle">Default</span>
                            )}
                          </td>
                          <td className={td}>
                            <Input
                              size="sm"
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`New price of batch ${b.batchNo || ''}`}
                              value={b.bTyped}
                              disabled={!b.on}
                              onChange={(e) => setBatchPrices((prev) => ({ ...prev, [b.bid]: e.target.value }))}
                              placeholder={b.on ? (r.next > 0 ? String(r.next) : 'New price') : 'Tick to change'}
                              invalid={b.aboveMrp}
                              wrapperClassName="w-32"
                              className="tabular-nums"
                            />
                            {b.on && !(num(b.bTyped) > 0) && r.next > 0 && <div className="mt-1 text-[11px] text-ink-subtle">Takes the new default price</div>}
                            {b.aboveMrp && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger">
                                <AlertTriangle className="size-3" /> Above its MRP
                              </div>
                            )}
                          </td>
                          <td className={`${td} whitespace-nowrap text-xs`}>
                            {b.changed ? <Change from={num(b.sellingPrice) || r.current} to={b.bNext} /> : <span className="text-ink-subtle">—</span>}
                          </td>
                        </LineRow>
                      ))}
                    </Fragment>
                  );
                })}
              </LineItemsTable>
              <div>
                <FieldError>{shown('prices') || shown('batches')}</FieldError>
                <FieldHint>Batch prices change right away. The default price applies from the date below and is what new stock (purchases) gets.</FieldHint>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* date, note and save on one row */}
      <Section title="Save" description="Bills already saved do not change.">
        <FormGrid cols={3} className="items-start lg:grid-cols-[200px_minmax(0,1fr)_auto]">
          <Field
            label="Default price from"
            required
            error={shown('effectiveFrom')}
            hint={startsTodayOrEarlier ? 'Applies right away.' : undefined}
          >
            <DatePicker id="price-effective-from" value={effectiveFrom} onChange={setEffectiveFrom} allowClear={false} inputReadOnly invalid={!!shown('effectiveFrom')} />
          </Field>
          <Field label="Note">
            <Input id="price-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. New rate list from the distributor" />
          </Field>
          <div className="flex flex-col">
            <Label aria-hidden="true" className="invisible hidden lg:block">
              Save
            </Label>
            <Button onClick={save} loading={applying} startIcon={<IndianRupee />} className="h-11">
              Save {changeCount > 0 ? `${changeCount} change${changeCount === 1 ? '' : 's'}` : 'new prices'}
            </Button>
          </div>
        </FormGrid>
        {lastResult && <p className="m-0 mt-3 text-xs text-ink-subtle">Last save: {lastResult}</p>}
      </Section>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!applying) setConfirmOpen(false);
        }}
        closeOnBackdrop={!applying}
        title={`Save ${changeCount} price change${changeCount === 1 ? '' : 's'}?`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={runApply} loading={applying}>
              {applying ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          {defaultsToSave.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="m-0 font-semibold text-ink">Default price from {effectiveFrom ? formatDay(effectiveFrom) : '—'} (new batches)</p>
              <ul className="m-0 max-h-32 list-none divide-y divide-line overflow-y-auto rounded-control p-0 ring-1 ring-line">
                {defaultsToSave.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 break-words font-medium text-ink">{r.product.name}</span>
                    <OldNew from={r.current > 0 ? formatMoney(r.current) : 'Not set'} to={formatMoney(r.next)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {batchesToSave.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="m-0 font-semibold text-ink">Batches — right away</p>
              <ul className="m-0 max-h-40 list-none divide-y divide-line overflow-y-auto rounded-control p-0 ring-1 ring-line">
                {batchesToSave.map((b) => (
                  <li key={b.bid} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 break-words text-ink-muted">
                      <span className="font-medium text-ink">{b.row.product.name}</span> · {b.batchNo || '(no batch no)'}
                    </span>
                    <OldNew from={num(b.sellingPrice) > 0 ? formatMoney(b.sellingPrice) : 'Default'} to={formatMoney(b.bNext)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="m-0 text-xs text-ink-subtle">Batches you did not tick keep their price. Bills already saved do not change.</p>
        </div>
      </Modal>
    </div>
  );
}
