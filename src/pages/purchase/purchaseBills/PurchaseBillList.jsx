import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, IndianRupee, FileText, ShoppingCart, Percent, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Button, DataTable, Input, PageHeader, StatCard } from '@/components/ui';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { notify, notifyError } from '../components/toast';
import { PATHS, daysPast, editPath, errMsg, fmtDate, formatINR, isOverdue, num, refId, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseBills, deletePurchaseBill } from './services/purchaseBillSlice';

const DUE = 'unpaid,partially_paid'; // bills with money still to pay

// Plain words for bill status (the shared badge is also used by orders / receipts).
const BILL_STATUS_LABEL = { draft: 'Not finished', unpaid: 'To pay', partially_paid: 'Part paid', paid: 'Paid', cancelled: 'Cancelled' };

export default function PurchaseBillList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, stats, listLoading, listError, saving } = useSelector((state) => state.purchaseBill);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | DUE (unpaid + part paid) | 'overdue'
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

  const payable = (b) => ['unpaid', 'partially_paid'].includes(b.status) && num(b.balanceAmount) > 0;
  const payBill = (b) => navigate(`${PATHS.payments}/create`, { state: { supplierId: refId(b.supplierId), purchaseBillId: b._id, amount: b.balanceAmount } });

  const columns = [
    { key: 'billNumber', header: 'Bill', mobile: 'title', render: (b) => <span className="font-mono text-[13px] font-semibold">{b.billNumber}</span> },
    { key: 'supplierBillNo', header: 'Supplier bill no.', type: 'mono', hideBelow: 'xl' },
    { key: 'supplier', header: 'Supplier', render: (b) => <span className="font-semibold">{supplierName(b)}</span> },
    { key: 'billDate', header: 'Bill date', hideBelow: 'xl', render: (b) => fmtDate(b.billDate) },
    {
      key: 'dueDate',
      header: 'Pay by',
      render: (b) => {
        const late = b.status !== 'draft' && b.status !== 'cancelled' && isOverdue(b.dueDate, b.balanceAmount);
        return <span className={late ? 'font-semibold text-danger' : ''}>{fmtDate(b.dueDate)}</span>;
      },
    },
    {
      key: 'late',
      header: 'Late',
      hideBelow: 'lg',
      render: (b) =>
        b.status !== 'draft' && b.status !== 'cancelled' && isOverdue(b.dueDate, b.balanceAmount) ? (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-danger">Late</span>
        ) : (
          <span className="text-ink-subtle">—</span>
        ),
    },
    {
      key: 'dueDays',
      header: 'Due days',
      hideBelow: '2xl',
      render: (b) => {
        if (b.status === 'paid') return <span className="font-semibold text-success">Paid</span>;
        if (!['unpaid', 'partially_paid'].includes(b.status)) return <span className="text-ink-subtle">—</span>;
        // Days since the goods arrived (today − delivered day).
        const days = daysPast(b.receivedDate || b.billDate);
        const late = isOverdue(b.dueDate, b.balanceAmount);
        return (
          <span className={late ? 'font-semibold text-danger' : 'text-ink'} title={`Goods arrived on ${fmtDate(b.receivedDate || b.billDate)}`}>
            {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`}
          </span>
        );
      },
    },
    { key: 'totalAmount', header: 'Total (₹)', type: 'money', mobile: 'amount', render: (b) => formatINR(b.totalAmount) },
    { key: 'paidAmount', header: 'Paid (₹)', type: 'money', hideBelow: 'lg', render: (b) => <span className="font-medium text-success">{formatINR(num(b.paidAmount) + num(b.adjustedAmount))}</span> },
    {
      key: 'balanceAmount',
      header: 'Still to pay (₹)',
      type: 'money',
      render: (b) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span className={num(b.balanceAmount) > 0 && b.status !== 'draft' ? 'text-danger' : 'font-normal text-ink-subtle'}>{formatINR(b.balanceAmount)}</span>
          {payable(b) && (
            <Button variant="soft" size="xs" startIcon={<IndianRupee />} onClick={() => payBill(b)} title="Pay this bill">
              Pay
            </Button>
          )}
        </span>
      ),
    },
    { key: 'status', header: 'Status', type: 'status', statusLabel: (b) => BILL_STATUS_LABEL[b.status] },
  ];

  const rowActions = (b) => [
    { label: 'View', icon: Eye, onClick: () => navigate(viewPath('bills', b._id)) },
    b.status === 'draft' && { label: 'Edit', icon: Edit2, onClick: () => navigate(editPath('bills', b._id)) },
    payable(b) && { label: 'Pay this bill', icon: IndianRupee, onClick: () => payBill(b) },
    ['draft', 'cancelled'].includes(b.status) && { divider: true },
    ['draft', 'cancelled'].includes(b.status) && { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget(b) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Purchase Bills"
        actions={<Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.bills}/create`)}>Record a bill</Button>}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Bills" value={stats?.bills ?? 0} icon={FileText} tone="neutral" active={filter === 'all'} onClick={() => changeFilter('all')} />
          <StatCard label="Total bought" value={formatINR(stats?.purchases)} icon={ShoppingCart} tone="primary" />
          <StatCard label="GST you can claim (ITC)" value={formatINR(stats?.inputTax)} icon={Percent} tone="info" />
          <StatCard label="Still to pay" value={formatINR(stats?.due)} icon={Clock} tone="warning" active={filter === DUE} onClick={() => changeFilter(filter === DUE ? 'all' : DUE)} />
          <StatCard label="Late" value={formatINR(stats?.overdue)} icon={AlertTriangle} tone="danger" active={filter === 'overdue'} onClick={() => changeFilter(filter === 'overdue' ? 'all' : 'overdue')} />
        </div>
        {(dateFrom || dateTo) && <p className="m-0 text-xs text-ink-subtle">Totals are for the selected bill dates (drafts and cancelled bills excluded).</p>}
      </div>

      <DataTable
        columns={columns}
        rows={list}
        loading={listLoading}
        tabs={[
          { value: 'all', label: 'All bills' },
          { value: DUE, label: 'Due bills' },
          { value: 'overdue', label: 'Late' },
        ]}
        tab={filter}
        onTabChange={changeFilter}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search bill no, supplier bill no, supplier, product...',
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
          </>
        }
        rowActions={rowActions}
        onRowClick={(b) => navigate(viewPath('bills', b._id))}
        empty={{ icon: FileText, title: 'No purchase bills found', text: 'Bills you record or receive show here.' }}
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
