import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Building,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Edit3,
  X,
  Save,
  CheckCircle,
  HelpCircle,
  Mail,
  Phone,
  User
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Button from '@/components/inputs/Button';
import Select from '@/components/inputs/Select';
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
    switch (status) {
      case 'activated':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Activated & Live
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Verified
          </span>
        );
      case 'bank_saved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Verification Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Verification Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not Configured
          </span>
        );
    }
  };

  // ─── Loading / Blank States ────────────────────────────────────────────────
  if (loading && !accountData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader />
      </div>
    );
  }

  const vStatus = accountData?.verificationStatus || 'none';
  const isVerifiedOrActivated = ['verified', 'activated'].includes(vStatus);

  return (
    <Card
      h1={
        <div className="flex items-center gap-3">
          Payment Account
          {accountData && getStatusBadge(vStatus)}
        </div>
      }
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
      rightNode={
        accountData && (vStatus === 'bank_saved' || isVerifiedOrActivated) ? (
          <div className="flex items-center gap-2.5">
            {vStatus === 'bank_saved' && (
              <Button
                variant="primary"
                onClick={handleVerify}
                disabled={verifying}
                className="h-9"
                startIcon={verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              >
                {verifying ? 'Verifying...' : 'Verify Payouts'}
              </Button>
            )}
            {isVerifiedOrActivated && (
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-9"
                startIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              >
                {refreshing ? 'Refreshing...' : 'Sync Status'}
              </Button>
            )}
          </div>
        ) : undefined
      }
      bodyClassName="p-4 sm:p-6 space-y-6"
    >

      {/* ─── Feedback Banners ─── */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {(error || saveError || verifyError || refreshError) && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || saveError || verifyError || refreshError}</span>
        </div>
      )}

      {/* ─── Main Details Form ─── */}
      <div>
        <div className="flex justify-between items-center">

          {!isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              startIcon={<Edit3 className="w-3.5 h-3.5" />}
              className="h-9 px-3.5"
            >
              Edit Details
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Edit Warning Message */}
          {isEditMode && vStatus !== 'none' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-xs flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Warning: Editing bank details resets verification</p>
                <p className="mt-1 font-medium leading-relaxed">
                  Saving any changes to these coordinates will immediately invalidate your current verification status ({vStatus}) and sever linked payouts until you re-verify.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Business Details */}
          <Card title="Business Profile" bodyClassName="p-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="legalBusinessName">Legal Business Name</Label>
                <Input
                  id="legalBusinessName"
                  name="legalBusinessName"
                  value={formData.legalBusinessName}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="e.g. Acme Corp Pvt Ltd"
                  error={!!formErrors.legalBusinessName}
                  startIcon={<Building className="w-4 h-4" />}
                />
                {formErrors.legalBusinessName && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.legalBusinessName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  options={BUSINESS_TYPES}
                  value={formData.businessType}
                  onChange={handleSelectChange}
                  disabled={!isEditMode || saving}
                  placeholder="Select business structure"
                  error={!!formErrors.businessType}
                />
                {formErrors.businessType && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.businessType}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beneficiaryEmail">Beneficiary Email</Label>
                <Input
                  id="beneficiaryEmail"
                  name="beneficiaryEmail"
                  value={formData.beneficiaryEmail}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="e.g. accounts@acme.com"
                  error={!!formErrors.beneficiaryEmail}
                  startIcon={<Mail className="w-4 h-4" />}
                />
                {formErrors.beneficiaryEmail && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.beneficiaryEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="beneficiaryPhone">Beneficiary Phone</Label>
                <Input
                  id="beneficiaryPhone"
                  name="beneficiaryPhone"
                  value={formData.beneficiaryPhone}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="10-digit mobile number"
                  error={!!formErrors.beneficiaryPhone}
                  startIcon={<Phone className="w-4 h-4" />}
                />
                {formErrors.beneficiaryPhone && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.beneficiaryPhone}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: Bank Details */}
          <Card title="Bank Account Details" bodyClassName="p-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="e.g. Acme Corporation"
                  error={!!formErrors.accountHolderName}
                  startIcon={<User className="w-4 h-4" />}
                />
                {formErrors.accountHolderName && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.accountHolderName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bankName">Bank Name (Optional)</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="e.g. HDFC Bank"
                  startIcon={<Building className="w-4 h-4" />}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder="e.g. HDFC0001234"
                  error={!!formErrors.ifsc}
                  className="uppercase"
                  startIcon={<HelpCircle className="w-4 h-4" />}
                />
                {formErrors.ifsc && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.ifsc}</p>
                )}
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  type={isEditMode ? "text" : "password"}
                  value={isEditMode ? formData.accountNumber : (accountData?.accountNumberMasked || '••••••••••••')}
                  onChange={handleInputChange}
                  disabled={!isEditMode || saving}
                  placeholder={isEditMode ? "Enter complete account number" : "••••••••••••"}
                  error={!!formErrors.accountNumber}
                  startIcon={<CreditCard className="w-4 h-4" />}
                />
                {formErrors.accountNumber && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.accountNumber}</p>
                )}
                {isEditMode && vStatus !== 'none' && (
                  <p className="text-[11px] text-[var(--vs-text-secondary)] mt-1.5 font-medium">
                    Note: For security, enter the complete bank account number to authorize save.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          {isEditMode && (
            <div className="flex justify-end items-center gap-3 pt-4">
              {vStatus !== 'none' && (
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  startIcon={<X className="w-4 h-4" />}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                startIcon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              >
                {saving ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* ─── Tech Details Panel (System IDs for Admins) ─── */}
      {accountData && vStatus !== 'none' && (
        <div className="p-5 rounded-2xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] space-y-3.5 transition-all duration-300">
          <h4 className="text-xs font-bold tracking-widest text-[var(--vs-text-secondary)] uppercase">
            Razorpay Integration Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-700 dark:text-slate-300 [&_span]:text-[var(--vs-text-primary)] [&_span]:font-bold">
            <div>
              <p className="text-[var(--vs-text-secondary)]">Linked Account ID</p>
              <p className="mt-1 break-all">
                {accountData.razorpayLinkedAccountId ? <span>{accountData.razorpayLinkedAccountId}</span> : '—'}
              </p>
            </div>
            <div>
              <p className="text-[var(--vs-text-secondary)]">Stakeholder ID</p>
              <p className="mt-1 break-all">
                {accountData.stakeholderId ? <span>{accountData.stakeholderId}</span> : '—'}
              </p>
            </div>
            <div>
              <p className="text-[var(--vs-text-secondary)]">Settlement Commission</p>
              <p className="mt-1">
                <span>{accountData.platformCommissionPercent || 0}%</span>
              </p>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}
