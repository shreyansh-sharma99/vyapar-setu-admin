import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Save } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DetailList,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Section,
  Segmented,
  Select,
  SettingRow,
  SkeletonRows,
  Switch,
  Textarea,
} from '@/components/ui';
import {
  fetchGeneralInvoiceSettings,
  updateGeneralInvoiceSettings,
  clearErrors,
} from './services/generalInvoiceSettingSlice';

const DOC_TYPES = [
  { key: 'salesInvoice', label: 'Sales Invoice' },
  { key: 'salesReturn', label: 'Sales Return' },
  { key: 'creditNote', label: 'Credit Note' },
  { key: 'paymentReceipt', label: 'Payment Receipt' },
];

const FINANCIAL_YEAR_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'YYYY-YY', label: 'YYYY-YY (Dynamic)' },
  { value: 'YY-YY', label: 'YY-YY (Dynamic Short)' },
  { value: '2024-25', label: '2024-25' },
  { value: '2025-26', label: '2025-26' },
  { value: '2026-27', label: '2026-27' },
  { value: '2027-28', label: '2027-28' },
  { value: '2028-29', label: '2028-29' },
  { value: '2029-30', label: '2029-30' },
  { value: '2030-31', label: '2030-31' },
  { value: '2031-32', label: '2031-32' },
  { value: '2032-33', label: '2032-33' },
  { value: '2033-34', label: '2033-34' },
  { value: '2034-35', label: '2034-35' },
  { value: '2035-36', label: '2035-36' },
];

