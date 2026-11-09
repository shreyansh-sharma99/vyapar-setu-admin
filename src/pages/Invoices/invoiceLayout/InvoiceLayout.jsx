import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Store, Save } from 'lucide-react';
import {
  Badge,
  Button,
  DetailList,
  Field,
  FormActions,
  FormGrid,
  Input,
  Label,
  PageHeader,
  Section,
  SettingRow,
  SkeletonRows,
  Switch,
  Textarea,
  ToastStack,
} from '@/components/ui';
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

  const header = (
    <PageHeader
      title="Invoice settings"
      description="How your invoices look, and how they are numbered. The preview on the right is exactly what prints — it is the same layout, not a copy of it."
      actions={<Badge tone="warning" size="md" icon={Store}>Partners module</Badge>}
    />
  );

  // Show a placeholder whenever fetching layout is in pending state
  if (loading) {
    return (
      <div className="flex flex-col gap-5 pb-12">
        {header}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <Section title="Theme" className="lg:col-span-6">
            <SkeletonRows rows={6} cols={3} />
          </Section>
          <Section title="Live preview" className="lg:col-span-6">
            <SkeletonRows rows={8} cols={2} />
          </Section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Toast Notification Container */}
      <ToastStack toasts={toasts} />

      {header}

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* ── LEFT COLUMN: Configuration Sections ── */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-6">
          {/* 1. THEME */}
          <Section title="Theme" description="Pick the layout your invoices print in">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={formData.theme === theme.id}
                  onClick={() => updateField('theme', theme.id)}
                />
              ))}
            </div>
          </Section>

          {/* 2. BRANDING */}
          <Section title="Branding" description="Colour, logo and signature on the document">
            <BrandingSection
              accentColor={formData.branding?.accentColor}
              onChangeAccentColor={(val) => updateField('branding.accentColor', val)}
              logo={formData.branding?.logo}
              onChangeLogo={(val) => updateField('branding.logo', val)}
              signature={formData.branding?.signature}
              onChangeSignature={(val) => updateField('branding.signature', val)}
            />
          </Section>

          {/* 3. WHAT SHOWS ON THE DOCUMENT */}
          <Section title="What shows on the document">
            <SettingRow title="HSN code column">
              <Switch
                size="sm"
                checked={formData.documentVisibility?.showHsn === true}
                onChange={(val) => updateField('documentVisibility.showHsn', val)}
              />
            </SettingRow>
            <SettingRow title="Discount column">
              <Switch
                size="sm"
                checked={formData.documentVisibility?.showDiscount === true}
                onChange={(val) => updateField('documentVisibility.showDiscount', val)}
              />
            </SettingRow>
            <SettingRow title="Tax breakup (CGST/SGST/IGST split)">
              <Switch
                size="sm"
                checked={formData.documentVisibility?.showTaxBreakup === true}
                onChange={(val) => updateField('documentVisibility.showTaxBreakup', val)}
              />
            </SettingRow>
            <SettingRow title="UPI payment QR">
              <Switch
                size="sm"
                checked={formData.documentVisibility?.showUpiQr === true}
                onChange={(val) => updateField('documentVisibility.showUpiQr', val)}
              />
            </SettingRow>
            <SettingRow title="Signature">
              <Switch
                size="sm"
                checked={formData.documentVisibility?.showSignature === true}
                onChange={(val) => updateField('documentVisibility.showSignature', val)}
              />
            </SettingRow>
          </Section>

          {/* 4. ORDER BILLING AUTOMATION */}
          <Section title="Order billing automation">
            <p className="m-0 mb-4 text-[13px] leading-relaxed text-ink-muted">
              What happens automatically when an order is handed over. Both are on by default — turn either off to raise the bill or record the payment yourself instead.
            </p>
            <SettingRow
              title="Auto-raise the invoice when an order is delivered"
              description="Raises and issues the tax invoice the moment an order is handed over, against that order. Off — you raise the bill by hand from the order."
            >
              <Switch
                size="sm"
                checked={formData.orderAutomation?.autoRaiseInvoiceOnDelivery === true}
                onChange={(val) => updateField('orderAutomation.autoRaiseInvoiceOnDelivery', val)}
              />
            </SettingRow>
            <SettingRow
              title="Auto-record payment as received for cash/COD orders on delivery"
              description="For cash-on-delivery orders only — records the receipt against that invoice at the same moment, so it shows settled straight away. A credit or online-paid order is never touched by this."
            >
              <Switch
                size="sm"
                checked={formData.orderAutomation?.autoRecordCashPaymentOnDelivery === true}
                onChange={(val) =>
                  updateField('orderAutomation.autoRecordCashPaymentOnDelivery', val)
                }
              />
            </SettingRow>
          </Section>

          {/* 5. NUMBERING FORMAT */}
          <Section title="Numbering format" bodyClassName="flex flex-col gap-4">
            <FormGrid cols={3}>
              <Field
                label="Template"
                className="md:col-span-1 lg:col-span-2"
                hint={<>Tokens: <span className="font-mono">{'{PREFIX}'} {'{FY}'} {'{FYSHORT}'} {'{SEQ}'}</span></>}
              >
                <Input
                  value={formData.numberingFormat?.template || ''}
                  onChange={(e) => updateField('numberingFormat.template', e.target.value)}
                  placeholder="{PREFIX}/{FYSHORT}/{SEQ}"
                  className="font-mono"
                />
              </Field>

              <Field label="Zero-padding">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.numberingFormat?.zeroPadding || 5}
                  onChange={(e) => updateField('numberingFormat.zeroPadding', parseInt(e.target.value) || 5)}
                  className="font-mono tabular-nums"
                />
              </Field>
            </FormGrid>

            {/* Live sample */}
            <div className="rounded-control bg-fill-2 px-4 py-3">
              <DetailList
                cols={1}
                items={[{ label: 'Live sample (invoice series)', value: computeLiveSample(), mono: true, tone: 'brand' }]}
              />
            </div>

            {/* Prefix per series */}
            <div>
              <Label>Prefix per series</Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {['INV', 'QT', 'PI', 'DC', 'CN', 'SR', 'PUR', 'PO', 'DN'].map((series) => (
                  <div key={series} className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-ink-subtle">{series}</span>
                    <Input
                      size="sm"
                      aria-label={`${series} prefix`}
                      value={formData.numberingFormat?.prefixPerSeries?.[series] || ''}
                      onChange={(e) =>
                        updateField(`numberingFormat.prefixPerSeries.${series}`, e.target.value)
                      }
                      className="font-mono uppercase"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 6. BANK DETAILS */}
          <Section title="Bank details">
            <FormGrid cols={2}>
              <Field label="Account name">
                <Input
                  value={formData.bankDetails?.accountName || ''}
                  onChange={(e) => updateField('bankDetails.accountName', e.target.value)}
                  placeholder="Himanshu jangis"
                />
              </Field>

              <Field label="Account number">
                <Input
                  value={formData.bankDetails?.accountNumber || ''}
                  onChange={(e) => updateField('bankDetails.accountNumber', e.target.value)}
                  placeholder="6784947474784"
                  className="font-mono"
                />
              </Field>

              <Field label="IFSC">
                <Input
                  value={formData.bankDetails?.ifsc || ''}
                  onChange={(e) => updateField('bankDetails.ifsc', e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  className="font-mono uppercase"
                />
              </Field>

              <Field label="UPI ID" hint="name@bank — builds the dynamic QR">
                <Input
                  value={formData.bankDetails?.upiId || ''}
                  onChange={(e) => updateField('bankDetails.upiId', e.target.value)}
                  placeholder="7073083470@ybl"
                />
              </Field>
            </FormGrid>
          </Section>

          {/* 7. TERMS & NOTES */}
          <Section title="Terms & notes" bodyClassName="flex flex-col gap-4">
            <Field label="Terms">
              <Textarea
                rows={3}
                value={formData.terms || ''}
                onChange={(e) => updateField('terms', e.target.value)}
              />
            </Field>

            <Field label="Notes">
              <Textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </Field>
          </Section>

          {/* 8. SAVE CHANGES */}
          <FormActions>
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              startIcon={<Save className="size-4" />}
            >
              {saving ? 'Saving changes...' : 'Save changes'}
            </Button>
          </FormActions>
        </div>

        {/* ── RIGHT COLUMN: SCROLLABLE LIVE PREVIEW ── */}
        <div className="min-w-0 lg:sticky lg:top-6 lg:col-span-6">
          <Section title="Live preview" description="Updates as you change settings" bodyClassName="px-2 pb-2 pt-3 sm:px-2.5 sm:pb-2.5">
            {/* Scrollable Container */}
            <div className="max-h-[calc(100vh-210px)] overflow-y-auto overflow-x-hidden rounded-control pr-1">
              <InvoiceTemplateRenderer layout={formData} businessName={businessName} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
