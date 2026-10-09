/* Shared building blocks for Stock Audit Report & Product Audit Report */
import {
  Filter,
  FilterX,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeftRight,
  Truck,
  Undo2,
  ClipboardCheck,
  AlertOctagon,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
  History,
} from 'lucide-react';
import { ConfigProvider, DatePicker, Select as AntSelect, theme as antdTheme } from 'antd';
import dayjs from 'dayjs';
import Button from '@/components/inputs/Button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { SOURCE_OPTIONS, BUCKET_OPTIONS, getActorName } from './auditReportUtils';

const { RangePicker } = DatePicker;

const DATE_PRESETS = [
  { label: 'Today', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'Yesterday', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: 'Last 7 Days', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Last 30 Days', value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('day')] },
  { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

const SOURCE_BADGES = {
  sales_invoice: {
    label: 'Sold (Invoice)',
    icon: ArrowDownLeft,
    className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  product_create: {
    label: 'Stock Added',
    icon: ArrowUpRight,
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  sales_return: {
    label: 'Sales Return',
    icon: RefreshCw,
    className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  stock_transfer: {
    label: 'Stock Transfer',
    icon: ArrowLeftRight,
    className: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  manual_adjust: {
    label: 'Manual Adjust',
    icon: SlidersHorizontal,
    className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  opening_stock: {
    label: 'Opening Stock',
    icon: ArrowUpRight,
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  invoice_void: {
    label: 'Invoice Voided',
    icon: RefreshCw,
    className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  sales_return_reversal: {
    label: 'Return Rejected',
    icon: XCircle,
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  delivery_challan: {
    label: 'Delivery Challan',
    icon: ArrowDownLeft,
    className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  challan_cancel: {
    label: 'Challan Cancelled',
    icon: Undo2,
    className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  purchase_receipt: {
    label: 'Purchase Received',
    icon: Truck,
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  purchase_receipt_cancel: {
    label: 'Receipt Cancelled',
    icon: Undo2,
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  purchase_return: {
    label: 'Purchase Return',
    icon: ArrowDownLeft,
    className: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  purchase_return_cancel: {
    label: 'Return Cancelled',
    icon: Undo2,
    className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  stock_count: {
    label: 'Stock Count',
    icon: ClipboardCheck,
    className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  damage_mark: {
    label: 'Marked Damaged',
    icon: AlertOctagon,
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  damage_restore: {
    label: 'Damage Restored',
    icon: RotateCcw,
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  damage_write_off: {
    label: 'Written Off',
    icon: Trash2,
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  bulk_import: {
    label: 'Bulk Import',
    icon: Upload,
    className: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
};

const FALLBACK_BADGE = {
  icon: History,
  className: 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10',
};

/* ─── Cells ─────────────────────────────────────────────────────────────── */

export const SourceBadge = ({ log }) => {
  const badge = SOURCE_BADGES[log.source] || FALLBACK_BADGE;
  const Icon = badge.icon;
  const label = log.sourceLabel || badge.label || log.source || 'Stock Change';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.className}`}>
      <Icon className="w-3 h-3" />
      {label}
      {log.source === 'manual_adjust' && log.action ? ` (${log.action})` : ''}
    </span>
  );
};

export const DeltaBadge = ({ delta }) => {
  const isPositive = delta > 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${isPositive
        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
        }`}
    >
      {isPositive ? `+${delta}` : delta}
    </span>
  );
};

export const StockChange = ({ before, after }) => (
  <span className="font-mono text-xs">
    <span className="text-gray-400">{before ?? 0}</span>
    <span className="mx-1 text-gray-300">→</span>
    <span className="font-bold text-[var(--vs-text-primary)]">{after ?? 0}</span>
  </span>
);

const inr = (n) =>
  `₹${Math.abs(Number(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Sellable / damaged stock bucket of a movement. */
export const BucketBadge = ({ bucket }) =>
  bucket === 'damaged' ? (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
      Damaged
    </span>
  ) : (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
      Sellable
    </span>
  );

/** Signed movement value (+ in / − out) with unit cost below. */
export const ValueCell = ({ log }) => {
  if (!log.value && !log.unitCost) return <span className="text-gray-400">-</span>;
  const isIn = Number(log.value) >= 0;
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={`font-mono text-xs font-bold ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {isIn ? '+' : '-'}
        {inr(log.value)}
      </span>
      {log.unitCost ? <span className="text-[10px] text-[var(--vs-text-secondary)]">@ {inr(log.unitCost)}</span> : null}
    </div>
  );
};

export const ActorCell = ({ log }) => {
  const name = getActorName(log);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-xs text-[var(--vs-text-primary)]">{name}</span>
        <span className="text-[10px] text-[var(--vs-text-secondary)] capitalize">
          {log.actorRole || log.actorId?.role || 'Staff'}
        </span>
      </div>
    </div>
  );
};

/* ─── Filters ───────────────────────────────────────────────────────────── */

export const FilterToggleButton = ({ open, activeCount, onClick }) => (
  <Button
    variant="outline"
    onClick={onClick}
    aria-expanded={open}
    className={open || activeCount ? '!border-indigo-500 !text-indigo-600 dark:!text-indigo-400' : ''}
    startIcon={<Filter className="w-4 h-4" />}
  >
    Filters
    {activeCount > 0 && (
      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
        {activeCount}
      </span>
    )}
  </Button>
);

/**
 * Collapsible filter panel (store, activity, date range) using antd controls.
 * Stays mounted and animates height + opacity when `open` changes.
 */
export const AuditFilterPanel = ({
  open,
  stores = [],
  selectedStore,
  onStoreChange,
  selectedSource,
  onSourceChange,
  sourceOptions = SOURCE_OPTIONS,
  selectedBucket,
  onBucketChange,
  dateRange,
  onDateRangeChange,
  onReset,
  canReset,
}) => {
  const isDark = useDarkMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#4f46e5', borderRadius: 8, fontSize: 13 },
      }}
    >
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100 mb-2' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] grid grid-cols-1 sm:grid-cols-2 ${onBucketChange ? 'lg:grid-cols-[1fr_1fr_0.8fr_1.4fr_auto]' : 'lg:grid-cols-[1fr_1fr_1.4fr_auto]'} gap-x-3 gap-y-2 items-end transition-transform duration-300 ease-in-out ${open ? 'translate-y-0' : '-translate-y-2'}`}
          >
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">Store / Warehouse</span>
              <AntSelect
                value={selectedStore || undefined}
                onChange={(val) => onStoreChange(val || '')}
                placeholder="All Stores"
                allowClear
                showSearch
                optionFilterProp="label"
                options={stores.map((s) => ({
                  value: s._id,
                  label: `${s.name}${s.code ? ` [${s.code}]` : ''}${s.isDefault ? ' (Default)' : ''}`,
                }))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">Activity</span>
              <AntSelect
                value={selectedSource || undefined}
                onChange={(val) => onSourceChange(val || '')}
                placeholder="All Activities"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={sourceOptions}
                className="w-full"
              />
            </div>

            {onBucketChange && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">Stock Type</span>
                <AntSelect
                  value={selectedBucket || undefined}
                  onChange={(val) => onBucketChange(val || '')}
                  placeholder="All Types"
                  allowClear
                  options={BUCKET_OPTIONS}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--vs-text-secondary)]">Date Range</span>
              <RangePicker
                value={dateRange}
                onChange={(range) => onDateRangeChange(range)}
                format="DD MMM YYYY"
                presets={DATE_PRESETS}
                disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
                allowClear
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={onReset}
              disabled={!canReset}
              title="Clear all filters"
              className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};
