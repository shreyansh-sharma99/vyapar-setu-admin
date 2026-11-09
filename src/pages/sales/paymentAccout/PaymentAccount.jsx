import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Building,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Edit3,
  X,
  Save,
  HelpCircle,
  Mail,
  Phone,
  User
} from 'lucide-react';
import {
  Alert, Badge, Button, Card, DetailList, Field, FormActions, FormGrid, Input, PageHeader, Section, Select, SkeletonRows,
} from '@/components/ui';
import {
  fetchPaymentAccount,
  saveBankDetails,
  verifyAccount,
  refreshStatus,
  clearErrors,
} from './services/paymentAccountSlice';

// ─── Constants ───────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'public_limited', label: 'Public Limited' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'ngo', label: 'Non-Governmental Organization (NGO)' },
];

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{6,18}$/;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verification status → badge look.
const STATUS_BADGE = {
  activated: { tone: 'success', label: 'Activated & Live' },
  verified: { tone: 'primary', label: 'Verified' },
  bank_saved: { tone: 'warning', label: 'Verification Pending' },
  failed: { tone: 'danger', label: 'Verification Failed' },
};

export default function PaymentAccount() {
  const dispatch = useDispatch();

  // Redux Selectors
  const {
    accountData,
    loading,
    saving,
    verifying,
    refreshing,
    error,
    saveError,
    verifyError,
    refreshError,
    success,
  } = useSelector((state) => state.paymentAccount);

  // Component States
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    beneficiaryEmail: '',
    beneficiaryPhone: '',
    legalBusinessName: '',
    businessType: 'individual',
  });

  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Fetch Data on Mount ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchPaymentAccount());
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // ─── Populate Form Data ────────────────────────────────────────────────────
  useEffect(() => {
    if (accountData) {
      setFormData({
        accountHolderName: accountData.accountHolderName || '',
        accountNumber: '', // Keep empty or write as placeholder when editing
        ifsc: accountData.ifsc || '',
        bankName: accountData.bankName || '',
        beneficiaryEmail: accountData.beneficiaryEmail || '',
        beneficiaryPhone: accountData.beneficiaryPhone || '',
        legalBusinessName: accountData.legalBusinessName || '',
        businessType: accountData.businessType || 'individual',
      });

      // If the account details haven't been configured, go straight to Edit mode.
      if (accountData.verificationStatus === 'none') {
        setIsEditMode(true);
      } else {
        setIsEditMode(false);
      }
    }
  }, [accountData]);

  // ─── Success/Error banner handlers ─────────────────────────────────────────
  useEffect(() => {
    if (success) {
      setSuccessMessage('Bank details saved successfully. Verify to enable payouts.');
      setIsEditMode(false);
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Clear slice errors when starting edits
  const handleStartEdit = () => {
    dispatch(clearErrors());
    setIsEditMode(true);
    // Clear account number to enforce full input on save
    setFormData((prev) => ({ ...prev, accountNumber: '' }));
  };

  const handleCancelEdit = () => {
    dispatch(clearErrors());
    setFormErrors({});
    if (accountData && accountData.verificationStatus !== 'none') {
      console.log(accountData.beneficiaryEmail)
      setFormData({
        accountHolderName: accountData.accountHolderName || '',
        accountNumber: '',
        ifsc: accountData.ifsc || '',
        bankName: accountData.bankName || '',
        beneficiaryEmail: accountData.beneficiaryEmail || '',
        beneficiaryPhone: accountData.beneficiaryPhone || '',
        legalBusinessName: accountData.legalBusinessName || '',
        businessType: accountData.businessType || 'individual',
      });
      setIsEditMode(false);
    }
  };

  // ─── Form Input Handlers ───────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (val) => {
    setFormData((prev) => ({ ...prev, businessType: val }));
    if (formErrors.businessType) {
      setFormErrors((prev) => ({ ...prev, businessType: null }));
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};

    if (!formData.legalBusinessName.trim()) {
      errors.legalBusinessName = 'Legal Business Name is required';
    } else if (formData.legalBusinessName.trim().length < 2) {
      errors.legalBusinessName = 'Legal Business Name must be at least 2 characters';
    }

    if (!formData.businessType) {
      errors.businessType = 'Business Type is required';
    }

    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = 'Account Holder Name is required';
    } else if (formData.accountHolderName.trim().length < 2) {
      errors.accountHolderName = 'Account Holder Name must be at least 2 characters';
    }

    // Account Number must be provided during edit mode.
    if (!formData.accountNumber) {
      errors.accountNumber = 'Account Number is required to save bank details';
    } else if (!ACCOUNT_NUMBER_REGEX.test(formData.accountNumber)) {
      errors.accountNumber = 'Account Number must be 6 to 18 digits';
    }

    if (!formData.ifsc.trim()) {
      errors.ifsc = 'IFSC code is required';
    } else if (!IFSC_REGEX.test(formData.ifsc.trim().toUpperCase())) {
      errors.ifsc = 'Valid IFSC code is required (e.g. HDFC0001234)';
    }

    if (!formData.beneficiaryEmail.trim()) {
      errors.beneficiaryEmail = 'Beneficiary Email is required';
    } else if (!EMAIL_REGEX.test(formData.beneficiaryEmail.trim())) {
      errors.beneficiaryEmail = 'Please enter a valid email address';
    }

    if (!formData.beneficiaryPhone.trim()) {
      errors.beneficiaryPhone = 'Beneficiary Phone is required';
    } else if (!PHONE_REGEX.test(formData.beneficiaryPhone.trim())) {
      errors.beneficiaryPhone = 'Please enter a valid 10-digit mobile number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Submit details ────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const payload = {
        ...formData,
        ifsc: formData.ifsc.trim().toUpperCase(),
        beneficiaryEmail: formData.beneficiaryEmail.trim(),
        beneficiaryPhone: formData.beneficiaryPhone.trim(),
        legalBusinessName: formData.legalBusinessName.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        bankName: formData.bankName.trim(),
      };
      dispatch(saveBankDetails(payload));
    }
  };

  // ─── Action Dispatchers ────────────────────────────────────────────────────
  const handleVerify = () => {
    dispatch(verifyAccount());
  };

  const handleRefresh = () => {
    dispatch(refreshStatus());
  };


  // ─── Render Badges ─────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const b = STATUS_BADGE[status] ?? { tone: 'neutral', label: 'Not Configured' };
    return <Badge tone={b.tone} size="md" dot>{b.label}</Badge>;
  };

  // ─── Loading / Blank States ────────────────────────────────────────────────
  if (loading && !accountData) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Payment Account" />
        <Card>
          <SkeletonRows rows={6} cols={2} />
        </Card>
      </div>
    );
  }

  const vStatus = accountData?.verificationStatus || 'none';
  const isVerifiedOrActivated = ['verified', 'activated'].includes(vStatus);
  const fieldOff = !isEditMode || saving;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payment Account"
        description={
          accountData ? (
            <>
              {vStatus === 'activated' && 'Automatic settlements are fully functional. Any platform transactions will resolve to the linked bank account.'}
              {vStatus === 'verified' && 'Verification successful. Your account registration is complete and is pending final activation activation step.'}
              {vStatus === 'bank_saved' && 'Your bank details have been saved locally. In order to start automated payouts, you must click Verify below.'}
              {vStatus === 'failed' && `Verification failed: ${accountData.lastError || 'KYC Validation issue'}. Please correct details and retry.`}
            </>
          ) : undefined
        }
        actions={
          <>
            {accountData && getStatusBadge(vStatus)}
            {!isEditMode && (
              <Button variant="secondary" onClick={handleStartEdit} startIcon={<Edit3 />}>
                Edit Details
              </Button>
            )}
            {accountData && isVerifiedOrActivated && (
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                startIcon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
              >
                {refreshing ? 'Refreshing...' : 'Sync Status'}
              </Button>
            )}
            {accountData && vStatus === 'bank_saved' && (
              <Button onClick={handleVerify} loading={verifying} startIcon={<ShieldCheck />}>
                {verifying ? 'Verifying...' : 'Verify Payouts'}
              </Button>
            )}
          </>
        }
      />

      {/* ─── Feedback Banners ─── */}
      {successMessage && <Alert tone="success">{successMessage}</Alert>}

      {(error || saveError || verifyError || refreshError) && (
        <Alert tone="danger">{error || saveError || verifyError || refreshError}</Alert>
      )}

      {/* ─── Main Details Form ─── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Edit Warning Message */}
        {isEditMode && vStatus !== 'none' && (
          <Alert tone="warning" title="Warning: Editing bank details resets verification">
            Saving any changes to these coordinates will immediately invalidate your current verification status ({vStatus}) and sever linked payouts until you re-verify.
          </Alert>
        )}

        {/* Section 1: Business Details */}
        <Section title="Business profile">
          <FormGrid cols={2}>
            <Field label="Legal Business Name" htmlFor="legalBusinessName" error={formErrors.legalBusinessName}>
              <Input
                id="legalBusinessName"
                name="legalBusinessName"
                value={formData.legalBusinessName}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="e.g. Acme Corp Pvt Ltd"
                invalid={!!formErrors.legalBusinessName}
                startIcon={<Building />}
              />
            </Field>

            <Field label="Business Type" error={formErrors.businessType}>
              <Select
                options={BUSINESS_TYPES}
                value={formData.businessType}
                onChange={handleSelectChange}
                disabled={fieldOff}
                placeholder="Select business structure"
                invalid={!!formErrors.businessType}
              />
            </Field>

            <Field label="Beneficiary Email" htmlFor="beneficiaryEmail" error={formErrors.beneficiaryEmail}>
              <Input
                id="beneficiaryEmail"
                name="beneficiaryEmail"
                value={formData.beneficiaryEmail}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="accounts@acme.com"
                invalid={!!formErrors.beneficiaryEmail}
                startIcon={<Mail />}
              />
            </Field>

            <Field label="Beneficiary Phone" htmlFor="beneficiaryPhone" error={formErrors.beneficiaryPhone}>
              <Input
                id="beneficiaryPhone"
                name="beneficiaryPhone"
                value={formData.beneficiaryPhone}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="10-digit mobile number"
                invalid={!!formErrors.beneficiaryPhone}
                startIcon={<Phone />}
              />
            </Field>
          </FormGrid>
        </Section>

        {/* Section 2: Bank Details */}
        <Section title="Bank account details">
          <FormGrid cols={2}>
            <Field label="Account Holder Name" htmlFor="accountHolderName" error={formErrors.accountHolderName}>
              <Input
                id="accountHolderName"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="e.g. Acme Corporation"
                invalid={!!formErrors.accountHolderName}
                startIcon={<User />}
              />
            </Field>

            <Field label="Bank Name (Optional)" htmlFor="bankName">
              <Input
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="e.g. HDFC Bank"
                startIcon={<Building />}
              />
            </Field>

            <Field label="IFSC Code" htmlFor="ifsc" error={formErrors.ifsc}>
              <Input
                id="ifsc"
                name="ifsc"
                value={formData.ifsc}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder="e.g. HDFC0001234"
                invalid={!!formErrors.ifsc}
                className="font-mono uppercase"
                startIcon={<HelpCircle />}
              />
            </Field>

            <Field
              label="Account Number"
              htmlFor="accountNumber"
              error={formErrors.accountNumber}
              hint={isEditMode && vStatus !== 'none' ? 'For security, enter the complete bank account number to authorize save.' : undefined}
            >
              <Input
                id="accountNumber"
                name="accountNumber"
                type={isEditMode ? "text" : "password"}
                value={isEditMode ? formData.accountNumber : (accountData?.accountNumberMasked || '••••••••••••')}
                onChange={handleInputChange}
                disabled={fieldOff}
                placeholder={isEditMode ? "Enter complete account number" : "••••••••••••"}
                invalid={!!formErrors.accountNumber}
                className="font-mono"
                startIcon={<CreditCard />}
              />
            </Field>
          </FormGrid>
        </Section>

        {/* Form Actions */}
        {isEditMode && (
          <FormActions>
            {vStatus !== 'none' && (
              <Button variant="secondary" onClick={handleCancelEdit} disabled={saving} startIcon={<X />}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={saving} startIcon={<Save />}>
              {saving ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </FormActions>
        )}
      </form>

      {/* ─── Tech Details Panel (System IDs for Admins) ─── */}
      {accountData && vStatus !== 'none' && (
        <Section title="Razorpay integration details">
          <DetailList
            cols={3}
            items={[
              { label: 'Linked Account ID', value: accountData.razorpayLinkedAccountId, mono: true },
              { label: 'Stakeholder ID', value: accountData.stakeholderId, mono: true },
              { label: 'Settlement Commission', value: `${accountData.platformCommissionPercent || 0}%` },
            ]}
          />
        </Section>
      )}
    </div>
  );
}
