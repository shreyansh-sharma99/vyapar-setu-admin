import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, IndianRupee, Receipt } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '@/components/breadCrumbs/Card';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '../components/ui';
import { notifyError } from '../components/toast';
import { PAYMENT_METHODS, PATHS, fmtDate, formatINR, methodLabel, num, viewPath } from '../components/helpers';
import { fetchPaymentsOut } from './services/paymentOutSlice';

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

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

  const headers = [
    {
      label: 'Actions',
      key: 'actions',
      render: (p) => (
        <div className="flex items-center justify-center">
          <button type="button" title="View" onClick={() => navigate(viewPath('payments', p._id))} className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    { label: 'Payment no', key: 'paymentNumber', value: 'checked', cellClassName: 'font-mono font-semibold' },
    { label: 'Date', key: 'paymentDate', value: 'checked', render: (p) => fmtDate(p.paymentDate) },
    { label: 'Supplier', key: 'supplier', value: 'checked', render: (p) => <span className="font-medium">{p.supplierId?.name || p.supplierName || '—'}</span> },
    { label: 'Method', key: 'paymentMethod', value: 'checked', render: (p) => methodLabel(p.paymentMethod) },
    { label: 'Reference', key: 'reference', value: 'checked', render: (p) => p.reference || '—' },
    {
      label: 'Bills paid',
      key: 'allocations',
      value: 'checked',
      render: (p) => (p.allocations?.length ? <span className="text-xs">{p.allocations.map((a) => a.supplierBillNo || a.billNumber).join(', ')}</span> : '—'),
    },
    { label: 'Amount', key: 'amount', value: 'checked', render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
    { label: 'Advance', key: 'unallocatedAmount', value: 'checked', render: (p) => (num(p.unallocatedAmount) > 0 ? <span className="text-amber-600 dark:text-amber-400">{formatINR(p.unallocatedAmount)}</span> : '—') },
    { label: 'Status', key: 'status', value: 'checked', render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <Card
        h1="Payments Out"
        description="Money paid to suppliers"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={method} onChange={(v) => { setMethod(v); setPage(1); }} options={[{ value: 'all', label: 'All methods' }, ...PAYMENT_METHODS]} />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={[
              { label: 'Total paid', value: formatINR(stats?.totalPaid), icon: <IndianRupee className="w-4 h-4 text-emerald-500" />, colorClass: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Payments', value: stats?.payments ?? 0, icon: <Receipt className="w-4 h-4 text-indigo-500" />, colorClass: 'text-indigo-600 dark:text-indigo-400' },
            ]}
          />
        </div>
        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search payment no, supplier, reference, bill no..."
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchClick={() => {
            setPage(1);
            setQuery(searchTerm.trim());
          }}
          onSearchClear={() => {
            setPage(1);
            setQuery('');
          }}
          emptyMessage="No payments recorded yet."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${PATHS.payments}/create`)}>Pay Supplier</Button>}
        />
      </Card>
      <PurchaseToaster />
    </div>
  );
}
