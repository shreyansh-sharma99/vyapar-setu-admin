import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  QrCode,
  Store as StoreIcon,
  Lock,
} from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import FileInput from '@/components/inputs/FileInput';
import TagInput from '@/components/inputs/TagInputs';
import Checkbox from '@/components/inputs/Checkbox';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import { getSubcategoriesApi } from '../../subcategories/services/subcategoryService';
import { getSimilarProductsApi } from '../services/productService';
import DuplicateWarning from './DuplicateWarning';
import PriceCheck from './PriceCheck';
import {
  computeCustomerPrice,
  formatQty,
  toNumberOr,
  useDebouncedValue,
} from '../utils/productUtils';

const DEFAULT_THRESHOLD = '5';

const refId = (v) => (v && typeof v === 'object' ? v._id : v) || '';

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return String(tags).split(',').map((t) => t.trim()).filter(Boolean);
  }
};

const parseCustomFields = (fields) => {
  if (!fields) return [];
  try {
    const arr = typeof fields === 'string' ? JSON.parse(fields) : fields;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const numText = (v, { zeroAsEmpty = false } = {}) => {
  if (v === null || v === undefined || v === '') return '';
  if (zeroAsEmpty && Number(v) === 0) return '';
  return String(v);
};

const buildDefaults = (p) => ({
  name: p?.name || '',
  sku: p?.sku || '',
  barcode: p?.barcode || '',
  categoryId: refId(p?.categoryId),
  subCategoryId: refId(p?.subCategoryId),
  brandId: refId(p?.brandId),
  manufacturerId: refId(p?.manufacturerId),
  shortDescription: p?.shortDescription || '',
  fullDescription: p?.fullDescription || '',
  basePrice: numText(p?.basePrice),
  discountedPrice: numText(p?.discountedPrice),
  mrp: numText(p?.mrp, { zeroAsEmpty: true }),
  costPrice: numText(p?.costPrice, { zeroAsEmpty: true }),
  minOrderQty: numText(p?.minOrderQty) || '1',
  hsnSacCode: p?.hsnSacCode || '',
  tags: parseTags(p?.tags),
  isGstApplicable: String(p?.isGstApplicable ?? false),
  gstRateOverride: String(p?.gstRateOverride ?? 0),
  isGstIncludedInPrice: String(p?.isGstIncludedInPrice ?? false),
  isCustomizable: String(p?.isCustomizable ?? false),
  unit: p?.unit || 'pcs',
  reorderQty: numText(p?.reorderQty, { zeroAsEmpty: true }),
});

const cellInputCls =
  'w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500';

/**
 * Shared create / edit product form.
 * mode = 'create' → per-store opening stock
 * mode = 'edit'   → per-store stock is read-only; only threshold and rack are sent.
 */
export default function ProductForm({
  mode = 'create',
  product = null,
  stores = [],
  categories = [],
  brands = [],
  manufacturers = [],
  submitting = false,
  error = null,
  onSubmit,
  onValidationError,
}) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const productId = product?._id || null;

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: buildDefaults(product),
  });

  // ── local state ──
  const [images, setImages] = useState(() => (Array.isArray(product?.images) ? product.images : []));
  const [customFields, setCustomFields] = useState(() => {
    const parsed = parseCustomFields(product?.customizationFields);
    return parsed.length ? parsed : [{ label: '', fieldType: 'TextInput', isRequired: false }];
  });
  const [storeEdits, setStoreEdits] = useState({});
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [subcats, setSubcats] = useState({ categoryId: null, list: [] });
  const [similar, setSimilar] = useState({ key: '', items: [] });
  const [dismissedKey, setDismissedKey] = useState(null);

  // ── watched values ──
  const selectedCategoryId = watch('categoryId');
  const isGstApplicable = watch('isGstApplicable');
  const isCustomizable = watch('isCustomizable');
  const unit = watch('unit');
  const barcode = watch('barcode');
  const priceValues = {
    basePrice: watch('basePrice'),
    discountedPrice: watch('discountedPrice'),
    mrp: watch('mrp'),
    costPrice: watch('costPrice'),
    isGstApplicable,
    isGstIncludedInPrice: watch('isGstIncludedInPrice'),
    gstRateOverride: watch('gstRateOverride'),
  };

  // ── subcategories for the selected category ──
  useEffect(() => {
    if (!selectedCategoryId) return undefined;
    let cancelled = false;
    getSubcategoriesApi(selectedCategoryId)
      .then((res) => {
        if (!cancelled) setSubcats({ categoryId: selectedCategoryId, list: res.data || [] });
      })
      .catch(() => {
        if (!cancelled) setSubcats({ categoryId: selectedCategoryId, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);
  const subcategories = subcats.categoryId === selectedCategoryId ? subcats.list : [];
  const subcategoriesLoading = !!selectedCategoryId && subcats.categoryId !== selectedCategoryId;

  // ── duplicate check (name blur + barcode change) ──
  const runSimilarCheck = useCallback((name, code) => {
    const n = String(name || '').trim();
    const b = String(code || '').trim();
    if (n.length < 3 && b.length < 4) return;
    const key = `${n.toLowerCase()}|${b}`;
    const params = { name: n, barcode: b, limit: 5 };
    if (productId) params.excludeId = productId;
    getSimilarProductsApi(params)
      .then((res) => setSimilar({ key, items: Array.isArray(res?.data) ? res.data : [] }))
      .catch(() => setSimilar({ key, items: [] }));
  }, [productId]);

  const debouncedBarcode = useDebouncedValue(barcode, 500);
  useEffect(() => {
    const code = String(debouncedBarcode || '').trim();
    if (code.length < 4) return;
    if (isEdit && code === (product?.barcode || '')) return;
    runSimilarCheck(getValues('name'), code);
  }, [debouncedBarcode, isEdit, product, runSimilarCheck, getValues]);

  const showSimilar = similar.items.length > 0 && similar.key !== dismissedKey;

  // ── per-store rows (derived: stores + product + local edits) ──
  const storeRows = useMemo(
    () =>
      (stores || []).map((s) => {
        const existing = (product?.storeStocks || []).find(
          (ss) => String(refId(ss.storeId)) === String(s._id)
        );
        const thresholdDefault = existing
          ? numText(existing.lowStockAlertThreshold ?? product?.lowStockAlertThreshold ?? DEFAULT_THRESHOLD)
          : isEdit
            ? numText(product?.lowStockAlertThreshold ?? DEFAULT_THRESHOLD)
            : DEFAULT_THRESHOLD;
        return {
          storeId: s._id,
          storeName: s.name,
          code: s.code,
          isDefault: s.isDefault,
          isActive: s.isActive,
          currentStock: toNumberOr(existing?.stock, 0),
          damagedStock: toNumberOr(existing?.damagedStock, 0),
          hasRow: !!existing,
          stock: '',
          lowStockAlertThreshold: thresholdDefault,
          rackLocation: existing?.rackLocation || '',
          ...(storeEdits[s._id] || {}),
        };
      }),
    [stores, product, storeEdits, isEdit]
  );

  const totalOpeningStock = storeRows.reduce((sum, r) => sum + toNumberOr(r.stock, 0), 0);
  const totalCurrentStock = storeRows.reduce((sum, r) => sum + r.currentStock, 0);

  const handleStoreRowChange = (storeId, field, value) => {
    setStoreEdits((prev) => ({ ...prev, [storeId]: { ...(prev[storeId] || {}), [field]: value } }));
  };

  // ── images / custom fields ──
  const handleUploadSuccess = (response) => {
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        const urls = response.data.map((item) => item.url).filter(Boolean);
        setImages((prev) => [...prev, ...urls]);
      } else if (response.data.url) {
        setImages((prev) => [...prev, response.data.url]);
      }
    } else if (response && typeof response === 'string') {
      setImages((prev) => [...prev, response]);
    }
  };
  const getImageUrl = (img) => (typeof img === 'string' ? img : img?.path || img?.url || '');
  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleCustomFieldChange = (index, key, value) => {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };
  const addCustomFieldRow = (index) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, { label: '', fieldType: 'TextInput', isRequired: false });
      return next;
    });
  };
  const removeCustomFieldRow = (index) => setCustomFields((prev) => prev.filter((_, i) => i !== index));

  // ── submit ──
  const submit = (data) => {
    if (!isEdit && (!stores || stores.length === 0)) {
      onValidationError?.('No store or warehouse found. Create at least one store before adding products.');
      return;
    }

    const base = toNumberOr(data.basePrice, 0);
    const discounted = toNumberOr(data.discountedPrice, 0);
    const mrp = toNumberOr(data.mrp, 0);
    if (discounted > 0 && discounted > base) {
      onValidationError?.('Discounted price cannot be more than the base price.');
      return;
    }
    if (mrp > 0) {
      const customerPrice = computeCustomerPrice(data);
      if (customerPrice > mrp + 0.005) {
        onValidationError?.(`Selling price ₹${customerPrice} (incl. GST) is above the MRP ₹${mrp}.`);
        return;
      }
    }

    const thresholds = storeRows.map((r) => Math.max(0, toNumberOr(r.lowStockAlertThreshold, Number(DEFAULT_THRESHOLD))));
    const productThreshold = thresholds.length ? Math.min(...thresholds) : Number(DEFAULT_THRESHOLD);

    let tagList = [];
    if (Array.isArray(data.tags)) tagList = data.tags.map((t) => String(t).trim()).filter(Boolean);
    else if (typeof data.tags === 'string') tagList = data.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const storeStocks = storeRows.map((r) => {
      const row = {
        storeId: r.storeId,
        lowStockAlertThreshold: Math.max(0, toNumberOr(r.lowStockAlertThreshold, Number(DEFAULT_THRESHOLD))),
        rackLocation: (r.rackLocation || '').trim(),
      };
      if (!isEdit) {
        row.stock = Math.max(0, toNumberOr(r.stock, 0));
      }
      return row;
    });

    const payload = {
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      name: data.name.trim(),
      sku: (data.sku || '').trim().toUpperCase(),
      barcode: (data.barcode || '').trim(),
      shortDescription: (data.shortDescription || '').trim(),
      fullDescription: (data.fullDescription || '').trim(),
      basePrice: String(data.basePrice),
      discountedPrice: data.discountedPrice === '' ? '0' : String(data.discountedPrice),
      mrp: data.mrp === '' ? '' : String(data.mrp),
      costPrice: data.costPrice === '' ? '' : String(data.costPrice),
      minOrderQty: String(data.minOrderQty || 1),
      lowStockAlertThreshold: String(productThreshold),
      hsnSacCode: (data.hsnSacCode || '').trim(),
      brandId: data.brandId,
      manufacturerId: data.manufacturerId,
      isGstApplicable: String(data.isGstApplicable),
      gstRateOverride: String(data.isGstApplicable === 'true' ? data.gstRateOverride : '0'),
      isGstIncludedInPrice: String(data.isGstIncludedInPrice),
      isCustomizable: String(data.isCustomizable),
      tags: JSON.stringify(tagList),
      images,
      customizationFields: data.isCustomizable === 'true'
        ? JSON.stringify(customFields.filter((f) => String(f.label || '').trim()))
        : '[]',
      storeStocks,
    };

    onSubmit(payload);
  };

  const yesNo = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
      {/* Basic information */}
      <Card title="Basic Information" bodyClassName="p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Product Name<span className="text-rose-500">*</span></Label>
            <Input
              id="name"
              type="text"
              placeholder="Product Name"
              error={errors.name}
              {...register('name', {
                required: 'Product name is required',
                onBlur: (e) => runSimilarCheck(e.target.value, getValues('barcode')),
              })}
            />
            {errors.name && <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>}
          </div>

          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              type="text"
              placeholder="e.g. RICE-BAS-5KG"
              className="uppercase"
              error={errors.sku}
              {...register('sku', {
                maxLength: { value: 40, message: 'SKU can be at most 40 characters' },
                pattern: { value: /^[A-Za-z0-9._\-/]*$/, message: 'SKU may contain only letters, numbers, . _ - /' },
              })}
            />
            {errors.sku ? (
              <span className="text-xs text-red-500 mt-1 block">{errors.sku.message}</span>
            ) : (
              <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">Unique code for this product in your shop. Saved in capitals.</span>
            )}
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input id="barcode" type="text" placeholder="e.g. 8901234567890" {...register('barcode')} />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="px-3"
                title="Scan Barcode"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
            <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">
              No barcode? Leave empty and use “Generate Barcodes” on the product list.
            </span>
          </div>

          <div>
            <Label htmlFor="categoryId">Category<span className="text-rose-500">*</span></Label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <Select
                  id="categoryId"
                  options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                  placeholder="Select Category"
                  value={field.value}
                  onChange={(val) => {
                    if (val !== field.value) setValue('subCategoryId', '');
                    field.onChange(val);
                  }}
                  error={!!errors.categoryId}
                />
              )}
            />
            {errors.categoryId && <span className="text-xs text-red-500 mt-1 block">{errors.categoryId.message}</span>}
          </div>

          <div>
            <Label htmlFor="subCategoryId">Subcategory<span className="text-rose-500">*</span></Label>
            <Controller
              name="subCategoryId"
              control={control}
              rules={{ required: 'Subcategory is required' }}
              render={({ field }) => (
                <Select
                  id="subCategoryId"
                  options={subcategories.map((sub) => ({ value: sub._id, label: sub.name }))}
                  placeholder={selectedCategoryId ? 'Select Subcategory' : 'Select Category first'}
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.subCategoryId}
                  disabled={!selectedCategoryId || subcategoriesLoading}
                  loading={subcategoriesLoading}
                />
              )}
            />
            {errors.subCategoryId && <span className="text-xs text-red-500 mt-1 block">{errors.subCategoryId.message}</span>}
          </div>

          <div>
            <Label htmlFor="brandId">Brand<span className="text-rose-500">*</span></Label>
            <Controller
              name="brandId"
              control={control}
              rules={{ required: 'Brand is required' }}
              render={({ field }) => (
                <Select
                  id="brandId"
                  options={brands.map((b) => ({ value: b._id, label: b.name }))}
                  placeholder="Select Brand"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.brandId}
                />
              )}
            />
            {errors.brandId && <span className="text-xs text-red-500 mt-1 block">{errors.brandId.message}</span>}
          </div>

          <div>
            <Label htmlFor="manufacturerId">Manufacturer<span className="text-rose-500">*</span></Label>
            <Controller
              name="manufacturerId"
              control={control}
              rules={{ required: 'Manufacturer is required' }}
              render={({ field }) => (
                <Select
                  id="manufacturerId"
                  options={manufacturers.map((m) => ({ value: m._id, label: m.name }))}
                  placeholder="Select Manufacturer"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.manufacturerId}
                />
              )}
            />
            {errors.manufacturerId && <span className="text-xs text-red-500 mt-1 block">{errors.manufacturerId.message}</span>}
          </div>
        </div>

        {showSimilar && <DuplicateWarning items={similar.items} onDismiss={() => setDismissedKey(similar.key)} />}
      </Card>

      {/* Pricing */}
      <Card title="Pricing" bodyClassName="p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="basePrice">Base Price (₹)<span className="text-rose-500">*</span></Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="999"
              error={errors.basePrice}
              {...register('basePrice', {
                required: 'Base price is required',
                min: { value: 0, message: 'Price cannot be negative' },
              })}
            />
            {errors.basePrice && <span className="text-xs text-red-500 mt-1 block">{errors.basePrice.message}</span>}
          </div>

          <div>
            <Label htmlFor="discountedPrice">Discounted Price (₹)</Label>
            <Input
              id="discountedPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0 = no discount"
              error={errors.discountedPrice}
              {...register('discountedPrice', { min: { value: 0, message: 'Price cannot be negative' } })}
            />
            {errors.discountedPrice ? (
              <span className="text-xs text-red-500 mt-1 block">{errors.discountedPrice.message}</span>
            ) : (
              <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">Leave empty or 0 to sell at the base price.</span>
            )}
          </div>

          <div>
            <Label htmlFor="mrp">MRP (₹)</Label>
            <Input
              id="mrp"
              type="number"
              step="0.01"
              min="0"
              placeholder="Printed MRP"
              error={errors.mrp}
              {...register('mrp', { min: { value: 0, message: 'MRP cannot be negative' } })}
            />
            {errors.mrp && <span className="text-xs text-red-500 mt-1 block">{errors.mrp.message}</span>}
          </div>

          <div>
            <Label htmlFor="costPrice">Cost Price (₹)</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="Purchase cost per unit"
              error={errors.costPrice}
              {...register('costPrice', { min: { value: 0, message: 'Cost cannot be negative' } })}
            />
            {errors.costPrice ? (
              <span className="text-xs text-red-500 mt-1 block">{errors.costPrice.message}</span>
            ) : (
              <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">Per {unit || 'unit'}, before GST.</span>
            )}
          </div>

          <div>
            <Label htmlFor="minOrderQty">Min Order Qty</Label>
            <Input id="minOrderQty" type="number" min="1" placeholder="1" {...register('minOrderQty', { min: 1 })} />
          </div>

          <div>
            <Label htmlFor="hsnSacCode">HSN / SAC Code</Label>
            <Input id="hsnSacCode" type="text" placeholder="e.g. 85171200" {...register('hsnSacCode')} />
          </div>
        </div>

        <PriceCheck values={priceValues} />
      </Card>

      {/* GST */}
      <Card title="GST Configuration" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="isGstApplicable">Is GST Applicable?</Label>
            <Controller
              name="isGstApplicable"
              control={control}
              render={({ field }) => (
                <Select id="isGstApplicable" options={yesNo} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          {isGstApplicable === 'true' && (
            <div>
              <Label htmlFor="gstRateOverride">GST Rate (%)</Label>
              <Input id="gstRateOverride" type="number" step="0.01" placeholder="18" {...register('gstRateOverride', { min: 0, max: 100 })} />
            </div>
          )}

          <div>
            <Label htmlFor="isGstIncludedInPrice">Is GST Included In Price?</Label>
            <Controller
              name="isGstIncludedInPrice"
              control={control}
              render={({ field }) => (
                <Select id="isGstIncludedInPrice" options={yesNo} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </Card>

      {/* Stores */}
      {!isEdit && (!stores || stores.length === 0) && (
        <div className="p-5 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">No Store or Warehouse Found</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                You must add at least one store/warehouse before you can add products and allocate stock.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/stores/create')}
            className="shrink-0 flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Store / Warehouse</span>
          </Button>
        </div>
      )}

      {stores && stores.length > 0 && (
        <Card
          title={isEdit ? 'Store Stock & Locations' : 'Opening Stock per Store'}
          description={
            isEdit
              ? 'Stock levels are shown for reference. You can change the low-stock alert and rack location here.'
              : 'Enter the opening stock, low-stock alert and rack location for each store or warehouse.'
          }
          rightNode={
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
              Total: {formatQty(isEdit ? totalCurrentStock : totalOpeningStock)} {unit || 'units'}
            </span>
          }
          bodyClassName="p-6 flex flex-col gap-4"
        >
          {isEdit && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs text-indigo-700 dark:text-indigo-300">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Change stock from <strong>Inventory → Adjust Stock</strong>. Editing the product does not change stock quantities.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-x-auto bg-white dark:bg-gray-800/50">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-semibold">
                <tr>
                  <th className="py-3 px-3">Store / Warehouse</th>
                  {isEdit ? (
                    <>
                      <th className="py-3 px-3 w-32">Current Stock</th>
                      <th className="py-3 px-3 w-28">Damaged</th>
                    </>
                  ) : (
                    <th className="py-3 px-3 w-32">Opening Stock</th>
                  )}
                  <th className="py-3 px-3 w-32">Low Stock Alert</th>
                  <th className="py-3 px-3 w-44">Rack / Shelf Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {storeRows.map((row) => (
                  <tr key={row.storeId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <StoreIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{row.storeName}</span>
                        {row.isDefault && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            Default
                          </span>
                        )}
                        {row.isActive === false && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500">Inactive</span>
                        )}
                      </div>
                      {row.code && <span className="text-[10px] font-mono text-gray-400 ml-5">{row.code}</span>}
                    </td>
                    {isEdit ? (
                      <>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--vs-text-primary)]">
                            {formatQty(row.currentStock)}
                            <span className="text-[10px] text-[var(--vs-text-secondary)]">{unit || ''}</span>
                          </span>
                          {!row.hasRow && <span className="block text-[10px] text-[var(--vs-text-secondary)]">New store</span>}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {row.damagedStock > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatQty(row.damagedStock)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={row.stock}
                          onChange={(e) => handleStoreRowChange(row.storeId, 'stock', e.target.value)}
                          className={`${cellInputCls} font-mono`}
                        />
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={row.lowStockAlertThreshold}
                        onChange={(e) => handleStoreRowChange(row.storeId, 'lowStockAlertThreshold', e.target.value)}
                        className={`${cellInputCls} font-mono`}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="e.g. Aisle 4, Shelf B"
                        value={row.rackLocation}
                        onChange={(e) => handleStoreRowChange(row.storeId, 'rackLocation', e.target.value)}
                        className={cellInputCls}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--vs-text-secondary)] m-0">
            Low stock alert: you are warned when stock falls to this level. 0 means alert only when the store is out of stock.
          </p>
        </Card>
      )}

      {/* Descriptions & tags */}
      <Card title="Descriptions & Tags" bodyClassName="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="shortDescription">Short Description<span className="text-rose-500">*</span></Label>
            <Input
              id="shortDescription"
              type="text"
              placeholder="Short summary of the product..."
              error={errors.shortDescription}
              {...register('shortDescription', { required: 'Short description is required' })}
            />
            {errors.shortDescription && <span className="text-xs text-red-500 mt-1 block">{errors.shortDescription.message}</span>}
          </div>

          <div>
            <Label htmlFor="fullDescription">Full Description</Label>
            <textarea
              id="fullDescription"
              placeholder="Detailed explanation of the product features, specs..."
              rows="5"
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
              {...register('fullDescription')}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagInput value={field.value} onChange={field.onChange} placeholder="Type a tag and press Enter" />
              )}
            />
          </div>
        </div>
      </Card>

      {/* Customization */}
      <Card title="Product Customization" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="isCustomizable">Is Product Customizable?</Label>
            <Controller
              name="isCustomizable"
              control={control}
              render={({ field }) => (
                <Select id="isCustomizable" options={yesNo} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        {isCustomizable === 'true' && (
          <div className="bg-[var(--vs-bg-secondary)] p-4 sm:p-6 rounded-2xl border border-[var(--vs-border)] flex flex-col gap-4">
            <span className="text-sm font-semibold text-[var(--vs-text-primary)]">Custom Fields Builder</span>
            <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)]">
              <table className="w-full border-collapse border-spacing-0 min-w-[560px]">
                <thead className="bg-[var(--vs-active-bg)] dark:bg-indigo-950/40 text-[var(--vs-active-text)] dark:text-indigo-300">
                  <tr>
                    <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-left">Field Label</th>
                    <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-left w-64">Field Type</th>
                    <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-center w-36">Required</th>
                    <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--vs-bg-primary)]">
                  {customFields.map((field, idx) => (
                    <tr key={idx} className="hover:bg-[var(--vs-drop-hover)] transition-colors">
                      <td className="border border-[var(--vs-border)] p-3">
                        <input
                          type="text"
                          placeholder="e.g. Engraving Name"
                          value={field.label}
                          onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                          className="w-full rounded-xl border border-[var(--vs-input-border)] bg-[var(--vs-input-bg)] px-3.5 py-2 text-sm text-[var(--vs-text-primary)] placeholder:text-[var(--vs-text-secondary)]/50 transition-all duration-200 outline-none focus:border-indigo-500/60"
                        />
                      </td>
                      <td className="border border-[var(--vs-border)] p-3 align-middle">
                        <Select
                          options={[
                            { value: 'TextInput', label: 'Text Input' },
                            { value: 'ImageUpload', label: 'Image Upload' },
                          ]}
                          value={field.fieldType}
                          onChange={(val) => handleCustomFieldChange(idx, 'fieldType', val)}
                        />
                      </td>
                      <td className="border border-[var(--vs-border)] p-3 align-middle">
                        <div className="flex justify-center items-center h-11">
                          <Checkbox
                            id={`isRequired-${idx}`}
                            label="Required"
                            checked={field.isRequired}
                            onChange={(checked) => handleCustomFieldChange(idx, 'isRequired', checked)}
                          />
                        </div>
                      </td>
                      <td className="border border-[var(--vs-border)] p-3 align-middle">
                        <div className="flex gap-2 justify-center items-center h-11">
                          <button
                            type="button"
                            onClick={() => addCustomFieldRow(idx)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--vs-active-bg)] hover:opacity-90 text-[var(--vs-active-text)] transition-all border border-[var(--vs-border-sidebar-line)]"
                            title="Add Field"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {customFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomFieldRow(idx)}
                              className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all border border-rose-500/20"
                              title="Remove Field"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Images */}
      <Card title="Product Images" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Upload Image</Label>
            <FileInput
              onUploadSuccess={handleUploadSuccess}
              fieldName="files"
              enableUploadModal={true}
              title="Upload product images"
              description="Drag & drop or select multiple files"
              multiple={true}
            />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Images List ({images.length})</span>
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02]">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 dark:text-gray-400">No images uploaded yet.</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[220px] p-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 aspect-square">
                    <img src={getImageUrl(img)} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-md cursor-pointer z-10"
                      title="Remove Image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSave={(val) => setValue('barcode', val, { shouldValidate: true, shouldDirty: true })}
        initialValue={barcode || ''}
      />

      <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10 pt-5">
        <Button type="button" variant="outline" onClick={() => navigate('/products')} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || (!isEdit && (!stores || stores.length === 0))}
          startIcon={submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        >
          {isEdit ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
