import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, PackageCheck, Plus, Save, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '@/pages/purchase/components/PurchaseToaster';
import AsyncSelect from '@/pages/purchase/components/AsyncSelect';
import { Field, FormError, NativeSelect, PageLoading, PageShell, Section, StatusBadge, TextArea } from '@/pages/purchase/components/ui';
import useApi from '@/pages/purchase/components/useApi';
import useStores from '@/pages/purchase/components/useStores';
import { productOptionsLoader } from '@/pages/purchase/components/lookupService';
import { notify, notifyError } from '@/pages/purchase/components/toast';
import { decId, errMsg, formatINR, formatQty, newKey, num, refId, round2, toInputDate, todayISO, unitsOf } from '@/pages/purchase/components/helpers';
import { CELL_INPUT, TD, TH } from '@/pages/purchase/components/itemTable';
import PriceChangeConfirm from '@/pages/purchase/components/PriceChangeConfirm';
import { DefaultPriceTick } from '@/pages/purchase/components/ItemTableBits';
import {
  marginPercent,
  priceChangesOf,
  shownMrp,
  shownSp,
  spChanged,
  stockInCheck,
  stockInFields,
  stockInFromSaved,
  stockInPayload,
  useStockInPricing,
} from '@/pages/purchase/components/stockInPricing';
import { createOpeningStockApi, getOpeningStockByIdApi, postOpeningStockApi, updateOpeningStockApi } from './services/openingStockService';
import { openingViewPath } from './paths';

const emptyLine = () => ({
  key: newKey(),
  productId: '',
  productName: '',
  sku: '',
  unit: '',
  units: [],
  qty: '',
  unitCost: '',
  ...stockInFields(null),
});

const linesFromDoc = (doc) =>
  (doc.items || []).map((i) => ({
    ...emptyLine(),
    productId: refId(i.productId),
    productName: i.productName,
    sku: i.sku || '',
    unit: i.unit,
    units: [{ unit: i.unit, factor: num(i.unitFactor) || 1 }],
    qty: num(i.qty),
    unitCost: num(i.unitCost),
    ...stockInFromSaved(i),
  }));

/** Base units per one line unit (1 box = 24 pcs). */
const factorOf = (l) => l.units.find((u) => u.unit === l.unit)?.factor || 1;

const lineProblem = (l) => {
  if (!l.productId) return '';
  if (!(num(l.qty) > 0)) return `Enter the quantity for "${l.productName}".`;
  if (!(num(l.unitCost) > 0)) return `Enter the cost for "${l.productName}".`;
  return '';
};

/**
 * Opening stock: goods already on the shelf when the shop starts (or a new store opens).
 * Each line becomes a batch with its cost and MRP, dated the opening date (sold first).
 * Like the goods receipt screen, without supplier / purchase order / rejected quantity.
 */
