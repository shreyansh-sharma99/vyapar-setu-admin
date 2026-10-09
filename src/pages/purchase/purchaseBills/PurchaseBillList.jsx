import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, IndianRupee, FileText, ShoppingCart, Percent, Clock, AlertTriangle } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, isOverdue, num, refId, storeName, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseBills, deletePurchaseBill } from './services/purchaseBillSlice';

const FILTERS = [
  { value: 'all', label: 'All bills' },
  { value: 'unpaid,partially_paid', label: 'Due (unpaid + part paid)' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dateInput = 'h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none';

export default function PurchaseBillList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, stats, listLoading, listError, saving } = useSelector((state) => state.purchaseBill);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'billDate', order: 'desc' };
    if (filter === 'overdue') params.overdue = true;
    else if (filter !== 'all') params.status = filter;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPurchaseBills(params));
  }, [dispatch, page, pageSize, filter, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const changeFilter = (v) => {
    setFilter(v);
    setPage(1);
  };

  const handleDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseBill(deleteTarget._id)).unwrap();
      notify(res?.message || 'Bill deleted');
      setRefresh((r) => r + 1);
    } catch (e) {
      notifyError(errMsg(e));
    } finally {
      setDeleteTarget(null);
    }
  };

  const iconBtn = 'p-1 rounded-lg transition-colors cursor-pointer';
  const payable = (b) => ['unpaid', 'partially_paid'].includes(b.status) && num(b.balanceAmount) > 0;

  const headers = [
    {
      label: 'Actions',
      key: 'actions',
      render: (b) => (
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" title="View" onClick={() => navigate(viewPath('bills', b._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
            <Eye className="w-4 h-4" />
          </button>
          {b.status === 'draft' && (
            <button type="button" title="Edit" onClick={() => navigate(editPath('bills', b._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {payable(b) && (
            <button
              type="button"
              title="Record payment"
              onClick={() => navigate(`${PATHS.payments}/create`, { state: { supplierId: refId(b.supplierId), purchaseBillId: b._id, amount: b.balanceAmount } })}
              className={`${iconBtn} text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}
            >
              <IndianRupee className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(b.status) && (
            <button type="button" title="Delete" onClick={() => setDeleteTarget(b)} className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    {
      label: 'Bill',
      key: 'billNumber',
      value: 'checked',
      render: (b) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">{b.billNumber}</span>
          {b.supplierBillNo && <span className="text-[11px] text-[var(--vs-text-secondary)]">Supplier no. {b.supplierBillNo}</span>}
        </div>
      ),
    },
    { label: 'Bill date', key: 'billDate', value: 'checked', render: (b) => fmtDate(b.billDate) },
    {
      label: 'Due date',
      key: 'dueDate',
      value: 'checked',
      render: (b) => {
        const late = b.status !== 'draft' && b.status !== 'cancelled' && isOverdue(b.dueDate, b.balanceAmount);
        return (
          <span className={late ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
            {fmtDate(b.dueDate)}
            {late && <span className="block text-[10px] uppercase tracking-wide">Overdue</span>}
          </span>
        );
      },
    },
    { label: 'Supplier', key: 'supplier', value: 'checked', render: (b) => <span className="font-medium">{supplierName(b)}</span> },
    { label: 'Store', key: 'store', value: 'unchecked', render: (b) => storeName(b) },
    { label: 'Total', key: 'totalAmount', value: 'checked', render: (b) => <span className="font-semibold">{formatINR(b.totalAmount)}</span> },
    { label: 'Paid', key: 'paidAmount', value: 'checked', render: (b) => <span className="text-emerald-600 dark:text-emerald-400">{formatINR(num(b.paidAmount) + num(b.adjustedAmount))}</span> },
    {
      label: 'Balance',
      key: 'balanceAmount',
      value: 'checked',
      render: (b) => <span className={num(b.balanceAmount) > 0 && b.status !== 'draft' ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-[var(--vs-text-secondary)]'}>{formatINR(b.balanceAmount)}</span>,
    },
    { label: 'Status', key: 'status', value: 'checked', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <Card
        h1="Purchase Bills"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={dateInput} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={dateInput} title="To date" />
            <FilterSelect value={filter} onChange={changeFilter} options={FILTERS} />
          </div>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={[
              { label: 'Bills', value: stats?.bills ?? 0, icon: <FileText className="w-4 h-4 text-slate-500" />, isActive: filter === 'all', onClick: () => changeFilter('all') },
              { label: 'Purchases', value: formatINR(stats?.purchases), icon: <ShoppingCart className="w-4 h-4 text-indigo-500" />, colorClass: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Input tax (ITC)', value: formatINR(stats?.inputTax), icon: <Percent className="w-4 h-4 text-blue-500" />, colorClass: 'text-blue-600 dark:text-blue-400' },
              {
                label: 'Due',
                value: formatINR(stats?.due),
                icon: <Clock className="w-4 h-4 text-amber-500" />,
                colorClass: 'text-amber-600 dark:text-amber-400',
                isActive: filter === 'unpaid,partially_paid',
                onClick: () => changeFilter(filter === 'unpaid,partially_paid' ? 'all' : 'unpaid,partially_paid'),
              },
              {
                label: 'Overdue',
                value: formatINR(stats?.overdue),
                icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: filter === 'overdue',
                onClick: () => changeFilter(filter === 'overdue' ? 'all' : 'overdue'),
              },
            ]}
          />
          {(dateFrom || dateTo) && <p className="mt-1 text-[11px] text-[var(--vs-text-secondary)]">Totals are for the selected bill dates (drafts and cancelled bills excluded).</p>}
        </div>
        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search bill no, supplier bill no, supplier, product..."
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
          emptyMessage="No purchase bills found."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${PATHS.bills}/create`)}>Record Bill</Button>}
        />
      </Card>
      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete bill"
        message={`Delete ${deleteTarget?.billNumber || 'this bill'}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </div>
  );
}
