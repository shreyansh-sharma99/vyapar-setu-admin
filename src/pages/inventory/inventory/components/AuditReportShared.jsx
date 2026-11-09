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
import dayjs from 'dayjs';
import { Avatar, Badge, Button, DateRangePicker, Field, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SOURCE_OPTIONS, BUCKET_OPTIONS, getActorName } from './auditReportUtils';

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
    tone: 'info',
  },
  product_create: {
    label: 'Stock Added',
    icon: ArrowUpRight,
    tone: 'success',
  },
  sales_return: {
    label: 'Sales Return',
    icon: RefreshCw,
    tone: 'primary',
  },
  stock_transfer: {
    label: 'Stock Transfer',
    icon: ArrowLeftRight,
    tone: 'info',
  },
  manual_adjust: {
    label: 'Manual Adjust',
    icon: SlidersHorizontal,
    tone: 'warning',
  },
  opening_stock: {
    label: 'Opening Stock',
    icon: ArrowUpRight,
    tone: 'success',
  },
  invoice_void: {
    label: 'Invoice Voided',
    icon: RefreshCw,
    tone: 'primary',
  },
  sales_return_reversal: {
    label: 'Return Rejected',
    icon: XCircle,
    tone: 'danger',
  },
  delivery_challan: {
    label: 'Delivery Challan',
    icon: ArrowDownLeft,
    tone: 'info',
  },
  challan_cancel: {
    label: 'Challan Cancelled',
    icon: Undo2,
    tone: 'primary',
  },
  purchase_receipt: {
    label: 'Purchase Received',
    icon: Truck,
    tone: 'success',
  },
  purchase_receipt_cancel: {
    label: 'Receipt Cancelled',
    icon: Undo2,
    tone: 'danger',
  },
  purchase_return: {
    label: 'Purchase Return',
    icon: ArrowDownLeft,
    tone: 'warning',
  },
  purchase_return_cancel: {
    label: 'Return Cancelled',
    icon: Undo2,
    tone: 'primary',
  },
  stock_count: {
    label: 'Stock Count',
    icon: ClipboardCheck,
    tone: 'primary',
  },
  damage_mark: {
    label: 'Marked Damaged',
    icon: AlertOctagon,
    tone: 'danger',
  },
  damage_restore: {
    label: 'Damage Restored',
    icon: RotateCcw,
    tone: 'success',
  },
  damage_write_off: {
    label: 'Written Off',
    icon: Trash2,
    tone: 'danger',
  },
  bulk_import: {
    label: 'Bulk Import',
    icon: Upload,
    tone: 'info',
  },
};

const FALLBACK_BADGE = {
  icon: History,
  tone: 'neutral',
};

/* ─── Cells ─────────────────────────────────────────────────────────────── */

export const SourceBadge = ({ log }) => {
  const badge = SOURCE_BADGES[log.source] || FALLBACK_BADGE;
  const label = log.sourceLabel || badge.label || log.source || 'Stock Change';
  return (
    <Badge tone={badge.tone} icon={badge.icon}>
      {label}
      {log.source === 'manual_adjust' && log.action ? ` (${log.action})` : ''}
    </Badge>
  );
};

export const DeltaBadge = ({ delta }) => {
  const isPositive = delta > 0;
  return (
    <Badge tone={isPositive ? 'success' : 'danger'} className="font-mono tabular-nums">
      {isPositive ? `+${delta}` : delta}
    </Badge>
  );
};

export const StockChange = ({ before, after }) => (
  <span className="font-mono text-xs tabular-nums">
    <span className="text-ink-subtle">{before ?? 0}</span>
    <span className="mx-1 text-ink-subtle">→</span>
    <span className="font-bold text-ink">{after ?? 0}</span>
  </span>
);

