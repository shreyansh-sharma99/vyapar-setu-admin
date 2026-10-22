import { useMemo, useState } from 'react';
import { DatePicker, Input as AntInput, Segmented } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, Eye, IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { applyBulkOffersApi, previewBulkOffersApi } from '../services/priceMasterService';
import PricePreviewTable from './PricePreviewTable';
import ProductPicker from './ProductPicker';
import { formatDay, toNumber } from './gstUtils';
import { OFFER_TYPE_OPTIONS, describeOffer, parseMoney } from './priceUtils';
import { FieldError, FieldHint, PreviewSummary } from './formBits';

const defaultRange = () => [dayjs().startOf('day'), dayjs().add(6, 'day').startOf('day')];

const VALUE_LABEL = { percent: 'Percent off', amount: 'Amount off (₹ per unit)', fixed: 'Offer price (₹)' };
const VALUE_HINT = {
  percent: 'e.g. 5 = customer pays 5% less.',
  amount: 'Customer pays this much less per unit (GST included).',
  fixed: 'Customer pays exactly this per unit (GST included).',
};

/** Offer for one or many products between two dates. */
export default function OfferForm({ notify, onApplied }) {
  const [products, setProducts] = useState([]);
  const [type, setType] = useState('percent');
  const [valueText, setValueText] = useState('');
  const [range, setRange] = useState(defaultRange);
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const value = parseMoney(valueText, { required: true, label: VALUE_LABEL[type], ...(type === 'percent' ? { max: 100 } : {}) });
  const [start, end] = Array.isArray(range) ? range : [null, null];
  const errors = {
    products: products.length ? '' : 'Choose at least one product.',
    range: start && end ? '' : 'Choose the start and end dates.',
    value: value.error,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const shownError = (field, typed) => (attempted || typed ? errors[field] : '');

  const payload = hasErrors
    ? null
    : {
        filter: { productIds: products.map((p) => p._id) },
        type,
        value: value.value,
        startDate: dayjs(start).format('YYYY-MM-DD'),
        endDate: dayjs(end).format('YYYY-MM-DD'),
        note: note.trim(),
      };
  const payloadKey = payload ? JSON.stringify(payload) : '';
  const previewIsFresh = !!preview && preview.key === payloadKey;
  const data = preview?.data || null;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const willGet = toNumber(data?.count);
  const canApply = previewIsFresh && willGet > 0 && !applying;

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [String(p._id), p])), [products]);

  const reset = () => {
    setProducts([]);
    setValueText('');
    setRange(defaultRange());
    setNote('');
    setAttempted(false);
    setPreview(null);
    setPreviewError('');
  };

  const runPreview = async () => {
    setAttempted(true);
    if (!payload) return;
    setPreviewing(true);
    setPreviewError('');
    try {
      const res = await previewBulkOffersApi(payload);
      setPreview({ key: payloadKey, data: res?.data || null });
    } catch (err) {
      const message = await getApiErrorMessage(err, 'Could not preview the offer');
      setPreview(null);
      setPreviewError(message);
      notify(message, 'danger');
    } finally {
      setPreviewing(false);
    }
  };

  const runApply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const res = await applyBulkOffersApi(payload);
      notify(res?.message || 'Offer saved', 'success');
      onApplied?.(rows.filter((r) => !r.skip).map((r) => String(r.productId)));
      setConfirmOpen(false);
      reset();
    } catch (err) {
      const message = await getApiErrorMessage(err, 'Could not save the offer');
      setConfirmOpen(false);
      setPreviewError(message);
      notify(message, 'danger');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="offer-products">
          Products <span className="text-rose-500">*</span>
        </Label>
        <ProductPicker
          id="offer-products"
          multiple
          value={products}
          onChange={setProducts}
          invalid={!!shownError('products')}
          placeholder="Search by name, SKU or barcode — pick one or many"
        />
        <FieldError>{shownError('products')}</FieldError>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_200px_minmax(0,1fr)] gap-3 items-start">
        <div>
          <Label>Offer type</Label>
          <Segmented options={OFFER_TYPE_OPTIONS} value={type} onChange={setType} />
        </div>

        <div>
          <Label htmlFor="offer-value">
            {VALUE_LABEL[type]} <span className="text-rose-500">*</span>
          </Label>
          <AntInput
            id="offer-value"
            size="large"
            value={valueText}
            onChange={(e) => setValueText(e.target.value)}
            prefix={type === 'percent' ? undefined : <IndianRupee className="w-3.5 h-3.5 text-gray-400" />}
            suffix={type === 'percent' ? '%' : undefined}
            placeholder={type === 'percent' ? 'e.g. 5' : type === 'amount' ? 'e.g. 10' : 'e.g. 99'}
            inputMode="decimal"
            maxLength={12}
            status={shownError('value', valueText !== '') ? 'error' : undefined}
          />
          <FieldError>{shownError('value', valueText !== '')}</FieldError>
          {!shownError('value', valueText !== '') && <FieldHint>{VALUE_HINT[type]}</FieldHint>}
        </div>

        <div>
          <Label htmlFor="offer-dates">
            Offer dates <span className="text-rose-500">*</span>
          </Label>
          <DatePicker.RangePicker
            id="offer-dates"
            size="large"
            value={range}
            onChange={setRange}
            format="DD MMM YYYY"
            inputReadOnly
            disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
            status={shownError('range') ? 'error' : undefined}
            className="w-full"
          />
          <FieldError>{shownError('range')}</FieldError>
          {!shownError('range') && <FieldHint>Whole days, first to last.</FieldHint>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
        <div>
          <Label htmlFor="offer-note">Note</Label>
          <AntInput id="offer-note" size="large" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Diwali sale" />
        </div>
        <Button
          onClick={runPreview}
          disabled={previewing || applying}
          startIcon={previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : preview && !previewIsFresh ? <RefreshCw className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        >
          {previewing ? 'Loading...' : preview && !previewIsFresh ? 'Preview again' : 'Preview'}
        </Button>
      </div>
      {preview && !previewIsFresh && (
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">You changed the details — preview again before applying.</span>
      )}

      {previewError && (
        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{previewError}</span>
        </div>
      )}

      {data && (
        <div className={`flex flex-col gap-3 pt-4 border-t border-[var(--vs-border)] ${previewIsFresh ? '' : 'opacity-60'}`}>
          <PreviewSummary
            title={`Preview — ${formatDay(data.startDate)} to ${formatDay(data.endDate)}`}
            chips={[
              { label: `Will get the offer: ${willGet}`, tone: 'green' },
              { label: `Skipped (already has an offer on these days): ${toNumber(data.skipped)}`, tone: 'gray' },
            ]}
            action={
              <Button size="xs" onClick={() => setConfirmOpen(true)} disabled={!canApply}>
                Apply to {willGet} product{willGet === 1 ? '' : 's'}
              </Button>
            }
          />
          <div className="max-h-[45vh] overflow-y-auto rounded-xl">
            <PricePreviewTable rows={rows} productsById={productsById} offer />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runApply}
        isLoading={applying}
        title="Save offer?"
        message={
          payload
            ? `${willGet} product${willGet === 1 ? '' : 's'} will get ${describeOffer(payload)} from ${formatDay(payload.startDate)} to ${formatDay(payload.endDate)}.`
            : ''
        }
        confirmText="Apply"
        loadingText="Applying..."
      />
    </div>
  );
}
