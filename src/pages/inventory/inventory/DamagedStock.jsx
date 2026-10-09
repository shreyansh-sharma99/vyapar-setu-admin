import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Modal, Input as AntInput, InputNumber } from 'antd';
import { AlertOctagon, IndianRupee, RotateCcw, Trash2, Plus, Store as StoreIcon, Package } from 'lucide-react';
import { FaHistory } from 'react-icons/fa';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { getDamagedStock, damageStock } from './services/inventorySlice';
import {
  AntdThemed,
  FilterBar,
  FilterField,
  StoreSelect,
  ProductCell,
  ProductSearchSelect,
  InventoryNav,
  InventoryToaster,
} from './components/InventoryShared';
import {
  formatCurrency,
  formatQty,
  getStoreQty,
  useDebouncedValue,
  useToasts,
  useReportLoader,
  productAuditPath,
} from './components/inventoryUtils';

const MODAL_TEXT = {
  mark: {
    title: 'Mark Stock as Damaged',
    ok: 'Mark Damaged',
    help: 'Moves units from sellable stock to damaged stock. They can be restored or written off later.',
  },
  restore: {
    title: 'Restore to Sellable',
    ok: 'Restore',
    help: 'Moves damaged units back to sellable stock (repaired or found fine).',
  },
  write_off: {
    title: 'Write Off Damaged Stock',
    ok: 'Write Off',
    help: 'Removes damaged units permanently. Their cost is recorded as a loss. This cannot be undone.',
  },
};

/**
 * One modal for mark / restore / write off.
 * `row` is set for restore / write off (a damaged-stock row); `mark` picks product + store.
 */
