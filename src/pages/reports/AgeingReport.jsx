import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { DataTable, PageHeader } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { getAgeing } from './services/reportSlice';
import { StatRow } from './components/ReportBits';

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
        icon: AlertTriangle,
        tone: 'warning',
      },
      {
        label: 'Net due (after credits)',
        value: `₹${Number(ageing?.netTotal ?? grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: AlertTriangle,
        tone: 'primary',
      },
      {
        label: 'Total Customers',
        value: rows.length,
        icon: UserCheck,
        tone: 'info',
      },
      {
        label: 'As Of Date',
        value: asOf ? formatDate(asOf) : 'Current Date',
        icon: Clock,
        tone: 'primary',
      },
    ];
  }, [grandTotal, rows.length, asOf, ageing?.netTotal]);

  const columns = useMemo(() => {
    const list = [
      {
        header: 'Customer Name',
        key: 'customer',
        sortable: true,
        mobile: 'title',
        render: (item) => <span className="text-xs font-semibold text-ink">{item.customer || '—'}</span>,
      },
      {
        header: 'Phone',
        key: 'phone',
        hideBelow: 'lg',
        render: (item) => <span className="text-xs">{item.phone || '—'}</span>,
      },
    ];

    uniqueBucketKeys.forEach((bKey) => {
      list.push({
        header: `${bKey} Days`,
        key: `bucket_${bKey}`,
        type: 'money',
        sortable: true,
        render: (item) => {
          const bObj = (item.buckets || []).find((b) => b.bucket === bKey);
          const amt = bObj?.amount || 0;
          return <span className="text-xs font-semibold tabular-nums">{amt > 0 ? `₹${Number(amt).toFixed(2)}` : '—'}</span>;
        },
      });
    });

    list.push({
      header: 'Total Outstanding',
      key: 'totalOutstanding',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      render: (item) => <span className="text-xs font-bold tabular-nums text-warning">₹{Number(item.totalOutstanding || 0).toFixed(2)}</span>,
    });
    list.push({
      header: 'Credit (returns / notes)',
      key: 'credit',
      type: 'money',
      sortable: true,
      render: (item) => (Number(item.credit) > 0 ? <span className="text-xs font-semibold tabular-nums text-success">−₹{Number(item.credit).toFixed(2)}</span> : <span className="text-xs text-ink-subtle">—</span>),
    });
    list.push({
      header: 'Net due',
      key: 'netDue',
      type: 'money',
      sortable: true,
      render: (item) => <span className="text-xs font-bold tabular-nums text-ink">₹{Number(item.netDue ?? item.totalOutstanding ?? 0).toFixed(2)}</span>,
    });

    return list;
  }, [uniqueBucketKeys]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts Receivable Ageing Report"
        description="Outstanding receivables classified into age brackets based on invoice due dates."
      />

      <StatRow stats={stats} />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={{ placeholder: 'Search customer name...' }}
        empty={{ icon: Clock, title: 'No accounts receivable ageing data found.' }}
        pageSizeOptions={[10, 20, 50, 100, 500]}
      />
    </div>
  );
}
