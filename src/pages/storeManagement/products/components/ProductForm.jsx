import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  QrCode,
  Boxes,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Checkbox,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  Label,
  Section,
  Select,
  Switch,
  TagInput,
  Textarea,
} from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import { getSubcategoriesApi } from '../../subcategories/services/subcategoryService';
import { getSimilarProductsApi } from '../services/productService';
import { runBarcodeCheck, BLOCKING } from '@/pages/purchase/components/barcodeCheck';
import { getTaxRatesApi } from '@/pages/masterSettings/services/gstRateService';
import useGstRates from '@/pages/masterSettings/components/useGstRates';
import { can } from '@/utility/shopPermissions';
import dayjs from 'dayjs';
import DuplicateWarning from './DuplicateWarning';
import IncludedItemsEditor from './IncludedItemsEditor';
import { toNumberOr } from '../utils/productUtils';

const DEFAULT_THRESHOLD = '5';
// From the GST Scheme of Classification of Services. A SAC does not set the GST rate.
const COMMON_SAC = [
  { value: '999312', label: 'Medical and dental services' },
  { value: '998222', label: 'Accounting and bookkeeping' },
  { value: '998231', label: 'Corporate tax consulting' },
  { value: '998212', label: 'Legal advice' },
  { value: '998714', label: 'Vehicle maintenance and repair' },
  { value: '999721', label: 'Hairdressing and barber services' },
];
const CHARGE_OPTIONS = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'hour', label: 'Per hour' },
  { value: 'session', label: 'Per session' },
  { value: 'day', label: 'Per day' },
];

const formatGst = (gstRate, cessRate) => {
  const gst = `${Number(gstRate) || 0}%`;
  return Number(cessRate) > 0 ? `${gst} + ${Number(cessRate)}% cess` : gst;
};

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
  sellingPrice: '',
  name: p?.name || '',
  sku: p?.sku || '',
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
  // a new product: selling prices include GST (like the MRP); change later in Prices & Offers
  isGstIncludedInPrice: String(p ? p.isGstIncludedInPrice ?? false : true),
  isCustomizable: String(p?.isCustomizable ?? false),
  chargeType: p?.chargeBy === 'quantity' ? p.unit : 'fixed',
  priceAtBilling: !!p?.priceAtBilling,
  reorderQty: numText(p?.reorderQty, { zeroAsEmpty: true }),
  // single location: one low-stock alert for the product (empty on a new product = not set)
  lowStockAlertThreshold: p ? numText(p.lowStockAlertThreshold ?? DEFAULT_THRESHOLD) : '',
});

/**
 * Shared create / edit product form.
 * mode = 'create' → new product (stock comes from purchases / opening stock)
 * mode = 'edit'   → stock is read-only; the low-stock alert is sent.
 * itemType = 'goods' | 'service' → which form a new item gets (an existing item keeps its own type).
 */
