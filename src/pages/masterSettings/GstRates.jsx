import { useMemo, useState } from 'react';
import { AutoComplete, DatePicker, Input as AntInput } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, ArrowLeft, BadgePercent, Eye, History, Loader2, RefreshCw } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Tabs from '@/components/inputs/Tabs';
import { Label } from '@/components/inputs/Label';
import ConfirmDialog from '@/pages/storeManagement/products/components/ConfirmDialog';
import ToastStack from '@/pages/storeManagement/products/components/ToastStack';
import { getApiErrorMessage, useToasts } from '@/pages/storeManagement/products/utils/productUtils';
import { applyBulkTaxApi, previewBulkTaxApi } from './services/gstRateService';
import AntdThemed from './components/AntdThemed';
import ChangeHistory from './components/ChangeHistory';
import GstPreviewTable from './components/GstPreviewTable';
import ProductPicker from './components/ProductPicker';
import { FieldError, FieldHint } from './components/formBits';
import { GST_SLABS, formatDay, formatGst, parsePercent, toNumber } from './components/gstUtils';

const GST_OPTIONS = GST_SLABS.map((s) => ({ value: String(s), label: `${s}%` }));
const tomorrow = () => dayjs().add(1, 'day').startOf('day');

const TabLabel = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="w-4 h-4" />
    {children}
  </span>
);

const Chip = ({ tone, children }) => <span className={`px-2.5 py-1 rounded-full font-semibold ${tone}`}>{children}</span>;

/**
 * Master Settings → GST Rates. Two tabs so the page stays short:
 *  - Change GST: products, date, new GST %, note → preview → apply
 *  - GST history: one product's past and upcoming rates
 */
