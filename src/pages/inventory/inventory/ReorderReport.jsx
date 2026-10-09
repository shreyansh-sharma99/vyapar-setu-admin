import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Select as AntSelect, InputNumber, Segmented } from 'antd';
import { ShoppingCart, Download, Package, IndianRupee, CheckSquare, Store as StoreIcon, Truck } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { getReorderReport } from './services/inventorySlice';
import { getSupplierOptionsApi } from './services/inventoryService';
import {
  AntdThemed,
  FilterBar,
  FilterField,
  StoreSelect,
  ProductCell,
  InventoryNav,
  InventoryToaster,
} from './components/InventoryShared';
import {
  formatCurrency,
  formatQty,
  downloadCsv,
  useDebouncedValue,
  useToasts,
  useReportLoader,
} from './components/inventoryUtils';

const DAY_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
];

const rowKey = (r) => `${r.productId}:${r.storeId?._id || r.storeId}`;
const rowRate = (r) => Number(r.lastPurchasePrice || r.costPrice || r.avgCost || 0);
const supplierName = (s) => (s ? s.companyName || s.name : '');

const DaysLeft = ({ days }) => {
  if (days === null || days === undefined) {
    return <span className="text-[11px] text-[var(--vs-text-secondary)]">No sales</span>;
  }
  const cls =
    days <= 3
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
      : days <= 7
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{days} days</span>;
};

