import { useMemo, useState } from 'react';
import { DollarSign, Percent, TrendingUp, Wallet } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { formatDate } from '@/utility/dateTiming';
import ReportTabs from './ReportTabs';
import { DateFilterBar, Money, ReportError } from './components/ReportBits';
import { currentFy, getProfitApi, inr, useReportData } from './services/pricingReportService';

const GROUPS = [
  { value: 'invoice', label: 'By invoice' },
  { value: 'product', label: 'By product' },
  { value: 'day', label: 'By day' },
];

/** Profit = taxable value − cost of the batches each line took (older lines without batches show no profit). */
export default function Profit() {
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [groupBy, setGroupBy] = useState('invoice');
  const { data, loading, error } = useReportData(getProfitApi, { ...range, groupBy });
  const totals = data?.totals || {};
  const rows = data?.rows || [];

  const stats = [
    { label: 'Sales (taxable)', value: inr(totals.revenue), icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> },
    { label: 'Cost', value: inr(totals.cost), icon: <Wallet className="w-3.5 h-3.5 text-amber-500" /> },
    {
      label: 'Profit',
      value: inr(totals.profit),
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      colorClass: Number(totals.profit) < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold',
    },
    { label: 'Margin', value: `${Number(totals.marginPercent) || 0}%`, icon: <Percent className="w-3.5 h-3.5 text-blue-500" /> },
    { label: 'Lines', value: totals.lines || 0 },
  ];

  const first = {
    invoice: { label: 'Invoice', key: 'label', render: (r) => <span className="font-mono font-semibold text-xs">{r.label}</span>, value: 'checked' },
    product: { label: 'Product', key: 'label', render: (r) => <span className="font-medium text-xs">{r.label}</span>, value: 'checked' },
    day: { label: 'Day', key: 'label', render: (r) => <span className="text-xs">{formatDate(r.label)}</span>, value: 'checked' },
  }[data?.groupBy || groupBy];

  const headers = [
    first,
    ...(groupBy === 'invoice'
      ? [
          { label: 'Date', key: 'date', render: (r) => <span className="text-xs">{formatDate(r.date)}</span>, value: 'checked' },
          { label: 'Customer', key: 'customer', render: (r) => <span className="text-xs">{r.customer || '—'}</span>, value: 'checked' },
        ]
      : []),
    { label: 'Qty', key: 'qty', cellClassName: 'text-right text-xs', render: (r) => Number(r.qty) || 0, value: 'checked' },
    { label: 'Sales (taxable)', key: 'revenue', cellClassName: 'text-right font-mono text-xs', render: (r) => inr(r.revenue), value: 'checked' },
    { label: 'Cost', key: 'cost', cellClassName: 'text-right font-mono text-xs', render: (r) => inr(r.cost), value: 'checked' },
    { label: 'Profit', key: 'profit', cellClassName: 'text-right font-mono text-xs font-bold', render: (r) => <Money value={r.profit} tone />, value: 'checked' },
    { label: 'Margin', key: 'marginPercent', cellClassName: 'text-right text-xs', render: (r) => `${Number(r.marginPercent) || 0}%`, value: 'checked' },
  ];

  return (
    <Card h1="Profit Report" bodyClassName="px-4 pb-4 pt-2">
      <ReportTabs />
      <DateFilterBar idPrefix="profit" value={range} defaults={defaults} onApply={setRange}>
        <div className="flex rounded-xl border border-[var(--vs-border)] overflow-hidden h-9">
          {GROUPS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGroupBy(g.value)}
              className={`px-3 text-xs font-semibold cursor-pointer ${groupBy === g.value ? 'bg-indigo-600 text-white' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-primary)]'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </DateFilterBar>
      <ReportError message={error} />
      <div className="mb-3">
        <TableInfoCard stats={stats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
      </div>
      {Number(data?.withoutCost?.lines) > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
          {data.withoutCost.lines} product line(s) worth {inr(data.withoutCost.revenue)} have no cost (billed before batch costing was on) and are not in these figures.
        </p>
      )}
      <Table headers={headers} data={rows} loading={loading} searchPlaceholder="Search..." emptyMessage="No billed lines with cost in this period." />
    </Card>
  );
}
