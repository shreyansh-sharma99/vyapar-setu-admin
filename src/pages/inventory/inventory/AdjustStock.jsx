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
  CheckCircle2,
  Truck,
  ClipboardCheck,
  AlertOctagon,
  RotateCcw,
  Sparkles,
  Check,
  Info,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Section,
  Select,
  TONE_CLASSES,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getProductByIdApi } from '../../storeManagement/products/services/productService';
import { adjustStock, resetInventoryStatus } from './services/inventorySlice';
import { ProductSearchSelect, InventoryToaster } from './components/InventoryShared';
import { decodeId, formatQty, useToasts } from './components/inventoryUtils';
import { getBatchesApi } from './services/inventoryService';

/** Quick reasons that mean new goods: not offered (new goods come in through a Purchase, or opening stock when creating the product). */
const NEW_GOODS_TAGS = ['Purchase', 'Return', 'Transfer'];

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const quickReasonPresets = [
  {
    title: 'Restock from supplier',
    description: 'Incoming stock from vendor / purchase shipment',
    tag: 'Purchase',
    icon: Truck,
    tone: 'success',
  },
  {
    title: 'Inventory audit correction',
    description: 'Discrepancy resolved during cycle count',
    tag: 'Audit',
    icon: ClipboardCheck,
    tone: 'primary',
  },
  {
    title: 'Damaged / expired goods',
    description: 'Stock write-off due to breakage or shelf expiry',
    tag: 'Loss',
    icon: AlertOctagon,
    tone: 'danger',
  },
  {
    title: 'Customer return restock',
    description: 'Good condition customer returns placed back on shelf',
    tag: 'Return',
    icon: RotateCcw,
    tone: 'warning',
  },
  {
    title: 'Sample / promotional dispatch',
    description: 'Units used for client presentation or marketing campaign',
    tag: 'Marketing',
    icon: Sparkles,
    tone: 'info',
  },
];

const ACTIONS = [
  {
    value: 'increase',
    label: 'Increase Stock',
    hint: 'Add units (restock, returns).',
    icon: PlusCircle,
    tone: 'success',
  },
  {
    value: 'decrease',
    label: 'Decrease Stock',
    hint: 'Remove units (shrinkage, wastage).',
    icon: MinusCircle,
    tone: 'danger',
  },
  {
    value: 'set',
    label: 'Set Exact Stock',
    hint: 'Replace with the physically counted quantity.',
    icon: Equal,
    tone: 'primary',
  },
];

/** Text colour per tone for the selected choice tile. */
const TONE_INK = { success: 'text-success', danger: 'text-danger', primary: 'text-brand-ink', warning: 'text-warning', info: 'text-info' };

/** Big selectable tile (adjustment action, quick reason). */
const ChoiceTile = ({ active, onClick, className, children }) => (
  <Card
    as="button"
    type="button"
    padding="none"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'relative flex w-full cursor-pointer text-left transition-shadow focus-visible:outline-none',
      active
        ? 'ring-2 ring-brand'
        : 'ring-1 ring-line hover:ring-line-strong',
      className
    )}
  >
    {children}
  </Card>
);

