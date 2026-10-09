import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, IndianRupee } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '../components/PurchaseToaster';
import { FilterSelect } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { PATHS, editPath, errMsg, formatINR, num, viewPath } from '../components/helpers';
import { fetchSuppliers, setSupplierStatus, deleteSupplier } from './services/supplierSlice';

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

  const headers = [
    {
      label: 'Supplier',
      key: 'name',
      sortable: true,
      value: 'checked',
      render: (s) => (
        <div className="flex flex-col">
          <button type="button" onClick={() => navigate(viewPath('suppliers', s._id))} className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {s.name}
          </button>
          {s.companyName && <span className="text-[11px] text-[var(--vs-text-secondary)]">{s.companyName}</span>}
        </div>
      ),
    },
    { label: 'Phone', key: 'phone', value: 'checked', render: (s) => s.phone || '—' },
    { label: 'GSTIN', key: 'gstin', value: 'checked', render: (s) => <span className="font-mono text-xs">{s.gstin || 'Unregistered'}</span> },
    { label: 'City', key: 'city', value: 'checked', render: (s) => s.address?.city || '—' },
    { label: 'Credit days', key: 'paymentTermsDays', value: 'checked', render: (s) => (num(s.paymentTermsDays) ? `${s.paymentTermsDays} days` : 'On receipt') },
    {
      label: 'Payable',
      key: 'payableBalance',
      sortable: true,
      value: 'checked',
      render: (s) => {
        const bal = num(s.payableBalance);
        if (bal < 0) return <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(-bal)} advance</span>;
        return <span className={bal > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-[var(--vs-text-secondary)]'}>{formatINR(bal)}</span>;
      },
    },
    {
      label: 'Status',
      key: 'isActive',
      value: 'checked',
      render: (s) => (
        <span className={`font-semibold text-xs ${s.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {s.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Card
        h1="Suppliers"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <FilterSelect
            value={status}
            onChange={changeStatus}
            options={[
              { value: 'all', label: 'All suppliers' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Total suppliers',
                value: stats?.total ?? 0,
                icon: <Users className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
                isActive: status === 'all',
                onClick: () => changeStatus('all'),
              },
              {
                label: 'Active',
                value: stats?.active ?? 0,
                icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                isActive: status === 'active',
                onClick: () => changeStatus(status === 'active' ? 'all' : 'active'),
              },
              {
                label: 'Total payable',
                value: formatINR(stats?.totalPayable),
                icon: <IndianRupee className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={list}
          loading={listLoading}
          searchPlaceholder="Search name, phone, GSTIN, city..."
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
          onView={(s) => navigate(viewPath('suppliers', s._id))}
          onEdit={(s) => navigate(editPath('suppliers', s._id))}
          onDelete={(s) => setDeleteTarget(s)}
          onToggle={handleToggle}
          toggleField="isActive"
          emptyMessage="No suppliers yet. Click 'Add Supplier' to add your first one."
          currentPage={page}
          pageSize={pageSize}
          totalRows={meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(PATHS.ageing)}>
                Payables ageing
              </Button>
              <Button onClick={() => navigate(`${PATHS.suppliers}/create`)}>Add Supplier</Button>
            </div>
          }
        />
      </Card>

      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete supplier"
        message={`Delete "${deleteTarget?.name || ''}"? Suppliers with purchase history can't be deleted; mark them inactive instead.`}
      />
      <PurchaseToaster />
    </div>
  );
}