export default function GstRates() {
  const { toasts, showToast } = useToasts();
  const [tab, setTab] = useState('change');

  // ── Change GST ──
  const [products, setProducts] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(tomorrow);
  const [gstText, setGstText] = useState('');
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
    <AntdThemed>
      <Card
        h1="GST Rates"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-5 flex flex-col gap-4"
      >
        <Tabs
          tabs={[
            { value: 'change', label: <TabLabel icon={BadgePercent}>Change GST</TabLabel> },
            { value: 'history', label: <TabLabel icon={History}>GST history</TabLabel> },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {/* both tabs stay mounted so switching keeps what was typed */}
        <div className={tab === 'change' ? 'flex flex-col gap-4' : 'hidden'}>
          <div>
            <Label htmlFor="gst-products">
              Products <span className="text-rose-500">*</span>
            </Label>
            <ProductPicker
              id="gst-products"
              multiple
              value={products}
              onChange={setProducts}
              invalid={!!shownError('products')}
              placeholder="Search by name, SKU or barcode — pick one or many"
            />
            <FieldError>{shownError('products')}</FieldError>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[200px_200px_minmax(0,1fr)_auto] gap-3 items-start">
            <div>
              <Label htmlFor="gst-effective-from">
                Applicable from <span className="text-rose-500">*</span>
              </Label>
              <DatePicker
                id="gst-effective-from"
                size="large"
                value={effectiveFrom}
                onChange={setEffectiveFrom}
                format="DD MMM YYYY"
                allowClear={false}
                inputReadOnly
                status={shownError('effectiveFrom') ? 'error' : undefined}
                className="w-full"
              />
              <FieldError>{shownError('effectiveFrom')}</FieldError>
              {!shownError('effectiveFrom') && startsTodayOrEarlier && <FieldHint>Applies right away.</FieldHint>}
            </div>

            <div>
              <Label htmlFor="gst-rate">
                New GST % <span className="text-rose-500">*</span>
              </Label>
              <AutoComplete
                id="gst-rate"
                size="large"
                value={gstText}
                onChange={(v) => setGstText(v ?? '')}
                options={GST_OPTIONS}
                placeholder="Slab or e.g. 12"
                allowClear
                status={shownError('gst', gstText !== '') ? 'error' : undefined}
                className="w-full"
              />
              <FieldError>{shownError('gst', gstText !== '')}</FieldError>
            </div>

            <div>
              <Label htmlFor="gst-note">Note</Label>
              <AntInput
                id="gst-note"
                size="large"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="e.g. GST council notification, 22 Sep 2026"
              />
            </div>

            <div className="flex flex-col">
              <span className="hidden lg:block text-sm mb-1.5 invisible" aria-hidden="true">
                Preview
              </span>
              <Button
                onClick={runPreview}
                disabled={previewing || applying}
                startIcon={
                  previewing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : preview && !previewIsFresh ? (
                    <RefreshCw className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )
                }
              >
                {previewing ? 'Loading...' : preview && !previewIsFresh ? 'Preview again' : 'Preview'}
              </Button>
            </div>
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
            <div className={`flex flex-col gap-3 border-t border-[var(--vs-border)] pt-4 ${previewIsFresh ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-sm font-bold text-[var(--vs-text-primary)]">Preview</span>
                  {applyDay && <span className="text-[var(--vs-text-secondary)] mr-1">bills from {applyDay}</span>}
                  <Chip tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">New rate: {willChange}</Chip>
                  <Chip tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">GST changes: {changedCount}</Chip>
                  <Chip tone="bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">Skipped: {toNumber(data.skipped)}</Chip>
                  {blockedRows.length > 0 && <Chip tone="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">Above MRP: {blockedRows.length}</Chip>}
                  {lowProfitRows.length > 0 && <Chip tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Profit 0: {lowProfitRows.length}</Chip>}
                </div>
                <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!canApply} startIcon={<BadgePercent className="w-3.5 h-3.5" />}>
                  Apply to {willChange} product{willChange === 1 ? '' : 's'}
                </Button>
              </div>
              {blockedRows.length > 0 && (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    With GST {gst.value}% the price becomes more than the MRP for {blockedRows.length} product{blockedRows.length === 1 ? '' : 's'} (
                    {blockedRows.slice(0, 3).map((r) => r.name).join(', ')}
                    {blockedRows.length > 3 ? '…' : ''}). Change their selling price / MRP first, or remove them — nothing was saved.
                  </span>
                </div>
              )}
              <div className="max-h-[45vh] overflow-y-auto rounded-xl">
                <GstPreviewTable rows={rows} productsById={productsById} />
              </div>
            </div>
          )}
        </div>

        <div className={tab === 'history' ? 'flex flex-col gap-4' : 'hidden'}>
          <ChangeHistory kind="gst" notify={showToast} reloadKey={historyReloadKey} />
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runApply}
        isLoading={applying}
        title="Apply new GST?"
        message={
          payload ? (
            <div className="flex flex-col gap-2 text-left">
              <p className="m-0">
                {willChange} product{willChange === 1 ? '' : 's'} will get GST {formatGst(payload.gstRate, 0)} from {formatDay(payload.effectiveFrom)}. Bills already saved
                are not changed.
              </p>
              {lowProfitRows.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <p className="m-0 font-bold">Profit becomes ₹0 for {lowProfitRows.length} product{lowProfitRows.length === 1 ? '' : 's'}:</p>
                  <ul className="m-0 mt-1 pl-4 list-disc max-h-40 overflow-y-auto">
                    {lowProfitRows.map((r) => (
                      <li key={r.productId}>
                        {r.name}: SP ₹{r.sellingPriceIncl} = cost ₹{r.costIncl} incl. GST (MRP ₹{r.mrp ?? '—'}) — {r.warning}
                      </li>
                    ))}
                  </ul>
                  <p className="m-0 mt-1">Apply anyway?</p>
                </div>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmText={lowProfitRows.length > 0 ? 'Yes, apply' : 'Apply'}
        loadingText="Applying..."
      />

      <ToastStack toasts={toasts} />
    </AntdThemed>
  );
}
