import { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, IndianRupee, RotateCcw, Trash2, Plus, Package } from 'lucide-react';
import { FaHistory } from 'react-icons/fa';
import { Alert, Badge, Button, DataTable, Field, Modal, NumberInput, PageHeader, StatCard, Textarea } from '@/components/ui';
import { getDamagedStock, damageStock } from './services/inventorySlice';
import {
  ProductSearchSelect,
  InventoryToaster,
} from './components/InventoryShared';
import {
  formatCurrency,
  formatQty,
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
 * `row` is set for restore / write off (a damaged-stock row); `mark` picks the product.
 */
const DamageActionModal = ({ open, mode, row, loading, onCancel, onSubmit }) => {
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(row ? Number(row.damagedStock) : null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const text = MODAL_TEXT[mode] || MODAL_TEXT.mark;
  const isMark = mode === 'mark';
  const maxQty = isMark ? (product ? Number(product.currentStock || 0) : null) : Number(row?.damagedStock || 0);

  let error = '';
  if (isMark && !product) error = 'Select a product.';
  else if (!(Number(qty) > 0)) error = 'Enter a quantity greater than 0.';
  else if (maxQty !== null && Number(qty) > maxQty) error = `Only ${formatQty(maxQty)} available.`;
  else if (mode === 'write_off' && !reason.trim()) error = 'Enter a reason for the write off.';

  const handleOk = () => {
    setSubmitted(true);
    if (error) return;
    onSubmit({
      productId: isMark ? product._id : row.productId,
      qty: Number(qty),
      action: mode,
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      open={open}
      title={text.title}
      subtitle={text.help}
      onClose={loading ? undefined : onCancel}
      closeOnBackdrop={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={mode === 'write_off' ? 'danger' : 'primary'} onClick={handleOk} loading={loading}>
            {text.ok}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isMark ? (
          <Field
            label="Product"
            required
            hint={product ? `Sellable: ${formatQty(maxQty)} ${product.unit || 'units'}` : undefined}
          >
            <ProductSearchSelect value={product} onChange={setProduct} />
          </Field>
        ) : (
          row && (
            <div className="flex items-center justify-between gap-3 rounded-control bg-fill-2 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
                  <Package className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{row.name}</span>
                  {row.sku && <span className="font-mono text-xs text-ink-subtle">{row.sku}</span>}
                </div>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">
                Damaged: <b className="text-danger tabular-nums">{formatQty(row.damagedStock)}</b>
              </span>
            </div>
          )
        )}

        <Field label="Quantity" required>
          <NumberInput
            value={qty ?? ''}
            onChange={setQty}
            min={0}
            max={maxQty ?? undefined}
            step={1}
            placeholder="e.g. 2"
          />
        </Field>

        <Field label="Reason" required={mode === 'write_off'}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={isMark ? 'e.g. Broken in transit' : mode === 'restore' ? 'e.g. Repaired' : 'e.g. Expired, thrown away'}
          />
        </Field>

        {mode === 'write_off' && Number(qty) > 0 && row && (
          <Alert tone="danger" icon={IndianRupee}>
            Estimated loss:{' '}
            <b className="text-danger">{formatCurrency((Number(row.value || 0) / Math.max(1, Number(row.damagedStock || 1))) * Number(qty))}</b>
          </Alert>
        )}

        {submitted && error && <p role="alert" className="m-0 text-xs font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
};

export default function DamagedStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, stats, pagination, loading } = useSelector((state) => state.inventory.reports.damaged);
  const { damageLoading } = useSelector((state) => state.inventory);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // { mode: 'mark' | 'restore' | 'write_off', row, key } | null
  const [modal, setModal] = useState(null);

  const { toasts, showToast } = useToasts();

  const params = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch || undefined,
    }),
    [currentPage, pageSize, debouncedSearch]
  );
  const reload = useReportLoader(dispatch, getDamagedStock, params, (msg) => showToast(msg, 'danger'));

  // One row per product (kept unique per stock row for old multi-store data)
  const rows = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((r, i) => ({
        ...r,
        productId: r._id,
        _id: `${r._id}:${i}`,
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

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Product',
        mobile: 'title',
        render: (row) => <span className="text-sm font-semibold text-ink">{row.name || 'Deleted Product'}</span>,
      },
      {
        key: 'sku',
        header: 'SKU',
        hideBelow: 'lg',
        render: (row) => (row.sku ? <span className="font-mono text-xs">{row.sku}</span> : <span className="text-ink-subtle">—</span>),
      },
      {
        key: 'damagedStock',
        header: 'Damaged',
        type: 'number',
        mobile: 'amount',
        render: (row) => (
          <Badge tone="danger" className="tabular-nums">
            {formatQty(row.damagedStock)} {row.unit || ''}
          </Badge>
        ),
      },
      {
        key: 'sellableStock',
        header: 'Sellable',
        type: 'number',
        render: (row) => <span className="text-xs font-semibold tabular-nums">{formatQty(row.sellableStock)}</span>,
      },
      {
        key: 'value',
        header: 'Value at cost (₹)',
        type: 'money',
        render: (row) => <span className="font-semibold">{formatCurrency(row.value)}</span>,
      },
      {
        key: 'actions',
        header: '',
        type: 'actions',
        render: (row) => (
          <div className="inline-flex items-center justify-end gap-1">
            <Button variant="soft" size="xs" startIcon={<RotateCcw />} title="Move back to sellable stock" onClick={() => openModal('restore', row)}>
              Restore
            </Button>
            <Button variant="danger-soft" size="xs" startIcon={<Trash2 />} title="Remove permanently" onClick={() => openModal('write_off', row)}>
              Write off
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Stock history"
              aria-label="Stock history"
              onClick={() => navigate(productAuditPath(row.productId))}
            >
              <FaHistory />
            </Button>
          </div>
        ),
      },
    ],
    [navigate, openModal]
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Damaged Stock"
        description="Units kept aside as damaged. Restore them to sellable stock or write them off."
        actions={
          <Button startIcon={<Plus />} onClick={() => openModal('mark')}>
            Mark damaged
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard label="Damaged units" value={formatQty(stats?.units)} icon={AlertOctagon} tone="danger" />
        <StatCard label="Damaged value" value={formatCurrency(stats?.value)} chip="at cost" icon={IndianRupee} tone="primary" />
        <StatCard label="Rows" value={pagination?.total || 0} icon={Package} tone="neutral" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={{
          value: searchTerm,
          onChange: (val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          },
          onSubmit: () => setCurrentPage(1),
          onClear: () => {
            setSearchTerm('');
            setCurrentPage(1);
          },
          placeholder: 'Search name, SKU, barcode...',
        }}
        empty={{
          icon: AlertOctagon,
          title: debouncedSearch ? 'No damaged stock matches these filters.' : 'No damaged stock. All good!',
        }}
        pagination={{
          page: currentPage,
          pageSize,
          total: pagination?.total || 0,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <DamageActionModal
        key={modal?.key || 'closed'}
        open={!!modal}
        mode={modal?.mode}
        row={modal?.row}
        loading={damageLoading}
        onCancel={() => setModal(null)}
        onSubmit={handleSubmit}
      />

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