const inr = (n) =>
  `₹${Math.abs(Number(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Sellable / damaged stock bucket of a movement. */
export const BucketBadge = ({ bucket }) =>
  bucket === 'damaged' ? <Badge tone="danger">Damaged</Badge> : <Badge tone="neutral">Sellable</Badge>;

/** Signed movement value (+ in / − out) with unit cost below. */
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (d) => {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? `${x.getDate()} ${SHORT_MONTHS[x.getMonth()]}` : '';
};

/** Batches a movement touched: "B-0925 (25 Sep) · MRP ₹120 ×3", one per line. */
export const BatchCell = ({ log }) => {
  const batches = (log.batches || []).filter((b) => b.batchNo || Number(b.mrp) > 0);
  if (!batches.length) return <span className="text-ink-subtle">-</span>;
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap text-[11px] leading-tight">
      {batches.map((b, i) => (
        <span key={`${b.batchId || 'b'}-${i}`}>
          <span className="font-mono font-semibold text-ink">{b.batchNo || 'No batch no'}</span>
          {b.receivedAt && <span className="text-ink-subtle"> ({shortDay(b.receivedAt)})</span>}
          {Number(b.mrp) > 0 && <span className="text-ink-subtle"> · MRP ₹{Number(b.mrp)}</span>}
          {batches.length > 1 && <span className="text-ink-subtle"> ×{Number(b.qty)}</span>}
        </span>
      ))}
    </div>
  );
};

export const ValueCell = ({ log }) => {
  if (!log.value && !log.unitCost) return <span className="text-ink-subtle">-</span>;
  const isIn = Number(log.value) >= 0;
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={cn('font-mono text-xs font-bold tabular-nums', isIn ? 'text-success' : 'text-danger')}>
        {isIn ? '+' : '-'}
        {inr(log.value)}
      </span>
      {log.unitCost ? <span className="text-[10px] text-ink-subtle tabular-nums">@ {inr(log.unitCost)}</span> : null}
    </div>
  );
};

export const ActorCell = ({ log }) => {
  const name = getActorName(log);
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-ink">{name}</span>
        <span className="text-[10px] capitalize text-ink-subtle">
          {log.actorRole || log.actorId?.role || 'Staff'}
        </span>
      </div>
    </div>
  );
};

/* ─── Filters ───────────────────────────────────────────────────────────── */

export const FilterToggleButton = ({ open, activeCount, onClick }) => (
  <Button
    variant={open || activeCount ? 'soft' : 'secondary'}
    size="sm"
    onClick={onClick}
    aria-expanded={open}
    startIcon={<Filter />}
  >
    Filters
    {activeCount > 0 && (
      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
        {activeCount}
      </span>
    )}
  </Button>
);

/**
 * Collapsible filter panel (activity, stock type, date range).
 * Stays mounted and animates height + opacity when `open` changes.
 */
export const AuditFilterPanel = ({
  open,
  selectedSource,
  onSourceChange,
  sourceOptions = SOURCE_OPTIONS,
  selectedBucket,
  onBucketChange,
  dateRange,
  onDateRangeChange,
  onReset,
  canReset,
}) => (
  <div
    className={cn(
      'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
      open ? 'grid-rows-[1fr] opacity-100' : '-mb-5 grid-rows-[0fr] opacity-0'
    )}
    aria-hidden={!open}
    inert={!open}
  >
    <div className="min-h-0 overflow-hidden">
      <div
        className={cn(
          'grid grid-cols-1 items-end gap-x-3 gap-y-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-300 ease-in-out sm:grid-cols-2 sm:p-5',
          onBucketChange ? 'lg:grid-cols-[1fr_0.8fr_1.4fr_auto]' : 'lg:grid-cols-[1fr_1.4fr_auto]',
          open ? 'translate-y-0' : '-translate-y-2'
        )}
      >
        <Field label="Activity">
          <Select
            size="sm"
            value={selectedSource || ''}
            onChange={(val) => onSourceChange(val || '')}
            placeholder="All Activities"
            clearable
            options={sourceOptions}
          />
        </Field>

        {onBucketChange && (
          <Field label="Stock Type">
            <Select
              size="sm"
              value={selectedBucket || ''}
              onChange={(val) => onBucketChange(val || '')}
              placeholder="All Types"
              clearable
              searchable={false}
              options={BUCKET_OPTIONS}
            />
          </Field>
        )}

        <Field label="Date Range">
          <DateRangePicker
            size="sm"
            value={dateRange}
            onChange={(range) => onDateRangeChange(range)}
            presets={DATE_PRESETS}
            disabledDate={(d) => d && d.isAfter(dayjs().endOf('day'))}
            allowClear
          />
        </Field>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!canReset}
          title="Clear all filters"
          startIcon={<FilterX />}
          className="text-danger hover:bg-danger-soft"
        >
          Clear
        </Button>
      </div>
    </div>
  </div>
);
