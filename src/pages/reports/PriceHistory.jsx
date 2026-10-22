import { useMemo, useState } from 'react';
import Card from '@/components/breadCrumbs/Card';
import { Label } from '@/components/inputs/Label';
import Table from '@/components/table/Table';
import { formatDate, formatDateWithTiming } from '@/utility/dateTiming';
import AntdThemed from '@/pages/masterSettings/components/AntdThemed';
import ProductPicker from '@/pages/masterSettings/components/ProductPicker';
import ReportTabs from './ReportTabs';
import { DateFilterBar, ReportError } from './components/ReportBits';
import { currentFy, getPriceHistoryApi, useReportData } from './services/pricingReportService';

const KINDS = [
  { value: '', label: 'All changes' },
  { value: 'price', label: 'Selling price' },
  { value: 'offer', label: 'Offers' },
  { value: 'gst', label: 'GST' },
  { value: 'clearance', label: 'Clearance price' },
];

const KIND_STYLE = {
  price: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  offer: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  gst: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  clearance: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
};

/** Who changed which price / offer / GST / clearance price, and when (by the day it was saved). */
export default function PriceHistory() {
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [product, setProduct] = useState(null);
  const [kind, setKind] = useState('');
  const params = { ...range, ...(product ? { productId: product._id } : {}), ...(kind ? { kind } : {}) };
  const { data, loading, error } = useReportData(getPriceHistoryApi, params);

  const headers = [
    { label: 'Changed on', key: 'at', render: (r) => <span className="font-mono text-[11px] text-[var(--vs-text-secondary)]">{formatDateWithTiming(r.at)}</span>, value: 'checked' },
    {
      label: 'Product',
      key: 'productName',
      render: (r) => (
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-xs">{r.productName}</span>
          {r.sku && <span className="text-[10px] font-mono text-[var(--vs-text-secondary)]">{r.sku}</span>}
        </div>
      ),
      value: 'checked',
    },
    {
      label: 'Change',
      key: 'change',
      render: (r) => (
        <span className="inline-flex flex-col gap-0.5">
          <span className={`self-start px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${KIND_STYLE[r.kind] || ''}`}>{r.kind}</span>
          <span className="text-xs font-semibold">{r.change}</span>
        </span>
      ),
      value: 'checked',
    },
    {
      label: 'Applies',
      key: 'effectiveFrom',
      render: (r) => <span className="text-xs">{r.until ? `${formatDate(r.effectiveFrom)} – ${formatDate(r.until)}` : r.kind === 'clearance' ? 'Right away' : `From ${formatDate(r.effectiveFrom)}`}</span>,
      value: 'checked',
    },
    { label: 'Set from', key: 'from', render: (r) => <span className="text-xs">{r.from}</span>, value: 'checked' },
    { label: 'By', key: 'by', render: (r) => <span className="text-xs">{r.by || '—'}</span>, value: 'checked' },
    { label: 'Note', key: 'note', render: (r) => <span className="block max-w-[220px] truncate text-[11px] text-[var(--vs-text-secondary)]" title={r.note}>{r.note || '—'}</span>, value: 'checked' },
  ];

  return (
    <AntdThemed>
      <Card h1="Price History" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />
        <DateFilterBar idPrefix="priceHistory" value={range} defaults={defaults} onApply={setRange}>
          <div className="w-full sm:w-72">
            <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">Product</Label>
            <ProductPicker id="price-history-filter" value={product} onChange={setProduct} placeholder="All products" />
          </div>
          <div className="w-44">
            <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">Type</Label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-2 text-sm text-[var(--vs-text-primary)] cursor-pointer">
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </DateFilterBar>
        <ReportError message={error} />
        {data?.truncated && <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">Showing the latest 1000 of {data.total} changes — narrow the dates or pick a product.</p>}
        <Table headers={headers} data={data?.rows || []} loading={loading} searchPlaceholder="Search product, change, person..." emptyMessage="No price changes in this period." />
      </Card>
    </AntdThemed>
  );
}
