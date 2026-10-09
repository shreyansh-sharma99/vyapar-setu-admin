import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import AsyncSelect from './AsyncSelect';
import { productOptionsLoader } from './lookupService';
import { applyProduct, emptyLine, formatINR, lineAmounts, num, round2 } from './helpers';

const cellInput =
  'h-9 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60 disabled:opacity-60';
const th = 'py-2.5 px-2 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] border-b border-[var(--vs-border)] whitespace-nowrap';
const td = 'py-2 px-2 align-top border-b border-[var(--vs-border)]';

/**
 * Editable priced lines for purchase orders, bills and returns.
 *
 * options:
 *  - bucket:       show "return from" bucket + reason (returns)
 *  - lockProducts: lines come from another document; products can't be changed / added
 */
export default function PurchaseLineEditor({ lines, onChange, storeId, options = {}, submitted = false }) {
  const { bucket = false, lockProducts = false } = options;
  const loader = productOptionsLoader(storeId);

  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changeUnit = (line, unit) => {
    const from = line.units.find((u) => u.unit === line.unit)?.factor || 1;
    const to = line.units.find((u) => u.unit === unit)?.factor || 1;
    update(line.key, { unit, rate: round2((num(line.rate) / from) * to) });
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
    update(line.key, applyProduct(line, opt.data));
  };

  const remove = (key) => {
    const next = lines.filter((l) => l.key !== key);
    onChange(next.length ? next : [emptyLine()]);
  };

  const add = () => onChange([...lines, emptyLine()]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead className="bg-[var(--vs-bg-secondary)]">
            <tr>
              <th className={`${th} w-8`}>#</th>
              <th className={`${th} min-w-[240px]`}>Product</th>
              <th className={`${th} w-24`}>Unit</th>
              <th className={`${th} w-24`}>Qty</th>
              <th className={`${th} w-28`}>Rate (₹)</th>
              <th className={`${th} w-20`}>Disc %</th>
              <th className={`${th} w-20`}>GST %</th>
              {bucket && <th className={`${th} w-32`}>Return from</th>}
              {bucket && <th className={`${th} w-44`}>Reason</th>}
              <th className={`${th} w-28 text-right`}>Amount</th>
              {!lockProducts && <th className={`${th} w-10`} />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const amounts = lineAmounts(line);
              const missingProduct = submitted && !line.productId && lines.length > 1;
              const badQty = submitted && line.productId && num(line.qty) <= 0;
              return (
                <tr key={line.key} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                  <td className={`${td} pt-4 text-xs text-[var(--vs-text-secondary)]`}>{idx + 1}</td>
                  <td className={td}>
                    {lockProducts ? (
                      <div className="pt-1.5 font-medium">{line.productName}</div>
                    ) : (
                      <AsyncSelect
                        size="sm"
                        value={line.productId ? { value: line.productId, label: line.productName } : null}
                        onChange={(opt) => pickProduct(line, opt)}
                        loadOptions={loader}
                        placeholder="Search name, SKU or barcode"
                        error={missingProduct}
                      />
                    )}
                    {line.productId && (
                      <div className="mt-1 text-[11px] text-[var(--vs-text-secondary)] flex flex-wrap gap-x-2">
                        {line.sku && <span>SKU {line.sku}</span>}
                        {line.hsnCode && <span>HSN {line.hsnCode}</span>}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    {line.units.length > 1 ? (
                      <select value={line.unit} onChange={(e) => changeUnit(line, e.target.value)} className={`${cellInput} cursor-pointer`}>
                        {line.units.map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit}
                            {u.factor !== 1 ? ` (${u.factor})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="pt-2 text-sm">{line.unit || '—'}</div>
                    )}
                  </td>
                  <td className={td}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.qty}
                      onChange={(e) => update(line.key, { qty: e.target.value })}
                      className={`${cellInput} ${badQty ? '!border-red-500' : ''}`}
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(e) => update(line.key, { rate: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={line.discountPercent}
                      onChange={(e) => update(line.key, { discountPercent: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={line.taxPercent}
                      placeholder="Auto"
                      onChange={(e) => update(line.key, { taxPercent: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  {bucket && (
                    <td className={td}>
                      <select value={line.fromBucket} onChange={(e) => update(line.key, { fromBucket: e.target.value })} className={`${cellInput} cursor-pointer`}>
                        <option value="sellable">Sellable stock</option>
                        <option value="damaged">Damaged stock</option>
                      </select>
                    </td>
                  )}
                  {bucket && (
                    <td className={td}>
                      <input
                        type="text"
                        value={line.reason}
                        placeholder="e.g. Expired, defective"
                        onChange={(e) => update(line.key, { reason: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                  )}
                  <td className={`${td} pt-4 text-right font-semibold whitespace-nowrap text-indigo-600 dark:text-indigo-400`}>
                    {line.productId ? formatINR(amounts.total) : '—'}
                  </td>
                  {!lockProducts && (
                    <td className={`${td} pt-3`}>
                      <button
                        type="button"
                        title="Remove line"
                        onClick={() => remove(line.key)}
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
      {!lockProducts && (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={add} startIcon={<Plus className="w-3.5 h-3.5" />}>
            Add item
          </Button>
        </div>
      )}
      <p className="text-[11px] text-[var(--vs-text-secondary)]">
        Rates are per unit, before GST. Leave GST % empty to use the product&apos;s GST rate. Amounts here are a preview; the saved document shows the final figures.
      </p>
    </div>
  );
}
