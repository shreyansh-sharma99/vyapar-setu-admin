import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Edit,
  Barcode,
  ShieldAlert,
  BadgeInfo,
  Tag,
  Box,
  Layers,
  Image as ImageIcon,
  MapPin,
  AlertCircle,
  Hash,
  Truck,
  Ruler,
  Printer,
  Shapes,
  Plus,
} from 'lucide-react';
import { getProductById, clearCurrentProduct, getProductVariants } from './services/productSlice';
import Card from '../../../components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Loader from '@/components/loader/Loader';
import { decryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { FaHistory } from 'react-icons/fa';
import { computeCustomerPrice, encodeId, formatINR, formatQty, getStockState, toNumberOr } from './utils/productUtils';

const InfoItem = ({ icon: Icon, label, children }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{label}</span>
      <span className="text-sm font-semibold text-[var(--vs-text-primary)] break-words">{children}</span>
    </div>
  </div>
);

const PriceTile = ({ label, value, accent = false, muted = false, hint }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">{label}</span>
    <span
      className={`mt-1 font-bold ${accent ? 'text-2xl text-indigo-600 dark:text-indigo-400' : muted ? 'text-base text-gray-400' : 'text-lg text-[var(--vs-text-primary)]'}`}
    >
      {value}
    </span>
    {hint && <span className="text-[10px] text-[var(--vs-text-secondary)]">{hint}</span>}
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

export default function ProductDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentProduct, loading, variants, variantsLoading, variantGroupId } = useSelector((state) => state.product);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedId, setLoadedId] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(getProductById(id)).finally(() => setLoadedId(id));
      dispatch(getProductVariants(id));
    }
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, id]);

  const isCurrent = !!currentProduct && String(currentProduct._id) === String(id);
  if ((loading && !isCurrent) || (!!id && !isCurrent && loadedId !== id)) {
    return (
      <Card
        h1="Product Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        <Loader className="mb-4" />
      </Card>
    );
  }

  if (!currentProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--vs-bg-primary)] rounded-2xl border border-[var(--vs-border)] max-w-md mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Product Not Found</h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mt-2">
          The product you are trying to view does not exist or has been deleted.
        </p>
        <Button onClick={() => navigate('/products')} className="mt-6" variant="primary">
          Back to Products
        </Button>
      </div>
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
  const storeStocks = (p.storeStocks || []).filter(
    (st) => toNumberOr(st.stock, 0) !== 0 || toNumberOr(st.damagedStock, 0) > 0 || st.rackLocation
  );
  const customerPrice = toNumberOr(p.finalPrice, 0) > 0 ? toNumberOr(p.finalPrice, 0) : computeCustomerPrice(p);
  const avgCost = toNumberOr(p.avgCost, 0);
  const cost = toNumberOr(p.costPrice, 0);
  const marginBase = avgCost > 0 ? avgCost : cost;
  const supplierName = (s) => (s && typeof s === 'object' ? s.name || s.companyName : '') || '';
  const lastSupplier = supplierName(p.lastSupplierId);
  const preferredSupplier = supplierName(p.preferredSupplierId);
  const variantAttributes = Array.isArray(p.variantAttributes) ? p.variantAttributes : [];
  const otherVariants = (variants || []).filter((v) => String(v._id) !== String(p._id));

  const goToVariants = () => navigate(`/products/variants/${encodeId(p._id)}`);

  return (
    <div className="flex flex-col gap-6">
      <Card
        h1="Product Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Images */}
          <div className="w-full lg:max-w-md flex flex-col gap-4">
            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
              {activeImage ? (
                <img src={getImageUrl(activeImage)} alt={p.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-16 h-16 opacity-30 mb-2" />
                  <span className="text-sm font-semibold">No Image Available</span>
                </div>
              )}
            </div>
            {p.images && p.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {p.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${getImageUrl(activeImage) === getImageUrl(img) ? 'border-indigo-600 scale-95 shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold !text-[var(--vs-active-text)] break-words">{p.name}</h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {variantAttributes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {variantAttributes.map((a) => (
                      <span
                        key={`${a.name}-${a.value}`}
                        className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                      >
                        {a.name}: {a.value}
                      </span>
                    ))}
                  </div>
                )}
                {p.shortDescription && (
                  <p className="text-sm text-[var(--vs-text-secondary)] mt-1.5 font-medium">{p.shortDescription}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  startIcon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/products/labels', { state: { productIds: [p._id] } })}
                >
                  Print Label
                </Button>
                <Button
                  variant="outline"
                  startIcon={<FaHistory className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/products/audit/${encodeId(p._id)}`)}
                >
                  Audit History
                </Button>
                <Button startIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/products/edit/${encodeId(p._id)}`)}>
                  Edit
                </Button>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-200 dark:border-white/10">
              <PriceTile label="Customer Pays" value={formatINR(customerPrice)} accent hint={p.isGstApplicable && !p.isGstIncludedInPrice ? 'Incl. GST' : undefined} />
              <PriceTile label="Base Price" value={formatINR(p.basePrice)} />
              <PriceTile
                label="Discounted Price"
                value={toNumberOr(p.discountedPrice, 0) > 0 ? formatINR(p.discountedPrice) : '—'}
                muted={!(toNumberOr(p.discountedPrice, 0) > 0)}
              />
              <PriceTile label="MRP" value={toNumberOr(p.mrp, 0) > 0 ? formatINR(p.mrp) : '—'} muted={!(toNumberOr(p.mrp, 0) > 0)} />
              <PriceTile label="Cost Price" value={cost > 0 ? formatINR(cost) : '—'} muted={!(cost > 0)} />
              <PriceTile
                label="Average Cost"
                value={avgCost > 0 ? formatINR(avgCost) : '—'}
                muted={!(avgCost > 0)}
                hint={marginBase > 0 && customerPrice > 0 ? `Margin ${formatINR(customerPrice - marginBase)} per ${unit}` : undefined}
              />
            </div>

            {/* Key details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <InfoItem icon={Hash} label="SKU">
                <span className="font-mono">{p.sku || 'N/A'}</span>
              </InfoItem>
              <InfoItem icon={Barcode} label="Barcode">
                <span className="font-mono">{p.barcode || 'N/A'}</span>
              </InfoItem>
              <InfoItem icon={Layers} label="Category">{p.categoryId?.name || 'N/A'}</InfoItem>
              <InfoItem icon={Layers} label="Subcategory">{p.subCategoryId?.name || 'N/A'}</InfoItem>
              <InfoItem icon={Box} label="Brand">{p.brandId?.name || 'N/A'}</InfoItem>
              <InfoItem icon={Box} label="Manufacturer">{p.manufacturerId?.name || 'N/A'}</InfoItem>
              <InfoItem icon={BadgeInfo} label="HSN/SAC Code">{p.hsnSacCode || 'N/A'}</InfoItem>
              <InfoItem icon={Ruler} label="Base Unit">{unit}</InfoItem>
              <InfoItem icon={Box} label="Total Sellable Stock">
                <span className="font-mono">
                  {formatQty(totalStock)} {unit}
                </span>
                {totalDamaged > 0 && (
                  <span className="block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    + {formatQty(totalDamaged)} damaged
                  </span>
                )}
              </InfoItem>
              <InfoItem icon={AlertCircle} label="Low Stock Alert / Reorder Qty">
                {formatQty(p.lowStockAlertThreshold ?? 0)} / {toNumberOr(p.reorderQty, 0) > 0 ? formatQty(p.reorderQty) : '—'}
              </InfoItem>
              <InfoItem icon={Box} label="Min Order Qty">{p.minOrderQty || 1} {unit}</InfoItem>
              <InfoItem icon={Truck} label="Preferred Supplier">{preferredSupplier || 'N/A'}</InfoItem>
              <InfoItem icon={Truck} label="Last Purchase">
                {toNumberOr(p.lastPurchasePrice, 0) > 0 ? (
                  <>
                    {formatINR(p.lastPurchasePrice)} / {unit}
                    {lastSupplier && <span className="font-medium text-[var(--vs-text-secondary)]"> from {lastSupplier}</span>}
                    {p.lastPurchaseDate && (
                      <span className="block text-[11px] font-medium text-[var(--vs-text-secondary)]">
                        {formatDateWithTiming(p.lastPurchaseDate)}
                      </span>
                    )}
                  </>
                ) : (
                  'No purchases yet'
                )}
              </InfoItem>
            </div>

            {/* Alternate units */}
            {Array.isArray(p.alternateUnits) && p.alternateUnits.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold !text-[var(--vs-active-text)] uppercase tracking-wider">Alternate Units</h4>
                <div className="flex flex-wrap gap-2">
                  {p.alternateUnits.map((u) => (
                    <span
                      key={u.unit}
                      className="inline-flex flex-col px-3 py-1.5 rounded-lg text-xs bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)]"
                    >
                      <span className="font-semibold text-[var(--vs-text-primary)]">
                        1 {u.unit} = {formatQty(u.factor)} {unit}
                      </span>
                      {u.barcode && <span className="font-mono text-[10px] text-[var(--vs-text-secondary)]">{u.barcode}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* GST */}
            <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold !text-[var(--vs-active-text)] uppercase tracking-wider">GST Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium text-[var(--vs-text-secondary)]">
                <div>GST Applicable: <span className="font-bold text-[var(--vs-text-primary)]">{p.isGstApplicable ? 'Yes' : 'No'}</span></div>
                {p.isGstApplicable && (
                  <div>GST Rate: <span className="font-bold text-[var(--vs-text-primary)]">{p.gstRateOverride}%</span></div>
                )}
                <div>GST Included in Price: <span className="font-bold text-[var(--vs-text-primary)]">{p.isGstIncludedInPrice ? 'Yes' : 'No'}</span></div>
              </div>
            </div>

            {tagsList.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tagsList.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {p.isCustomizable && customizationFields.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customizable Fields</h4>
                <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                        <th className="py-2 px-3">Field Label</th>
                        <th className="py-2 px-3">Field Type</th>
                        <th className="py-2 px-3">Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
                      {customizationFields.map((field, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--vs-text-primary)]">{field.label}</td>
                          <td className="py-2.5 px-3">{field.fieldType}</td>
                          <td className="py-2.5 px-3">{field.isRequired ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {p.fullDescription && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold !text-[var(--vs-active-text)] uppercase tracking-wider">Full Product Description</h4>
                <p className="text-sm text-[var(--vs-text-secondary)] whitespace-pre-line leading-relaxed">{p.fullDescription}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Store-wise stock */}
      <Card h1="Store-wise Stock" bodyClassName="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <p className="text-[var(--vs-text-secondary)] font-medium m-0">
            Sellable and damaged stock in each store or warehouse. Change stock from Inventory → Adjust Stock.
          </p>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
            Total: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{formatQty(totalStock)}</span> {unit}
            {totalDamaged > 0 && <span className="text-amber-600 dark:text-amber-400"> · {formatQty(totalDamaged)} damaged</span>}
          </span>
        </div>

        {storeStocks.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                  <th className="py-2.5 px-3.5">Store / Warehouse</th>
                  <th className="py-2.5 px-3.5 text-center">Sellable</th>
                  <th className="py-2.5 px-3.5 text-center">Damaged</th>
                  <th className="py-2.5 px-3.5 text-center">Low Stock Alert</th>
                  <th className="py-2.5 px-3.5">Rack / Shelf</th>
                  <th className="py-2.5 px-3.5">Stock Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
                {storeStocks.map((st, idx) => {
                  const stock = toNumberOr(st.stock, 0);
                  const damaged = toNumberOr(st.damagedStock, 0);
                  const threshold = toNumberOr(st.lowStockAlertThreshold, 0);
                  const state = getStockState(stock, threshold);
                  const sharePct = totalStock > 0 ? Math.round((stock / totalStock) * 100) : 0;
                  const storeLocation = st.storeId?.address?.city || st.storeId?.address?.area || '';
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[var(--vs-text-primary)] text-xs">{st.storeId?.name || 'Store'}</span>
                            {st.storeId?.code && (
                              <span className="font-mono text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                                {st.storeId.code}
                              </span>
                            )}
                            {st.storeId?.isDefault && (
                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">Default</span>
                            )}
                          </div>
                          {storeLocation && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {storeLocation}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${state === 'in'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : state === 'low'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}
                        >
                          {formatQty(stock)} {unit}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {damaged > 0 ? <span className="font-bold text-amber-600 dark:text-amber-400">{formatQty(damaged)}</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        {formatQty(threshold)}
                        {state === 'low' && <span className="ml-1 text-amber-600 font-bold">(Low)</span>}
                        {state === 'out' && <span className="ml-1 text-rose-500 font-bold">(Out)</span>}
                      </td>
                      <td className="py-3 px-3.5">
                        {st.rackLocation ? (
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {st.rackLocation}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 dark:bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }} />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-gray-500 shrink-0">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This product has no stock in any store or warehouse yet.</span>
          </div>
        )}
      </Card>

      {/* Variants */}
      <Card
        h1="Variants"
        description="Size, colour or pack versions of this product. Each variant has its own SKU, barcode, price and stock."
        rightNode={
          <Button size="xs" startIcon={variantGroupId ? <Shapes className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} onClick={goToVariants}>
            {variantGroupId ? 'Manage Variants' : 'Create Variants'}
          </Button>
        }
        bodyClassName="p-4 sm:p-5"
      >
        {variantsLoading ? (
          <Loader />
        ) : otherVariants.length === 0 ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
            No variants yet. Use “Create Variants” to add sizes, colours or packs of this product.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                  <th className="py-2.5 px-3.5">Variant</th>
                  <th className="py-2.5 px-3.5">SKU</th>
                  <th className="py-2.5 px-3.5">Barcode</th>
                  <th className="py-2.5 px-3.5 text-right">Price</th>
                  <th className="py-2.5 px-3.5 text-right">MRP</th>
                  <th className="py-2.5 px-3.5 text-right">Stock</th>
                  <th className="py-2.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
                {otherVariants.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-2.5 px-3.5">
                      <Link to={`/products/view/${encodeId(v._id)}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        {v.name}
                      </Link>
                      {Array.isArray(v.variantAttributes) && v.variantAttributes.length > 0 && (
                        <div className="text-[10px]">{v.variantAttributes.map((a) => `${a.name}: ${a.value}`).join(' · ')}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono">{v.sku || '—'}</td>
                    <td className="py-2.5 px-3.5 font-mono">{v.barcode || '—'}</td>
                    <td className="py-2.5 px-3.5 text-right">
                      {formatINR(toNumberOr(v.discountedPrice, 0) > 0 ? v.discountedPrice : v.basePrice)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">{toNumberOr(v.mrp, 0) > 0 ? formatINR(v.mrp) : '—'}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">{formatQty(v.currentStock)}</td>
                    <td className="py-2.5 px-3.5 capitalize">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
