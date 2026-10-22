import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning, TrendingDown } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import { Label } from '@/components/inputs/Label';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { formatDate } from '@/utility/dateTiming';
import { encryptData } from '@/utility/crypto';
import ReportTabs from './ReportTabs';
import { DateFilterBar, Money, ReportError } from './components/ReportBits';
import { currentFy, getPriceOverridesApi, inr, useReportData } from './services/pricingReportService';

/** Sales lines billed at a typed price: invoice, who, list vs charged, reason. */
export default function PriceOverrides() {
  const navigate = useNavigate();
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [by, setBy] = useState('');
  const { data, loading, error } = useReportData(getPriceOverridesApi, { ...range, ...(by ? { by } : {}) });
  const totals = data?.totals || {};

  const stats = [
    { label: 'Lines with a typed price', value: totals.lines || 0, icon: <FileWarning className="w-3.5 h-3.5 text-violet-500" /> },
    {
      label: 'Charged vs list (incl. GST)',
      value: inr(totals.difference),
      icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500" />,
      colorClass: Number(totals.difference) < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold',
    },
  ];

  const headers = [
    {
      label: 'Invoice',
      key: 'invoiceNumber',
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate(`/sales/invoices/view/${encodeURIComponent(encryptData(String(r.invoiceId)))}`)}
          className="font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          {r.invoiceNumber}
        </button>
      ),
      value: 'checked',
    },
    { label: 'Date', key: 'invoiceDate', render: (r) => <span className="text-xs">{formatDate(r.invoiceDate)}</span>, value: 'checked' },
    { label: 'Customer', key: 'customer', render: (r) => <span className="text-xs">{r.customer || '—'}</span>, value: 'checked' },
    { label: 'Product', key: 'productName', render: (r) => <span className="text-xs font-medium">{r.productName}</span>, value: 'checked' },
    { label: 'Qty', key: 'qty', cellClassName: 'text-right text-xs', render: (r) => `${r.qty} ${r.unit || ''}`, value: 'checked' },
    { label: 'List / unit', key: 'listUnit', cellClassName: 'text-right font-mono text-xs', render: (r) => (r.listUnit > 0 ? inr(r.listUnit) : '—'), value: 'checked' },
    { label: 'Charged / unit', key: 'chargedUnit', cellClassName: 'text-right font-mono text-xs font-semibold', render: (r) => inr(r.chargedUnit), value: 'checked' },
    { label: 'Difference', key: 'difference', cellClassName: 'text-right font-mono text-xs font-bold', render: (r) => <Money value={r.difference} tone />, value: 'checked' },
    { label: 'Reason', key: 'reason', render: (r) => <span className="block max-w-[240px] text-[11px]" title={r.reason}>{r.reason || '—'}</span>, value: 'checked' },
    { label: 'By', key: 'by', render: (r) => <span className="text-xs">{r.by || '—'}</span>, value: 'checked' },
  ];

  return (
    <Card h1="Price Overrides" bodyClassName="px-4 pb-4 pt-2">
      <ReportTabs />
      <DateFilterBar idPrefix="priceOverrides" value={range} defaults={defaults} onApply={setRange}>
        <div className="w-48">
          <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">Changed by</Label>
          <select value={by} onChange={(e) => setBy(e.target.value)} className="h-9 w-full rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-2 text-sm text-[var(--vs-text-primary)] cursor-pointer">
            <option value="">Everyone</option>
            {(data?.people || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {by && !(data?.people || []).includes(by) && <option value={by}>{by}</option>}
          </select>
        </div>
      </DateFilterBar>
      <ReportError message={error} />
      <div className="mb-3">
        <TableInfoCard stats={stats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
      </div>
      <Table headers={headers} data={data?.rows || []} loading={loading} searchPlaceholder="Search invoice, product, reason..." emptyMessage="No typed prices in this period." />
    </Card>
  );
}
