import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, IndianRupee, FileText, ShoppingCart, Percent, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Button, DataTable, Input, PageHeader, Select, StatCard } from '@/components/ui';
import PayBillPanel from '../components/PayBillPanel';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { Modal } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, fmtDate, formatINR, num, supplierName, viewPath } from '../components/helpers';
import { fetchPurchaseOrders, deletePurchaseOrder } from './services/purchaseOrderSlice';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft,sent', label: 'Draft' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
  // old orders
  { value: 'partially_received', label: 'Partially received (old)' },
  { value: 'closed', label: 'Closed (old)' },
];

export default function PurchaseOrderList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, stats, listLoading, listError, saving } = useSelector((state) => state.purchaseOrder);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null); // purchase whose bill is being paid

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'poDate', order: 'desc' };
    if (status !== 'all') params.status = status;
    if (query) params.search = query;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    dispatch(fetchPurchaseOrders(params));
  }, [dispatch, page, pageSize, status, query, dateFrom, dateTo, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const handleDelete = async () => {
    try {
      const res = await dispatch(deletePurchaseOrder(deleteTarget._id)).unwrap();
      notify(res?.message || 'Purchase deleted');
      setRefresh((r) => r + 1);
    } catch (e) {
      notifyError(errMsg(e));
    } finally {
      setDeleteTarget(null);
    }
  };

  // the bill made when the purchase was received, with money still to pay
  const payable = (po) => po.bill && ['unpaid', 'partially_paid'].includes(po.bill.status) && num(po.bill.balanceAmount) > 0;

  const columns = [
    { key: 'poNumber', header: 'Purchase no.', type: 'mono', mobile: 'title', cellClassName: 'font-semibold' },
    { key: 'supplier', header: 'Supplier', render: (po) => <span className="font-semibold">{supplierName(po)}</span> },
    { key: 'poDate', header: 'Date', render: (po) => fmtDate(po.poDate) },
    { key: 'expectedDate', header: 'Expected', hideBelow: '2xl', render: (po) => fmtDate(po.expectedDate) },
    { key: 'items', header: 'Items', type: 'number', hideBelow: 'lg', render: (po) => po.items?.length ?? '—' },
    { key: 'totalAmount', header: 'Total (₹)', type: 'money', mobile: 'amount', render: (po) => formatINR(po.totalAmount) },
    {
      key: 'paid',
      header: 'Paid (₹)',
      type: 'money',
      hideBelow: 'lg',
      render: (po) =>
        po.bill ? <span className="font-medium text-success">{formatINR(num(po.bill.paidAmount) + num(po.bill.adjustedAmount))}</span> : <span className="font-normal text-ink-subtle">—</span>,
    },
    {
      key: 'balance',
      header: 'Still to pay (₹)',
      type: 'money',
      render: (po) =>
        po.bill && po.bill.status !== 'cancelled' ? (
          <span className="inline-flex items-center justify-end gap-2">
            <span className={num(po.bill.balanceAmount) > 0 ? 'text-danger' : 'font-normal text-ink-subtle'}>{formatINR(po.bill.balanceAmount)}</span>
            {payable(po) && (
              <Button variant="soft" size="xs" startIcon={<IndianRupee />} onClick={() => setPayTarget(po)} title={`Pay supplier (${formatINR(po.bill.balanceAmount)} to pay)`}>
                Pay
              </Button>
            )}
          </span>
        ) : (
          <span className="font-normal text-ink-subtle">—</span>
        ),
    },
    { key: 'status', header: 'Status', type: 'status' },
  ];

  const rowActions = (po) => [
    { label: 'View', icon: Eye, onClick: () => navigate(viewPath('orders', po._id)) },
    ['draft', 'sent'].includes(po.status) && { label: 'Edit', icon: Edit2, onClick: () => navigate(editPath('orders', po._id)) },
    payable(po) && { label: `Pay supplier (${formatINR(po.bill.balanceAmount)})`, icon: IndianRupee, onClick: () => setPayTarget(po) },
    ['draft', 'cancelled'].includes(po.status) && { divider: true },
    ['draft', 'cancelled'].includes(po.status) && { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget(po) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Purchases"
        actions={<Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.orders}/create`)}>New Purchase</Button>}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Bills" value={stats?.bills ?? 0} icon={FileText} tone="neutral" />
          <StatCard label="Total bought" value={formatINR(stats?.purchases)} icon={ShoppingCart} tone="primary" />
          <StatCard label="GST you can claim (ITC)" value={formatINR(stats?.inputTax)} icon={Percent} tone="info" />
          <StatCard label="Still to pay" value={formatINR(stats?.due)} icon={Clock} tone="warning" />
          <StatCard label="Late" value={formatINR(stats?.overdue)} icon={AlertTriangle} tone="danger" />
        </div>
        {(dateFrom || dateTo) && <p className="m-0 text-xs text-ink-subtle">Totals are for bills in the selected dates (drafts and cancelled bills excluded).</p>}
      </div>

      <DataTable
        columns={columns}
        rows={list}
        loading={listLoading}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search PO number, supplier, product...',
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
            <div className="w-48">
              <Select size="sm" searchable={false} aria-label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
            </div>
          </>
        }
        rowActions={rowActions}
        onRowClick={(po) => navigate(viewPath('orders', po._id))}
        empty={{
          icon: ShoppingCart,
          title: 'No purchases found',
          text: "Click 'New Purchase' to create one.",
          action: <Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.orders}/create`)}>New Purchase</Button>,
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

      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete purchase"
        message={`Delete ${deleteTarget?.poNumber || 'this purchase'}? This cannot be undone.`}
      />
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Pay supplier" subtitle={payTarget ? `${payTarget.poNumber} · bill ${payTarget.bill?.billNumber || ''} · ${supplierName(payTarget)}` : ''}>
        {payTarget?.bill && (
          <PayBillPanel
            key={payTarget.bill._id}
            bill={payTarget.bill}
            title={`${formatINR(payTarget.bill.balanceAmount)} to pay`}
            onPaid={() => {
              setPayTarget(null);
              setRefresh((r) => r + 1);
            }}
          />
        )}
      </Modal>
      <PurchaseToaster />
    </div>
  );
}
