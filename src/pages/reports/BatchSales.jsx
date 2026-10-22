import { useMemo, useState } from 'react';
import { Boxes, DollarSign, Package, TrendingUp } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import { Label } from '@/components/inputs/Label';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { formatDate } from '@/utility/dateTiming';
import AntdThemed from '@/pages/masterSettings/components/AntdThemed';
import ProductPicker from '@/pages/masterSettings/components/ProductPicker';
import ReportTabs from './ReportTabs';
import { DateFilterBar, Money, ReportError } from './components/ReportBits';
import { currentFy, getBatchSalesApi, inr, useReportData } from './services/pricingReportService';

/** One product, per batch: qty in, sold in the period, left, revenue, cost, profit. */
export default function BatchSales() {
  const defaults = useMemo(() => currentFy(), []);
  const [range, setRange] = useState(defaults);
  const [product, setProduct] = useState(null);
  const { data, loading, error } = useReportData(getBatchSalesApi, product ? { ...range, productId: product._id } : null);
  const totals = data?.totals || {};
  const unit = data?.product?.unit || '';

  const stats = [
    { label: 'Qty in', value: `${totals.qtyIn || 0} ${unit}`, icon: <Boxes className="w-3.5 h-3.5 text-blue-500" /> },
    { label: 'Sold (period)', value: `${totals.soldQty || 0} ${unit}`, icon: <Package className="w-3.5 h-3.5 text-indigo-500" /> },
    { label: 'Left', value: `${totals.qtyLeft || 0} ${unit}` },
    { label: 'Revenue', value: inr(totals.revenue), icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> },
    {
      label: 'Profit',
      value: inr(totals.profit),
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      colorClass: Number(totals.profit) < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold',
    },
  ];

  const headers = [
    { label: 'Batch', key: 'batchNo', render: (r) => <span className="font-mono font-semibold text-xs">{r.batchNo || '—'}</span>, value: 'checked' },
    { label: 'Store', key: 'storeName', render: (r) => <span className="text-xs">{r.storeName || '—'}</span>, value: 'checked' },
    { label: 'Received', key: 'receivedAt', render: (r) => <span className="text-xs">{r.receivedAt ? formatDate(r.receivedAt) : '—'}</span>, value: 'checked' },
    { label: 'Expiry', key: 'expiryDate', render: (r) => <span className="text-xs">{r.expiryDate ? formatDate(r.expiryDate) : '—'}</span>, value: 'checked' },
    { label: 'MRP', key: 'mrp', cellClassName: 'text-right text-xs', render: (r) => (r.mrp > 0 ? inr(r.mrp) : '—'), value: 'checked' },
    { label: 'Cost / unit', key: 'unitCost', cellClassName: 'text-right text-xs', render: (r) => (r.batchId ? inr(r.unitCost) : '—'), value: 'checked' },
    { label: 'In', key: 'qtyIn', cellClassName: 'text-right text-xs', render: (r) => r.qtyIn, value: 'checked' },
    { label: 'Sold', key: 'soldQty', cellClassName: 'text-right text-xs font-semibold', render: (r) => r.soldQty, value: 'checked' },
    { label: 'Left', key: 'qtyLeft', cellClassName: 'text-right text-xs', render: (r) => r.qtyLeft, value: 'checked' },
    { label: 'Revenue', key: 'revenue', cellClassName: 'text-right font-mono text-xs', render: (r) => inr(r.revenue), value: 'checked' },
    { label: 'Cost', key: 'cost', cellClassName: 'text-right font-mono text-xs', render: (r) => inr(r.cost), value: 'checked' },
    { label: 'Profit', key: 'profit', cellClassName: 'text-right font-mono text-xs font-bold', render: (r) => <Money value={r.profit} tone />, value: 'checked' },
  ];

  return (
    <AntdThemed>
      <Card h1="Batch-wise Sales" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />
        <DateFilterBar idPrefix="batchSales" value={range} defaults={defaults} onApply={setRange}>
          <div className="w-full sm:w-80">
            <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">Product</Label>
            <ProductPicker id="batch-sales-product" value={product} onChange={setProduct} placeholder="Search a product" />
          </div>
        </DateFilterBar>
        <ReportError message={error} />
        {product ? (
          <>
            <div className="mb-3">
              <TableInfoCard stats={stats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
            </div>
            <p className="text-[11px] text-[var(--vs-text-secondary)] mb-3">
              Sold, revenue and profit count bills in the chosen period; In and Left are for the whole batch. A line split over batches shares its revenue by quantity.
            </p>
            <Table headers={headers} data={data?.rows || []} loading={loading} searchPlaceholder="Search batch..." emptyMessage="This product has no batches yet." />
          </>
        ) : (
          <p className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">Choose a product to see its batches.</p>
        )}
      </Card>
    </AntdThemed>
  );
}
