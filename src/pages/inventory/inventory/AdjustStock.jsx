import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  MinusCircle,
  Equal,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Truck,
  ClipboardCheck,
  AlertOctagon,
  RotateCcw,
  Building2,
  Sparkles,
  Check,
  Info,
  Store as StoreIcon,
} from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import { getProductByIdApi } from '../../storeManagement/products/services/productService';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import { adjustStock, resetInventoryStatus } from './services/inventorySlice';
import { AntdThemed, StoreSelect, ProductSearchSelect, InventoryToaster } from './components/InventoryShared';
import { decodeId, formatQty, formatCurrency, getStoreQty, useToasts } from './components/inventoryUtils';

const quickReasonPresets = [
  {
    title: 'Restock from supplier',
    description: 'Incoming stock from vendor / purchase shipment',
    tag: 'Purchase',
    icon: <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  {
    title: 'Inventory audit correction',
    description: 'Discrepancy resolved during cycle count',
    tag: 'Audit',
    icon: <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  {
    title: 'Damaged / expired goods',
    description: 'Stock write-off due to breakage or shelf expiry',
    tag: 'Loss',
    icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  },
  {
    title: 'Customer return restock',
    description: 'Good condition customer returns placed back on shelf',
    tag: 'Return',
    icon: <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  {
    title: 'Internal store transfer',
    description: 'Stock moved between branch stores or warehouses',
    tag: 'Transfer',
    icon: <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  },
  {
    title: 'Sample / promotional dispatch',
    description: 'Units used for client presentation or marketing campaign',
    tag: 'Marketing',
    icon: <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  },
];

const ACTIONS = [
  {
    value: 'increase',
    label: 'Increase Stock',
    hint: 'Add units to this store (restock, returns).',
    icon: PlusCircle,
    on: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    value: 'decrease',
    label: 'Decrease Stock',
    hint: 'Remove units from this store (shrinkage, wastage).',
    icon: MinusCircle,
    on: 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-sm ring-2 ring-rose-500/30',
    text: 'text-rose-700 dark:text-rose-400',
  },
  {
    value: 'set',
    label: 'Set Exact Stock',
    hint: 'Replace with the physically counted quantity.',
    icon: Equal,
    on: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm ring-2 ring-indigo-500/30',
    text: 'text-indigo-700 dark:text-indigo-400',
  },
];

const ErrorText = ({ children }) => (
  <span className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
    {children}
  </span>
);

export default function AdjustStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { adjustLoading } = useSelector((state) => state.inventory);
  const { stores } = useSelector((state) => state.store);
  const { toasts, showToast } = useToasts();

  // Preselection: location.state wins, then (encrypted) query params
  const queryProductId = decodeId(searchParams.get('productId'));
  const initialStoreId = location.state?.storeId || decodeId(searchParams.get('storeId'));
  const stateProduct = location.state?.selectedProduct || null;

  const [product, setProduct] = useState(stateProduct);
  const [storeId, setStoreId] = useState(initialStoreId || '');
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      action: 'increase',
      amount: '',
      reason: 'Restock from supplier',
      unitCost: '',
    },
  });

  const currentAction = useWatch({ control, name: 'action' });
  const currentAmount = useWatch({ control, name: 'amount' });
  const currentReason = useWatch({ control, name: 'reason' });

  useEffect(() => {
    dispatch(getStores({ limit: 100 }));
    dispatch(resetInventoryStatus());
  }, [dispatch]);

  // Product passed only by id (e.g. a shared link): load it once
  useEffect(() => {
    if (stateProduct || !queryProductId) return;
    let alive = true;
    getProductByIdApi(queryProductId)
      .then((res) => {
        if (alive && res?.data) setProduct(res.data);
      })
      .catch(() => {
        if (alive) showToast('Could not load the selected product.', 'danger');
      });
    return () => {
      alive = false;
    };
  }, [stateProduct, queryProductId, showToast]);

  const activeStores = useMemo(() => (stores || []).filter((s) => s.isActive !== false), [stores]);
  // No store chosen yet → default to the default (or only) active store
  const effectiveStoreId =
    storeId || activeStores.find((s) => s.isDefault)?._id || (activeStores.length === 1 ? activeStores[0]._id : '');
  const selectedStore = activeStores.find((s) => s._id === effectiveStoreId) || null;

  const storeQty = getStoreQty(product, selectedStore);
  const totalQty = Number(product?.currentStock ?? 0);
  const parsedAmount = Number(currentAmount) || 0;

  const newStoreQty = useMemo(() => {
    if (storeQty === null) return null;
    if (currentAction === 'increase') return storeQty + parsedAmount;
    if (currentAction === 'decrease') return storeQty - parsedAmount;
    return parsedAmount;
  }, [storeQty, currentAction, parsedAmount]);

  const showPreview =
    newStoreQty !== null && (currentAction === 'set' ? String(currentAmount ?? '').trim() !== '' : parsedAmount > 0);
  const showCostFields =currentAction === 'increase' || (currentAction === 'set' && newStoreQty > (storeQty ?? 0));

  const onSubmit = (formData) => {
    setSubmitted(true);
    if (!product || !effectiveStoreId) return;

    const payload = {
      productId: product._id,
      storeId: effectiveStoreId,
      action: formData.action,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
    };
    if (showCostFields && String(formData.unitCost).trim() !== '') payload.unitCost = Number(formData.unitCost);

    dispatch(adjustStock(payload))
      .unwrap()
      .then((res) => {
        dispatch(resetInventoryStatus());
        navigate('/inventory', {
          state: { message: res?.message || 'Stock adjusted successfully.', color: 'success' },
        });
      })
      .catch((msg) => showToast(typeof msg === 'string' ? msg : 'Failed to adjust stock.', 'danger'));
  };

  const productError = submitted && !product ? 'Please select a product.' : '';
  const storeError = submitted && !effectiveStoreId ? 'Please select a store.' : '';

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        h1="Adjust Stock"
        rightNode={
          <Button
            variant="danger"
            startIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            size="sm"
            onClick={() => navigate('/inventory')}
            className="!h-9"
          >
            Back
          </Button>
        }
        bodyClassName="p-4 sm:p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <AntdThemed>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <Label className="text-gray-700 dark:text-gray-200">
                  Store / Warehouse <span className="text-red-500">*</span>
                </Label>
                <StoreSelect
                  stores={activeStores}
                  value={effectiveStoreId}
                  onChange={setStoreId}
                  placeholder="Select store"
                  allowClear={false}
                  status={storeError ? 'error' : undefined}
                  className="w-full !h-11"
                />
                {storeError && <ErrorText>{storeError}</ErrorText>}
              </div>

              <div className="flex flex-col">
                <Label className="text-gray-700 dark:text-gray-200">
                  Product <span className="text-red-500">*</span>
                </Label>
                <ProductSearchSelect
                  value={product}
                  onChange={setProduct}
                  storeId={effectiveStoreId}
                  status={productError ? 'error' : undefined}
                  className="w-full !h-11"
                />
                {productError ? (
                  <ErrorText>{productError}</ErrorText>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Type a name, SKU or barcode to search.</p>
                )}
              </div>
            </div>
          </AntdThemed>

          {product && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.04] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
                    {product.status === 'inactive' ? ' · Inactive' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px] uppercase">All Stores</span>
                  <span className="font-bold text-base text-gray-900 dark:text-white">
                    {formatQty(totalQty)} {product.unit || 'units'}
                  </span>
                </div>
                {selectedStore && (
                  <div className="border-l border-indigo-200 dark:border-indigo-500/20 pl-4">
                    <span className="text-gray-400 text-[11px] uppercase flex items-center gap-1">
                      <StoreIcon className="w-3 h-3" />
                      {selectedStore.name}
                    </span>
                    <span className="font-bold text-base text-gray-900 dark:text-white">
                      {formatQty(storeQty)} {product.unit || 'units'}
                    </span>
                  </div>
                )}
                {showPreview ? (
                  <div className="border-l border-indigo-200 dark:border-indigo-500/20 pl-4">
                    <span className="text-gray-400 block text-[11px] uppercase">After Adjustment</span>
                    <span
                      className={`font-bold text-base ${newStoreQty < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                    >
                      {formatQty(newStoreQty)} {product.unit || 'units'}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div>
            <Label className="text-gray-700 dark:text-gray-200">
              Adjustment Action <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                const active = currentAction === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setValue('action', a.value, { shouldValidate: submitted })}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${active
                      ? a.on
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-2 font-bold text-sm ${a.text}`}>
                        <Icon className="w-4 h-4" />
                        {a.label}
                      </span>
                      {active && <CheckCircle2 className={`w-4 h-4 ${a.text}`} />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="text-gray-700 dark:text-gray-200">
                {currentAction === 'set' ? 'Counted Quantity' : 'Quantity'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={currentAction === 'set' ? '0' : '0.001'}
                step="any"
                placeholder="e.g. 10"
                error={Boolean(errors.amount)}
                className="w-full"
                {...register('amount', {
                  validate: (val) => {
                    const str = String(val ?? '').trim();
                    if (!str) return 'Quantity is required.';
                    const num = Number(str);
                    if (Number.isNaN(num) || num < 0) return 'Enter a valid non-negative number.';
                    if (currentAction !== 'set' && num === 0) return 'Quantity must be greater than 0.';
                    if (currentAction === 'decrease' && storeQty !== null && num > storeQty) {
                      return `Only ${formatQty(storeQty)} available in this store.`;
                    }
                    return true;
                  },
                })}
              />
              {errors.amount ? (
                <ErrorText>{errors.amount.message}</ErrorText>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  {currentAction === 'increase' && 'Units added to the selected store.'}
                  {currentAction === 'decrease' && 'Units removed from the selected store.'}
                  {currentAction === 'set' && 'New stock of this product in the selected store.'}
                </p>
              )}
            </div>

            {showCostFields && (
              <div>
                <Label htmlFor="unitCost" className="text-gray-700 dark:text-gray-200">
                  Unit Cost (₹) <span className="text-[11px] font-normal text-gray-400">optional</span>
                </Label>
                <Input
                  id="unitCost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={product?.avgCost ? `Avg. ${formatCurrency(product.avgCost)}` : 'e.g. 120'}
                  error={Boolean(errors.unitCost)}
                  className="w-full"
                  {...register('unitCost', {
                    validate: (val) => {
                      const str = String(val ?? '').trim();
                      if (!str) return true;
                      const num = Number(str);
                      return (!Number.isNaN(num) && num >= 0) || 'Enter a valid cost.';
                    },
                  })}
                />
                {errors.unitCost ? (
                  <ErrorText>{errors.unitCost.message}</ErrorText>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Leave empty to use the current average cost.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <Label htmlFor="reason" className="!mb-0 text-gray-700 dark:text-gray-200">
                Reason <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-500" /> Pick a quick reason or type your own
              </span>
            </div>

            <Input
              id="reason"
              type="text"
              maxLength={500}
              placeholder="Type or select a reason below..."
              error={Boolean(errors.reason)}
              className="w-full"
              {...register('reason', {
                validate: (val) => (val && val.trim().length > 0) || 'Reason is required.',
              })}
            />
            {errors.reason && <ErrorText>{errors.reason.message}</ErrorText>}

            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">
                Quick Reasons:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {quickReasonPresets.map((preset) => {
                  const isSelected = (currentReason || '').trim().toLowerCase() === preset.title.toLowerCase();
                  return (
                    <div
                      key={preset.title}
                      onClick={() => setValue('reason', preset.title, { shouldValidate: true })}
                      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${isSelected
                        ? 'border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-500/10 shadow-xs ring-2 ring-indigo-500/25'
                        : 'border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-indigo-300 dark:hover:border-indigo-500/30'
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${preset.iconBg}`}
                      >
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h5
                            className={`text-xs font-bold leading-snug truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-200'
                              }`}
                          >
                            {preset.title}
                          </h5>
                          <span
                            className={`text-[9px] px-1.5 rounded-md font-semibold shrink-0 uppercase tracking-wider ${preset.badgeClass}`}
                          >
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-400 line-clamp-1 leading-normal">
                          {preset.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')} disabled={adjustLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={adjustLoading}
              className="!h-10 px-6 font-semibold"
              onClick={() => setSubmitted(true)}
            >
              {adjustLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Adjustment'
              )}
            </Button>
          </div>
        </form>
      </Card>

      <InventoryToaster toasts={toasts} />
    </div>
  );
}