export default function ProductForm({
  mode = 'create',
  itemType = 'goods',
  product = null,
  categories = [],
  brands = [],
  manufacturers = [],
  submitting = false,
  error = null,
  onSubmit,
}) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const currentType = product?.itemType || itemType;
  const isService = currentType === 'service';
  // GST % choices: the platform's list (Admin Owner → Settings → GST Rates)
  const { options: gstOptions } = useGstRates();
  const productId = product?._id || null;
  const { user } = useSelector((state) => state.auth || {});
  // Opening stock on a new product: needs Inventory → Create (owner always).
  const canAddOpening = !isEdit && can(user, 'inventory', 'create');
  const [opening, setOpening] = useState(() => ({
    open: false, qty: '', unitCost: '', mrp: '', sellingPrice: '', barcode: '', mfgDate: '', expiryDate: '', openingDate: dayjs().format('YYYY-MM-DD'),
  }));
  // Live barcode check of the opening stock (in use / on hold elsewhere → red, blocks Create Product)
  const [barcodeCheck, setBarcodeCheck] = useState({ code: '', status: '', tone: '', text: '' });
  const checkOpeningBarcode = async (value) => {
    const res = await runBarcodeCheck(value, null);
    setBarcodeCheck((prev) => (String(value || '').trim() === res.code ? res : prev));
  };
  const barcodeBlocked = !!opening.barcode.trim() && opening.barcode.trim() === barcodeCheck.code && BLOCKING.includes(barcodeCheck.status);
  const [openingError, setOpeningError] = useState('');
  const setOpeningField = (field) => (e) => setOpening((prev) => ({ ...prev, [field]: e.target.value }));

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: buildDefaults(product),
  });

  // ── local state ──
  const [images, setImages] = useState(() => (Array.isArray(product?.images) ? product.images : []));
  const [customFields, setCustomFields] = useState(() => {
    const parsed = parseCustomFields(product?.customizationFields);
    return parsed.length ? parsed : [{ label: '', fieldType: 'TextInput', isRequired: false }];
  });
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [includedItems, setIncludedItems] = useState(() => (product?.includedItems || []).map((i) => ({
    productId: refId(i.productId),
    productName: i.productId?.name || '',
    qty: String(i.qty),
    unit: i.unit || i.productId?.unit || '',
  })));
  const [subcats, setSubcats] = useState({ categoryId: null, list: [] });
  const [similar, setSimilar] = useState({ key: '', items: [] });
  const [dismissedKey, setDismissedKey] = useState(null);
  const [taxInfo, setTaxInfo] = useState({ productId: null, data: null });
  // New product: its GST becomes the first GST master entry (from today). Prices change only
  // in Master Settings → Prices & Offers.
  const initialPricingMode = !isEdit;

  // ── GST master (edit only): GST is changed in Master Settings → GST Rates ──
  useEffect(() => {
    if (!isEdit || !productId) return undefined;
    let cancelled = false;
    getTaxRatesApi(productId)
      .then((res) => {
        if (!cancelled) setTaxInfo({ productId, data: res?.data || null });
      })
      .catch(() => {
        if (!cancelled) setTaxInfo({ productId, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId]);
  const taxData = isEdit && taxInfo.productId === productId ? taxInfo.data : null;
  const gstLocked = isEdit;
  const masterGst = taxData?.current || null;

  // ── watched values ──
  const selectedCategoryId = watch('categoryId');
  const isGstApplicable = watch('isGstApplicable');
  const isCustomizable = watch('isCustomizable');
  const chargeType = watch('chargeType');
  const sacCode = String(watch('hsnSacCode') || '').trim();
  const sacWarning = isService && !!sacCode && !/^99\d{4}$/.test(sacCode);

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

  // ── duplicate check (name blur; the barcode is checked at stock-in) ──
  const runSimilarCheck = useCallback((name) => {
    const n = String(name || '').trim();
    if (n.length < 3) return;
    const key = n.toLowerCase();
    const params = { name: n, limit: 5 };
    if (productId) params.excludeId = productId;
    getSimilarProductsApi(params)
      .then((res) => setSimilar({ key, items: Array.isArray(res?.data) ? res.data : [] }))
      .catch(() => setSimilar({ key, items: [] }));
  }, [productId]);

  const showSimilar = similar.items.length > 0 && similar.key !== dismissedKey;



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
    // Opening stock (optional): with a quantity, the MRP is required (like any new batch).
    const openingQty = canAddOpening && !isService ? toNumberOr(opening.qty, 0) : 0;
    if (openingQty > 0 && barcodeBlocked) {
      setOpening((prev) => ({ ...prev, open: true }));
      return;
    }
    if (openingQty > 0 && !(toNumberOr(opening.mrp, 0) > 0)) {
      setOpening((prev) => ({ ...prev, open: true }));
      setOpeningError('Enter the MRP for the opening stock.');
      return;
    }
    setOpeningError('');
    // Empty low-stock alert on a new product = not set (0); it can also come from a purchase line.
    const productThreshold = Math.max(0, toNumberOr(data.lowStockAlertThreshold, isEdit ? Number(DEFAULT_THRESHOLD) : 0));

    let tagList = [];
    if (Array.isArray(data.tags)) tagList = data.tags.map((t) => String(t).trim()).filter(Boolean);
    else if (typeof data.tags === 'string') tagList = data.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const payload = {
      itemType: currentType,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      name: data.name.trim(),
      sku: (data.sku || '').trim().toUpperCase(),
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
    };

    // Add and edit have no price, MRP, cost or stock: they come from purchases
    // (and Prices & Offers) and are shown on the product page.
    delete payload.basePrice;
    delete payload.discountedPrice;
    delete payload.mrp;
    delete payload.costPrice;
    if (isEdit) {
      delete payload.isGstIncludedInPrice;
    }
    if (initialPricingMode) {
      // First GST master entry from today; the first selling price comes from the first purchase.
      payload.initialPricing = {
        priceIncludesGst: data.isGstIncludedInPrice === 'true',
        gstRate: data.isGstApplicable === 'true' ? toNumberOr(data.gstRateOverride, 0) : 0,
        cessRate: 0,
      };
    }
    if (isService) {
      payload.chargeBy = data.chargeType === 'fixed' ? 'fixed' : 'quantity';
      payload.priceAtBilling = !!data.priceAtBilling;
      if (payload.chargeBy === 'quantity') payload.unit = data.chargeType;
      payload.includedItems = includedItems
        .filter((i) => toNumberOr(i.qty, 0) > 0)
        .map((i) => ({ productId: i.productId, qty: toNumberOr(i.qty, 0), unit: i.unit }));
      if (initialPricingMode) payload.initialPricing.sellingPrice = toNumberOr(data.sellingPrice, 0);
    }
    if (openingQty > 0) {
      payload.openingStock = {
        qty: openingQty,
        unitCost: Math.max(0, toNumberOr(opening.unitCost, 0)),
        mrp: toNumberOr(opening.mrp, 0),
        ...(toNumberOr(opening.sellingPrice, 0) > 0 ? { sellingPrice: toNumberOr(opening.sellingPrice, 0) } : {}),
        barcode: opening.barcode.trim(),
        mfgDate: opening.mfgDate || null,
        expiryDate: opening.expiryDate || null,
        openingDate: opening.openingDate || null,
      };
    }

    // GST comes from the GST master — do not overwrite the product card from this form.
    if (gstLocked) {
      delete payload.isGstApplicable;
      delete payload.gstRateOverride;
      delete payload.isGstIncludedInPrice;
    }

    onSubmit(payload);
  };

  const yesNo = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      {/* Basic information */}
      <Section title="Basic Information" description="Name, code and where it sits in your catalog">
        <div className="flex flex-col gap-4">
          <FormGrid cols={2}>
            <Field label={isService ? 'Service Name' : 'Product Name'} required error={errors.name?.message}>
              <Input
                id="name"
                type="text"
                placeholder={isService ? 'e.g. Root canal, GST filing, Oil change' : 'Product Name'}
                {...register('name', {
                  required: 'Name is required',
                  onBlur: (e) => runSimilarCheck(e.target.value),
                })}
              />
            </Field>

            <Field
              label="SKU"
              error={errors.sku?.message}
              hint={`Unique code for this ${isService ? 'service' : 'product'} in your shop. Saved in capitals.`}
            >
              <Input
                id="sku"
                type="text"
                placeholder="e.g. RICE-BAS-5KG"
                className="uppercase"
                {...register('sku', {
                  maxLength: { value: 40, message: 'SKU can be at most 40 characters' },
                  pattern: { value: /^[A-Za-z0-9._\-/]*$/, message: 'SKU may contain only letters, numbers, . _ - /' },
                })}
              />
            </Field>

            {isEdit && !isService && (
              <Field label="Barcode" hint="Set when stock comes in. It can change once the product has no stock.">
                <Input id="barcode" type="text" value={product?.barcode || ''} placeholder="No barcode yet" readOnly disabled />
              </Field>
            )}

            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Field label="Category">
                  <Select
                    id="categoryId"
                    options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                    placeholder="Select Category"
                    clearable
                    value={field.value}
                    onChange={(val) => {
                      if (val !== field.value) setValue('subCategoryId', '');
                      field.onChange(val);
                    }}
                  />
                </Field>
              )}
            />

            <Controller
              name="subCategoryId"
              control={control}
              render={({ field }) => (
                <Field label="Subcategory">
                  <Select
                    id="subCategoryId"
                    options={subcategories.map((sub) => ({ value: sub._id, label: sub.name }))}
                    placeholder={selectedCategoryId ? 'Select Subcategory' : 'Select Category first'}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!selectedCategoryId || subcategoriesLoading}
                    loading={subcategoriesLoading}
                  />
                </Field>
              )}
            />

            {!isService && <Controller
              name="brandId"
              control={control}
              rules={{ required: 'Brand is required' }}
              render={({ field }) => (
                <Field label="Brand" required error={errors.brandId?.message}>
                  <Select
                    id="brandId"
                    options={brands.map((b) => ({ value: b._id, label: b.name }))}
                    placeholder="Select Brand"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.brandId}
                  />
                </Field>
              )}
            />}

            {!isService && <Controller
              name="manufacturerId"
              control={control}
              rules={{ required: 'Manufacturer is required' }}
              render={({ field }) => (
                <Field label="Manufacturer" required error={errors.manufacturerId?.message}>
                  <Select
                    id="manufacturerId"
                    options={manufacturers.map((m) => ({ value: m._id, label: m.name }))}
                    placeholder="Select Manufacturer"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.manufacturerId}
                  />
                </Field>
              )}
            />}
          </FormGrid>

          {showSimilar && <DuplicateWarning items={similar.items} onDismiss={() => setDismissedKey(similar.key)} />}
        </div>
      </Section>

      {isService && (
        <Section title="Price & Charge" description="What you charge for this service">
          <div className="flex flex-col gap-4">
            <FormGrid cols={3}>
              <Controller
                name="chargeType"
                control={control}
                render={({ field }) => (
                  <Field label="How do you charge?" required>
                    <Select id="chargeType" options={CHARGE_OPTIONS} value={field.value} onChange={field.onChange} />
                  </Field>
                )}
              />
              {!isEdit && (
                <Field label={chargeType === 'fixed' ? 'Selling Price (₹)' : `Price per ${chargeType} (₹)`} required error={errors.sellingPrice?.message}>
                  <Input id="sellingPrice" type="number" min="0" step="0.01" placeholder="e.g. 4000" {...register('sellingPrice', { validate: (v) => !isService || toNumberOr(v, 0) > 0 || 'Enter the price of this service' })} />
                </Field>
              )}
            </FormGrid>
            <Controller
              name="priceAtBilling"
              control={control}
              render={({ field }) => (
                <Field label="Price changes on every bill" hint="The usual price fills in. Staff can type a different price without a reason.">
                  <Switch checked={field.value} onChange={field.onChange} aria-label="Price changes on every bill" />
                </Field>
              )}
            />
            {isEdit && <p className="m-0 text-xs text-ink-subtle">Change the price in Master Settings → Prices &amp; Offers.</p>}
          </div>
        </Section>
      )}

      {isService && (
        <Section title="Products used (optional)" description="Goods used with this service, like gloves or engine oil. They appear below the service on the bill at their batch price, and can be removed from that bill.">
          <IncludedItemsEditor items={includedItems} onChange={setIncludedItems} />
        </Section>
      )}

      {/* GST */}
      <Section title={isService ? 'GST & SAC' : 'GST & HSN'} description="Tax details used on bills">
        <div className="flex flex-col gap-4">
          {gstLocked && productId && (
            <div className="flex flex-col justify-between gap-2 rounded-control bg-brand-soft p-3 text-xs text-brand-ink sm:flex-row sm:items-center">
              <span className="flex items-start gap-2">
                <Lock className="mt-px size-4 shrink-0" />
                <span>
                  GST rates are managed in Master Settings → GST Rates and cannot be changed here.
                  {masterGst && (
                    <>
                      {' '}Current: <span className="font-bold">{formatGst(masterGst.gstRate, masterGst.cessRate)}</span>
                      {masterGst.source === 'master' && masterGst.effectiveFrom ? ` · from ${dayjs(masterGst.effectiveFrom).format('DD MMM YYYY')}` : ''}
                    </>
                  )}
                </span>
              </span>
              <Button as={Link} to="/master/gst-rates" variant="link" size="xs" endIcon={<ExternalLink />} className="shrink-0">
                Change in GST master
              </Button>
            </div>
          )}
          <FormGrid cols={3}>
            <Controller
              name="isGstApplicable"
              control={control}
              render={({ field }) => (
                <Field label="Is GST Applicable?">
                  <Select id="isGstApplicable" options={yesNo} searchable={false} value={field.value} onChange={field.onChange} disabled={gstLocked} />
                </Field>
              )}
            />

            {isGstApplicable === 'true' && (
              <Controller
                name="gstRateOverride"
                control={control}
                render={({ field }) => {
                  // An old product keeps (and shows) its stored rate even if the platform removed it.
                  const options = gstOptions.map((o) => ({ value: String(o.value), label: o.label }));
                  if (field.value !== '' && !options.some((o) => o.value === String(field.value))) {
                    options.push({ value: String(field.value), label: `${field.value}% (old rate)` });
                  }
                  return (
                    <Field label="GST Rate (%)">
                      <Select id="gstRateOverride" options={options} value={String(field.value)} onChange={field.onChange} disabled={gstLocked} />
                    </Field>
                  );
                }}
              />
            )}
          </FormGrid>
          <FormGrid cols={3}>
            <div className="flex min-w-0 flex-col gap-1">
              <Field label={isService ? 'SAC Code' : 'HSN / SAC Code'}>
                <Input id="hsnSacCode" type="text" placeholder={isService ? 'e.g. 998221' : 'e.g. 85171200'} list={isService ? 'common-sac' : undefined} {...register('hsnSacCode')} />
              </Field>
              {sacWarning && <p className="m-0 text-xs text-warning">A SAC code usually has 6 digits and starts with 99.</p>}
              {isService && <datalist id="common-sac">{COMMON_SAC.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</datalist>}
            </div>
            {!isService && (
              <Field label="Min Order Qty">
                <Input id="minOrderQty" type="number" min="1" placeholder="1" {...register('minOrderQty', { min: 1 })} />
              </Field>
            )}
          </FormGrid>
          {!isEdit && !isService && (
            <p className="m-0 text-xs text-ink-subtle">
              Selling price, MRP, cost and stock are entered on the purchase (order / bill) or the opening stock below, and shown on the product page.
            </p>
          )}
        </div>
      </Section>

      {/* Stock settings (one location) */}
      {!isService && <Section title="Stock Settings" description="When to warn you about low stock">
        <div className="flex flex-col gap-4">
          <FormGrid cols={3}>
            <Field label="Low Stock Alert">
              <Input id="lowStockAlertThreshold" type="number" min="0" step="any" placeholder={isEdit ? DEFAULT_THRESHOLD : 'Not set'} {...register('lowStockAlertThreshold', { min: 0 })} />
            </Field>
          </FormGrid>
          {!isEdit && (
            <div className="flex items-start gap-2 rounded-control bg-brand-soft p-3 text-xs text-brand-ink">
              <Boxes className="mt-px size-4 shrink-0" />
              <span>
                Stock comes in through a Purchase{canAddOpening ? ', or the opening stock below' : ''}. The low-stock alert can also be set on the purchase line.
              </span>
            </div>
          )}
        </div>
      </Section>}

      {/* Opening stock (create only, optional) */}
      {canAddOpening && !isService && (
        <Section title="Opening Stock (optional)" description="Stock that is already on your shelf">
          <div className="flex flex-col gap-4">
            <Button
              variant="link"
              size="xs"
              startIcon={opening.open ? <ChevronUp /> : <ChevronDown />}
              onClick={() => setOpening((prev) => ({ ...prev, open: !prev.open }))}
              className="self-start"
            >
              {opening.open ? 'Hide opening stock' : 'This product is already on the shelf — add its stock'}
            </Button>
            {opening.open && (
              <>
                <FormGrid cols={4}>
                  <Field label="Quantity">
                    <Input id="openingQty" type="number" min="0" step="any" placeholder="e.g. 10" value={opening.qty} onChange={setOpeningField('qty')} />
                  </Field>
                  <Field label="Cost Price (₹ / pc)">
                    <Input id="openingCost" type="number" min="0" step="0.01" value={opening.unitCost} onChange={setOpeningField('unitCost')} />
                  </Field>
                  <Field label="MRP (₹ / pc)" required={toNumberOr(opening.qty, 0) > 0}>
                    <Input id="openingMrp" type="number" min="0" step="0.01" placeholder="Required" value={opening.mrp} onChange={setOpeningField('mrp')} invalid={!!openingError} />
                  </Field>
                  <Field label="Selling Price (₹ / pc)">
                    <Input id="openingSp" type="number" min="0" step="0.01" placeholder="Optional" value={opening.sellingPrice} onChange={setOpeningField('sellingPrice')} />
                  </Field>
                  <div className="flex min-w-0 flex-col">
                    <Label htmlFor="openingBarcode">Barcode</Label>
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1">
                        <Input
                          id="openingBarcode"
                          type="text"
                          maxLength={64}
                          placeholder="Optional"
                          value={opening.barcode}
                          onChange={setOpeningField('barcode')}
                          onBlur={(e) => checkOpeningBarcode(e.target.value)}
                          invalid={barcodeBlocked}
                        />
                      </div>
                      <Button variant="secondary" size="icon" onClick={() => setIsBarcodeModalOpen(true)} title="Scan Barcode" aria-label="Scan Barcode">
                        <QrCode />
                      </Button>
                    </div>
                  </div>
                  <Field label="Mfg Date">
                    <Input id="openingMfg" type="date" value={opening.mfgDate} onChange={setOpeningField('mfgDate')} />
                  </Field>
                  <Field label="Expiry Date">
                    <Input id="openingExpiry" type="date" value={opening.expiryDate} onChange={setOpeningField('expiryDate')} />
                  </Field>
                  <Field label="Opening Date">
                    <Input id="openingDate" type="date" max={dayjs().format('YYYY-MM-DD')} value={opening.openingDate} onChange={setOpeningField('openingDate')} />
                  </Field>
                </FormGrid>
                {openingError && <p role="alert" className="m-0 text-xs font-medium text-danger">{openingError}</p>}
                {barcodeCheck.text && opening.barcode.trim() === barcodeCheck.code && (
                  <p className={`m-0 text-xs ${barcodeCheck.tone === 'error' ? 'text-danger' : 'text-brand-ink'}`}>
                    Barcode {barcodeCheck.code}: {barcodeCheck.text}
                  </p>
                )}
                <p className="m-0 text-xs text-ink-subtle">
                  Goes into stock as one batch dated on the opening date, so it is sold before later purchases. A batch number is given automatically. Leave the quantity empty to skip.
                  No barcode? Leave it empty and use “Generate Barcodes” on the product list.
                </p>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Descriptions & tags */}
      <Section title="Descriptions & Tags" description={`Text and search tags for this ${isService ? 'service' : 'product'}`}>
        <FormGrid cols={1}>
          <Field label="Short Description" required={!isService} error={errors.shortDescription?.message}>
            <Input
              id="shortDescription"
              type="text"
              placeholder="Short summary..."
              {...register('shortDescription', { required: isService ? false : 'Short description is required' })}
            />
          </Field>

          <Field label="Full Description">
            <Textarea
              id="fullDescription"
              placeholder="Detailed explanation of the product features, specs..."
              rows={5}
              {...register('fullDescription')}
            />
          </Field>

          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <Field label="Tags">
                <TagInput value={field.value} onChange={field.onChange} placeholder="Type a tag and press Enter" />
              </Field>
            )}
          />
        </FormGrid>
      </Section>

      {/* Customization */}
      {!isService && <Section title="Product Customization" description="Extra details a buyer fills in for this product">
        <div className="flex flex-col gap-4">
          <FormGrid cols={2}>
            <Controller
              name="isCustomizable"
              control={control}
              render={({ field }) => (
                <Field label="Is Product Customizable?">
                  <Select id="isCustomizable" options={yesNo} searchable={false} value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
          </FormGrid>

          {isCustomizable === 'true' && (
            <div className="flex flex-col gap-3 rounded-card bg-fill p-4 sm:p-5">
              <span className="text-sm font-semibold text-ink">Custom Fields Builder</span>
              <div className="hidden gap-3 px-3 text-[13px] font-semibold text-ink-muted md:grid md:grid-cols-[minmax(0,1fr)_16rem_9rem_8rem]">
                <span>Field Label</span>
                <span>Field Type</span>
                <span className="text-center">Required</span>
                <span className="text-center">Actions</span>
              </div>
              {customFields.map((field, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 items-center gap-3 rounded-control bg-surface p-3 shadow-card md:grid-cols-[minmax(0,1fr)_16rem_9rem_8rem]"
                >
                  <Input
                    type="text"
                    aria-label="Field Label"
                    placeholder="e.g. Engraving Name"
                    value={field.label}
                    onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                  />
                  <Select
                    aria-label="Field Type"
                    searchable={false}
                    options={[
                      { value: 'TextInput', label: 'Text Input' },
                      { value: 'ImageUpload', label: 'Image Upload' },
                    ]}
                    value={field.fieldType}
                    onChange={(val) => handleCustomFieldChange(idx, 'fieldType', val)}
                  />
                  <div className="flex items-center md:justify-center">
                    <Checkbox
                      id={`isRequired-${idx}`}
                      label="Required"
                      checked={field.isRequired}
                      onChange={(checked) => handleCustomFieldChange(idx, 'isRequired', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <Button variant="soft" size="icon" onClick={() => addCustomFieldRow(idx)} title="Add Field" aria-label="Add Field">
                      <Plus />
                    </Button>
                    {customFields.length > 1 && (
                      <Button variant="danger-soft" size="icon" onClick={() => removeCustomFieldRow(idx)} title="Remove Field" aria-label="Remove Field">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>}

      {/* Images */}
      {!isService && <Section title="Product Images" description="Upload one or more photos">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex min-w-0 flex-col">
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
          <div className="flex min-w-0 flex-col gap-3">
            <span className="text-[13px] font-semibold text-ink-muted">Images List ({images.length})</span>
            {images.length === 0 ? (
              <div className="rounded-control border border-dashed border-line bg-fill">
                <EmptyState icon={ImageIcon} text="No images uploaded yet." className="py-6" />
              </div>
            ) : (
              <div className="grid max-h-[220px] grid-cols-3 gap-3 overflow-y-auto p-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square overflow-hidden rounded-control border border-line">
                    <img src={getImageUrl(img)} alt={`Product image ${idx + 1}`} className="size-full object-cover" />
                    <Button
                      variant="danger"
                      size="icon-sm"
                      onClick={() => removeImage(idx)}
                      title="Remove Image"
                      aria-label="Remove Image"
                      className="absolute right-1.5 top-1.5 z-10 rounded-full"
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>}

      {error && (
        <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSave={(val) => {
          setOpening((prev) => ({ ...prev, barcode: val }));
          checkOpeningBarcode(val);
        }}
        initialValue={opening.barcode || ''}
      />

      <FormActions>
        <Button variant="secondary" onClick={() => navigate('/products')} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={submitting}
          disabled={submitting || (toNumberOr(opening.qty, 0) > 0 && barcodeBlocked)}
        >
          {isEdit ? (isService ? 'Update Service' : 'Update Product') : (isService ? 'Create Service' : 'Create Product')}
        </Button>
      </FormActions>
    </form>
  );
}
