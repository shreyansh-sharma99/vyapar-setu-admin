import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Edit2, Eye, IndianRupee, Plus, Trash2, Truck, UserCheck, Users } from 'lucide-react';
import { Button, ConfirmDialog, DataTable, PageHeader, StatCard, Switch } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, formatINR, num, viewPath } from '../components/helpers';
import { fetchSuppliers, setSupplierStatus, deleteSupplier } from './services/supplierSlice';

const STATUS_TABS = [
  { value: 'all', label: 'All suppliers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function SupplierList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, meta, stats, listLoading, listError, saving } = useSelector((state) => state.supplier);

  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const params = { page, limit: pageSize, sort: 'name', order: 'asc' };
    if (status !== 'all') params.isActive = status === 'active';
    if (query) params.search = query;
    dispatch(fetchSuppliers(params));
  }, [dispatch, page, pageSize, status, query, refresh]);

  useEffect(() => {
    if (listError) notifyError(listError);
  }, [listError]);

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleToggle = async (item, isActive) => {
    try {
      const res = await dispatch(setSupplierStatus({ id: item._id, isActive })).unwrap();
      notify(res?.message || (isActive ? 'Supplier activated' : 'Supplier deactivated'));
      setRefresh((r) => r + 1);
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(deleteSupplier(deleteTarget._id)).unwrap();
      notify(res?.message || 'Supplier deleted');
      setDeleteTarget(null);
      setRefresh((r) => r + 1);
    } catch (e) {
      setDeleteTarget(null);
      notifyError(errMsg(e));
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Supplier',
      sortable: true,
      mobile: 'title',
      render: (s) => <span className="font-semibold text-ink">{s.name}</span>,
    },
    { key: 'companyName', header: 'Company', hideBelow: 'lg', render: (s) => s.companyName || '—' },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    { key: 'gstin', header: 'GSTIN', hideBelow: 'lg', render: (s) => (s.gstin ? <span className="font-mono text-[13px]">{s.gstin}</span> : <span className="text-ink-subtle">Unregistered</span>) },
    { key: 'city', header: 'City', hideBelow: 'xl', render: (s) => s.address?.city || '—' },
    { key: 'paymentTermsDays', header: 'Credit days', hideBelow: 'xl', render: (s) => (num(s.paymentTermsDays) ? `${s.paymentTermsDays} days` : 'On receipt') },
    {
      key: 'payableBalance',
      header: 'Payable (₹)',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      render: (s) => {
        const bal = num(s.payableBalance);
        if (bal < 0) return <span className="text-success">{formatINR(-bal)} advance</span>;
        return <span className={bal > 0 ? 'text-danger' : 'font-normal text-ink-subtle'}>{formatINR(bal)}</span>;
      },
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (s) => (
        <Switch size="sm" checked={!!s.isActive} onChange={(v) => handleToggle(s, v)} label={s.isActive ? 'Active' : 'Inactive'} />
      ),
    },
  ];

  const rowActions = (s) => [
    { label: 'View', icon: Eye, onClick: () => navigate(viewPath('suppliers', s._id)) },
    { label: 'Edit', icon: Edit2, onClick: () => navigate(editPath('suppliers', s._id)) },
    { divider: true },
    { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget(s) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Suppliers"
        actions={<Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.suppliers}/create`)}>Add Supplier</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total suppliers" value={stats?.total ?? 0} icon={Users} tone="primary" active={status === 'all'} onClick={() => changeStatus('all')} />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          icon={UserCheck}
          tone="success"
          active={status === 'active'}
          onClick={() => changeStatus(status === 'active' ? 'all' : 'active')}
        />
        <StatCard label="Total payable" value={formatINR(stats?.totalPayable)} icon={IndianRupee} tone="danger" />
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
          placeholder: 'Search name, phone, GSTIN, city...',
          onSubmit: () => {
            setPage(1);
            setQuery(searchTerm.trim());
          },
          onClear: () => {
            setPage(1);
            setQuery('');
          },
        }}
        rowActions={rowActions}
        onRowClick={(s) => navigate(viewPath('suppliers', s._id))}
        empty={{
          icon: Truck,
          title: 'No suppliers yet',
          text: "Click 'Add Supplier' to add your first one.",
          action: <Button startIcon={<Plus />} onClick={() => navigate(`${PATHS.suppliers}/create`)}>Add Supplier</Button>,
        }}
        pagination={{
          page,
          pageSize,
          total: meta?.total || 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete supplier"
        message={`Delete "${deleteTarget?.name || ''}"? Suppliers with purchase history can't be deleted; mark them inactive instead.`}
        confirmLabel="Delete"
        icon={Trash2}
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <PurchaseToaster />
    </div>
  );
}