export default function AdjustStock() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { adjustLoading } = useSelector((state) => state.inventory);
  const { toasts, showToast } = useToasts();

  // Preselection: location.state wins, then (encrypted) query params
  const queryProductId = decodeId(searchParams.get('productId'));
  const stateProduct = location.state?.selectedProduct || null;

  const [product, setProduct] = useState(stateProduct);
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
      reason: 'Inventory audit correction',
    },
  });

  // Tally style: Adjust Stock never brings in new goods; a count increase goes into
  // an existing batch (same cost and MRP).
  const [batchId, setBatchId] = useState('');
  const [batchState, setBatchState] = useState({ key: '', list: [], error: '' });

  const currentAction = useWatch({ control, name: 'action' });
  const currentAmount = useWatch({ control, name: 'amount' });
  const currentReason = useWatch({ control, name: 'reason' });

  useEffect(() => {
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

  // Single location: the product's stock is its total.
  const storeQty = product ? Number(product.currentStock ?? 0) : null;
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
  const needsBatch = showCostFields;

  // Batches of the product (for a count increase).
  const batchKey = needsBatch && product?._id ? String(product._id) : '';
  useEffect(() => {
    if (!batchKey) return undefined;
    let alive = true;
    getBatchesApi({ productId: batchKey, onlyOpen: false })
      .then((res) => {
        if (alive) setBatchState({ key: batchKey, list: res?.data?.batches || [], error: '' });
      })
      .catch(() => {
        if (alive) setBatchState({ key: batchKey, list: [], error: 'Could not load the batches.' });
      });
    return () => {
      alive = false;
    };
  }, [batchKey]);
  const batches = batchState.key === batchKey ? batchState.list : [];
  const batchesLoading = !!batchKey && batchState.key !== batchKey;
  const chosenBatch = batches.find((b) => String(b._id) === String(batchId)) ? batchId : '';
  const batchError = submitted && needsBatch && !chosenBatch ? 'Pick the batch the extra units belong to.' : '';

  const reasonPresets = quickReasonPresets.filter((p) => !NEW_GOODS_TAGS.includes(p.tag));
  const actions = ACTIONS.map((a) => (a.value === 'increase' ? { ...a, label: 'Count Correction (+)', hint: 'Found more than the system shows — added to an existing batch.' } : a));

  const onSubmit = (formData) => {
    setSubmitted(true);
    if (!product) return;
    if (needsBatch && !chosenBatch) return;

    const payload = {
      productId: product._id,
      action: formData.action,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
    };
    if (needsBatch) payload.batchId = chosenBatch;

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <PageHeader
        title="Adjust Stock"
        description="Correct a count or remove stock that is lost, used or wasted."
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate('/inventory')}>
            Back
          </Button>
        }
      />

      <Alert tone="warning" icon={Info}>
        New goods come in through a Purchase or opening stock when creating the product. Here you can
        only remove stock or correct a count — extra units found in a count go into an existing batch.
      </Alert>

      <Section title="Product" description="Which product's stock is changing">
        <div className="flex flex-col gap-4">
          <FormGrid cols={2}>
            <Field label="Product" required error={productError || undefined} hint="Type a name, SKU or barcode to search.">
              <ProductSearchSelect
                value={product}
                onChange={setProduct}
                status={productError ? 'error' : undefined}
              />
            </Field>
          </FormGrid>

          {product && (
            <div className="flex flex-col justify-between gap-4 rounded-control bg-fill-2 p-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-soft text-brand-ink">
                  <Package className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-bold text-ink">{product.name}</p>
                  <p className="m-0 font-mono text-xs text-ink-subtle">
                    {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
                    {product.status === 'inactive' ? ' · Inactive' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="block text-xs font-medium text-ink-subtle">Current stock</span>
                  <span className="text-lg font-extrabold tabular-nums text-ink">
                    {formatQty(storeQty)} {product.unit || 'units'}
                  </span>
                </div>
                {showPreview ? (
                  <div className="border-l border-line pl-6">
                    <span className="block text-xs font-medium text-ink-subtle">After adjustment</span>
                    <span className={cn('text-lg font-extrabold tabular-nums', newStoreQty < 0 ? 'text-danger' : 'text-success')}>
                      {formatQty(newStoreQty)} {product.unit || 'units'}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Adjustment" description="What happened to the stock">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {actions.map((a) => {
              const Icon = a.icon;
              const active = currentAction === a.value;
              return (
                <ChoiceTile
                  key={a.value}
                  active={active}
                  onClick={() => setValue('action', a.value, { shouldValidate: submitted })}
                  className="flex-col gap-1.5 p-4"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('flex items-center gap-2 text-sm font-bold', active ? TONE_INK[a.tone] : 'text-ink')}>
                      <span className={cn('grid size-8 place-items-center rounded-[10px]', TONE_CLASSES[a.tone])}>
                        <Icon className="size-4" />
                      </span>
                      {a.label}
                    </span>
                    {active && <CheckCircle2 className={cn('size-4 shrink-0', TONE_INK[a.tone])} />}
                  </span>
                  <span className="text-xs text-ink-subtle">{a.hint}</span>
                </ChoiceTile>
              );
            })}
          </div>

          <FormGrid cols={2}>
            <Field
              label={currentAction === 'set' ? 'Counted quantity' : 'Quantity'}
              required
              error={errors.amount?.message}
              hint={
                currentAction === 'increase'
                  ? 'Units added to stock.'
                  : currentAction === 'decrease'
                    ? 'Units removed from stock.'
                    : 'New stock of this product.'
              }
            >
              <Input
                id="amount"
                type="number"
                min={currentAction === 'set' ? '0' : '0.001'}
                step="any"
                placeholder="e.g. 10"
                error={Boolean(errors.amount)}
                className="tabular-nums"
                {...register('amount', {
                  validate: (val) => {
                    const str = String(val ?? '').trim();
                    if (!str) return 'Quantity is required.';
                    const num = Number(str);
                    if (Number.isNaN(num) || num < 0) return 'Enter a valid non-negative number.';
                    if (currentAction !== 'set' && num === 0) return 'Quantity must be greater than 0.';
                    if (currentAction === 'decrease' && storeQty !== null && num > storeQty) {
                      return `Only ${formatQty(storeQty)} available.`;
                    }
                    return true;
                  },
                })}
              />
            </Field>

            {needsBatch && (
              <Field
                label="Batch"
                required
                error={batchError || batchState.error || undefined}
                hint="Same cost and MRP as that batch. No batch here? Receive it on a Purchase."
              >
                <Select
                  id="batchId"
                  value={chosenBatch}
                  onChange={(v) => setBatchId(v)}
                  disabled={batchesLoading}
                  searchable={false}
                  invalid={!!batchError}
                  placeholder={batchesLoading ? 'Loading batches...' : batches.length ? 'Select batch' : 'No batch'}
                  options={batches.map((b) => ({
                    value: b._id,
                    label: [b.batchNo || 'No batch no', b.mrp > 0 ? `MRP ₹${b.mrp}` : 'MRP —', `${formatQty(b.qtyRemaining)} left`, fmtDay(b.receivedAt)].filter(Boolean).join(' · '),
                  }))}
                />
              </Field>
            )}
          </FormGrid>
        </div>
      </Section>

      <Section
        title="Reason"
        description="Pick a quick reason or type your own"
      >
        <div className="flex flex-col gap-4">
          <Field label="Reason" required error={errors.reason?.message}>
            <Input
              id="reason"
              type="text"
              maxLength={500}
              placeholder="Type or select a reason below..."
              error={Boolean(errors.reason)}
              {...register('reason', {
                validate: (val) => (val && val.trim().length > 0) || 'Reason is required.',
              })}
            />
          </Field>

          <div>
            <p className="m-0 mb-2 text-xs font-semibold text-ink-subtle">Quick reasons</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reasonPresets.map((preset) => {
                const isSelected = (currentReason || '').trim().toLowerCase() === preset.title.toLowerCase();
                const Icon = preset.icon;
                return (
                  <ChoiceTile
                    key={preset.title}
                    active={isSelected}
                    onClick={() => setValue('reason', preset.title, { shouldValidate: true })}
                    className="items-start gap-3 p-3"
                  >
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-[10px]', TONE_CLASSES[preset.tone])}>
                      <Icon className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center justify-between gap-2 pr-5">
                        <span className={cn('truncate text-xs font-bold', isSelected ? 'text-brand-ink' : 'text-ink')}>{preset.title}</span>
                        <Badge tone={preset.tone} size="xs" className="px-2 uppercase tracking-wider">{preset.tag}</Badge>
                      </span>
                      <span className="line-clamp-1 text-[11px] text-ink-subtle">{preset.description}</span>
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-brand text-white">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </ChoiceTile>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <FormActions>
        <Button variant="secondary" onClick={() => navigate('/inventory')} disabled={adjustLoading}>
          Cancel
        </Button>
        <Button type="submit" loading={adjustLoading} onClick={() => setSubmitted(true)}>
          {adjustLoading ? 'Saving...' : 'Save Adjustment'}
        </Button>
      </FormActions>

      <InventoryToaster toasts={toasts} />
    </form>
  );
}