const DamageActionModal = ({ open, mode, row, stores, defaultStoreId, loading, onCancel, onSubmit }) => {
  const [product, setProduct] = useState(null);
  const [storeId, setStoreId] = useState(defaultStoreId || '');
  const [qty, setQty] = useState(row ? Number(row.damagedStock) : null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const text = MODAL_TEXT[mode] || MODAL_TEXT.mark;
  const isMark = mode === 'mark';
  const store = stores.find((s) => s._id === storeId) || null;
  const maxQty = isMark ? getStoreQty(product, store) : Number(row?.damagedStock || 0);

  let error = '';
  if (isMark && !storeId) error = 'Select a store.';
  else if (isMark && !product) error = 'Select a product.';
  else if (!(Number(qty) > 0)) error = 'Enter a quantity greater than 0.';
  else if (maxQty !== null && Number(qty) > maxQty) error = `Only ${formatQty(maxQty)} available.`;
  else if (mode === 'write_off' && !reason.trim()) error = 'Enter a reason for the write off.';

  const handleOk = () => {
    setSubmitted(true);
    if (error) return;
    onSubmit({
      productId: isMark ? product._id : row.productId,
      storeId: isMark ? storeId : row.storeId?._id,
      qty: Number(qty),
      action: mode,
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      open={open}
      title={text.title}
      onCancel={loading ? undefined : onCancel}
      onOk={handleOk}
      okText={text.ok}
      okButtonProps={{ danger: mode === 'write_off', loading }}
      cancelButtonProps={{ disabled: loading }}
      destroyOnHidden
      maskClosable={!loading}
    >
      <div className="flex flex-col gap-3 pt-1">
        <p className="text-xs opacity-70">{text.help}</p>

        {isMark ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Store / Warehouse *</span>
              <StoreSelect
                stores={stores}
                activeOnly
                value={storeId}
                onChange={setStoreId}
                placeholder="Select store"
                allowClear={false}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Product *</span>
              <ProductSearchSelect value={product} onChange={setProduct} storeId={storeId} />
              {product && store && (
                <span className="text-[11px] opacity-70">
                  Sellable in {store.name}: <b>{formatQty(maxQty)}</b> {product.unit || 'units'}
                </span>
              )}
            </div>
          </>
        ) : (
          row && (
            <div className="rounded-lg border border-[var(--vs-border)] p-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold truncate">{row.name}</span>
                  <span className="opacity-70">{row.storeId?.name || 'Store'}</span>
                </div>
              </div>
              <span className="shrink-0">
                Damaged: <b className="text-rose-600">{formatQty(row.damagedStock)}</b>
              </span>
            </div>
          )
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">Quantity *</span>
          <InputNumber
            value={qty}
            onChange={setQty}
            min={0}
            max={maxQty ?? undefined}
            className="!w-full"
            placeholder="e.g. 2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">Reason{mode === 'write_off' ? ' *' : ''}</span>
          <AntInput.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={isMark ? 'e.g. Broken in transit' : mode === 'restore' ? 'e.g. Repaired' : 'e.g. Expired, thrown away'}
          />
        </div>

        {mode === 'write_off' && Number(qty) > 0 && row && (
          <div className="text-xs rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2.5 py-1.5">
            Estimated loss:{' '}
            <b>{formatCurrency((Number(row.value || 0) / Math.max(1, Number(row.damagedStock || 1))) * Number(qty))}</b>
          </div>
        )}

        {submitted && error && <span className="text-xs font-medium text-rose-600">{error}</span>}
      </div>
    </Modal>
  );
};

export default function DamagedStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, stats, pagination, loading } = useSelector((state) => state.inventory.reports.damaged);
  const { damageLoading } = useSelector((state) => state.inventory);
  const { stores } = useSelector((state) => state.store);

  const [selectedStore, setSelectedStore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // { mode: 'mark' | 'restore' | 'write_off', row, key } | null
  const [modal, setModal] = useState(null);

  const { toasts, showToast } = useToasts();

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
  }, [dispatch]);

  const params = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      storeId: selectedStore || undefined,
      search: debouncedSearch || undefined,
    }),
    [currentPage, pageSize, selectedStore, debouncedSearch]
  );
  const reload = useReportLoader(dispatch, getDamagedStock, params, (msg) => showToast(msg, 'danger'));

  // Rows are product × store, so build a unique key per row
  const rows = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        productId: r._id,
        _id: `${r._id}:${r.storeId?._id || r.storeId}`,
      })),
    [data]
  );

  const openModal = useCallback((mode, row = null) => setModal({ mode, row, key: Date.now() }), []);

  const handleSubmit = (payload) => {
    dispatch(damageStock(payload))
      .unwrap()
      .then((res) => {
        const loss = res?.data?.lossValue;
        showToast(
          payload.action === 'write_off' && loss ? `${res.message}. Loss: ${formatCurrency(loss)}` : res?.message || 'Done',
          'success'
        );
        setModal(null);
        reload();
      })
      .catch((msg) => showToast(typeof msg === 'string' ? msg : 'Action failed.', 'danger'));
  };

  const headers = useMemo(
    () => [
      {
        label: 'Actions',
        key: 'actions',
        width: '1%',
        render: (row) => (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => openModal('restore', row)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg border border-emerald-200 dark:border-emerald-500/30 cursor-pointer"
              title="Move back to sellable stock"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
            <button
              type="button"
              onClick={() => openModal('write_off', row)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg border border-rose-200 dark:border-rose-500/30 cursor-pointer"
              title="Remove permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Write Off
            </button>
            <button
              type="button"
              onClick={() => navigate(productAuditPath(row.productId))}
              className="p-1.5 rounded text-blue-600 hover:text-blue-800 dark:text-blue-400 cursor-pointer"
              title="Stock history"
            >
              <FaHistory className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
      {
        label: 'Product',
        key: 'name',
        value: 'checked',
        render: (row) => <ProductCell name={row.name} sku={row.sku} />,
      },
      {
        label: 'Store',
        key: 'store',
        value: 'checked',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <StoreIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            {row.storeId?.name || 'Store'}
            {row.storeId?.code ? ` [${row.storeId.code}]` : ''}
          </span>
        ),
      },
      {
        label: 'Damaged',
        key: 'damagedStock',
        value: 'checked',
        cellClassName: 'text-center',
        render: (row) => (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {formatQty(row.damagedStock)} {row.unit || ''}
          </span>
        ),
      },
      {
        label: 'Sellable',
        key: 'sellableStock',
        value: 'checked',
        cellClassName: 'text-center',
        render: (row) => <span className="text-xs font-semibold">{formatQty(row.sellableStock)}</span>,
      },
      {
        label: 'Value (at cost)',
        key: 'value',
        value: 'checked',
        cellClassName: 'text-right',
        render: (row) => <span className="font-semibold">{formatCurrency(row.value)}</span>,
      },
    ],
    [navigate, openModal]
  );

  return (
    <div>
      <Card h1="Damaged Stock" bodyClassName="px-4 pb-4 pt-3">
        <InventoryNav current="damaged" />
        <AntdThemed>
          <FilterBar>
            <FilterField label="Store / Warehouse">
              <StoreSelect
                stores={stores}
                value={selectedStore}
                onChange={(v) => {
                  setSelectedStore(v);
                  setCurrentPage(1);
                }}
              />
            </FilterField>
          </FilterBar>

          <DamageActionModal
            key={modal?.key || 'closed'}
            open={!!modal}
            mode={modal?.mode}
            row={modal?.row}
            stores={stores}
            defaultStoreId={selectedStore}
            loading={damageLoading}
            onCancel={() => setModal(null)}
            onSubmit={handleSubmit}
          />
        </AntdThemed>

        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Damaged Units',
                value: formatQty(stats?.units),
                icon: <AlertOctagon className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
              },
              {
                label: 'Damaged Value',
                value: formatCurrency(stats?.value),
                subValue: '(at cost)',
                icon: <IndianRupee className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
              },
              {
                label: 'Rows',
                value: pagination?.total || 0,
                subValue: '(product × store)',
                icon: <Package className="w-4 h-4 text-slate-500" />,
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={rows}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search name, SKU, barcode..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          onSearchClick={() => setCurrentPage(1)}
          onSearchClear={() => {
            setSearchTerm('');
            setCurrentPage(1);
          }}
          actions={
            <Button onClick={() => openModal('mark')} className="!h-10" startIcon={<Plus className="w-4 h-4" />}>
              Mark Damaged
            </Button>
          }
          emptyMessage={selectedStore || debouncedSearch ? 'No damaged stock matches these filters.' : 'No damaged stock. All good!'}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          totalRows={pagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </Card>

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
