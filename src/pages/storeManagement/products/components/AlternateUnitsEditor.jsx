import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { UNIT_OPTIONS, emptyAlternateUnit } from '../utils/productUtils';


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
          <span className="text-sm font-semibold text-ink">Alternate units</span>
          <p className="text-xs text-ink-muted m-0">
            Buy or sell in packs. Stock is always kept in {base}.
          </p>
        </div>
        <Button variant="soft" size="sm" onClick={add} disabled={rows.length >= 10} startIcon={<Plus />}>
          Add unit
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-ink-muted border border-dashed border-line-strong rounded-control px-3 py-3">
          No alternate units. Add one if you buy or sell this product by the box, pack or dozen.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1.2fr_auto] items-center gap-2 p-2 rounded-control border border-line bg-fill-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted shrink-0">1</span>
                <Input
                  size="sm"
                  list="product-unit-options"
                  value={row.unit}
                  placeholder="box"
                  onChange={(e) => update(idx, 'unit', e.target.value)}
                  invalid={!!errors[idx]?.unit}
                  className={errors[idx]?.unit ? undefined : 'bg-surface'}
                />
              </div>
              <span className="text-xs text-ink-muted text-center">=</span>
              <div className="flex items-center gap-2">
                <Input
                  size="sm"
                  type="number"
                  min="0"
                  step="any"
                  value={row.factor}
                  placeholder="12"
                  onChange={(e) => update(idx, 'factor', e.target.value)}
                  invalid={!!errors[idx]?.factor}
                  className={errors[idx]?.factor ? 'tabular-nums' : 'bg-surface tabular-nums'}
                />
                <span className="text-xs font-semibold text-ink shrink-0">{base}</span>
              </div>
              <Input
                size="sm"
                value={row.barcode || ''}
                placeholder="Pack barcode (optional)"
                onChange={(e) => update(idx, 'barcode', e.target.value)}
                className="bg-surface"
              />
              <Button
                variant="danger-soft"
                size="icon-sm"
                onClick={() => remove(idx)}
                className="justify-self-end"
                title="Remove unit"
                aria-label="Remove unit"
              >
                <Trash2 />
              </Button>
              {(errors[idx]?.unit || errors[idx]?.factor) && (
                <span className="text-xs font-medium text-danger sm:col-span-5">{errors[idx]?.unit || errors[idx]?.factor}</span>
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
