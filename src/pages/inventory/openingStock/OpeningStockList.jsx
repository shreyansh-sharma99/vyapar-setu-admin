import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Eye, Trash2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import Card from '@/components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import PurchaseToaster from '@/pages/purchase/components/PurchaseToaster';
import { FilterSelect, StatusBadge } from '@/pages/purchase/components/ui';
import useApi from '@/pages/purchase/components/useApi';
import { notify, notifyError } from '@/pages/purchase/components/toast';
import { errMsg, fmtDate, formatINR, storeName } from '@/pages/purchase/components/helpers';
import { deleteOpeningStockApi, getOpeningStocksApi } from './services/openingStockService';
import { OPENING_PATH, openingEditPath, openingViewPath } from './paths';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Not finished' },
  { value: 'posted', label: 'Posted (in stock)' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** "Not finished" for drafts, else the usual badge. */
export const OpeningStatus = ({ status, size }) => <StatusBadge status={status} size={size} label={status === 'draft' ? 'Not finished' : undefined} />;

/** Inventory → Opening Stock: goods already on the shelf, entered with cost, MRP and batch. */
export default function OpeningStockList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const params = { page, limit: pageSize, sort: 'openingDate', order: 'desc', ...(status !== 'all' ? { status } : {}), ...(query ? { search: query } : {}) };
  const { data, loading, error, reload } = useApi(`opening-list:${JSON.stringify(params)}`, () => getOpeningStocksApi(params));
  const rows = data?.data || [];

  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteOpeningStockApi(deleteTarget._id);
      notify(res?.message || 'Opening stock deleted');
      reload();
    } catch (e) {
      notifyError(errMsg(e));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const iconBtn = 'p-1 rounded-lg transition-colors cursor-pointer';
  const headers = [
    {
      label: 'Actions',
      key: 'actions',
      render: (d) => (
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" title="View" onClick={() => navigate(openingViewPath(d._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
            <Eye className="w-4 h-4" />
          </button>
          {d.status === 'draft' && (
            <button type="button" title="Edit" onClick={() => navigate(openingEditPath(d._id))} className={`${iconBtn} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {['draft', 'cancelled'].includes(d.status) && (
            <button type="button" title="Delete" onClick={() => setDeleteTarget(d)} className={`${iconBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { label: 'Number', key: 'openingNumber', value: 'checked', cellClassName: 'font-mono font-semibold' },
    { label: 'Date', key: 'openingDate', value: 'checked', render: (d) => fmtDate(d.openingDate) },
    { label: 'Store', key: 'store', value: 'checked', render: (d) => storeName(d) },
    { label: 'Items', key: 'items', value: 'checked', render: (d) => (d.items || []).length },
    { label: 'Value (at cost)', key: 'totalValue', value: 'checked', render: (d) => <span className="font-semibold">{formatINR(d.totalValue)}</span> },
    { label: 'Status', key: 'status', value: 'checked', render: (d) => <OpeningStatus status={d.status} /> },
  ];

  return (
    <div>
      <Card
        h1="Opening Stock"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={FILTERS}
          />
        }
      >
        <Table
          headers={headers}
          data={rows}
          loading={loading}
          searchPlaceholder="Search number, product..."
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
          emptyMessage="No opening stock yet. Add the goods already on your shelf with their cost and MRP."
          currentPage={page}
          pageSize={pageSize}
          totalRows={data?.meta?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          actions={<Button onClick={() => navigate(`${OPENING_PATH}/create`)}>Add opening stock</Button>}
        />
      </Card>
      <DeleteModal
        isOpen={!!deleteTarget}
        isLoading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete opening stock"
        message={`Delete ${deleteTarget?.openingNumber || 'this opening stock'}? This cannot be undone.`}
      />
      <PurchaseToaster />
    </div>
  );
}
