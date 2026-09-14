import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, PlusCircle, MinusCircle, Equal, Package, AlertCircle, CheckCircle2, Loader2, Truck, ClipboardCheck, AlertOctagon, RotateCcw, Building2, Sparkles, Check, Info, } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Loader from '@/components/loader/Loader';
import { getProductsApi } from '../../storeManagement/products/services/productService';
import { adjustStock, resetInventoryStatus, clearInventoryToast } from './services/inventorySlice';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function AdjustStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { adjustLoading, adjustError, adjustSuccess, toast: reduxToast } = useSelector((state) => state.inventory);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const initialProductId =
    searchParams.get('productId') || location.state?.selectedProduct?._id || '';

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, } = useForm({
    defaultValues: {
      productId: initialProductId,
      action: 'increase',
      amount: '',
      reason: 'Restock from supplier',
    },
  });

  const currentProductId = watch('productId');
  const currentAction = watch('action');
  const currentAmount = watch('amount');
  const currentReason = watch('reason');

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    let isMounted = true;
    setProductsLoading(true);

    getProductsApi({ limit: 1000000 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setProducts(list);

        const paramId = searchParams.get('productId') || location.state?.selectedProduct?._id;
        if (paramId && list.some((p) => p._id === paramId)) {
          setValue('productId', paramId);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        showToast(
          err.response?.data?.message || 'Failed to load products list for adjustment.',
          'danger'
        );
      })
      .finally(() => {
        if (isMounted) setProductsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, location.state, setValue]);

  useEffect(() => {
    if (adjustSuccess) {
      dispatch(resetInventoryStatus());
      navigate('/inventory', {
        state: { message: 'Product stock adjusted successfully!', color: 'success' },
      });
    }
  }, [adjustSuccess, dispatch, navigate]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearInventoryToast());
    }
  }, [reduxToast, dispatch]);

  const selectedProduct = useMemo(() => {
    return (
      products.find((p) => p._id === currentProductId) ||
      location.state?.selectedProduct ||
      null
    );
  }, [products, currentProductId, location.state]);

  const currentStock = Number(
    selectedProduct?.currentStock ?? selectedProduct?.initialStock ?? 0
  );

  const parsedAmount = Number(currentAmount) || 0;
  const newStockPreview = useMemo(() => {
    if (!selectedProduct) return null;
    if (currentAction === 'increase') return currentStock + parsedAmount;
    if (currentAction === 'decrease') return currentStock - parsedAmount;
    if (currentAction === 'set') return parsedAmount;
    return currentStock;
  }, [selectedProduct, currentStock, currentAction, parsedAmount]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: p._id,
      label: `${p.name} (Stock: ${p.currentStock ?? p.initialStock ?? 0})`,
    }));
  }, [products]);

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

  const onSubmit = (formData) => {
    const payload = {
      productId: formData.productId,
      action: formData.action,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
    };

    dispatch(adjustStock(payload));
  };

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
        bodyClassName="p-6"
      >
        {productsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Loading products list...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {adjustError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div>
              <Label htmlFor="productId" className="text-gray-700 dark:text-gray-200">
                Select Product <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="productId"
                control={control}
                rules={{ required: 'Please select a product.' }}
                render={({ field }) => (
                  <Select
                    id="productId"
                    options={productOptions}
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    error={Boolean(errors.productId)}
                    placeholder="Search and choose a product..."
                    className={errors.productId ? '!border-red-500 !ring-1 !ring-red-500' : ''}
                  />
                )}
              />
              {errors.productId && (
                <span className="text-xs text-red-500 mt-1 block font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.productId.message}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {products.length} products available for stock adjustment.
              </p>
            </div>

            {selectedProduct && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Product ID: <span className="font-mono text-gray-400">{selectedProduct._id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase">
                      Current Stock
                    </span>
                    <span className="font-bold text-base text-gray-900 dark:text-white">
                      {currentStock} units
                    </span>
                  </div>

                  {newStockPreview !== null && (
                    <div className="border-l border-indigo-200 dark:border-indigo-500/20 pl-4">
                      <span className="text-gray-400 block text-[11px] uppercase">
                        Stock After Adjustment
                      </span>
                      <span
                        className={`font-bold text-base ${newStockPreview < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                      >
                        {newStockPreview} units
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="text-gray-700 dark:text-gray-200">
                Adjustment Action <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Increase */}
                <button
                  type="button"
                  onClick={() => setValue('action', 'increase')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${currentAction === 'increase'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/30'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      <PlusCircle className="w-4 h-4" />
                      Increase Stock
                    </span>
                    {currentAction === 'increase' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add units to current balance (e.g. restock from supplier, returns).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('action', 'decrease')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${currentAction === 'decrease'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-sm ring-2 ring-rose-500/30'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                      <MinusCircle className="w-4 h-4" />
                      Decrease Stock
                    </span>
                    {currentAction === 'decrease' && (
                      <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Deduct units (e.g. damaged goods, shrinkage, wastage).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('action', 'set')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${currentAction === 'set'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm ring-2 ring-indigo-500/30'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-400">
                      <Equal className="w-4 h-4" />
                      Set Exact Stock
                    </span>
                    {currentAction === 'set' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Override stock with exact counted physical inventory.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="amount" className="text-gray-700 dark:text-gray-200">
                Amount / Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={currentAction === 'set' ? '0' : '1'}
                step="1"
                placeholder="e.g. 10"
                error={Boolean(errors.amount)}
                className={`w-full ${errors.amount ? '!border-red-500 !ring-1 !ring-red-500' : ''}`}
                {...register('amount', {
                  required: 'Amount is required.',
                  validate: (val) => {
                    const str = String(val).trim();
                    if (!str) return 'Amount is required.';
                    const num = Number(str);
                    if (isNaN(num) || num < 0) return 'Please enter a valid non-negative number.';
                    if (currentAction !== 'set' && num === 0) return 'Amount must be greater than 0.';
                    if (currentAction === 'decrease' && selectedProduct && num > currentStock) {
                      return `Cannot decrease more than available stock (${currentStock} units).`;
                    }
                    return true;
                  },
                })}
              />
              {errors.amount ? (
                <span className="text-xs text-red-500 mt-1 block font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.amount.message}
                </span>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  {currentAction === 'increase' && 'Quantity that will be added to the stock.'}
                  {currentAction === 'decrease' && 'Quantity that will be deducted from the stock.'}
                  {currentAction === 'set' && 'Total new stock quantity for this product.'}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="reason" className="!mb-0 text-gray-700 dark:text-gray-200">
                  Reason for Adjustment <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3 text-indigo-500" /> Select a quick reason or enter custom text
                </span>
              </div>

              <Input
                id="reason"
                type="text"
                placeholder="Type or select a reason below..."
                error={Boolean(errors.reason)}
                className={`w-full ${errors.reason ? '!border-red-500 !ring-1 !ring-red-500' : ''}`}
                {...register('reason', {
                  required: 'Reason is required.',
                  validate: (val) => (val && val.trim().length > 0) || 'Reason is required.',
                })}
              />
              {errors.reason && (
                <span className="text-xs text-red-500 mt-1 block font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.reason.message}
                </span>
              )}

              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">
                  Quick Reason Presets:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {quickReasonPresets.map((preset) => {
                    const isSelected =
                      (currentReason || '').trim().toLowerCase() === preset.title.toLowerCase();
                    return (
                      <div
                        key={preset.title}
                        onClick={() => {
                          setValue('reason', preset.title, { shouldValidate: true });
                        }}
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
                              className={`text-xs font-bold leading-snug truncate ${isSelected
                                  ? 'text-indigo-900 dark:text-indigo-200'
                                  : 'text-gray-800 dark:text-gray-200'
                                }`}
                            >
                              {preset.title}
                            </h5>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold shrink-0 uppercase tracking-wider ${preset.badgeClass}`}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/inventory')}
                disabled={adjustLoading}
                className=""
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={adjustLoading}
                className="!h-10 px-6 font-semibold"
              >
                {adjustLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <CToaster
        className="p-3"
        style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}
      >
        {toasts.map((t) => (
          <CToast
            key={t.id}
            visible={true}
            color={t.color}
            className="text-white align-items-center mb-2"
          >
            <div className="d-flex">
              <CToastBody className="font-semibold">{t.message}</CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