const INITIAL_FORM_STATE = {
  prefix: 'INV-',
  suffix: '',
  financialYearFormat: 'YYYY-YY',
  seriesStartsFrom: 1,
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  dueDays: 15,
  defaultTerms: '',
  defaultNotes: '',
  showAuthorizedSignatory: true,
  bankDetails: {
    accountName: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    branch: '',
  },
  numberingConfig: {
    salesInvoice: { prefix: 'INV-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    salesReturn: { prefix: 'SR-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    creditNote: { prefix: 'CN-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    paymentReceipt: { prefix: 'PR-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
  },
};

export default function GeneralInvoiceSetting() {
  const dispatch = useDispatch();
  const { settings, loading, saving, error, saveError, success, successMessage } = useSelector(
    (state) => state.generalInvoiceSetting
  );

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'numbering' | 'sequences'
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [selectedDocType, setSelectedDocType] = useState('salesInvoice');
  const [localSuccessMsg, setLocalSuccessMsg] = useState('');

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchGeneralInvoiceSettings());
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Populate form state when settings arrive
  useEffect(() => {
    if (settings) {
      setFormData({
        prefix: settings.prefix ?? 'INV-',
        suffix: settings.suffix ?? '',
        financialYearFormat: settings.financialYearFormat ?? 'YYYY-YY',
        seriesStartsFrom: settings.seriesStartsFrom ?? 1,
        currency: settings.currency ?? 'INR',
        dateFormat: settings.dateFormat ?? 'DD/MM/YYYY',
        dueDays: settings.dueDays ?? 15,
        defaultTerms: settings.defaultTerms ?? '',
        defaultNotes: settings.defaultNotes ?? '',
        showAuthorizedSignatory: settings.showAuthorizedSignatory ?? true,
        bankDetails: {
          accountName: settings.bankDetails?.accountName || '',
          accountNumber: settings.bankDetails?.accountNumber || '',
          ifsc: settings.bankDetails?.ifsc || '',
          bankName: settings.bankDetails?.bankName || '',
          branch: settings.bankDetails?.branch || '',
        },
        numberingConfig: {
          // Series no longer shown here (quotation, proforma, challan…) are sent back as the server returned them.
          ...(settings.numberingConfig || {}),
          salesInvoice: {
            prefix: settings.numberingConfig?.salesInvoice?.prefix ?? settings.prefix ?? 'INV-',
            suffix: settings.numberingConfig?.salesInvoice?.suffix ?? settings.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.salesInvoice?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.salesInvoice?.seriesStartsFrom ?? settings.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.salesInvoice?.resetPerYear ?? true,
          },
          salesReturn: {
            prefix: settings.numberingConfig?.salesReturn?.prefix ?? 'SR-',
            suffix: settings.numberingConfig?.salesReturn?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.salesReturn?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.salesReturn?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.salesReturn?.resetPerYear ?? true,
          },
          creditNote: {
            prefix: settings.numberingConfig?.creditNote?.prefix ?? 'CN-',
            suffix: settings.numberingConfig?.creditNote?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.creditNote?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.creditNote?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.creditNote?.resetPerYear ?? true,
          },
          paymentReceipt: {
            prefix: settings.numberingConfig?.paymentReceipt?.prefix ?? 'PR-',
            suffix: settings.numberingConfig?.paymentReceipt?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.paymentReceipt?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.paymentReceipt?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.paymentReceipt?.resetPerYear ?? true,
          },
        },
      });
    }
  }, [settings]);

  useEffect(() => {
    if (success || successMessage) {
      setLocalSuccessMsg(successMessage || 'General invoice settings updated successfully');
      const timer = setTimeout(() => {
        setLocalSuccessMsg('');
        dispatch(clearErrors());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, successMessage, dispatch]);

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [name]: value,
      },
    }));
  };

  const handleDocTypeChange = (docKey, field, value) => {
    setFormData((prev) => ({
      ...prev,
      numberingConfig: {
        ...prev.numberingConfig,
        [docKey]: {
          ...prev.numberingConfig[docKey],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      prefix: formData.prefix,
      suffix: formData.suffix,
      financialYearFormat: formData.financialYearFormat,
      seriesStartsFrom: Number(formData.seriesStartsFrom) || 1,
      currency: formData.currency,
      dateFormat: formData.dateFormat,
      dueDays: Number(formData.dueDays) || 0,
      defaultTerms: formData.defaultTerms,
      defaultNotes: formData.defaultNotes,
      showAuthorizedSignatory: formData.showAuthorizedSignatory,
      bankDetails: formData.bankDetails,
      numberingConfig: formData.numberingConfig,
    };
    dispatch(updateGeneralInvoiceSettings(payload));
  };

  const CURRENCY_OPTIONS = [
    { value: 'INR', label: 'INR (₹)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'AED', label: 'AED (د.إ)' },
  ];

  const header = (
    <PageHeader
      title="General Invoice Settings"
      description="Default numbering, terms and bank details used on your sales documents."
    />
  );

  if (loading && !settings) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <SkeletonRows rows={6} cols={3} />
        </Card>
      </div>
    );
  }

  const tabItems = [
    { label: 'Default Settings & Terms', value: 'general' },
    { label: 'Per-Document Numbering Config', value: 'numbering' },
    ...(settings?.sequences ? [{ label: 'Current Sequences Tracker', value: 'sequences' }] : []),
  ];

  const docConfig = formData.numberingConfig[selectedDocType];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {header}

      {/* Success Notification */}
      {localSuccessMsg && <Alert tone="success">{localSuccessMsg}</Alert>}

      {/* Error Notification */}
      {(error || saveError) && <Alert tone="danger">{error || saveError}</Alert>}

      {/* Tabs */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          aria-label="Settings sections"
          options={tabItems}
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
        />
      </div>

      {/* TAB 1: General Defaults */}
      {activeTab === 'general' && (
        <>
          <Section title="Global Default Rules" description="Used when a document type has no rule of its own">
            <FormGrid cols={3}>
              <Field label="Default Prefix" hint="Prefix applied across invoices">
                <Input
                  id="prefix"
                  name="prefix"
                  value={formData.prefix}
                  onChange={handleGeneralChange}
                  placeholder="e.g. INV-"
                  className="font-mono"
                />
              </Field>

              <Field label="Default Suffix" hint="Optional trailing text suffix">
                <Input
                  id="suffix"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleGeneralChange}
                  placeholder="e.g. -2324"
                  className="font-mono"
                />
              </Field>

              <Field label="Financial Year Format">
                <Select
                  id="financialYearFormat"
                  options={FINANCIAL_YEAR_OPTIONS}
                  value={formData.financialYearFormat}
                  onChange={(val) => handleGeneralChange({ target: { name: 'financialYearFormat', value: val } })}
                  searchable={false}
                />
              </Field>

              <Field label="Series Starts From">
                <Input
                  id="seriesStartsFrom"
                  name="seriesStartsFrom"
                  type="number"
                  value={formData.seriesStartsFrom}
                  onChange={handleGeneralChange}
                  placeholder="1"
                  min="1"
                  className="tabular-nums"
                />
              </Field>

              <Field label="Default Currency">
                <Select
                  id="currency"
                  options={CURRENCY_OPTIONS}
                  value={formData.currency}
                  onChange={(val) => handleGeneralChange({ target: { name: 'currency', value: val } })}
                  searchable={false}
                />
              </Field>

              <Field label="Default Payment Due Days">
                <Input
                  id="dueDays"
                  name="dueDays"
                  type="number"
                  value={formData.dueDays}
                  onChange={handleGeneralChange}
                  placeholder="15"
                  min="0"
                  className="tabular-nums"
                />
              </Field>
            </FormGrid>
          </Section>

          <Section title="Default Terms & Notes" description="Pre-filled on every new invoice">
            <FormGrid cols={2}>
              <Field label="Default Terms & Conditions">
                <Textarea
                  id="defaultTerms"
                  name="defaultTerms"
                  rows={4}
                  value={formData.defaultTerms}
                  onChange={handleGeneralChange}
                  placeholder="e.g. Payment due within 15 days."
                />
              </Field>

              <Field label="Default Customer Notes">
                <Textarea
                  id="defaultNotes"
                  name="defaultNotes"
                  rows={4}
                  value={formData.defaultNotes}
                  onChange={handleGeneralChange}
                  placeholder="e.g. Thank you for your business."
                />
              </Field>
            </FormGrid>

            <div className="mt-5 border-t border-line pt-4">
              <SettingRow title="Show Authorized Signatory" description="Display digital signature line on invoices">
                <Switch
                  checked={formData.showAuthorizedSignatory}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, showAuthorizedSignatory: val }))
                  }
                />
              </SettingRow>
            </div>
          </Section>

          <Section title="Bank Account Details" description="Printed in the payment block of your invoices">
            <FormGrid cols={3}>
              <Field label="Account Holder Name">
                <Input
                  id="accountName"
                  name="accountName"
                  value={formData.bankDetails.accountName}
                  onChange={handleBankChange}
                  placeholder="e.g. Company Name"
                />
              </Field>

              <Field label="Account Number">
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleBankChange}
                  placeholder="e.g. 123456789"
                  className="font-mono"
                />
              </Field>

              <Field label="Bank Name">
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankDetails.bankName}
                  onChange={handleBankChange}
                  placeholder="e.g. HDFC Bank"
                />
              </Field>

              <Field label="IFSC Code">
                <Input
                  id="ifsc"
                  name="ifsc"
                  value={formData.bankDetails.ifsc}
                  onChange={handleBankChange}
                  placeholder="e.g. HDFC0001"
                  className="font-mono"
                />
              </Field>

              <Field label="Branch Name">
                <Input
                  id="branch"
                  name="branch"
                  value={formData.bankDetails.branch}
                  onChange={handleBankChange}
                  placeholder="e.g. Main Branch"
                />
              </Field>
            </FormGrid>
          </Section>
        </>
      )}

      {/* TAB 2: Per-Document Numbering Config */}
      {activeTab === 'numbering' && (
        <Section
          title="Per-Document Type Numbering Rules"
          description="Each document type keeps its own prefix and counter"
          bodyClassName="flex flex-col gap-5"
        >
          {/* Document Selector */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <Segmented
              size="sm"
              aria-label="Document type"
              options={DOC_TYPES.map((dt) => ({ value: dt.key, label: dt.label }))}
              value={selectedDocType}
              onChange={(val) => setSelectedDocType(val)}
            />
          </div>

          {/* Config for active Document Type */}
          {selectedDocType && (
            <div className="flex flex-col gap-4 rounded-card border border-line p-4 sm:p-5">
              <h3 className="m-0 !text-sm !font-bold text-ink">
                {`${DOC_TYPES.find((d) => d.key === selectedDocType)?.label} Configuration`}
              </h3>

              <FormGrid cols={4}>
                <Field label="Prefix">
                  <Input
                    id={`${selectedDocType}-prefix`}
                    value={docConfig?.prefix ?? ''}
                    onChange={(e) => handleDocTypeChange(selectedDocType, 'prefix', e.target.value)}
                    placeholder="e.g. INV-"
                    className="font-mono"
                  />
                </Field>

                <Field label="Suffix">
                  <Input
                    id={`${selectedDocType}-suffix`}
                    value={docConfig?.suffix ?? ''}
                    onChange={(e) => handleDocTypeChange(selectedDocType, 'suffix', e.target.value)}
                    placeholder="e.g. -2026"
                    className="font-mono"
                  />
                </Field>

                <Field label="Financial Year Format">
                  <Select
                    id={`${selectedDocType}-fyFormat`}
                    options={FINANCIAL_YEAR_OPTIONS}
                    value={docConfig?.financialYearFormat ?? 'YYYY-YY'}
                    onChange={(val) => handleDocTypeChange(selectedDocType, 'financialYearFormat', val)}
                    searchable={false}
                  />
                </Field>

                <Field label="Series Starts From">
                  <Input
                    id={`${selectedDocType}-series`}
                    type="number"
                    value={docConfig?.seriesStartsFrom ?? 1}
                    onChange={(e) => handleDocTypeChange(selectedDocType, 'seriesStartsFrom', Number(e.target.value))}
                    placeholder="1"
                    min="1"
                    className="tabular-nums"
                  />
                </Field>
              </FormGrid>

              <div className="border-t border-line pt-4">
                <SettingRow
                  title="Reset Counter Each Financial Year"
                  description={`When enabled, document numbering sequence resets back to ${docConfig?.seriesStartsFrom ?? 1} at the beginning of a new financial year.`}
                >
                  <Switch
                    checked={docConfig?.resetPerYear ?? true}
                    onChange={(val) => handleDocTypeChange(selectedDocType, 'resetPerYear', val)}
                  />
                </SettingRow>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* TAB 3: Sequences Tracker */}
      {activeTab === 'sequences' && settings?.sequences && (
        <Section title="Current Sequences Counter Status" description="Last number used, per financial year">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(settings.sequences).map(([docKey, fyObject]) => (
              <div key={docKey} className="flex flex-col gap-3 rounded-card bg-fill-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold capitalize text-ink">
                    {docKey.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <Badge tone="primary" className="font-mono">{docKey}</Badge>
                </div>
                <DetailList
                  cols={1}
                  className="gap-y-3"
                  items={Object.entries(fyObject || {}).map(([fy, currentSeq]) => ({
                    key: fy,
                    label: `Financial Year (${fy})`,
                    value: `#${currentSeq}`,
                    mono: true,
                  }))}
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Submit Actions Footer */}
      <FormActions>
        <Button type="submit" disabled={saving} loading={saving} startIcon={<Save className="size-4" />}>
          {saving ? 'Updating Settings...' : 'Save General Settings'}
        </Button>
      </FormActions>
    </form>
  );
}
