import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Tabs from '@/components/inputs/Tabs';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Button from '@/components/inputs/Button';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import {
  fetchGeneralInvoiceSettings,
  updateGeneralInvoiceSettings,
  clearErrors,
} from './services/generalInvoiceSettingSlice';

const DOC_TYPES = [
  { key: 'salesInvoice', label: 'Sales Invoice' },
  { key: 'quotation', label: 'Quotation / Estimate' },
  { key: 'proformaInvoice', label: 'Proforma Invoice' },
  { key: 'deliveryChallan', label: 'Delivery Challan' },
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
    quotation: { prefix: 'QT-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    proformaInvoice: { prefix: 'PI-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    deliveryChallan: { prefix: 'DC-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
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
          salesInvoice: {
            prefix: settings.numberingConfig?.salesInvoice?.prefix ?? settings.prefix ?? 'INV-',
            suffix: settings.numberingConfig?.salesInvoice?.suffix ?? settings.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.salesInvoice?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.salesInvoice?.seriesStartsFrom ?? settings.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.salesInvoice?.resetPerYear ?? true,
          },
          quotation: {
            prefix: settings.numberingConfig?.quotation?.prefix ?? 'QT-',
            suffix: settings.numberingConfig?.quotation?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.quotation?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.quotation?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.quotation?.resetPerYear ?? true,
          },
          proformaInvoice: {
            prefix: settings.numberingConfig?.proformaInvoice?.prefix ?? 'PI-',
            suffix: settings.numberingConfig?.proformaInvoice?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.proformaInvoice?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.proformaInvoice?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.proformaInvoice?.resetPerYear ?? true,
          },
          deliveryChallan: {
            prefix: settings.numberingConfig?.deliveryChallan?.prefix ?? 'DC-',
            suffix: settings.numberingConfig?.deliveryChallan?.suffix ?? '',
            financialYearFormat: settings.numberingConfig?.deliveryChallan?.financialYearFormat ?? settings.financialYearFormat ?? 'YYYY-YY',
            seriesStartsFrom: settings.numberingConfig?.deliveryChallan?.seriesStartsFrom ?? 1,
            resetPerYear: settings.numberingConfig?.deliveryChallan?.resetPerYear ?? true,
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

  if (loading && !settings) {
    return (
      <Card >
        <Loader />
      </Card>
    );
  }

  const tabItems = [
    { label: 'Default Settings & Terms', value: 'general' },
    { label: 'Per-Document Numbering Config', value: 'numbering' },
    ...(settings?.sequences ? [{ label: 'Current Sequences Tracker', value: 'sequences' }] : []),
  ];

  return (
    <Card title="General Invoice Settings">
      <div className="space-y-6">
        {/* Success Notification */}
        {localSuccessMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 shadow-sm animate-in fade-in">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <span>{localSuccessMsg}</span>
          </div>
        )}

        {/* Error Notification */}
        {(error || saveError) && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{error || saveError}</span>
          </div>
        )}

        {/* Tabs Component */}
        <Tabs
          tabs={tabItems}
          activeTab={activeTab}
          onChange={(val) => setActiveTab(val)}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: General Defaults */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Global Default Rules Card */}
              <Card title="Global Default Rules">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prefix">Default Prefix</Label>
                    <Input
                      id="prefix"
                      name="prefix"
                      value={formData.prefix}
                      onChange={handleGeneralChange}
                      placeholder="e.g. INV-"
                    />
                    <p className="text-xs text-[var(--vs-text-secondary)]">Prefix applied across invoices</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="suffix">Default Suffix</Label>
                    <Input
                      id="suffix"
                      name="suffix"
                      value={formData.suffix}
                      onChange={handleGeneralChange}
                      placeholder="e.g. -2324"
                    />
                    <p className="text-xs text-[var(--vs-text-secondary)]">Optional trailing text suffix</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="financialYearFormat">Financial Year Format</Label>
                    <select
                      id="financialYearFormat"
                      name="financialYearFormat"
                      value={formData.financialYearFormat}
                      onChange={handleGeneralChange}
                      className="flex h-10 w-full rounded-md border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3 py-2 text-sm text-[var(--vs-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0f6ebd]"
                    >
                      {FINANCIAL_YEAR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="seriesStartsFrom">Series Starts From</Label>
                    <Input
                      id="seriesStartsFrom"
                      name="seriesStartsFrom"
                      type="number"
                      value={formData.seriesStartsFrom}
                      onChange={handleGeneralChange}
                      placeholder="1"
                      min="1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Default Currency</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleGeneralChange}
                      className="flex h-10 w-full rounded-md border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3 py-2 text-sm text-[var(--vs-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0f6ebd]"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dueDays">Default Payment Due Days</Label>
                    <Input
                      id="dueDays"
                      name="dueDays"
                      type="number"
                      value={formData.dueDays}
                      onChange={handleGeneralChange}
                      placeholder="15"
                      min="0"
                    />
                  </div>
                </div>
              </Card>

              {/* Default Terms & Notes Card */}
              <Card title="Default Terms & Notes">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="defaultTerms">Default Terms & Conditions</Label>
                      <textarea
                        id="defaultTerms"
                        name="defaultTerms"
                        rows="4"
                        value={formData.defaultTerms}
                        onChange={handleGeneralChange}
                        placeholder="e.g. Payment due within 15 days."
                        className="flex w-full rounded-md border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] p-3 text-sm text-[var(--vs-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0f6ebd]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="defaultNotes">Default Customer Notes</Label>
                      <textarea
                        id="defaultNotes"
                        name="defaultNotes"
                        rows="4"
                        value={formData.defaultNotes}
                        onChange={handleGeneralChange}
                        placeholder="e.g. Thank you for your business."
                        className="flex w-full rounded-md border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] p-3 text-sm text-[var(--vs-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0f6ebd]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--vs-border)]">
                    <div>
                      <Label className="font-semibold text-sm">Show Authorized Signatory</Label>
                      <p className="text-xs text-[var(--vs-text-secondary)]">Display digital signature line on invoices</p>
                    </div>
                    <Switch
                      checked={formData.showAuthorizedSignatory}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, showAuthorizedSignatory: val }))
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Bank Account Details Card */}
              <Card title="Bank Account Details">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="accountName">Account Holder Name</Label>
                    <Input
                      id="accountName"
                      name="accountName"
                      value={formData.bankDetails.accountName}
                      onChange={handleBankChange}
                      placeholder="e.g. Company Name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      value={formData.bankDetails.accountNumber}
                      onChange={handleBankChange}
                      placeholder="e.g. 123456789"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={formData.bankDetails.bankName}
                      onChange={handleBankChange}
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ifsc">IFSC Code</Label>
                    <Input
                      id="ifsc"
                      name="ifsc"
                      value={formData.bankDetails.ifsc}
                      onChange={handleBankChange}
                      placeholder="e.g. HDFC0001"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="branch">Branch Name</Label>
                    <Input
                      id="branch"
                      name="branch"
                      value={formData.bankDetails.branch}
                      onChange={handleBankChange}
                      placeholder="e.g. Main Branch"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Per-Document Numbering Config */}
          {activeTab === 'numbering' && (
            <Card title="Per-Document Type Numbering Rules" >
              <div className="space-y-6">
                {/* Document Selector Pills */}
                <div className="flex flex-wrap gap-2">
                  {DOC_TYPES.map((dt) => {
                    const isSelected = selectedDocType === dt.key;
                    return (
                      <button
                        key={dt.key}
                        type="button"
                        onClick={() => setSelectedDocType(dt.key)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${isSelected
                          ? 'bg-[#0f6ebd] text-white shadow-sm'
                          : 'bg-[var(--vs-btn-hover)] text-[var(--vs-text-secondary)] hover:text-[var(--vs-text-primary)]'
                          }`}
                      >
                        {dt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Config Box for active Document Type */}
                {selectedDocType && (
                  <Card title={`${DOC_TYPES.find((d) => d.key === selectedDocType)?.label} Configuration`}>
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${selectedDocType}-prefix`}>Prefix</Label>
                          <Input
                            id={`${selectedDocType}-prefix`}
                            value={formData.numberingConfig[selectedDocType]?.prefix ?? ''}
                            onChange={(e) => handleDocTypeChange(selectedDocType, 'prefix', e.target.value)}
                            placeholder="e.g. INV-"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${selectedDocType}-suffix`}>Suffix</Label>
                          <Input
                            id={`${selectedDocType}-suffix`}
                            value={formData.numberingConfig[selectedDocType]?.suffix ?? ''}
                            onChange={(e) => handleDocTypeChange(selectedDocType, 'suffix', e.target.value)}
                            placeholder="e.g. -2026"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${selectedDocType}-fyFormat`}>Financial Year Format</Label>
                          <select
                            id={`${selectedDocType}-fyFormat`}
                            value={formData.numberingConfig[selectedDocType]?.financialYearFormat ?? 'YYYY-YY'}
                            onChange={(e) => handleDocTypeChange(selectedDocType, 'financialYearFormat', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] px-3 py-2 text-sm text-[var(--vs-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0f6ebd]"
                          >
                            {FINANCIAL_YEAR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${selectedDocType}-series`}>Series Starts From</Label>
                          <Input
                            id={`${selectedDocType}-series`}
                            type="number"
                            value={formData.numberingConfig[selectedDocType]?.seriesStartsFrom ?? 1}
                            onChange={(e) => handleDocTypeChange(selectedDocType, 'seriesStartsFrom', Number(e.target.value))}
                            placeholder="1"
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--vs-border)] pt-4">
                        <div>
                          <Label className="font-semibold text-sm">Reset Counter Each Financial Year</Label>
                          <p className="text-xs text-[var(--vs-text-secondary)]">
                            When enabled, document numbering sequence resets back to {formData.numberingConfig[selectedDocType]?.seriesStartsFrom ?? 1} at the beginning of a new financial year.
                          </p>
                        </div>
                        <Switch
                          checked={formData.numberingConfig[selectedDocType]?.resetPerYear ?? true}
                          onChange={(val) => handleDocTypeChange(selectedDocType, 'resetPerYear', val)}
                        />
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          )}

          {/* TAB 3: Sequences Tracker */}
          {activeTab === 'sequences' && settings?.sequences && (
            <Card title="Current Sequences Counter Status">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(settings.sequences).map(([docKey, fyObject]) => (
                  <div key={docKey} className="rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--vs-text-primary)] capitalize">
                        {docKey.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {docKey}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {Object.entries(fyObject || {}).map(([fy, currentSeq]) => (
                        <div key={fy} className="flex items-center justify-between text-xs border-b border-dashed border-[var(--vs-border)] py-1 last:border-0">
                          <span className="text-[var(--vs-text-secondary)]">Financial Year ({fy}):</span>
                          <span className="font-mono font-bold text-[var(--vs-text-primary)]">#{currentSeq}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Submit Actions Footer */}
          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 font-semibold"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Updating Settings...' : 'Save General Settings'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
