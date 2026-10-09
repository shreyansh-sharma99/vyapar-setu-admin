/* Shared building blocks for the inventory screens */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { ConfigProvider, Select as AntSelect, theme as antdTheme } from 'antd';
import {
  Boxes,
  SlidersHorizontal,
  LayoutGrid,
  AlertOctagon,
  ShoppingCart,
  IndianRupee,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { searchProductsLookupApi } from '../services/inventoryService';
import { formatQty, storeLabel } from './inventoryUtils';

/* ─── Toasts ────────────────────────────────────────────────────────────── */

export const InventoryToaster = ({ toasts }) => (
  <CToaster className="p-3" style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}>
    {toasts.map((t) => (
      <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2">
        <div className="d-flex">
          <CToastBody className="font-semibold">{t.message}</CToastBody>
        </div>
      </CToast>
    ))}
  </CToaster>
);

/* ─── antd theme (light / dark) ─────────────────────────────────────────── */

export const AntdThemed = ({ children }) => {
  const isDark = useDarkMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#4f46e5', borderRadius: 8, fontSize: 13 },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

/** Small label + control wrapper used in filter bars. */
export const FilterField = ({ label, children, className = '' }) => (
  <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
    <span className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">{label}</span>
    {children}
  </div>
);

/** Filter bar container (wraps on small screens). */
export const FilterBar = ({ children }) => (
  <div className="mb-2 p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2 items-end">
    {children}
  </div>
);

/* ─── Store dropdown ────────────────────────────────────────────────────── */

export const StoreSelect = ({
  stores = [],
  value,
  onChange,
  placeholder = 'All Stores',
  allowClear = true,
  activeOnly = false,
  status,
  disabled,
  className = 'w-full',
}) => (
  <AntSelect
    value={value || undefined}
    onChange={(val) => onChange(val || '')}
    placeholder={placeholder}
    allowClear={allowClear}
    showSearch={{ optionFilterProp: 'label' }}
    status={status}
    disabled={disabled}
    options={stores
      .filter((s) => !activeOnly || s.isActive !== false)
      .map((s) => ({ value: s._id, label: `${storeLabel(s)}${s.isActive === false ? ' (Inactive)' : ''}` }))}
    className={className}
  />
);

/* ─── Stock status pill ─────────────────────────────────────────────────── */

const STATUS_PILLS = {
  in: {
    label: 'In Stock',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  },
  low: {
    label: 'Low Stock',
    icon: AlertTriangle,
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  },
  out: {
    label: 'Out of Stock',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  },
};

export const StockStatusPill = ({ status }) => {
  const pill = STATUS_PILLS[status] || STATUS_PILLS.in;
  const Icon = pill.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pill.className}`}>
      <Icon className="w-3 h-3" />
      {pill.label}
    </span>
  );
};

/** Product name + SKU cell. */
export const ProductCell = ({ name, sku, sub }) => (
  <div className="flex flex-col leading-tight">
    <span className="font-semibold text-sm text-[var(--vs-text-primary)]">{name || 'Deleted Product'}</span>
    <span className="text-[11px] font-mono text-[var(--vs-text-secondary)]">
      {sku ? `SKU: ${sku}` : 'No SKU'}
      {sub ? ` · ${sub}` : ''}
    </span>
  </div>
);

/* ─── Inventory section links ───────────────────────────────────────────── */

const INVENTORY_LINKS = [
  { key: 'list', label: 'Inventory', to: '/inventory', icon: Boxes },
  { key: 'adjust', label: 'Adjust Stock', to: '/inventory/adjust', icon: SlidersHorizontal },
  { key: 'store-wise', label: 'Store-wise', to: '/inventory/store-wise', icon: LayoutGrid },
  { key: 'damaged', label: 'Damaged', to: '/inventory/damaged', icon: AlertOctagon },
  { key: 'reorder', label: 'Reorder', to: '/inventory/reorder', icon: ShoppingCart },
  { key: 'valuation', label: 'Valuation', to: '/inventory/valuation', icon: IndianRupee },
  { key: 'audit', label: 'Audit Report', to: '/inventory/audit-report', icon: History },
];

/** Compact button row linking the inventory screens; `current` is highlighted. */
export const InventoryNav = ({ current, exclude = [] }) => {
  const navigate = useNavigate();
  return (
    // One scrollable row of tabs at the top of the page body (never squeezes the page title).
    <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-2 mb-3 border-b border-[var(--vs-border)]">
      {INVENTORY_LINKS.filter((l) => !exclude.includes(l.key)).map((l) => {
        const Icon = l.icon;
        const active = l.key === current;
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => !active && navigate(l.to)}
            className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${active
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] border-[var(--vs-border)] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {l.label}
          </button>
        );
      })}
    </div>
  );
};

/* ─── Async product picker ──────────────────────────────────────────────── */

const productOptionLabel = (p) => `${p.name}${p.sku ? ` · ${p.sku}` : ''}`;

/**
 * Searches GET /lookups/products as the user types (debounced, max 20 rows).
 * `value` / `onChange` work with the full product object (or null).
 * With `storeId`, each option shows that store's sellable qty.
 */
export const ProductSearchSelect = ({
  value,
  onChange,
  storeId,
  includeInactive = true,
  placeholder = 'Search by name, SKU or barcode...',
  status,
  disabled,
  className = 'w-full',
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0);

  const runSearch = useCallback(
    (q) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const id = ++seq.current;
        setLoading(true);
        try {
          const res = await searchProductsLookupApi({
            q: q?.trim() || undefined,
            storeId: storeId || undefined,
            limit: 20,
            includeInactive,
          });
          if (id === seq.current) setOptions(Array.isArray(res?.data) ? res.data : []);
        } catch {
          if (id === seq.current) setOptions([]);
        } finally {
          if (id === seq.current) setLoading(false);
        }
      }, 300);
    },
    [storeId, includeInactive]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  // Keep the selected product visible even when it is not in the latest results
  const list = value && !options.some((p) => p._id === value._id) ? [value, ...options] : options;

  return (
    <AntSelect
      value={value?._id || undefined}
      placeholder={placeholder}
      allowClear
      status={status}
      disabled={disabled}
      loading={loading}
      showSearch={{ filterOption: false, onSearch: runSearch }}
      onOpenChange={(open) => open && runSearch('')}
      notFoundContent={loading ? 'Searching...' : 'No products found'}
      onChange={(id) => onChange(id ? list.find((p) => p._id === id) || null : null)}
      options={list.map((p) => ({ value: p._id, label: productOptionLabel(p), product: p }))}
      optionRender={(opt) => {
        const p = opt.data.product;
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-medium truncate">
                {p.name}
                {p.status === 'inactive' && <span className="ml-1 text-[10px] text-rose-500">(Inactive)</span>}
              </span>
              <span className="text-[11px] opacity-60 font-mono truncate">
                {[p.sku, p.barcode].filter(Boolean).join(' · ') || 'No SKU'}
              </span>
            </div>
            <span className="text-[11px] font-semibold opacity-75 shrink-0">
              {formatQty(storeId && p.storeStock !== undefined ? p.storeStock : p.currentStock)} {p.unit || ''}
            </span>
          </div>
        );
      }}
      className={className}
    />
  );
};
