/* Shared building blocks for the inventory screens */
import { useCallback } from 'react';
import { Badge, Select, ToastStack } from '@/components/ui';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { searchProductsLookupApi } from '../services/inventoryService';
import { formatQty } from './inventoryUtils';

/* ─── Toasts ────────────────────────────────────────────────────────────── */

export const InventoryToaster = ({ toasts }) => (
  <ToastStack toasts={toasts} />
);

/* ─── Stock status pill ─────────────────────────────────────────────────── */

const STATUS_PILLS = {
  in: { label: 'In Stock', icon: CheckCircle2, tone: 'success' },
  low: { label: 'Low Stock', icon: AlertTriangle, tone: 'warning' },
  out: { label: 'Out of Stock', icon: XCircle, tone: 'danger' },
};

export const StockStatusPill = ({ status }) => {
  const pill = STATUS_PILLS[status] || STATUS_PILLS.in;
  return (
    <Badge tone={pill.tone} icon={pill.icon}>
      {pill.label}
    </Badge>
  );
};

/** Product name + SKU cell. */
export const ProductCell = ({ name, sku, sub }) => (
  <div className="flex flex-col leading-tight">
    <span className="text-sm font-semibold text-ink">{name || 'Deleted Product'}</span>
    <span className="font-mono text-[11px] text-ink-subtle">
      {sku ? `SKU: ${sku}` : 'No SKU'}
      {sub ? ` · ${sub}` : ''}
    </span>
  </div>
);

/* ─── Async product picker ──────────────────────────────────────────────── */

const productOptionLabel = (p) => `${p.name}${p.sku ? ` · ${p.sku}` : ''}`;

const toOption = (p) => ({
  value: p._id,
  label: productOptionLabel(p),
  product: p,
  element: (
    <span className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium">
          {p.name}
          {p.status === 'inactive' && <span className="ml-1 text-[10px] text-danger">(Inactive)</span>}
        </span>
        <span className="truncate font-mono text-[11px] text-ink-subtle">
          {[p.sku, p.barcode].filter(Boolean).join(' · ') || 'No SKU'}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-ink-muted tabular-nums">
        {formatQty(p.currentStock)} {p.unit || ''}
      </span>
    </span>
  ),
});

/**
 * Searches GET /lookups/products as the user types (debounced, max 20 rows).
 * `value` / `onChange` work with the full product object (or null).
 * Each option shows the product's sellable qty (currentStock).
 */
export const ProductSearchSelect = ({
  value,
  onChange,
  includeInactive = true,
  placeholder = 'Search by name, SKU or barcode...',
  status,
  disabled,
  className,
  id,
  ...rest
}) => {
  const loadOptions = useCallback(
    async (q) => {
      try {
        const res = await searchProductsLookupApi({
          q: q?.trim() || undefined,
          limit: 20,
          includeInactive,
        });
        return (Array.isArray(res?.data) ? res.data : []).map(toOption);
      } catch {
        return [];
      }
    },
    [includeInactive]
  );

  return (
    <Select
      id={id}
      aria-describedby={rest['aria-describedby']}
      value={value?._id || ''}
      // Keeps the selected product's label visible even when it is not in the latest results
      options={value ? [toOption(value)] : []}
      loadOptions={loadOptions}
      onChange={(_, opt) => onChange(opt?.product || null)}
      placeholder={placeholder}
      clearable
      invalid={status === 'error' || rest['aria-invalid'] === true}
      disabled={disabled}
      emptyText="No products found"
      wrapperClassName={className}
    />
  );
};
