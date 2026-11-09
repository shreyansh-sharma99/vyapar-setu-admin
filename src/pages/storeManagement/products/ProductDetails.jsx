import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Barcode,
  Boxes,
  Edit,
  History,
  IndianRupee,
  Image as ImageIcon,
  Layers,
  Package,
  Percent,
  Printer,
  ShieldAlert,
  Tag,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { getProductById, clearCurrentProduct } from './services/productSlice';
import {
  Alert,
  Badge,
  Button,
  Card,
  DetailList,
  EmptyState,
  LINE_TD,
  LINE_TH,
  LineItemsTable,
  LineRow,
  PageHeader,
  Section,
  Segmented,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { decryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { computeCustomerPrice, encodeId, formatINR, formatQty, getStockState, toNumberOr, useToasts } from './utils/productUtils';
import TodayPriceCard from './components/TodayPriceCard';
import BatchesCard from './components/BatchesCard';
import ToastStack from './components/ToastStack';
import PriceHistory from '@/pages/masterSettings/components/PriceHistory';
import GstHistory from '@/pages/masterSettings/components/GstHistory';
import useProductPricing from '@/pages/masterSettings/components/useProductPricing';
import { getTaxRatesApi } from '@/pages/masterSettings/services/gstRateService';
import { formatDay } from '@/pages/masterSettings/components/gstUtils';

const STOCK_TONE = { in: 'success', low: 'warning', out: 'danger' };
const STOCK_LABEL = { in: 'In stock', low: 'Low stock', out: 'Out of stock' };
const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', brand: 'text-brand-ink', neutral: 'text-ink' };
const TONE_ICON_BG = { success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', brand: 'bg-brand-soft text-brand-ink', neutral: 'bg-fill text-ink-muted' };

/** One key number in the summary: icon, label, big value, short note. */
const KeyFigure = ({ icon: Icon, label, value, note, tone = 'neutral' }) => (
  <div className="flex items-start gap-3 rounded-control bg-fill-2 px-3.5 py-3">
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONE_ICON_BG[tone])}>
      <Icon className="size-4" />
    </span>
    <div className="min-w-0">
      <div className="text-xs font-medium text-ink-subtle">{label}</div>
      <div className={cn('text-lg font-extrabold leading-tight tabular-nums', TONE_TEXT[tone])}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-snug text-ink-muted">{note}</div>}
    </div>
  </div>
);

const parseList = (raw, splitter = true) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return splitter ? String(raw).split(',').map((t) => t.trim()).filter(Boolean) : [];
  }
};

/**
 * Product page: a summary (picture, what it is, the 4 numbers that matter) and tabs for
 * the rest — Overview (stock, cost & profit, product info), Batches, Prices, GST.
 * Everything here is read-only; prices / GST change in Master Settings, stock in Inventory.
 */
