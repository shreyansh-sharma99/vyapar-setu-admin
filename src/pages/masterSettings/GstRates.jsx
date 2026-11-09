import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft, BadgePercent, Eye, History, Loader2, RefreshCw } from 'lucide-react';
import {
  Alert, Button, DatePicker, Field, FormGrid, Input, Label, Modal, PageHeader, Section, Segmented, Select, ToastStack,
} from '@/components/ui';
import { getApiErrorMessage, useToasts } from '@/pages/storeManagement/products/utils/productUtils';
import { applyBulkTaxApi, previewBulkTaxApi } from './services/gstRateService';
import ChangeHistory from './components/ChangeHistory';
import GstPreviewTable from './components/GstPreviewTable';
import ProductPicker from './components/ProductPicker';
import { PreviewChips } from './components/formBits';
import { formatDay, formatGst, parsePercent, toNumber } from './components/gstUtils';
import useGstRates from './components/useGstRates';

const tomorrow = () => dayjs().add(1, 'day').startOf('day');

/**
 * Master Settings → GST Rates. Two tabs so the page stays short:
 *  - Change GST: products, date, new GST %, note → preview → apply
 *  - GST history: one product's past and upcoming rates
 */
export default function GstRates() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts();
  const [tab, setTab] = useState('change');

  // ── Change GST ──
  const [products, setProducts] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(tomorrow);
  const [gstText, setGstText] = useState('');
  // the platform's GST rates (Admin Owner → Settings → GST Rates)
  const { options: gstOptions, loading: gstLoading } = useGstRates();
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  const [preview, setPreview] = useState(null); // { key, data }
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // ── GST history ──
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  const gst = parsePercent(gstText, { required: true, label: 'GST %' });

  const errors = {
    products: products.length ? '' : 'Choose at least one product.',
    effectiveFrom: effectiveFrom ? '' : 'Choose the date this rate applies from.',
    gst: gst.error,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  // Typed-in mistakes show right away; "missing" errors only after a Preview attempt.
  const shownError = (field, typed) => (attempted || typed ? errors[field] : '');

  const payload = hasErrors
    ? null
    : {
        filter: { productIds: products.map((p) => p._id) },
        effectiveFrom: dayjs(effectiveFrom).format('YYYY-MM-DD'),
        gstRate: gst.value,
        cessRate: 0,
        note: note.trim(),
      };

  const payloadKey = payload ? JSON.stringify(payload) : '';
  const previewIsFresh = !!preview && preview.key === payloadKey;
  const data = preview?.data || null;
  const willChange = toNumber(data?.count);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  // Price / cost above MRP with the new GST: nothing is sent to the server.
  const blockedRows = rows.filter((r) => r.error);
  // Profit 0 (or a loss): asked in the confirm pop-up first.
  const lowProfitRows = rows.filter((r) => r.warning);
  const canApply = previewIsFresh && willChange > 0 && !applying && blockedRows.length === 0;
  const changedCount = rows.filter((r) => !r.skip && r.changed).length;

  const productsById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[String(p._id)] = p;
    });
    return map;
  }, [products]);

  const startsTodayOrEarlier = effectiveFrom && !dayjs(effectiveFrom).isAfter(dayjs(), 'day');
  const applyDay = data?.effectiveFrom ? formatDay(data.effectiveFrom) : payload ? formatDay(payload.effectiveFrom) : '';

  const resetForm = () => {
    setProducts([]);
    setEffectiveFrom(tomorrow());
    setGstText('');
    setNote('');
    setAttempted(false);
    setPreview(null);
    setPreviewError('');
  };

  const runPreview = async () => {
    setAttempted(true);
    if (!payload) return;
    const key = payloadKey;
    setPreviewing(true);
    setPreviewError('');
    try {
      const res = await previewBulkTaxApi(payload);
      setPreview({ key, data: res?.data || null });
    } catch (err) {
      const message = await getApiErrorMessage(err, 'Could not preview the GST change');
      setPreview(null);
      setPreviewError(message);
      showToast(message, 'danger');
    } finally {
      setPreviewing(false);
    }
  };

  const runApply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const res = await applyBulkTaxApi({ ...payload, acceptLowProfit: lowProfitRows.length > 0 });
      const count = toNumber(res?.data?.count);
      showToast(res?.message || `New GST saved for ${count} product${count === 1 ? '' : 's'}.`, 'success');
      const touchedIds = rows.filter((r) => !r.skip).map((r) => String(r.productId));
      if (touchedIds.length) setHistoryReloadKey((k) => k + 1);
      setConfirmOpen(false);
      resetForm();
    } catch (err) {
      const message = await getApiErrorMessage(err, 'Could not apply the GST change');
      setConfirmOpen(false);
      setPreviewError(message);
      showToast(message, 'danger');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="GST Rates"
        description="Change the GST of one or many products from a date. Bills dated before the change keep the old rate."
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="overflow-x-auto">
        <Segmented
          aria-label="GST rates view"
          options={[
            { value: 'change', label: 'Change GST', icon: BadgePercent },
            { value: 'history', label: 'GST history', icon: History },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* both tabs stay mounted so switching keeps what was typed */}
      <div className={tab === 'change' ? 'flex flex-col gap-5' : 'hidden'}>
        <Section title="Change GST" description="Pick the products, the date and the new slab, then preview.">
          <div className="flex flex-col gap-4">
            <Field label="Products" required error={shownError('products')}>
              <ProductPicker
                id="gst-products"
                multiple
                value={products}
                onChange={setProducts}
                invalid={!!shownError('products')}
                placeholder="Search by name, SKU or barcode — pick one or many"
              />
            </Field>

            <FormGrid cols={4} className="items-start lg:grid-cols-[200px_200px_minmax(0,1fr)_auto]">
              <Field
                label="Applicable from"
                required
                error={shownError('effectiveFrom')}
                hint={startsTodayOrEarlier ? 'Applies right away.' : undefined}
              >
                <DatePicker
                  id="gst-effective-from"
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  allowClear={false}
                  inputReadOnly
                  invalid={!!shownError('effectiveFrom')}
                />
              </Field>

              <Field label="New GST %" required error={shownError('gst', gstText !== '')}>
                <Select
                  id="gst-rate"
                  value={gstText === '' ? undefined : gstText}
                  onChange={(v) => setGstText(v ?? '')}
                  options={gstOptions}
                  placeholder={gstLoading ? 'Loading GST rates…' : 'Choose a GST rate'}
                  searchable={false}
                  clearable
                  invalid={!!shownError('gst', gstText !== '')}
                />
              </Field>

              <Field label="Note">
                <Input
                  id="gst-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. GST council notification, 22 Sep 2026"
                />
              </Field>

              <div className="flex flex-col">
                <Label aria-hidden="true" className="invisible hidden lg:block">
                  Preview
                </Label>
                <Button
                  variant={previewIsFresh ? 'secondary' : 'primary'}
                  onClick={runPreview}
                  disabled={previewing || applying}
                  className="h-11"
                  startIcon={previewing ? <Loader2 className="animate-spin" /> : preview && !previewIsFresh ? <RefreshCw /> : <Eye />}
                >
                  {previewing ? 'Loading...' : preview && !previewIsFresh ? 'Preview again' : 'Preview'}
                </Button>
              </div>
            </FormGrid>

            {preview && !previewIsFresh && <Alert tone="warning">You changed the details — preview again before applying.</Alert>}
            {previewError && <Alert tone="danger">{previewError}</Alert>}
          </div>
        </Section>

        {data && (
          <Section
            title="Preview"
            description={applyDay ? `Bills from ${applyDay}` : undefined}
            className={previewIsFresh ? '' : 'opacity-60'}
            actions={
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!canApply} startIcon={<BadgePercent />}>
                Apply to {willChange} product{willChange === 1 ? '' : 's'}
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              <PreviewChips
                chips={[
                  { label: `New rate: ${willChange}`, tone: 'green' },
                  { label: `GST changes: ${changedCount}`, tone: 'amber' },
                  { label: `Skipped: ${toNumber(data.skipped)}`, tone: 'gray' },
                  ...(blockedRows.length > 0 ? [{ label: `Above MRP: ${blockedRows.length}`, tone: 'red' }] : []),
                  ...(lowProfitRows.length > 0 ? [{ label: `Profit 0: ${lowProfitRows.length}`, tone: 'amber' }] : []),
                ]}
              />
              {blockedRows.length > 0 && (
                <Alert tone="danger">
                  With GST {gst.value}% the price becomes more than the MRP for {blockedRows.length} product{blockedRows.length === 1 ? '' : 's'} (
                  {blockedRows.slice(0, 3).map((r) => r.name).join(', ')}
                  {blockedRows.length > 3 ? '…' : ''}). Change their selling price / MRP first, or remove them — nothing was saved.
                </Alert>
              )}
              <div className="max-h-[45vh] overflow-y-auto">
                <GstPreviewTable rows={rows} productsById={productsById} />
              </div>
            </div>
          </Section>
        )}
      </div>

      <div className={tab === 'history' ? 'flex flex-col gap-4' : 'hidden'}>
        <ChangeHistory kind="gst" notify={showToast} reloadKey={historyReloadKey} />
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!applying) setConfirmOpen(false);
        }}
        closeOnBackdrop={!applying}
        title="Apply new GST?"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={runApply} loading={applying}>
              {applying ? 'Applying...' : lowProfitRows.length > 0 ? 'Yes, apply' : 'Apply'}
            </Button>
          </>
        }
      >
        {payload && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="m-0 text-ink-muted">
              <span className="font-semibold text-ink">
                {willChange} product{willChange === 1 ? '' : 's'}
              </span>{' '}
              will get GST <span className="font-semibold tabular-nums text-ink">{formatGst(payload.gstRate, 0)}</span> from{' '}
              <span className="font-semibold text-ink">{formatDay(payload.effectiveFrom)}</span>. Bills already saved are not changed.
            </p>
            {lowProfitRows.length > 0 && (
              <Alert tone="warning" title={`Profit becomes ₹0 for ${lowProfitRows.length} product${lowProfitRows.length === 1 ? '' : 's'}:`}>
                <ul className="m-0 mt-1 max-h-40 list-disc overflow-y-auto pl-4 tabular-nums">
                  {lowProfitRows.map((r) => (
                    <li key={r.productId}>
                      {r.name}: SP ₹{r.sellingPriceIncl} = cost ₹{r.costIncl} incl. GST (MRP ₹{r.mrp ?? '—'}) — {r.warning}
                    </li>
                  ))}
                </ul>
                <p className="m-0 mt-1 font-semibold">Apply anyway?</p>
              </Alert>
            )}
          </div>
        )}
      </Modal>

      <ToastStack toasts={toasts} />
    </div>
  );
}