export default function ReorderReport() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, pagination, loading } = useSelector((state) => state.inventory.reports.reorder);
  const { stores } = useSelector((state) => state.store);

  const [selectedStore, setSelectedStore] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [days, setDays] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [suppliers, setSuppliers] = useState([]);
  const [qtyEdits, setQtyEdits] = useState({}); // rowKey -> qty
  const [selected, setSelected] = useState({}); // rowKey -> row (kept across pages)

  const { toasts, showToast } = useToasts();

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
    getSupplierOptionsApi()
      .then((res) => setSuppliers(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSuppliers([]));
  }, [dispatch]);

  const params = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      days,
      storeId: selectedStore || undefined,
      supplierId: supplierId || undefined,
      search: debouncedSearch || undefined,
    }),
    [currentPage, pageSize, days, selectedStore, supplierId, debouncedSearch]
  );
  useReportLoader(dispatch, getReorderReport, params, (msg) => showToast(msg, 'danger'));

  const rows = useMemo(
    () => (Array.isArray(data) ? data : []).map((r) => ({ ...r, _id: rowKey(r) })),
    [data]
  );

  const getQty = useCallback(
    (r) => (qtyEdits[r._id] !== undefined ? qtyEdits[r._id] : r.suggestedQty),
    [qtyEdits]
  );

  const resetPage = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const toggleRow = useCallback((row) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[row._id]) delete next[row._id];
      else next[row._id] = row;
      return next;
    });
  }, []);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected[r._id]);
  const togglePage = useCallback(() => {
    setSelected((prev) => {
      const next = { ...prev };
      if (rows.every((r) => next[r._id])) rows.forEach((r) => delete next[r._id]);
      else rows.forEach((r) => (next[r._id] = r));
      return next;
    });
  }, [rows]);

  const selectedRows = Object.values(selected);
  const selectedCost = selectedRows.reduce((sum, r) => sum + Number(getQty(r) || 0) * rowRate(r), 0);
  const pageCost = rows.reduce((sum, r) => sum + Number(getQty(r) || 0) * rowRate(r), 0);

  const handleCreatePo = () => {
    if (!selectedRows.length) return;
    const storeIds = [...new Set(selectedRows.map((r) => r.storeId?._id || r.storeId))];
    if (storeIds.length > 1) {
      showToast('Select products from one store only. A purchase order is for one store.', 'danger');
      return;
    }
    const supplierIds = [...new Set(selectedRows.map((r) => r.supplier?._id || ''))];
    const items = selectedRows
      .map((r) => ({
        productId: r.productId,
        productName: r.name,
        qty: Number(getQty(r) || 0),
        rate: rowRate(r),
      }))
      .filter((i) => i.qty > 0);
    if (!items.length) {
      showToast('Enter a quantity for at least one selected product.', 'danger');
      return;
    }
    navigate('/purchase/orders/create', {
      state: {
        prefill: {
          supplierId: supplierIds.length === 1 && supplierIds[0] ? supplierIds[0] : undefined,
          storeId: storeIds[0],
          items,
        },
      },
    });
  };

  const handleExport = () => {
    if (!rows.length) return;
    downloadCsv(
      'Reorder_Report',
      [
        { label: 'Product', value: (r) => r.name },
        { label: 'SKU', value: (r) => r.sku || '' },
        { label: 'Store', value: (r) => r.storeId?.name || '' },
        { label: 'Stock', value: (r) => r.stock },
        { label: 'Low At', value: (r) => r.threshold },
        { label: `Sold (${days} days)`, value: (r) => r.soldLastDays },
        { label: 'Avg Daily Sales', value: (r) => r.avgDailySales },
        { label: 'Days of Stock Left', value: (r) => (r.daysOfStockLeft ?? '') },
        { label: 'Order Qty', value: (r) => getQty(r) },
        { label: 'Rate', value: (r) => rowRate(r) },
        { label: 'Est. Cost', value: (r) => (Number(getQty(r) || 0) * rowRate(r)).toFixed(2) },
        { label: 'Supplier', value: (r) => supplierName(r.supplier) },
      ],
      rows
    );
  };

  const headers = useMemo(
    () => [
      {
        label: 'Select',
        key: 'actions',
        width: '1%',
        render: (r) => (
          <input
            type="checkbox"
            checked={!!selected[r._id]}
            onChange={() => toggleRow(r)}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
        ),
      },
      {
        label: 'Product',
        key: 'name',
        value: 'checked',
        render: (r) => <ProductCell name={r.name} sku={r.sku} />,
      },
      {
        label: 'Store',
        key: 'store',
        value: 'checked',
        render: (r) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <StoreIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            {r.storeId?.name || 'Store'}
          </span>
        ),
      },
      {
        label: 'Stock / Low At',
        key: 'stock',
        value: 'checked',
        cellClassName: 'text-center',
        render: (r) => (
          <span className="font-mono text-xs">
            <b className={Number(r.stock) <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
              {formatQty(r.stock)}
            </b>
            <span className="text-[var(--vs-text-secondary)]"> / {formatQty(r.threshold)}</span>
          </span>
        ),
      },
      {
        label: `Sold (${days}d)`,
        key: 'soldLastDays',
        value: 'checked',
        cellClassName: 'text-center',
        render: (r) => (
          <div className="flex flex-col items-center leading-tight">
            <span className="text-xs font-semibold">{formatQty(r.soldLastDays)}</span>
            <span className="text-[10px] text-[var(--vs-text-secondary)]">{r.avgDailySales}/day</span>
          </div>
        ),
      },
      {
        label: 'Stock Left',
        key: 'daysOfStockLeft',
        value: 'checked',
        cellClassName: 'text-center',
        render: (r) => <DaysLeft days={r.daysOfStockLeft} />,
      },
      {
        label: 'Order Qty',
        key: 'suggestedQty',
        value: 'checked',
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <InputNumber
              size="small"
              min={0}
              value={getQty(r)}
              onChange={(v) => setQtyEdits((prev) => ({ ...prev, [r._id]: v ?? 0 }))}
              className="!w-24"
            />
            {qtyEdits[r._id] !== undefined && qtyEdits[r._id] !== r.suggestedQty && (
              <span className="text-[10px] text-[var(--vs-text-secondary)]">Suggested {formatQty(r.suggestedQty)}</span>
            )}
          </div>
        ),
      },
      {
        label: 'Rate',
        key: 'rate',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="text-xs">{formatCurrency(rowRate(r))}</span>,
      },
      {
        label: 'Est. Cost',
        key: 'estimatedCost',
        value: 'checked',
        cellClassName: 'text-right',
        render: (r) => <span className="font-semibold">{formatCurrency(Number(getQty(r) || 0) * rowRate(r))}</span>,
      },
      {
        label: 'Supplier',
        key: 'supplier',
        value: 'checked',
        render: (r) =>
          r.supplier ? (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Truck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {supplierName(r.supplier)}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--vs-text-secondary)]">Not set</span>
          ),
      },
    ],
    [selected, toggleRow, days, getQty, qtyEdits]
  );

  return (
    <div>
      <Card h1="Reorder Report" bodyClassName="px-4 pb-4 pt-3">
        <InventoryNav current="reorder" />
        <AntdThemed>
          <FilterBar>
            <FilterField label="Store / Warehouse">
              <StoreSelect stores={stores} value={selectedStore} onChange={resetPage(setSelectedStore)} />
            </FilterField>
            <FilterField label="Supplier">
              <AntSelect
                value={supplierId || undefined}
                onChange={(v) => resetPage(setSupplierId)(v || '')}
                placeholder="All Suppliers"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={suppliers.map((s) => ({ value: s._id, label: supplierName(s) }))}
                className="w-full"
              />
            </FilterField>
            <FilterField label="Sales Period">
              <Segmented options={DAY_OPTIONS} value={days} onChange={resetPage(setDays)} block />
            </FilterField>
          </FilterBar>
        </AntdThemed>

        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Products to Reorder',
                value: pagination?.total || 0,
                icon: <Package className="w-4 h-4 text-amber-500" />,
                colorClass: 'text-amber-600 dark:text-amber-400',
              },
              {
                label: 'Est. Cost (this page)',
                value: formatCurrency(pageCost),
                icon: <IndianRupee className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
              },
              {
                label: 'Selected',
                value: selectedRows.length,
                subValue: selectedRows.length ? `(${formatCurrency(selectedCost)})` : undefined,
                icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                onClick: selectedRows.length ? () => setSelected({}) : undefined,
              },
            ]}
          />
          {selectedRows.length > 0 && (
            <p className="text-[11px] text-[var(--vs-text-secondary)] mt-1 px-1">
              Click “Selected” to clear the selection. Selection is kept when you change pages.
            </p>
          )}
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
            <>
              <Button
                onClick={handleCreatePo}
                disabled={!selectedRows.length}
                className="!h-10"
                startIcon={<ShoppingCart className="w-4 h-4" />}
              >
                Create Purchase Order{selectedRows.length ? ` (${selectedRows.length})` : ''}
              </Button>
              <Button
                variant="outline"
                onClick={togglePage}
                disabled={!rows.length}
                className="!h-10"
                startIcon={<CheckSquare className="w-4 h-4" />}
              >
                {allOnPageSelected ? 'Unselect Page' : 'Select Page'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!rows.length}
                className="!h-10"
                startIcon={<Download className="w-4 h-4" />}
              >
                Export CSV
              </Button>
            </>
          }
          emptyMessage={
            selectedStore || supplierId || debouncedSearch
              ? 'No products match these filters.'
              : 'Nothing to reorder. All products are above their low-stock level.'
          }
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100, 200]}
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
