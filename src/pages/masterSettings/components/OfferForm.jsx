import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Eye, IndianRupee, Loader2, RefreshCw, Tag } from 'lucide-react';
import { Alert, Button, ConfirmDialog, DateRangePicker, Field, FormGrid, Input, Label, Section, Segmented } from '@/components/ui';
import { getApiErrorMessage } from '@/pages/storeManagement/products/utils/productUtils';
import { applyBulkOffersApi, previewBulkOffersApi } from '../services/priceMasterService';
import PricePreviewTable from './PricePreviewTable';
import ProductPicker from './ProductPicker';
import { formatDay, toNumber } from './gstUtils';
import { OFFER_TYPE_OPTIONS, describeOffer, parseMoney } from './priceUtils';
import { PreviewChips } from './formBits';

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
    <div className="flex flex-col gap-5">
      <Section title="Offer" description="Pick the products, the offer and the days it runs, then preview.">
        <div className="flex flex-col gap-4">
          <Field label="Products" required error={shownError('products')}>
            <ProductPicker
              id="offer-products"
              multiple
              value={products}
              onChange={setProducts}
              invalid={!!shownError('products')}
              placeholder="Search by name, SKU or barcode — pick one or many"
            />
          </Field>

          <FormGrid cols={3} className="items-start lg:grid-cols-[auto_200px_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col">
              <Label>Offer type</Label>
              <Segmented aria-label="Offer type" options={OFFER_TYPE_OPTIONS} value={type} onChange={setType} />
            </div>

            <Field label={VALUE_LABEL[type]} required error={shownError('value', valueText !== '')} hint={VALUE_HINT[type]}>
              <Input
                id="offer-value"
                value={valueText}
                onChange={(e) => setValueText(e.target.value)}
                startIcon={type === 'percent' ? undefined : <IndianRupee />}
                endIcon={type === 'percent' ? <span className="text-sm font-semibold">%</span> : undefined}
                placeholder={type === 'percent' ? 'e.g. 5' : type === 'amount' ? 'e.g. 10' : 'e.g. 99'}
                inputMode="decimal"
                maxLength={12}
                invalid={!!shownError('value', valueText !== '')}
                className="tabular-nums"
              />
            </Field>

            <Field label="Offer dates" required error={shownError('range')} hint="Whole days, first to last.">
              <DateRangePicker
                id="offer-dates"
                value={range}
                onChange={setRange}
                inputReadOnly
                disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
                invalid={!!shownError('range')}
              />
            </Field>
          </FormGrid>

          <FormGrid cols={2} className="items-end md:grid-cols-[minmax(0,1fr)_auto]">
            <Field label="Note">
              <Input id="offer-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Diwali sale" />
            </Field>
            <Button
              variant={previewIsFresh ? 'secondary' : 'primary'}
              onClick={runPreview}
              disabled={previewing || applying}
              className="h-11"
              startIcon={previewing ? <Loader2 className="animate-spin" /> : preview && !previewIsFresh ? <RefreshCw /> : <Eye />}
            >
              {previewing ? 'Loading...' : preview && !previewIsFresh ? 'Preview again' : 'Preview'}
            </Button>
          </FormGrid>

          {preview && !previewIsFresh && <Alert tone="warning">You changed the details — preview again before applying.</Alert>}
          {previewError && <Alert tone="danger">{previewError}</Alert>}
        </div>
      </Section>

      {data && (
        <Section
          title="Preview"
          description={`${formatDay(data.startDate)} to ${formatDay(data.endDate)}`}
          className={previewIsFresh ? '' : 'opacity-60'}
          actions={
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!canApply} startIcon={<Tag />}>
              Apply to {willGet} product{willGet === 1 ? '' : 's'}
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <PreviewChips
              chips={[
                { label: `Will get the offer: ${willGet}`, tone: 'green' },
                { label: `Skipped (already has an offer on these days): ${toNumber(data.skipped)}`, tone: 'gray' },
              ]}
            />
            <div className="max-h-[45vh] overflow-y-auto">
              <PricePreviewTable rows={rows} productsById={productsById} offer />
            </div>
          </div>
        </Section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runApply}
        loading={applying}
        tone="primary"
        icon={Tag}
        title="Save offer?"
        message={
          payload
            ? `${willGet} product${willGet === 1 ? '' : 's'} will get ${describeOffer(payload)} from ${formatDay(payload.startDate)} to ${formatDay(payload.endDate)}.`
            : ''
        }
        confirmLabel="Apply"
        loadingLabel="Applying..."
      />
    </div>
  );
}
