import { Plus, Trash2 } from 'lucide-react';
import { UNIT_OPTIONS, emptyAlternateUnit } from '../utils/productUtils';

const inputCls =
  'w-full h-10 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-indigo-500';


/**
 * Editor for product.alternateUnits: rows of { unit, factor, barcode }.
 * "1 box = 12 pcs" → { unit: 'box', factor: 12 }.
 */
export default function AlternateUnitsEditor({ baseUnit, rows = [], onChange, errors = {} }) {
  const base = (baseUnit || '').trim() || 'base unit';

  const update = (idx, key, value) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };
  const add = () => onChange([...rows, emptyAlternateUnit()]);
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="text-sm font-semibold text-[var(--vs-text-primary)]">Alternate units</span>
          <p className="text-xs text-[var(--vs-text-secondary)] m-0">
            Buy or sell in packs. Stock is always kept in {base}.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= 10}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add unit
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-[var(--vs-text-secondary)] border border-dashed border-[var(--vs-border)] rounded-lg px-3 py-3">
          No alternate units. Add one if you buy or sell this product by the box, pack or dozen.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1.2fr_auto] items-center gap-2 p-2 rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--vs-text-secondary)] shrink-0">1</span>
                <input
                  type="text"
                  list="product-unit-options"
                  value={row.unit}
                  placeholder="box"
                  onChange={(e) => update(idx, 'unit', e.target.value)}
                  className={`${inputCls} ${errors[idx]?.unit ? '!border-rose-500' : ''}`}
                />
              </div>
              <span className="text-xs text-[var(--vs-text-secondary)] text-center">=</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={row.factor}
                  placeholder="12"
                  onChange={(e) => update(idx, 'factor', e.target.value)}
                  className={`${inputCls} ${errors[idx]?.factor ? '!border-rose-500' : ''}`}
                />
                <span className="text-xs font-semibold text-[var(--vs-text-primary)] shrink-0">{base}</span>
              </div>
              <input
                type="text"
                value={row.barcode || ''}
                placeholder="Pack barcode (optional)"
                onChange={(e) => update(idx, 'barcode', e.target.value)}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="h-10 w-10 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer justify-self-end"
                title="Remove unit"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {(errors[idx]?.unit || errors[idx]?.factor) && (
                <span className="text-xs text-rose-500 sm:col-span-5">{errors[idx]?.unit || errors[idx]?.factor}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <datalist id="product-unit-options">
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </div>
  );
}
