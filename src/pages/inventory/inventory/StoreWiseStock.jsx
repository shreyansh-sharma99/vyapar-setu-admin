import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, Sigma } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Table from '@/components/table/Table';
import { getStoreWiseStock } from './services/inventorySlice';
import { InventoryNav, InventoryToaster } from './components/InventoryShared';
import {
  formatCurrency,
  formatQty,
  useDebouncedValue,
  useToasts,
  useReportLoader,
  adjustStockPath,
} from './components/inventoryUtils';

/** Qty + damaged qty in one cell. */
function QtyCell({ stock, damaged, tone = 'normal' }) {
  const color = tone === 'out'
    ? 'text-rose-600 dark:text-rose-400'
    : tone === 'low'
      ? 'text-amber-700 dark:text-amber-400'
      : tone === 'total'
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-[var(--vs-text-primary)]';
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className={`font-bold font-mono ${color}`}>{formatQty(stock)}</span>
      {Number(damaged) > 0 && (
        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">D: {formatQty(damaged)}</span>
      )}
    </div>
  );
}

export default function StoreWiseStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, pagination, loading } = useSelector((state) => state.inventory.reports.storeWise);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInactive, setShowInactive] = useState(false);

  const { toasts, showToast } = useToasts();

  const params = useMemo(
    () => ({ page: currentPage, limit: pageSize, search: debouncedSearch || undefined }),
    [currentPage, pageSize, debouncedSearch]
  );
  useReportLoader(dispatch, getStoreWiseStock, params, (msg) => showToast(msg, 'danger'));

  const allStores = useMemo(() => data?.stores || [], [data]);
  const stores = useMemo(
    () => (showInactive ? allStores : allStores.filter((s) => s.isActive !== false)),
    [allStores, showInactive]
  );
  const rows = data?.rows || [];
  const storeTotals = data?.storeTotals || {};
  const inactiveCount = allStores.filter((s) => s.isActive === false).length;

  const grand = stores.reduce(
    (t, s) => ({
      units: t.units + Number(storeTotals[s._id]?.units || 0),
      damaged: t.damaged + Number(storeTotals[s._id]?.damaged || 0),
      value: t.value + Number(storeTotals[s._id]?.value || 0),
    }),
    { units: 0, damaged: 0, value: 0 }
  );

  // Memoised so the shared Table keeps the user's column choices between page loads.
  const headers = useMemo(() => [
    {
      label: 'Product',
      key: 'name',
      className: '!text-left',
      render: (row) => (
        <div className="flex flex-col leading-tight min-w-[180px]">
          <span className="font-semibold text-[var(--vs-text-primary)]">{row.name}</span>
          <span className="text-[11px] font-mono text-[var(--vs-text-secondary)]">{row.sku ? `SKU: ${row.sku}` : 'No SKU'}</span>
        </div>
      ),
      value: 'checked',
    },
    ...stores.map((s) => ({
      label: s.code ? `${s.name} (${s.code})` : s.name,
      key: `store_${s._id}`,
      cellClassName: 'text-center !p-1',
      render: (row) => {
        const cell = row.stores?.[s._id] || { stock: 0, damaged: 0, isLow: true };
        const tone = Number(cell.stock) <= 0 ? 'out' : cell.isLow ? 'low' : 'normal';
        return (
          <button
            type="button"
            onClick={() => navigate(adjustStockPath(row._id, s._id), { state: { storeId: s._id } })}
            title={`Adjust stock in ${s.name}${cell.rackLocation ? ` · Rack ${cell.rackLocation}` : ''} · Low at ${formatQty(cell.threshold)}`}
            className={`w-full min-w-[96px] py-1.5 rounded-lg cursor-pointer transition-colors hover:ring-2 hover:ring-inset hover:ring-indigo-400 ${cell.isLow ? 'bg-amber-50 dark:bg-amber-500/10' : ''}`}
          >
            <QtyCell stock={cell.stock} damaged={cell.damaged} tone={tone} />
          </button>
        );
      },
      value: 'checked',
    })),
    {
      label: 'Total',
      key: 'currentStock',
      cellClassName: 'text-center',
      render: (row) => <QtyCell stock={row.currentStock} damaged={row.damagedStock} tone="total" />,
      value: 'checked',
    },
  ], [stores, navigate]);

  return (
    <div>
      <Card h1="Store-wise Stock" bodyClassName="px-4 pb-4 pt-3">
        <InventoryNav current="store-wise" />

        {/* Store totals (all matching products, not just this page) */}
        {stores.length > 0 && (
          <div className="flex gap-2 overflow-x-auto thin-scrollbar pb-3">
            {stores.map((s) => {
              const t = storeTotals[s._id] || { units: 0, damaged: 0, value: 0 };
              return (
                <div key={s._id} className="shrink-0 min-w-[170px] px-3 py-2 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--vs-text-primary)]">
                    <StoreIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="truncate">{s.name}</span>
                    {s.isDefault && <span className="text-[10px] text-[var(--vs-text-secondary)]">· Default</span>}
                    {s.isActive === false && <span className="text-[10px] text-rose-500">· Inactive</span>}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-bold font-mono text-[var(--vs-text-primary)]">{formatQty(t.units)}</span>
                    <span className="text-[11px] text-[var(--vs-text-secondary)]">{formatCurrency(t.value, 0)}</span>
                    {Number(t.damaged) > 0 && <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">D: {formatQty(t.damaged)}</span>}
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 min-w-[170px] px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sigma className="w-3.5 h-3.5" />
                All stores
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-bold font-mono text-indigo-700 dark:text-indigo-300">{formatQty(grand.units)}</span>
                <span className="text-[11px] text-[var(--vs-text-secondary)]">{formatCurrency(grand.value, 0)}</span>
                {grand.damaged > 0 && <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">D: {formatQty(grand.damaged)}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pb-3 text-xs text-[var(--vs-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40" />
            Low / out of stock
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-rose-600 dark:text-rose-400">D</span> Damaged qty
          </span>
          <span>Click a store cell to adjust that store&apos;s stock.</span>
          {inactiveCount > 0 && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-indigo-600"
              />
              Show inactive stores ({inactiveCount})
            </label>
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
          emptyMessage={debouncedSearch ? 'No products match your search.' : 'No products found.'}
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