function OpeningStockForm({ doc }) {
  const navigate = useNavigate();
  const isEdit = !!doc;
  const { options: storeOptions, defaultId: defaultStoreId, loading: storesLoading } = useStores();

  const [storeId, setStoreId] = useState(() => (doc ? refId(doc.storeId) : ''));
  const [openingDate, setOpeningDate] = useState(() => (doc ? toInputDate(doc.openingDate) : todayISO()));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [lines, setLines] = useState(() => (doc ? linesFromDoc(doc) : [emptyLine()]));
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);

  const effectiveStoreId = storeId || defaultStoreId;
  const loader = productOptionsLoader(effectiveStoreId);
  const pricing = useStockInPricing(lines.map((l) => l.productId));
  const infoOf = (l) => pricing.prices[String(l.productId)];
  const costPerBase = (l) => num(l.unitCost) / factorOf(l);

  const update = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (line, opt) => {
    if (!opt) {
      update(line.key, { ...emptyLine(), key: line.key });
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
      unitCost: round2(num(p.lastPurchasePrice) || num(p.costPrice) || num(p.avgCost)) || '',
      qty: line.qty === '' ? 1 : line.qty,
      ...stockInFields(p),
    });
  };

  const used = () => lines.filter((l) => l.productId);
  const totalValue = round2(used().reduce((s, l) => s + num(l.qty) * num(l.unitCost), 0));
  const totalQty = used().reduce((s, l) => s + num(l.qty), 0);

  const save = (post) => {
    setSubmitted(true);
    const items = used();
    let problem;
    if (!effectiveStoreId) problem = 'Select the store / warehouse.';
    else if (!openingDate) problem = 'Choose the opening date.';
    else if (!items.length) problem = 'Add at least one product.';
    else problem = items.map(lineProblem).find(Boolean) || items.map((l) => stockInCheck(l, infoOf(l), costPerBase(l)).error).find(Boolean) || '';
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    // Changed SP: confirm "₹A → ₹B from today" before the goods go into stock.
    const changes = post ? priceChangesOf(items, pricing.prices) : [];
    if (changes.length) {
      setPendingChanges(changes);
      return;
    }
    persist(post);
  };

  const persist = async (post) => {
    setPendingChanges([]);
    const payload = {
      storeId: effectiveStoreId,
      openingDate,
      notes,
      items: used().map((l) => {
        const extra = stockInPayload(l, infoOf(l));
        return {
          productId: l.productId,
          productName: l.productName,
          unit: l.unit || undefined,
          qty: num(l.qty),
          unitCost: num(l.unitCost),
          mrp: extra.mrp,
          batchNo: extra.batchNo,
          expiryDate: extra.expiryDate || null,
          ...(extra.sellingPrice ? { sellingPrice: extra.sellingPrice } : {}),
          ...(extra.setAsDefault ? { setAsDefault: true } : {}),
        };
      }),
    };
    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const res = await updateOpeningStockApi(doc._id, payload);
        saved = res?.data;
        if (post) {
          const posted = await postOpeningStockApi(doc._id);
          notify(posted?.message || 'Opening stock added');
        } else {
          notify(res?.message || 'Opening stock saved');
        }
      } else {
        const res = await createOpeningStockApi({ ...payload, post });
        saved = res?.data;
        notify(res?.message || (post ? 'Opening stock added' : 'Opening stock saved — finish it later'));
      }
      navigate(openingViewPath(saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title={isEdit ? `Edit opening stock - ${doc.openingNumber}` : 'Add opening stock'}>
      {isEdit && <StatusBadge status={doc.status} label="Not finished" size="lg" />}
      <FormError message={formError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Store / warehouse" required>
            <NativeSelect
              value={effectiveStoreId}
              onChange={setStoreId}
              error={submitted && !effectiveStoreId}
              options={[{ value: '', label: storesLoading ? 'Loading stores...' : 'Select store' }, ...storeOptions]}
            />
          </Field>
          <Field label="Opening date" required hint="The day this stock was already on the shelf. It is sold before later purchases.">
            <Input type="date" value={openingDate} max={todayISO()} onChange={(e) => setOpeningDate(e.target.value)} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <TextArea value={notes} onChange={setNotes} rows={2} placeholder="e.g. Stock count when we started using the app" />
          </Field>
        </Section>

        <Section title="Summary" bodyClassName="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Products</span>
              <span>{used().length}</span>
            </div>
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Quantity</span>
              <span>{formatQty(totalQty)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--vs-border)] pt-3 text-base font-bold">
              <span>Stock value (at cost)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatINR(totalValue)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--vs-border)] pt-4">
            <Button onClick={() => save(true)} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}>
              Save &amp; add to stock
            </Button>
            <Button variant="outline" onClick={() => save(false)} disabled={saving} className="w-full" startIcon={<Save className="w-4 h-4" />}>
              Save &amp; finish later
            </Button>
          </div>
        </Section>
      </div>

      <Section title="Products on the shelf" bodyClassName="p-3 sm:p-4 flex flex-col gap-3">
        <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
          <table className="w-full text-sm border-collapse min-w-[1350px]">
            <thead className="bg-[var(--vs-bg-secondary)]">
              <tr>
                <th className={`${TH} w-8`}>#</th>
                <th className={`${TH} min-w-[240px]`}>
                  Product <span className="text-rose-500">*</span>
                </th>
                <th className={`${TH} min-w-[90px]`}>
                  Qty <span className="text-rose-500">*</span>
                </th>
                <th className={`${TH} min-w-[110px]`}>Unit</th>
                <th className={`${TH} min-w-[120px]`}>
                  Cost / unit (₹) <span className="text-rose-500">*</span>
                </th>
                <th className={`${TH} min-w-[120px] text-right`}>Price incl. GST</th>
                <th className={`${TH} min-w-[120px]`}>
                  MRP / pc (₹) <span className="text-rose-500">*</span>
                </th>
                <th className={`${TH} min-w-[130px]`}>SP for this batch / pc (₹)</th>
                <th className={`${TH} min-w-[120px] text-right`}>Margin / pc</th>
                <th className={`${TH} min-w-[120px]`}>Batch no</th>
                <th className={`${TH} min-w-[150px]`}>Expiry date</th>
                <th className={`${TH} w-32 text-right`}>Value</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const has = !!l.productId;
                const info = infoOf(l);
                const sp = shownSp(l, info);
                const mrp = shownMrp(l, info);
                const changed = spChanged(l, info);
                const gstRate = num(info?.gstRate);
                const costIncl = round2(num(l.unitCost) * (1 + gstRate / 100)); // per line unit, GST from the product
                const margin = has ? marginPercent(sp, info, costPerBase(l)) : null;
                // ₹ margin per piece on the same basis as the %: SP before GST − cost
                const spExcl = info?.priceIncludesGst !== false ? num(sp) / (1 + gstRate / 100) : num(sp);
                const marginAmt = margin === null ? null : round2(spExcl - costPerBase(l));
                const spAboveMrp = num(sp) > 0 && num(mrp) > 0 && num(sp) > num(mrp);
                const noPriceYet = info && !(num(info.sellingPrice) > 0) && !l.spTouched;
                const bad = (cond) => (submitted && has && cond ? '!border-red-500' : '');
                return (
                  <tr key={l.key} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className={`${TD} pt-4 text-xs text-[var(--vs-text-secondary)]`}>{idx + 1}</td>
                    <td className={TD}>
                      <AsyncSelect
                        size="sm"
                        value={has ? { value: l.productId, label: l.productName } : null}
                        onChange={(opt) => pickProduct(l, opt)}
                        loadOptions={loader}
                        placeholder="Search name, SKU or barcode"
                        error={submitted && !has && lines.length > 1}
                      />
                      {has && l.sku && <div className="mt-1 text-[11px] text-[var(--vs-text-secondary)]">SKU {l.sku}</div>}
                    </td>
                    <td className={TD}>
                      <input type="number" min="0" step="any" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} className={`${CELL_INPUT} ${bad(!(num(l.qty) > 0))}`} />
                    </td>
                    <td className={TD}>
                      {l.units.length > 1 ? (
                        <select
                          value={l.unit}
                          onChange={(e) => {
                            const to = l.units.find((u) => u.unit === e.target.value)?.factor || 1;
                            update(l.key, { unit: e.target.value, unitCost: num(l.unitCost) > 0 ? round2((num(l.unitCost) / factorOf(l)) * to) : l.unitCost });
                          }}
                          className={`${CELL_INPUT} cursor-pointer`}
                        >
                          {l.units.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.unit}
                              {u.factor !== 1 ? ` (${u.factor} pcs)` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="pt-2 text-sm">{l.unit || '—'}</div>
                      )}
                    </td>
                    <td className={TD}>
                      <input type="number" min="0" step="0.01" value={l.unitCost} disabled={!has} onChange={(e) => update(l.key, { unitCost: e.target.value })} className={`${CELL_INPUT} ${bad(!(num(l.unitCost) > 0))}`} />
                      <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">before GST</div>
                    </td>
                    <td className={`${TD} pt-3 text-right whitespace-nowrap`}>
                      {has && num(l.unitCost) > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-semibold">{formatINR(costIncl)}</span>
                          <span className="text-[10px] text-[var(--vs-text-secondary)]">{gstRate > 0 ? `+ ${gstRate}% GST` : 'No GST'}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--vs-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      <input type="number" min="0" step="0.01" value={mrp} disabled={!has} placeholder="Required" onChange={(e) => update(l.key, { mrp: e.target.value, mrpTouched: true })} className={`${CELL_INPUT} ${bad(!(num(mrp) > 0))}`} />
                    </td>
                    <td className={TD}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={noPriceYet ? '' : sp}
                        disabled={!has || !pricing.canUpdatePrices}
                        placeholder={noPriceYet ? 'Not set yet' : 'Optional'}
                        title={pricing.canUpdatePrices ? 'Change it to set a new selling price' : 'Only users who can edit products may change the selling price'}
                        onChange={(e) => update(l.key, { sellingPrice: e.target.value, spTouched: true })}
                        className={`${CELL_INPUT} ${changed ? '!border-indigo-500 font-semibold' : ''} ${spAboveMrp ? '!border-red-500' : ''}`}
                      />
                      {changed && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">This batch only</div>}
                      <DefaultPriceTick line={l} changed={changed} canUpdate={pricing.canUpdatePrices} onChange={(patch) => update(l.key, patch)} />
                      {spAboveMrp && <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Above MRP</div>}
                    </td>
                    <td className={`${TD} pt-4 text-right text-xs font-semibold whitespace-nowrap`}>
                      {margin === null ? (
                        <span className="text-[var(--vs-text-secondary)]">—</span>
                      ) : (
                        <span className={margin < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {margin}% / {formatINR(marginAmt)}
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      <input type="text" value={l.batchNo ?? ''} maxLength={60} disabled={!has} placeholder="Batch no" onChange={(e) => update(l.key, { batchNo: e.target.value })} className={CELL_INPUT} />
                    </td>
                    <td className={TD}>
                      <input type="date" value={l.expiryDate ?? ''} disabled={!has} onChange={(e) => update(l.key, { expiryDate: e.target.value })} className={CELL_INPUT} />
                      {l.trackBatch && <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">Batch-tracked product</div>}
                    </td>
                    <td className={`${TD} pt-4 text-right font-semibold whitespace-nowrap text-indigo-600 dark:text-indigo-400`}>{has ? formatINR(num(l.qty) * num(l.unitCost)) : '—'}</td>
                    <td className={`${TD} pt-3`}>
                      <button
                        type="button"
                        title="Remove line"
                        onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : [emptyLine()]))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[var(--vs-bg-secondary)]">
              <tr>
                <td className={`${TD} text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]`} colSpan={2}>
                  Total
                </td>
                <td className={`${TD} text-sm font-semibold`}>{formatQty(totalQty)}</td>
                <td className={TD} colSpan={8} />
                <td className={`${TD} text-right font-bold text-indigo-600 dark:text-indigo-400`}>{formatINR(totalValue)}</td>
                <td className={TD} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div>
          <Button size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, emptyLine()])} startIcon={<Plus className="w-3.5 h-3.5" />}>
            Add product
          </Button>
        </div>
        <p className="text-[11px] text-[var(--vs-text-secondary)]">
          Cost is per unit before GST. MRP and SP are per piece — change the SP only when the selling price should change. Price incl. GST = cost + the product's GST.
          Margin per piece = SP before GST − cost (₹), and that ÷ SP before GST (%).
        </p>
      </Section>

      <PriceChangeConfirm changes={pendingChanges} onClose={() => setPendingChanges([])} onConfirm={() => persist(true)} isLoading={saving} />
      <PurchaseToaster />
    </PageShell>
  );
}

/**
 * inventory/opening-stock/create
 * inventory/opening-stock/edit/:id (drafts only)
 */
export default function CreateOpeningStock() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const { data, error } = useApi(id ? `opening:${id}` : null, () => getOpeningStockByIdApi(id));
  const doc = data?.data || null;

  if (!encryptedId) return <OpeningStockForm doc={null} />;
  if (!id) return <PageLoading title="Edit opening stock" error="This link is not valid." />;
  if (!doc) return <PageLoading title="Edit opening stock" error={error} />;
  if (doc.status !== 'draft') return <PageLoading title={`Opening stock ${doc.openingNumber}`} error="Only unfinished opening stock can be edited." />;
  return <OpeningStockForm key={doc._id} doc={doc} />;
}
