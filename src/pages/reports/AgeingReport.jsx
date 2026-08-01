import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, UserCheck, AlertTriangle } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { formatDate } from '@/utility/dateTiming';
import { getAgeing } from './services/reportSlice';
import ReportTabs from './ReportTabs';

export default function AgeingReport() {
  const dispatch = useDispatch();

  const { ageing, loading } = useSelector((state) => ({
    ageing: state.reports.ageing,
    loading: state.reports.loading.ageing,
  }));

  const fetchReport = () => {
    dispatch(getAgeing());
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = ageing?.rows || [];
  const grandTotal = ageing?.grandTotal || 0;
  const asOf = ageing?.asOf;

  const uniqueBucketKeys = useMemo(() => {
    const bucketSet = new Set();
    const standardOrder = ['1-30', '31-60', '61-90', '90+', '120+'];

    rows.forEach((row) => {
      (row.buckets || []).forEach((b) => {
        if (b.bucket) bucketSet.add(b.bucket);
      });
    });

    const found = Array.from(bucketSet);
    found.sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return found.length > 0 ? found : ['1-30', '31-60', '61-90', '90+'];
  }, [rows]);

  const stats = useMemo(() => {
    return [
      {
        label: 'Grand Total Outstanding',
        value: `₹${Number(grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
        colorClass: 'text-amber-600 dark:text-amber-400 font-bold',
      },
      {
        label: 'Total Customers',
        value: rows.length,
        icon: <UserCheck className="w-3.5 h-3.5 text-blue-500" />,
      },
      {
        label: 'As Of Date',
        value: asOf ? formatDate(asOf) : 'Current Date',
        icon: <Clock className="w-3.5 h-3.5 text-indigo-500" />,
      },
    ];
  }, [grandTotal, rows.length, asOf]);

  const headers = useMemo(() => {
    const list = [
      {
        label: 'Customer Name',
        key: 'customer',
        sortable: true,
        render: (item) => <span className="font-semibold text-xs text-[var(--vs-text-primary)]">{item.customer || '—'}</span>,
        value: 'checked',
      },
    ];

    uniqueBucketKeys.forEach((bKey) => {
      list.push({
        label: `${bKey} Days`,
        key: `bucket_${bKey}`,
        sortable: true,
        cellClassName: 'text-right font-mono text-xs font-semibold',
        render: (item) => {
          const bObj = (item.buckets || []).find((b) => b.bucket === bKey);
          const amt = bObj?.amount || 0;
          return <span>{amt > 0 ? `₹${Number(amt).toFixed(2)}` : '—'}</span>;
        },
        value: 'checked',
      });
    });

    list.push({
      label: 'Total Outstanding',
      key: 'totalOutstanding',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400',
      render: (item) => <span>₹{Number(item.totalOutstanding || 0).toFixed(2)}</span>,
      value: 'checked',
    });

    return list;
  }, [uniqueBucketKeys]);

  return (
    <div>
      <Card h1="Accounts Receivable Ageing Report" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />

        {/* ── Header Bar ── */}
        <div className="mb-5 bg-[var(--vs-bg-secondary)] p-3 rounded-xl border border-[var(--vs-border)]">
          <div className="text-xs text-[var(--vs-text-secondary)] font-medium">
            Outstanding receivables classified into age brackets based on invoice due dates.
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="mb-5">
          <TableInfoCard stats={stats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
        </div>

        {/* ── Table ── */}
        <Table
          headers={headers}
          data={rows}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search customer name..."
          emptyMessage="No accounts receivable ageing data found."
        />
      </Card>
    </div>
  );
}
