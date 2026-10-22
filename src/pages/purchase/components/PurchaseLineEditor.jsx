import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import AsyncSelect from './AsyncSelect';
import { productOptionsLoader } from './lookupService';
import { applyProduct, emptyLine, formatINR, num, round2 } from './helpers';
import { shownMrp, shownSp, spChanged, stockInFields } from './stockInPricing';
import { CELL_INPUT, TD, TH, lineValue, priceInclGst, profitPerPiece, sumRows } from './itemTable';
import { AmountCell, AmountHead, DefaultPriceTick, GstCell, ProfitCell, TotalAmountCell, TotalProfitCell } from './ItemTableBits';

const req = <span className="text-rose-500">*</span>;

/**
 * Editable priced lines for purchase bills and returns, laid out like the purchase order:
 * qty, cost price (before GST), GST from the product (read-only), price incl. GST and an
 * Amount column that shows amounts with or without GST, with totals in the footer.
 *
 * options:
 *  - bucket:       show the reason column (returns; good / damaged stock is picked by the server)
 *  - lockProducts: lines come from another document; products can't be changed / added
 *  - stockIn:      { prices, canUpdatePrices } — lines bring goods into stock (direct bill):
 *                  SP, MRP (required), batch, expiry, low-stock alert, profit
 */
export default function PurchaseLineEditor({ lines, onChange, storeId, options = {}, submitted = false }) {
  const { bucket = false, lockProducts = false, stockIn = null, gstRates = null } = options;
  /** gstRates (direct bill): today's GST master rate per product; else the line's own GST (from the GRN / bill). */
  const taxOf = (line) => {
    const info = gstRates ? gstRates[String(line.productId)] : null;
    return info && info.gstRate !== undefined ? num(info.gstRate) : num(line.taxPercent);
  };
  const [mode, setMode] = useState('incl');
  const factorOf = (l) => l.units.find((u) => u.unit === l.unit)?.factor || 1;
  const loader = productOptionsLoader(storeId);

  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changeUnit = (line, unit) => {
    const to = line.units.find((u) => u.unit === unit)?.factor || 1;
    update(line.key, { unit, rate: round2((num(line.rate) / factorOf(line)) * to) });
  };

  const pickProduct = (line, opt) => {
    if (!opt) {
      update(line.key, { ...emptyLine(), key: line.key });
      return;
    }
    const exists = lines.find((l) => l.key !== line.key && l.productId === opt.value && !bucket);
    if (exists) {
      onChange(lines.filter((l) => l.key !== line.key).map((l) => (l.key === exists.key ? { ...l, qty: num(l.qty) + 1 } : l)));
      return;
    }
    update(line.key, { ...applyProduct(line, opt.data), ...stockInFields(opt.data) });
  };

  const remove = (key) => {
    const next = lines.filter((l) => l.key !== key);
    onChange(next.length ? next : [emptyLine()]);
  };

  const rows = lines.map((line) => {
    const has = !!line.productId;
    const tax = taxOf(line);
    const costIncl = priceInclGst(line.rate, tax, line.discountPercent);
    const value = lineValue(line.qty, line.rate, tax, line.discountPercent);
    const info = stockIn ? stockIn.prices[String(line.productId)] : null;
    const sp = stockIn ? shownSp(line, info) : '';
    const mrp = stockIn ? shownMrp(line, info) : '';
    const pieces = num(line.qty) * factorOf(line);
    const profit = stockIn && has ? profitPerPiece(sp, mrp, costIncl / factorOf(line)) : null;
    return { line, has, tax, costIncl, value, info, sp, mrp, pieces, profit };
  });
  const totals = sumRows(rows.filter((r) => r.has).map((r) => ({ qty: r.line.qty, ...r.value, profit: r.profit ? r.profit.perUnit * r.pieces : null })));
  const middleCols = 3 + (stockIn ? 5 : 0) + (bucket ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
        <table className={`w-full text-sm border-collapse ${stockIn ? 'min-w-[1700px]' : 'min-w-[1000px]'}`}>
          <thead className="bg-[var(--vs-bg-secondary)]">
            <tr>
              <th className={`${TH} w-8`}>#</th>
              <th className={`${TH} min-w-[220px]`}>Product {!lockProducts && req}</th>
              <th className={`${TH} min-w-[90px]`}>Qty {req}</th>
              <th className={`${TH} min-w-[120px]`}>Cost price (₹) {req}</th>
              <th className={`${TH} w-20 text-center`}>GST</th>
              <th className={`${TH} w-28 text-right`}>Price incl. GST</th>
              {stockIn && (
                <>
                  <th className={`${TH} min-w-[130px]`}>SP for this batch (₹)</th>
                  <th className={`${TH} min-w-[120px]`}>MRP (₹) {req}</th>
                  <th className={`${TH} min-w-[120px]`}>Batch no</th>
                  <th className={`${TH} min-w-[150px]`}>Expiry date</th>
                  <th className={`${TH} min-w-[110px]`}>Low stock alert</th>
                </>
              )}
              {bucket && <th className={`${TH} w-44`}>Reason</th>}
              {stockIn && <th className={`${TH} w-32 text-right`}>Profit</th>}
              <AmountHead className={`${TH} w-40`} mode={mode} onModeChange={setMode} />
              {!lockProducts && <th className={`${TH} w-10`} />}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, has, tax, costIncl, value, info, sp, mrp, pieces, profit }, idx) => {
              const missingProduct = submitted && !has && lines.length > 1;
              const badQty = submitted && has && num(line.qty) <= 0;
              const badRate = submitted && has && !(num(line.rate) > 0);
              const changed = stockIn && spChanged(line, info);
              const spAboveMrp = num(sp) > 0 && num(mrp) > 0 && num(sp) > num(mrp);
              const mrpMissing = !!stockIn && submitted && has && !(num(mrp) > 0);
              const noPriceYet = info && !(num(info.sellingPrice) > 0) && !line.spTouched;
              return (
                <tr key={line.key} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                  <td className={`${TD} pt-4 text-xs text-[var(--vs-text-secondary)]`}>{idx + 1}</td>
                  <td className={TD}>
                    {lockProducts ? (
                      <div className="pt-1.5 font-medium">{line.productName}</div>
                    ) : (
                      <AsyncSelect
                        size="sm"
                        value={has ? { value: line.productId, label: line.productName } : null}
                        onChange={(opt) => pickProduct(line, opt)}
                        loadOptions={loader}
                        placeholder="Search name, SKU or barcode"
                        error={missingProduct}
                      />
                    )}
                    {has && (
                      <div className="mt-1 text-[11px] text-[var(--vs-text-secondary)] flex flex-wrap items-center gap-x-2">
                        {line.sku && <span>SKU {line.sku}</span>}
                        {line.hsnCode && <span>HSN {line.hsnCode}</span>}
                        {line.units.length > 1 ? (
                          <select value={line.unit} onChange={(e) => changeUnit(line, e.target.value)} className="h-6 rounded border border-[var(--vs-border)] bg-transparent px-1 text-[11px] cursor-pointer">
                            {line.units.map((u) => (
                              <option key={u.unit} value={u.unit}>
                                per {u.unit}
                                {u.factor !== 1 ? ` (${u.factor} pcs)` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>
                            per {line.unit || 'pc'}
                            {factorOf(line) !== 1 ? ` (${factorOf(line)} pcs)` : ''}
                          </span>
                        )}
                        {num(line.discountPercent) > 0 && <span>Disc {num(line.discountPercent)}%</span>}
                      </div>
                    )}
                  </td>
                  <td className={TD}>
                    <input type="number" min="0" step="any" value={line.qty} onChange={(e) => update(line.key, { qty: e.target.value })} className={`${CELL_INPUT} ${badQty ? '!border-red-500' : ''}`} />
                  </td>
                  <td className={TD}>
                    <input type="number" min="0" step="0.01" value={line.rate} onChange={(e) => update(line.key, { rate: e.target.value })} className={`${CELL_INPUT} ${badRate ? '!border-red-500' : ''}`} />
                    <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">before GST</div>
                  </td>
                  <GstCell taxPercent={tax} has={has} />
                  <td className={`${TD} pt-4 text-right font-mono text-xs whitespace-nowrap`}>{has ? formatINR(costIncl) : '—'}</td>
                  {stockIn && (
                    <>
                      <td className={TD}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={noPriceYet ? '' : sp}
                          disabled={!has || !stockIn.canUpdatePrices}
                          placeholder={noPriceYet ? 'Not set yet' : 'Optional'}
                          title={stockIn.canUpdatePrices ? 'Change it to set a new selling price' : 'Only users who can edit products may change the selling price'}
                          onChange={(e) => update(line.key, { sellingPrice: e.target.value, spTouched: true })}
                          className={`${CELL_INPUT} ${changed ? '!border-indigo-500 font-semibold' : ''} ${spAboveMrp ? '!border-red-500' : ''}`}
                        />
                        {changed && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">This batch only</div>}
                        <DefaultPriceTick line={line} changed={changed} canUpdate={stockIn.canUpdatePrices} onChange={(patch) => update(line.key, patch)} />
                        {spAboveMrp && <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Above MRP</div>}
                      </td>
                      <td className={TD}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={mrp}
                          disabled={!has}
                          placeholder="Required"
                          onChange={(e) => update(line.key, { mrp: e.target.value, mrpTouched: true })}
                          className={`${CELL_INPUT} ${mrpMissing ? '!border-red-500' : ''}`}
                        />
                      </td>
                      <td className={TD}>
                        <input type="text" value={line.batchNo ?? ''} maxLength={60} disabled={!has} placeholder="Batch no" onChange={(e) => update(line.key, { batchNo: e.target.value })} className={CELL_INPUT} />
                      </td>
                      <td className={TD}>
                        <input type="date" value={line.expiryDate ?? ''} disabled={!has} onChange={(e) => update(line.key, { expiryDate: e.target.value })} className={CELL_INPUT} />
                      </td>
                      <td className={TD}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.lowStockAlert ?? ''}
                          disabled={!has}
                          placeholder="e.g. 5"
                          title="Alert when this product's stock in this store falls to this number"
                          onChange={(e) => update(line.key, { lowStockAlert: e.target.value })}
                          className={CELL_INPUT}
                        />
                      </td>
                    </>
                  )}
                  {bucket && (
                    <td className={TD}>
                      <input type="text" value={line.reason} placeholder="e.g. Expired, defective" onChange={(e) => update(line.key, { reason: e.target.value })} className={CELL_INPUT} />
                    </td>
                  )}
                  {stockIn && <ProfitCell profit={profit} pieces={pieces} />}
                  <AmountCell value={value} mode={mode} has={has} />
                  {!lockProducts && (
                    <td className={`${TD} pt-3`}>
                      <button type="button" title="Remove line" onClick={() => remove(line.key)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[var(--vs-bg-secondary)]">
            <tr>
              <td className={`${TD} text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]`} colSpan={2}>
                Total
              </td>
              <td className={`${TD} text-sm font-semibold`}>{totals.qty}</td>
              <td className={TD} colSpan={middleCols} />
              {stockIn && <TotalProfitCell totals={totals} />}
              <TotalAmountCell totals={totals} mode={mode} />
              {!lockProducts && <td className={TD} />}
            </tr>
          </tfoot>
        </table>
      </div>
      {!lockProducts && (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, emptyLine()])} startIcon={<Plus className="w-3.5 h-3.5" />}>
            Add item
          </Button>
        </div>
      )}
      <p className="text-[11px] text-[var(--vs-text-secondary)]">
        Cost price is per unit before GST; GST comes from the product. Amounts here are a preview — the summary (with discount, freight and round off)
        and the saved document show the final figures.
        {stockIn && ' SP and MRP are per piece — change the SP only when the selling price should change. Profit = SP (or MRP when no SP) − price incl. GST.'}
      </p>
    </div>
  );
}
