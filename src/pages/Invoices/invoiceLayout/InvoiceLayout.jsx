import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Store, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import Card from '@/components/breadCrumbs/Card';
import Switch from '@/components/inputs/Switch';
import { Label } from '@/components/inputs/Label';
import Button from '@/components/inputs/Button';
import Loader from '@/components/loader/Loader';
import ThemeCard, { THEMES } from './components/ThemeCard';
import BrandingSection from './components/BrandingSection';
import InvoiceTemplateRenderer from './components/InvoiceTemplateRenderer';
import {
  fetchInvoiceLayout,
  updateInvoiceLayout,
  clearLayoutErrors,
  DEFAULT_INVOICE_LAYOUT,
} from './services/invoiceLayoutSlice';

export default function InvoiceLayout() {
  const dispatch = useDispatch();
  const { layout, loading, saving, error, saveError, success, successMessage } =
    useSelector((state) => state.invoiceLayout);
  const authUser = useSelector((state) => state.auth?.user);
  const businessName = authUser?.businessName || authUser?.business?.businessName || 'Patel industries';

  const [toasts, setToasts] = useState([]);

  // Local form state mirror for instantaneous reactive rendering
  const [formData, setFormData] = useState(DEFAULT_INVOICE_LAYOUT);

  const showToast = (message, color = 'success') => {
    if (!message) return;
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    dispatch(fetchInvoiceLayout());
    return () => {
      dispatch(clearLayoutErrors());
    };
  }, [dispatch]);

  useEffect(() => {
    if (layout) {
      setFormData(layout);
    }
  }, [layout]);

  useEffect(() => {
    if (error) {
      showToast(error, 'danger');
      dispatch(clearLayoutErrors());
    }
  }, [error, dispatch]);

  const handleSave = async () => {
    try {
      const resultAction = await dispatch(updateInvoiceLayout(formData));
      if (updateInvoiceLayout.fulfilled.match(resultAction)) {
        const msg = resultAction.payload?.message || 'Invoice layout updated successfully';
        showToast(msg, 'success');
      } else if (updateInvoiceLayout.rejected.match(resultAction)) {
        const errMsg = resultAction.payload || 'Failed to update invoice layout';
        showToast(errMsg, 'danger');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to update invoice layout', 'danger');
    }
  };

  // Helper updater
  const updateField = (path, value) => {
    setFormData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  // Live sample computation for numbering format
  const computeLiveSample = () => {
    const template = formData.numberingFormat?.template || '{PREFIX}/{FYSHORT}/{SEQ}';
    const prefix = formData.numberingFormat?.prefixPerSeries?.INV || 'INV';
    const padding = formData.numberingFormat?.zeroPadding || 5;
    const seqStr = String(42).padStart(padding, '0');
    return template
      .replace('{PREFIX}', prefix)
      .replace('{FY}', '2026-2027')
      .replace('{FYSHORT}', '2026-27')
      .replace('{SEQ}', seqStr);
  };

  // Show Loader inside Card whenever fetching layout is in pending state
  if (loading) {
    return (
      <div className="w-full min-h-screen pb-12">
        <Card
          title="Invoice settings"
          description="How your invoices look, and how they are numbered. The preview on the right is exactly what prints — it is the same layout, not a copy of it."
          rightNode={
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              PARTNERS MODULE
            </span>
          }
          bodyClassName="p-16 flex items-center justify-center min-h-[420px]"
        >
          <Loader />
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-12">
      {/* Toast Notification Container */}
      <CToaster className="p-3" style={{ zIndex: 99999, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
            <div className="d-flex">
              <CToastBody className="flex items-center gap-2 font-semibold">
                {t.color === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-white shrink-0" />
                )}
                <span>{t.message}</span>
              </CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>

      {/* ── 1. WHOLE INVOICE SETTINGS WRAPPED IN CARD ── */}
      <Card
        title="Invoice settings"
        description="How your invoices look, and how they are numbered. The preview on the right is exactly what prints — it is the same layout, not a copy of it."
        rightNode={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
            <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            PARTNERS MODULE
          </span>
        }
        bodyClassName="p-3 sm:p-4"
      >
        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* ── LEFT COLUMN: Configuration Sections ── */}
          <div className="lg:col-span-6 space-y-4">
            {/* 1. THEME SECTION WRAPPED IN CARD */}
            <Card title="Theme" bodyClassName="p-3.5 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {THEMES.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isSelected={formData.theme === theme.id}
                    onClick={() => updateField('theme', theme.id)}
                  />
                ))}
              </div>
            </Card>

            {/* 2. BRANDING SECTION WRAPPED IN CARD */}
            <Card title="Branding" bodyClassName="p-4 sm:p-5">
              <BrandingSection
                accentColor={formData.branding?.accentColor}
                onChangeAccentColor={(val) => updateField('branding.accentColor', val)}
                logo={formData.branding?.logo}
                onChangeLogo={(val) => updateField('branding.logo', val)}
                signature={formData.branding?.signature}
                onChangeSignature={(val) => updateField('branding.signature', val)}
              />
            </Card>

            {/* 3. WHAT SHOWS ON THE DOCUMENT WRAPPED IN CARD */}
            <Card title="What shows on the document" bodyClassName="p-4 sm:p-5">
              <div className="space-y-4 divide-y divide-gray-100 dark:divide-white/5">
                <div className="flex items-center justify-between pt-2 first:pt-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    HSN code column
                  </span>
                  <Switch
                    size="sm"
                    checked={formData.documentVisibility?.showHsn === true}
                    onChange={(val) => updateField('documentVisibility.showHsn', val)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    Discount column
                  </span>
                  <Switch
                    size="sm"
                    checked={formData.documentVisibility?.showDiscount === true}
                    onChange={(val) => updateField('documentVisibility.showDiscount', val)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    Tax breakup (CGST/SGST/IGST split)
                  </span>
                  <Switch
                    size="sm"
                    checked={formData.documentVisibility?.showTaxBreakup === true}
                    onChange={(val) => updateField('documentVisibility.showTaxBreakup', val)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    UPI payment QR
                  </span>
                  <Switch
                    size="sm"
                    checked={formData.documentVisibility?.showUpiQr === true}
                    onChange={(val) => updateField('documentVisibility.showUpiQr', val)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    Signature
                  </span>
                  <Switch
                    size="sm"
                    checked={formData.documentVisibility?.showSignature === true}
                    onChange={(val) => updateField('documentVisibility.showSignature', val)}
                  />
                </div>
              </div>
            </Card>

            {/* 4. ORDER BILLING AUTOMATION WRAPPED IN CARD */}
            <Card
              title="Order billing automation"

              description="What happens automatically when an order is handed over. Both are on by default — turn either off to raise the bill or record the payment yourself instead."
              bodyClassName="p-4 sm:p-5"
            >
              <div className="space-y-4 divide-y divide-gray-100 dark:divide-white/5">
                <div className="flex items-start justify-between gap-4 pt-2 first:pt-0">
                  <div className="pr-4">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Auto-raise the invoice when an order is delivered
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      Raises and issues the tax invoice the moment an order is handed over, against that order. Off — you raise the bill by hand from the order.
                    </p>
                  </div>
                  <div className="pt-0.5 shrink-0">
                    <Switch
                      size="sm"
                      checked={formData.orderAutomation?.autoRaiseInvoiceOnDelivery === true}
                      onChange={(val) => updateField('orderAutomation.autoRaiseInvoiceOnDelivery', val)}
                    />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="pr-4">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Auto-record payment as received for cash/COD orders on delivery
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      For cash-on-delivery orders only — records the receipt against that invoice at the same moment, so it shows settled straight away. A credit or online-paid order is never touched by this.
                    </p>
                  </div>
                  <div className="pt-0.5 shrink-0">
                    <Switch
                      size="sm"
                      checked={formData.orderAutomation?.autoRecordCashPaymentOnDelivery === true}
                      onChange={(val) =>
                        updateField('orderAutomation.autoRecordCashPaymentOnDelivery', val)
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 5. NUMBERING FORMAT WRAPPED IN CARD */}
            <Card title="Numbering format" bodyClassName="p-4 sm:p-5 space-y-4">
              {/* Template input */}
              <div>
                <Label>Template</Label>
                <input
                  type="text"
                  value={formData.numberingFormat?.template || ''}
                  onChange={(e) => updateField('numberingFormat.template', e.target.value)}
                  placeholder="{PREFIX}/{FYSHORT}/{SEQ}"
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="block text-[11px] text-gray-400 mt-1">
                  Tokens: <span className="font-mono">{'{PREFIX}'} {'{FY}'} {'{FYSHORT}'} {'{SEQ}'}</span>
                </span>
              </div>

              {/* Zero padding */}
              <div className="w-32">
                <Label>Zero-padding</Label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.numberingFormat?.zeroPadding || 5}
                  onChange={(e) => updateField('numberingFormat.zeroPadding', parseInt(e.target.value) || 5)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Live sample indicator */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Live sample (invoice series):{' '}
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {computeLiveSample()}
                </span>
              </div>

              {/* Prefix per series */}
              <div>
                <Label>PREFIX PER SERIES</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {['INV', 'QT', 'PI', 'DC', 'CN', 'SR', 'PUR', 'PO', 'DN'].map((series) => (
                    <div key={series}>
                      <span className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        {series}
                      </span>
                      <input
                        type="text"
                        value={formData.numberingFormat?.prefixPerSeries?.[series] || ''}
                        onChange={(e) =>
                          updateField(`numberingFormat.prefixPerSeries.${series}`, e.target.value)
                        }
                        className="w-full text-xs font-mono uppercase px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* 6. BANK DETAILS WRAPPED IN CARD */}
            <Card title="Bank details" bodyClassName="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label>Account name</Label>
                  <input
                    type="text"
                    value={formData.bankDetails?.accountName || ''}
                    onChange={(e) => updateField('bankDetails.accountName', e.target.value)}
                    placeholder="Himanshu jangis"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <Label>Account number</Label>
                  <input
                    type="text"
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => updateField('bankDetails.accountNumber', e.target.value)}
                    placeholder="6784947474784"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <Label>IFSC</Label>
                  <input
                    type="text"
                    value={formData.bankDetails?.ifsc || ''}
                    onChange={(e) => updateField('bankDetails.ifsc', e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <Label>UPI ID</Label>
                  <input
                    type="text"
                    value={formData.bankDetails?.upiId || ''}
                    onChange={(e) => updateField('bankDetails.upiId', e.target.value)}
                    placeholder="7073083470@ybl"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    name@bank — builds the dynamic QR
                  </span>
                </div>
              </div>
            </Card>

            {/* 7. TERMS & NOTES WRAPPED IN CARD */}
            <Card title="Terms & notes" bodyClassName="p-4 sm:p-5 space-y-4">
              <div>
                <Label>Terms</Label>
                <textarea
                  rows={3}
                  value={formData.terms || ''}
                  onChange={(e) => updateField('terms', e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>
            </Card>

            {/* 8. SAVE CHANGES BUTTON USING <Button> COMPONENT */}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={saving}
                startIcon={
                  saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )
                }
              >
                {saving ? 'Saving changes...' : 'Save changes'}
              </Button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: SCROLLABLE LIVE PREVIEW IN CARD ── */}
          <div className="lg:col-span-6 lg:sticky lg:top-6">
            <Card
              title="LIVE PREVIEW"
              titleClassName="!text-xs font-bold uppercase tracking-wider text-gray-400"
              bodyClassName="p-2 sm:p-2.5"
            >
              {/* Scrollable Container */}
              <div className="max-h-[calc(100vh-210px)] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 rounded-xl">
                <InvoiceTemplateRenderer layout={formData} businessName={businessName} />
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