export default function ProductDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentProduct, loading } = useSelector((state) => state.product);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  // the product list's "2 batches" link opens /products/view/:id#batches
  const [tab, setTab] = useState(() => (location.hash === '#batches' ? 'batches' : 'overview'));
  const pricing = useProductPricing(id);
  const { toasts, showToast } = useToasts();
  // GST master: today's rate and the next one that starts later (Master Settings → GST Rates).
  const [taxInfo, setTaxInfo] = useState({ id: null, data: null });
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    getTaxRatesApi(id)
      .then((res) => alive && setTaxInfo({ id, data: res?.data || null }))
      .catch(() => alive && setTaxInfo({ id, data: null }));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (id) {
      dispatch(getProductById(id)).finally(() => setLoadedId(id));
    }
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, id]);

  const backButton = (
    <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
      Back
    </Button>
  );

  const isCurrent = !!currentProduct && String(currentProduct._id) === String(id);
  if ((loading && !isCurrent) || (!!id && !isCurrent && loadedId !== id)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Product Details" actions={backButton} />
        <Card className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
          <Skeleton className="aspect-square w-full rounded-control" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <Card className="mx-auto my-12 w-full max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="Product Not Found"
          text="The product you are trying to view does not exist or has been deleted."
          action={<Button onClick={() => navigate('/products')}>Back to Products</Button>}
        />
      </Card>
    );
  }

  const p = currentProduct;
  const getImageUrl = (img) => (typeof img === 'string' ? img : img?.path || img?.url || '');
  const activeImage = selectedImage ?? p.images?.[0] ?? '';
  const tagsList = parseList(p.tags);
  const customizationFields = parseList(p.customizationFields, false);
  const unit = p.unit || 'pcs';
  const isActive = p.status === 'active';
  const totalStock = toNumberOr(p.currentStock, 0);
  const totalDamaged = toNumberOr(p.damagedStock, 0);
  // single location: one low-stock alert (the product's stock row)
  const stockThreshold = toNumberOr(p.lowStockAlertThreshold, 0);
  const stockState = getStockState(totalStock, stockThreshold);
  const customerPrice = toNumberOr(p.finalPrice, 0) > 0 ? toNumberOr(p.finalPrice, 0) : computeCustomerPrice(p);
  const mrp = toNumberOr(p.mrp, 0);
  // what a bill charges: the SP, else (no SP yet) the MRP
  const sellAt = customerPrice > 0 ? customerPrice : mrp;
  // From the last purchase (PO → bill): cost before GST, GST on it
  const cost = toNumberOr(p.lastPurchasePrice, 0) || toNumberOr(p.costPrice, 0) || toNumberOr(p.avgCost, 0);
  const tax = taxInfo.id === id ? taxInfo.data : null;
  // today's GST from the GST master (falls back to the product card)
  const gstRate = tax?.current ? toNumberOr(tax.current.gstRate, 0) : p.isGstApplicable ? toNumberOr(p.gstRateOverride, 0) : 0;
  const nextGst = (tax?.rows || []).filter((r) => r.status === 'upcoming').sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom))[0] || null;
  const costGst = Math.round(cost * gstRate) / 100;
  const costIncl = cost + costGst;
  const profit = sellAt > 0 && costIncl > 0 ? sellAt - costIncl : null;
  const profitPct = profit !== null && costIncl > 0 ? Math.round((profit / costIncl) * 1000) / 10 : null;
  const supplierName = (s) => (s && typeof s === 'object' ? s.name || s.companyName : '') || '';
  const lastSupplier = supplierName(p.lastSupplierId);
  const preferredSupplier = supplierName(p.preferredSupplierId);
  const showPricing = !!pricing.data;
  const categoryPath = [p.categoryId?.name, p.subCategoryId?.name].filter(Boolean).join(' › ');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={p.name}
        description={p.shortDescription || undefined}
        actions={
          <>
            {backButton}
            <Button variant="secondary" size="sm" startIcon={<Printer />} onClick={() => navigate('/products/labels', { state: { productIds: [p._id] } })}>
              Print Label
            </Button>
            <Button variant="secondary" size="sm" startIcon={<History />} onClick={() => navigate(`/products/audit/${encodeId(p._id)}`)}>
              Audit History
            </Button>
            <Button size="sm" startIcon={<Edit />} onClick={() => navigate(`/products/edit/${encodeId(p._id)}`)}>
              Edit
            </Button>
          </>
        }
      />

      {/* ── Summary: picture · what it is · the numbers that matter ── */}
      <Card className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <div className="aspect-square w-full overflow-hidden rounded-control bg-fill">
            {activeImage ? (
              <img src={getImageUrl(activeImage)} alt={p.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-ink-subtle">
                <ImageIcon className="mb-1 size-10 opacity-40" aria-hidden="true" />
                <span className="text-xs font-semibold">No image</span>
              </div>
            )}
          </div>
          {p.images && p.images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-0.5">
              {p.images.map((img, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="icon"
                  aria-label={`Image ${idx + 1}`}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    'size-11 shrink-0 overflow-hidden rounded-lg p-0 ring-2',
                    getImageUrl(activeImage) === getImageUrl(img) ? 'ring-brand' : 'ring-transparent hover:ring-line-strong'
                  )}
                >
                  <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* what it is */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
            <Badge tone={STOCK_TONE[stockState] || 'neutral'}>{STOCK_LABEL[stockState]}</Badge>
            {categoryPath && <Badge tone="neutral" icon={Layers}>{categoryPath}</Badge>}
            {p.brandId?.name && <Badge tone="neutral" icon={Tag}>{p.brandId.name}</Badge>}
            <Badge tone="neutral">{gstRate > 0 ? `GST ${gstRate}%` : 'No GST'}</Badge>
          </div>
          <DetailList
            cols={3}
            items={[
              { label: 'SKU', value: p.sku, mono: true },
              { label: 'Barcode', value: p.barcode || (totalStock > 0 ? 'Not set — add it on the next purchase' : 'Set when stock comes in'), mono: !!p.barcode },
              { label: 'HSN / SAC', value: p.hsnSacCode, mono: true },
            ]}
          />

          {/* the 4 numbers that matter */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KeyFigure
              icon={IndianRupee}
              label="Selling price"
              value={sellAt > 0 ? formatINR(sellAt) : '—'}
              tone={sellAt > 0 ? 'brand' : 'neutral'}
              note={customerPrice > 0 ? (gstRate > 0 ? 'Customer pays, incl. GST' : 'Customer pays') : mrp > 0 ? 'No SP set — bills use the MRP' : 'Set it in Prices & Offers'}
            />
            <KeyFigure icon={Tag} label="MRP" value={mrp > 0 ? formatINR(mrp) : '—'} note="Printed on the pack" />
            <KeyFigure
              icon={Package}
              label="In stock"
              value={`${formatQty(totalStock)} ${unit}`}
              tone={STOCK_TONE[stockState] || 'neutral'}
              note={totalDamaged > 0 ? `+ ${formatQty(totalDamaged)} damaged` : stockThreshold > 0 ? `Alert at ${formatQty(stockThreshold)}` : 'No low-stock alert set'}
            />
            <KeyFigure
              icon={TrendingUp}
              label="Profit per unit"
              value={profit === null ? '—' : formatINR(profit)}
              tone={profit === null ? 'neutral' : profit >= 0 ? 'success' : 'danger'}
              note={profit === null ? 'Needs a price and a purchase' : `${profitPct}% on cost incl. GST`}
            />
          </div>
        </div>
      </Card>

      {/* ── Tabs ── */}
      <Segmented
        aria-label="Product sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview', icon: Package },
          { value: 'batches', label: 'Batches', icon: Boxes },
          { value: 'prices', label: 'Prices & offers', icon: IndianRupee },
          { value: 'gst', label: 'GST history', icon: Percent },
        ]}
        className="self-start overflow-x-auto"
      />

      {tab === 'overview' && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Section title="Stock" description="Change stock in Inventory → Adjust Stock.">
            <DetailList
              cols={2}
              items={[
                { label: 'Sellable stock', value: `${formatQty(totalStock)} ${unit}`, tone: STOCK_TONE[stockState] },
                { label: 'Damaged', value: totalDamaged > 0 ? `${formatQty(totalDamaged)} ${unit}` : 'None', tone: totalDamaged > 0 ? 'warning' : undefined },
                { label: 'Low stock alert at', value: stockThreshold > 0 ? `${formatQty(stockThreshold)} ${unit}` : 'Not set' },
                { label: 'Reorder qty', value: toNumberOr(p.reorderQty, 0) > 0 ? `${formatQty(p.reorderQty)} ${unit}` : 'Not set' },
                { label: 'Min order qty', value: `${p.minOrderQty || 1} ${unit}` },
                { label: 'Base unit', value: unit },
              ]}
            />
          </Section>

          <Section title="Cost & profit" description="From the last purchase, per unit.">
            <DetailList
              cols={2}
              items={[
                { label: 'Cost (before GST)', value: cost > 0 ? formatINR(cost) : 'No purchase yet' },
                { label: `GST on cost${gstRate > 0 ? ` (${gstRate}%)` : ''}`, value: cost > 0 ? formatINR(costGst) : '—' },
                { label: 'Cost incl. GST', value: cost > 0 ? formatINR(costIncl) : '—' },
                { label: 'Profit', value: profit === null ? '—' : `${formatINR(profit)}${profitPct !== null ? ` (${profitPct}%)` : ''}`, tone: profit === null ? undefined : profit >= 0 ? 'success' : 'danger' },
                { label: 'Last bought', value: p.lastPurchaseDate ? formatDateWithTiming(p.lastPurchaseDate) : '' },
                { label: 'Last supplier', value: lastSupplier },
                { label: 'Preferred supplier', value: preferredSupplier },
              ]}
            />
          </Section>

          <Section title="Product info">
            <DetailList
              cols={2}
              items={[
                { label: 'Category', value: p.categoryId?.name },
                { label: 'Subcategory', value: p.subCategoryId?.name },
                { label: 'Brand', value: p.brandId?.name },
                { label: 'Manufacturer', value: p.manufacturerId?.name },
                { label: 'GST', value: p.isGstApplicable ? `${gstRate}% · ${p.isGstIncludedInPrice ? 'included in price' : 'added on top'}` : 'No GST' },
                { label: 'Created', value: p.createdAt ? formatDateWithTiming(p.createdAt) : '' },
              ]}
            />
            {Array.isArray(p.alternateUnits) && p.alternateUnits.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-medium text-ink-subtle">Pack sizes</div>
                <div className="flex flex-wrap gap-2">
                  {p.alternateUnits.map((u) => (
                    <span key={u.unit} className="inline-flex items-center gap-2 rounded-control bg-fill-2 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-ink">1 {u.unit} = {formatQty(u.factor)} {unit}</span>
                      {u.barcode && <span className="inline-flex items-center gap-1 font-mono text-ink-muted"><Barcode className="size-3" />{u.barcode}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tagsList.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-medium text-ink-subtle">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {tagsList.map((t, idx) => <Badge key={idx} tone="primary" icon={Tag}>{t}</Badge>)}
                </div>
              </div>
            )}
          </Section>

          <div className="flex flex-col gap-5">
            {p.fullDescription && (
              <Section title="Description">
                <p className="m-0 max-h-60 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-muted">{p.fullDescription}</p>
              </Section>
            )}
            {p.isCustomizable && customizationFields.length > 0 && (
              <Section title="Customer can customise">
                <LineItemsTable
                  head={
                    <tr>
                      <th className={LINE_TH}>Field</th>
                      <th className={LINE_TH}>Type</th>
                      <th className={LINE_TH}>Required</th>
                    </tr>
                  }
                >
                  {customizationFields.map((field, idx) => (
                    <LineRow key={idx}>
                      <td className={cn(LINE_TD, 'font-semibold')}>{field.label}</td>
                      <td className={cn(LINE_TD, 'text-ink-muted')}>{field.fieldType}</td>
                      <td className={cn(LINE_TD, 'text-ink-muted')}>{field.isRequired ? 'Yes' : 'No'}</td>
                    </LineRow>
                  ))}
                </LineItemsTable>
              </Section>
            )}
            {lastSupplier === '' && cost === 0 && (
              <Alert tone="neutral" icon={Truck}>No purchases yet. Cost and profit appear after the first purchase.</Alert>
            )}
          </div>
        </div>
      )}

      {/* every batch with its own selling price (#batches — the product list links here) */}
      {tab === 'batches' && <BatchesCard productId={p._id} />}

      {tab === 'prices' && (
        <div className="flex flex-col gap-5">
          {showPricing && (
            <Section title="Today's price">
              <TodayPriceCard data={pricing.data} />
            </Section>
          )}
          <Section title="Price & offer history">
            {showPricing
              ? <PriceHistory productId={p._id} data={pricing.data} loading={pricing.loading} error={pricing.error} readOnly />
              : <p className="m-0 text-sm text-ink-muted">{pricing.loading ? 'Loading…' : 'No price set yet.'}</p>}
          </Section>
        </div>
      )}

      {tab === 'gst' && (
        <div className="flex flex-col gap-5">
          {tax && (
            <Alert tone="info" icon={Percent}>
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span>
                  <span className="font-semibold">GST today </span>
                  <span className="font-bold text-ink">{gstRate > 0 ? `${gstRate}%` : 'No GST'}</span>
                  {tax.current?.effectiveFrom && <span> · since {formatDay(tax.current.effectiveFrom)}</span>}
                </span>
                {nextGst && (
                  <span>
                    Next change {formatDay(nextGst.effectiveFrom)} → <span className="font-semibold text-ink">{Number(nextGst.gstRate)}%</span>
                  </span>
                )}
              </span>
            </Alert>
          )}
          {/* GST audit history: every GST rate of this product, who set it and when */}
          <Section title="GST history">
            <GstHistory productId={p._id} notify={showToast} readOnly />
          </Section>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
