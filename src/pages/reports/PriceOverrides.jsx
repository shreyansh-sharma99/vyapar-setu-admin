import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning, TrendingDown } from 'lucide-react';
import { Button, DataTable, Field, PageHeader, Select } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { encryptData } from '@/utility/crypto';
import { DateFilterBar, Money, ReportError, StatRow } from './components/ReportBits';
import { currentFy, getPriceOverridesApi, inr, useReportData } from './services/pricingReportService';

const MONEY = 'text-xs tabular-nums';

/** Sales lines billed at a typed price: invoice, who, list vs charged, reason. */
export default function PriceOverrides() {
  const navigate = useNavigate();
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [by, setBy] = useState('');
  const { data, loading, error } = useReportData(getPriceOverridesApi, { ...range, ...(by ? { by } : {}) });
  const totals = data?.totals || {};

  const stats = [
    { label: 'Lines with a typed price', value: totals.lines || 0, icon: FileWarning, tone: 'primary' },
    {
      label: 'Charged vs list (incl. GST)',
      value: inr(totals.difference),
      icon: TrendingDown,
      tone: Number(totals.difference) < 0 ? 'danger' : 'success',
    },
  ];

  const people = data?.people || [];
  const byOptions = [
    { value: '', label: 'Everyone' },
    ...people.map((p) => ({ value: p, label: p })),
    ...(by && !people.includes(by) ? [{ value: by, label: by }] : []),
  ];

  const columns = [
    {
      header: 'Invoice',
      key: 'invoiceNumber',
      mobile: 'title',
      render: (r) => (
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate(`/sales/invoices/view/${encodeURIComponent(encryptData(String(r.invoiceId)))}`)}
          className="font-mono text-xs"
        >
          {r.invoiceNumber}
        </Button>
      ),
    },
    { header: 'Date', key: 'invoiceDate', render: (r) => <span className="text-xs">{formatDate(r.invoiceDate)}</span> },
    { header: 'Customer', key: 'customer', render: (r) => <span className="text-xs">{r.customer || '—'}</span> },
    { header: 'Product', key: 'productName', render: (r) => <span className="text-xs font-medium">{r.productName}</span> },
    { header: 'Qty', key: 'qty', type: 'number', render: (r) => <span className="text-xs tabular-nums">{`${r.qty} ${r.unit || ''}`}</span> },
    { header: 'List / unit', key: 'listUnit', type: 'money', render: (r) => <span className={MONEY}>{r.listUnit > 0 ? inr(r.listUnit) : '—'}</span> },
    { header: 'Charged / unit', key: 'chargedUnit', type: 'money', render: (r) => <span className={`${MONEY} font-semibold`}>{inr(r.chargedUnit)}</span> },
    { header: 'Difference', key: 'difference', type: 'money', mobile: 'amount', render: (r) => <span className={`${MONEY} font-bold`}><Money value={r.difference} tone /></span> },
    { header: 'Reason', key: 'reason', render: (r) => <span className="block min-w-[180px] max-w-[240px] whitespace-normal text-[11px]" title={r.reason}>{r.reason || '—'}</span> },
    { header: 'By', key: 'by', render: (r) => <span className="text-xs">{r.by || '—'}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Price Overrides"
        description="Sales lines billed at a typed price: who typed it, list vs charged, and the reason."
      />

      <DateFilterBar idPrefix="priceOverrides" value={range} defaults={defaults} onApply={setRange}>
        <Field label="Changed by" className="w-full sm:w-48">
          <Select options={byOptions} value={by} onChange={(v) => setBy(v ?? '')} searchable={false} />
        </Field>
      </DateFilterBar>
      <ReportError message={error} />

      <StatRow stats={stats} />

      <DataTable
        columns={columns}
        rows={data?.rows || []}
        loading={loading}
        search={{ placeholder: 'Search invoice, product, reason...' }}
        empty={{ icon: FileWarning, title: 'No typed prices in this period.' }}
        pageSizeOptions={[10, 20, 50, 100, 500]}
      />
    </div>
  );
}
