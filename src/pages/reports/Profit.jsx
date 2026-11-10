import { useMemo, useState } from 'react';
import { IndianRupee, ListOrdered, Percent, TrendingUp, Wallet } from 'lucide-react';
import { Alert, DataTable, Label, PageHeader, Segmented } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { DateFilterBar, Money, ReportError, StatRow } from './components/ReportBits';
import { currentFy, getProfitApi, inr, useReportData } from './services/pricingReportService';

const GROUPS = [
  { value: 'invoice', label: 'By invoice' },
  { value: 'product', label: 'By product' },
  { value: 'day', label: 'By day' },
];

const MONEY = 'text-xs';

/** Profit = taxable value − cost of the batches each line took (older lines without batches show no profit). */
export default function Profit() {
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [groupBy, setGroupBy] = useState('invoice');
  const [itemType, setItemType] = useState('');
  const { data, loading, error } = useReportData(getProfitApi, { ...range, groupBy, ...(itemType ? { itemType } : {}) });
  const totals = data?.totals || {};
  const rows = data?.rows || [];

  const stats = [
    { label: 'Sales (taxable)', value: inr(totals.revenue), icon: IndianRupee, tone: 'primary' },
    { label: 'Cost', value: inr(totals.cost), icon: Wallet, tone: 'warning' },
    { label: 'Profit', value: inr(totals.profit), icon: TrendingUp, tone: Number(totals.profit) < 0 ? 'danger' : 'success' },
    { label: 'Margin', value: `${Number(totals.marginPercent) || 0}%`, icon: Percent, tone: 'info' },
    { label: 'Lines', value: totals.lines || 0, icon: ListOrdered, tone: 'neutral' },
  ];

  const first = {
    invoice: { header: 'Invoice', key: 'label', mobile: 'title', render: (r) => <span className="font-mono text-xs font-semibold">{r.label}</span> },
    product: { header: 'Product', key: 'label', mobile: 'title', render: (r) => <span className="text-xs font-medium">{r.label}</span> },
    day: { header: 'Day', key: 'label', mobile: 'title', render: (r) => <span className="text-xs">{formatDate(r.label)}</span> },
  }[data?.groupBy || groupBy];

  const columns = [
    first,
    ...(groupBy === 'invoice'
      ? [
          { header: 'Date', key: 'date', render: (r) => <span className="text-xs">{formatDate(r.date)}</span> },
          { header: 'Customer', key: 'customer', render: (r) => <span className="text-xs">{r.customer || '—'}</span> },
        ]
      : []),
    { header: 'Qty', key: 'qty', type: 'number', render: (r) => <span className="text-xs tabular-nums">{Number(r.qty) || 0}</span> },
    { header: 'Sales (taxable)', key: 'revenue', type: 'money', render: (r) => <span className={MONEY}>{inr(r.revenue)}</span> },
    { header: 'Cost', key: 'cost', type: 'money', render: (r) => <span className={MONEY}>{inr(r.cost)}</span> },
    { header: 'Profit', key: 'profit', type: 'money', mobile: 'amount', render: (r) => <span className={`${MONEY} font-bold`}><Money value={r.profit} tone /></span> },
    { header: 'Margin', key: 'marginPercent', type: 'number', render: (r) => <span className="text-xs tabular-nums">{`${Number(r.marginPercent) || 0}%`}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profit Report"
        description="Taxable sales minus the cost of the batches each line took, by invoice, product or day."
      />

      <DateFilterBar idPrefix="profit" value={range} defaults={defaults} onApply={setRange}>
        <div className="flex flex-col">
          <Label>Group by</Label>
          <Segmented aria-label="Group by" options={GROUPS} value={groupBy} onChange={setGroupBy} />
        </div>
        <div className="flex flex-col">
          <Label>Type</Label>
          <Segmented aria-label="Item type" options={[{ value: '', label: 'All' }, { value: 'goods', label: 'Goods' }, { value: 'service', label: 'Services' }]} value={itemType} onChange={setItemType} />
        </div>
      </DateFilterBar>
      <ReportError message={error} />

      <StatRow stats={stats} />

      {Number(data?.withoutCost?.lines) > 0 && (
        <Alert tone="warning">
          {data.withoutCost.lines} product line(s) worth {inr(data.withoutCost.revenue)} have no cost (billed before batch costing was on) and are not in these figures.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={{ placeholder: 'Search...' }}
        empty={{ icon: TrendingUp, title: 'No billed lines with cost in this period.' }}
        pageSizeOptions={[10, 20, 50, 100, 500]}
      />
    </div>
  );
}
