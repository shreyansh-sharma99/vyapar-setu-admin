import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import AsyncSelect from './AsyncSelect';
import { productOptionsLoader } from './lookupService';
import { applyProduct, emptyLine, formatINR, num } from './helpers';
import { CELL_INPUT, TD, TH, lineValue, priceInclGst, profitPerPiece, sumRows } from './itemTable';
import { AmountCell, AmountHead, GstCell, ProfitCell, TotalAmountCell, TotalProfitCell } from './ItemTableBits';
import { useStockInPricing } from './stockInPricing';

const req = <span className="text-rose-500">*</span>;

/**
 * Purchase order lines: product, qty, cost price (required), GST from the product,
 * cost incl. GST, and the SP / MRP / expiry / low-stock alert planned for the goods receipt,
 * with the profit per piece. Qty and prices are per piece (the product's base unit).
 * The Amount column shows amounts with or without GST; the footer adds them up.
 */
export default function PurchaseOrderLineEditor({ lines, onChange, storeId, submitted = false }) {
  const [mode, setMode] = useState('incl');
  const loader = productOptionsLoader(storeId);
  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (line, opt) => {
    if (!opt) {
      update(line.key, { ...emptyLine(), key: line.key });
      return;
    }
    const exists = lines.find((l) => l.key !== line.key && l.productId === opt.value);
    if (exists) {
      onChange(lines.filter((l) => l.key !== line.key).map((l) => (l.key === exists.key ? { ...l, qty: num(l.qty) + 1 } : l)));
      return;
    }
    update(line.key, applyProduct(line, opt.data));
  };

  const remove = (key) => {
    const next = lines.filter((l) => l.key !== key);
    onChange(next.length ? next : [emptyLine()]);
  };

  // GST from the GST master (Master Settings → GST Rates) — the server saves the same rate
  const gstInfo = useStockInPricing(lines.map((l) => l.productId));
  const taxOf = (line) => {
    const info = gstInfo.prices[String(line.productId)];
    return info && info.gstRate !== undefined ? num(info.gstRate) : num(line.taxPercent);
  };

  const rows = lines.map((line) => {
    const has = !!line.productId;
    const tax = taxOf(line);
    // a PO has no line discount (saved as 0)
    const costIncl = priceInclGst(line.rate, tax);
    const value = lineValue(line.qty, line.rate, tax);
    const profit = has ? profitPerPiece(line.sellingPrice, line.mrp, costIncl) : null;
    return { line, has, tax, costIncl, value, profit };
  });
  const totals = sumRows(
    rows.filter((r) => r.has).map((r) => ({ qty: r.line.qty, ...r.value, profit: r.profit ? r.profit.perUnit * num(r.line.qty) : null }))
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
        <table className="w-full text-sm border-collapse min-w-[1550px]">
          <thead className="bg-[var(--vs-bg-secondary)]">
            <tr>
              <th className={`${TH} w-8`}>#</th>
              <th className={`${TH} min-w-[220px]`}>Product {req}</th>
              <th className={`${TH} min-w-[90px]`}>Qty {req}</th>
              <th className={`${TH} min-w-[120px]`}>Cost price (₹) {req}</th>
              <th className={`${TH} w-20 text-center`}>GST</th>
              <th className={`${TH} w-28 text-right`}>Price incl. GST</th>
              <th className={`${TH} min-w-[120px]`}>SP (₹)</th>
              <th className={`${TH} min-w-[120px]`}>MRP (₹)</th>
              <th className={`${TH} min-w-[150px]`}>Expiry date</th>
              <th className={`${TH} min-w-[110px]`}>Low stock alert</th>
              <th className={`${TH} w-32 text-right`}>Profit</th>
              <AmountHead className={`${TH} w-40`} mode={mode} onModeChange={setMode} />
              <th className={`${TH} w-10`} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, has, tax, costIncl, value, profit }, idx) => {
              const missingProduct = submitted && !has && lines.length > 1;
              const badQty = submitted && has && num(line.qty) <= 0;
              const badRate = submitted && has && !(num(line.rate) > 0);
              const spAboveMrp = num(line.sellingPrice) > 0 && num(line.mrp) > 0 && num(line.sellingPrice) > num(line.mrp);
              return (
                <tr key={line.key} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                  <td className={`${TD} pt-4 text-xs text-[var(--vs-text-secondary)]`}>{idx + 1}</td>
                  <td className={TD}>
                    <AsyncSelect
                      size="sm"
                      value={has ? { value: line.productId, label: line.productName } : null}
                      onChange={(opt) => pickProduct(line, opt)}
                      loadOptions={loader}
                      placeholder="Search name, SKU or barcode"
                      error={missingProduct}
                    />
                    {has && (
                      <div className="mt-1 text-[11px] text-[var(--vs-text-secondary)] flex flex-wrap gap-x-2">
                        {line.sku && <span>SKU {line.sku}</span>}
                        {line.hsnCode && <span>HSN {line.hsnCode}</span>}
                        <span>per {line.unit || 'pc'}</span>
                      </div>
                    )}
                  </td>
                  <td className={TD}>
                    <input type="number" min="0" step="any" value={line.qty} onChange={(e) => update(line.key, { qty: e.target.value })} className={`${CELL_INPUT} ${badQty ? '!border-red-500' : ''}`} />
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(e) => update(line.key, { rate: e.target.value })}
                      className={`${CELL_INPUT} ${badRate ? '!border-red-500' : ''}`}
                    />
                    <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5">before GST</div>
                  </td>
                  <GstCell taxPercent={tax} has={has} />
                  <td className={`${TD} pt-4 text-right font-mono text-xs whitespace-nowrap`}>{has ? formatINR(costIncl) : '—'}</td>
                  <td className={TD}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.sellingPrice}
                      disabled={!has}
                      placeholder="Optional"
                      onChange={(e) => update(line.key, { sellingPrice: e.target.value })}
                      className={`${CELL_INPUT} ${spAboveMrp ? '!border-amber-500' : ''}`}
                    />
                    {spAboveMrp && <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Above MRP</div>}
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.mrp}
                      disabled={!has}
                      placeholder={num(line.productMrp) > 0 ? String(line.productMrp) : 'Optional'}
                      onChange={(e) => update(line.key, { mrp: e.target.value })}
                      className={CELL_INPUT}
                    />
                  </td>
                  <td className={TD}>
                    <input type="date" value={line.expiryDate || ''} disabled={!has} onChange={(e) => update(line.key, { expiryDate: e.target.value })} className={CELL_INPUT} />
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.lowStockAlert}
                      disabled={!has}
                      placeholder="e.g. 5"
                      title="Alert when this product's stock in the store falls to this number (set when the goods arrive)"
                      onChange={(e) => update(line.key, { lowStockAlert: e.target.value })}
                      className={CELL_INPUT}
                    />
                  </td>
                  <ProfitCell profit={profit} pieces={line.qty} />
                  <AmountCell value={value} mode={mode} has={has} />
                  <td className={`${TD} pt-3`}>
                    <button type="button" title="Remove line" onClick={() => remove(line.key)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer">
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
              <td className={`${TD} text-sm font-semibold`}>{totals.qty}</td>
              <td className={TD} colSpan={7} />
              <TotalProfitCell totals={totals} />
              <TotalAmountCell totals={totals} mode={mode} />
              <td className={TD} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, emptyLine()])} startIcon={<Plus className="w-3.5 h-3.5" />}>
          Add item
        </Button>
      </div>
      <p className="text-[11px] text-[var(--vs-text-secondary)]">
        Cost price is per piece before GST; GST comes from the product. Profit = SP (or MRP when no SP) − price incl. GST. SP, MRP, expiry and the
        low-stock alert are filled in on the goods receipt when the order arrives. The document total (with discount, freight and round off) is in the
        summary.
      </p>
    </div>
  );
}
