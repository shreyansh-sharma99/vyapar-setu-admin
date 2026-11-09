import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, IndianRupee, Plus, Receipt } from 'lucide-react';
import { Button, DataTable, Input, PageHeader, Select, StatCard } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import { notifyError } from '../components/toast';
import { PAYMENT_METHODS, PATHS, fmtDate, formatINR, methodLabel, num, viewPath } from '../components/helpers';
import { fetchPaymentsOut } from './services/paymentOutSlice';

const METHOD_OPTIONS = [{ value: 'all', label: 'All methods' }, ...PAYMENT_METHODS];
const STATUS_TABS = [
  { value: 'all', label: 'All payments' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PaymentOutList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, stats, listLoading, listError } = useSelector((state) => state.paymentOut);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'paymentDate', order: 'desc' };
    if (method !== 'all') params.paymentMethod = method;
    if (status !== 'all') params.status = status;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPaymentsOut(params));
  }, [dispatch, page, pageSize, method, status, query, dateFrom, dateTo]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const columns = [
    { key: 'paymentNumber', header: 'Payment no', type: 'mono', mobile: 'title' },
    { key: 'paymentDate', header: 'Date', render: (p) => fmtDate(p.paymentDate) },
    { key: 'supplier', header: 'Supplier', render: (p) => <span className="font-semibold">{p.supplierId?.name || p.supplierName || '—'}</span> },
    { key: 'paymentMethod', header: 'Method', render: (p) => methodLabel(p.paymentMethod) },
    { key: 'reference', header: 'Reference', hideBelow: '2xl', render: (p) => p.reference || '—' },
    {
      key: 'allocations',
      header: 'Bills paid',
      hideBelow: '2xl',
      render: (p) => (p.allocations?.length ? <span className="text-xs text-ink-muted">{p.allocations.map((a) => a.supplierBillNo || a.billNumber).join(', ')}</span> : '—'),
    },
    { key: 'amount', header: 'Amount (₹)', type: 'money', mobile: 'amount', render: (p) => formatINR(p.amount) },
    {
      key: 'unallocatedAmount',
      header: 'Advance (₹)',
      type: 'money',
      render: (p) => (num(p.unallocatedAmount) > 0 ? <span className="text-warning">{formatINR(p.unallocatedAmount)}</span> : <span className="font-normal text-ink-subtle">—</span>),
    },
    { key: 'status', header: 'Status', type: 'status' },
  ];

  const changeStatus = (v) => {
    setStatus(v);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Supplier Payments"
        description="Money paid to suppliers"
        actions={<Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.payments}/create`)}>Pay Supplier</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2">
        <StatCard label="Total paid" value={formatINR(stats?.totalPaid)} icon={IndianRupee} tone="success" />
        <StatCard label="Payments" value={stats?.payments ?? 0} icon={Receipt} tone="primary" />
      </div>

      <DataTable
        columns={columns}
        rows={list}
        loading={listLoading}
        tabs={STATUS_TABS}
        tab={status}
        onTabChange={changeStatus}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search payment no, supplier, reference, bill no...',
          onSubmit: () => {
            setPage(1);
            setQuery(searchTerm.trim());
          },
          onClear: () => {
            setPage(1);
            setQuery('');
          },
        }}
        filters={
          <>
            <Input size="sm" type="date" aria-label="From date" title="From date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} wrapperClassName="w-40" />
            <Input size="sm" type="date" aria-label="To date" title="To date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} wrapperClassName="w-40" />
            <div className="w-44">
              <Select size="sm" searchable={false} aria-label="Payment method" value={method} onChange={(v) => { setMethod(v); setPage(1); }} options={METHOD_OPTIONS} />
            </div>
          </>
        }
        rowActions={(p) => [{ label: 'View', icon: Eye, onClick: () => navigate(viewPath('payments', p._id)) }]}
        onRowClick={(p) => navigate(viewPath('payments', p._id))}
        empty={{
          icon: Receipt,
          title: 'No payments recorded yet.',
          action: <Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.payments}/create`)}>Pay Supplier</Button>,
        }}
        pagination={{
          page,
          pageSize,
          total: meta?.total || 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />
      <PurchaseToaster />
    </div>
  );
}
