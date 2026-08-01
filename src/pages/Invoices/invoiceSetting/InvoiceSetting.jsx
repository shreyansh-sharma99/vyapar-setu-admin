import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Star,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  X,
  Save,
  AlertCircle,
  Globe,
  PlusCircle,
  MinusCircle,
  Loader2,
} from 'lucide-react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import Card from '@/components/breadCrumbs/Card';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Button from '@/components/inputs/Button';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import DeleteModal from '@/components/modal/DeleteModal';
import {
  fetchInvoiceSettings,
  createInvoiceSetting,
  fetchInvoiceSettingById,
  updateInvoiceSetting,
  setDefaultInvoiceSetting,
  deleteInvoiceSetting,
  clearErrors,
} from './services/invoiceSettingSlice';

const INITIAL_FORM_STATE = {
  name: '',
  businessName: '',
  companyPhone: '',
  companyEmail: '',
  billingAddress: '',
  city: '',
  state: '',
  pincode: '',
  isGSTRegistered: true,
  gstin: '',
  panNumber: '',
  enableTDS: false,
  enableTCS: false,
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  upiId: '',
  additionalDetails: [],
  isDefault: false,
};

export default function InvoiceSetting() {
  const dispatch = useDispatch();

  const {
    profiles,
    loading,
    saving,
    deleting,
    settingDefault,
    error,
    saveError,
    deleteError,
    success,
    successMessage,
  } = useSelector((state) => state.invoiceSetting);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, color = 'success') => {
    if (!message) return;
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    dispatch(fetchInvoiceSettings());
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Toast triggers on Redux errors & successes
  useEffect(() => {
    if (error) {
      showToast(error, 'danger');
    }
  }, [error]);

  useEffect(() => {
    if (saveError) {
      showToast(saveError, 'danger');
    }
  }, [saveError]);

  useEffect(() => {
    if (deleteError) {
      showToast(deleteError, 'danger');
    }
  }, [deleteError]);

  useEffect(() => {
    if (success && successMessage) {
      showToast(successMessage, 'success');
    }
  }, [success, successMessage]);

  // Open modal for creation
  const handleOpenCreateModal = () => {
    dispatch(clearErrors());
    setFormErrors({});
    setEditingProfileId(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      isDefault: profiles.length === 0,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = async (profile) => {
    dispatch(clearErrors());
    setFormErrors({});
    setEditingProfileId(profile._id);
    setIsModalOpen(true);

    try {
      const resultAction = await dispatch(fetchInvoiceSettingById(profile._id));
      if (fetchInvoiceSettingById.fulfilled.match(resultAction)) {
        const fetchedProfile = resultAction.payload.data || resultAction.payload;
        // Check that we are still editing the same profile
        setEditingProfileId((currentId) => {
          if (currentId === profile._id && fetchedProfile) {
            setFormData({
              name: fetchedProfile.name || '',
              businessName: fetchedProfile.businessName || '',
              companyPhone: fetchedProfile.companyPhone || '',
              companyEmail: fetchedProfile.companyEmail || '',
              billingAddress: fetchedProfile.billingAddress || '',
              city: fetchedProfile.city || '',
              state: fetchedProfile.state || '',
              pincode: fetchedProfile.pincode || '',
              isGSTRegistered: fetchedProfile.isGSTRegistered !== false,
              gstin: fetchedProfile.gstin || '',
              panNumber: fetchedProfile.panNumber || '',
              enableTDS: !!fetchedProfile.enableTDS,
              enableTCS: !!fetchedProfile.enableTCS,
              bankName: fetchedProfile.bankName || '',
              accountNumber: fetchedProfile.accountNumber || '',
              ifscCode: fetchedProfile.ifscCode || '',
              accountHolderName: fetchedProfile.accountHolderName || '',
              upiId: fetchedProfile.upiId || '',
              additionalDetails: Array.isArray(fetchedProfile.additionalDetails)
                ? [...fetchedProfile.additionalDetails.map((item) => ({ key: item.key || '', value: item.value || '' }))]
                : [],
              isDefault: !!fetchedProfile.isDefault,
            });
          }
          return currentId;
        });
      } else {
        showToast('Failed to load profile details', 'danger');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading profile details', 'danger');
      setIsModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingProfileId(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  // Input change handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Pincode Lookup Handler
  const handlePincodeChange = async (e) => {
    const val = e.target.value.trim();
    setFormData((prev) => ({ ...prev, pincode: val }));
    if (formErrors.pincode) {
      setFormErrors((prev) => ({ ...prev, pincode: null }));
    }

    if (val.length === 6 && /^\d{6}$/.test(val)) {
      setPincodeLoading(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          if (postOffice) {
            setFormData((prev) => ({
              ...prev,
              city: postOffice.District || postOffice.Block || '',
              state: postOffice.State || '',
            }));
            showToast('City & State auto-filled from PIN Code', 'info');
          }
        } else {
          showToast('Invalid PIN Code or location details not found', 'danger');
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
        showToast('Failed to fetch pincode details', 'danger');
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // Additional details array handlers
  const handleAddKeyValue = () => {
    setFormData((prev) => ({
      ...prev,
      additionalDetails: [...prev.additionalDetails, { key: '', value: '' }],
    }));
  };

  const handleRemoveKeyValue = (index) => {
    setFormData((prev) => ({
      ...prev,
      additionalDetails: prev.additionalDetails.filter((_, i) => i !== index),
    }));
  };

  const handleKeyValueChange = (index, field, val) => {
    setFormData((prev) => {
      const updated = [...prev.additionalDetails];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, additionalDetails: updated };
    });
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Profile Name is required';
    if (!formData.businessName.trim()) errors.businessName = 'Business Name is required';
    if (!formData.companyEmail.trim()) {
      errors.companyEmail = 'Company Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail.trim())) {
      errors.companyEmail = 'Invalid email address';
    }
    if (!formData.companyPhone.trim()) {
      errors.companyPhone = 'Company Phone is required';
    } else if (!/^\d{10}$/.test(formData.companyPhone.trim())) {
      errors.companyPhone = 'Must be a 10-digit mobile number';
    }
    if (formData.isGSTRegistered && !formData.gstin.trim()) {
      errors.gstin = 'GSTIN is required when GST registered';
    }

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) {
      showToast('Please correct the validation errors in the form', 'danger');
    }
    return isValid;
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      businessName: formData.businessName.trim(),
      companyEmail: formData.companyEmail.trim(),
      companyPhone: formData.companyPhone.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
      panNumber: formData.panNumber.trim().toUpperCase(),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
    };

    let resultAction;
    if (editingProfileId) {
      resultAction = await dispatch(
        updateInvoiceSetting({ id: editingProfileId, payload })
      );
    } else {
      resultAction = await dispatch(createInvoiceSetting(payload));
    }

    if (!resultAction.error) {
      setIsModalOpen(false);
      dispatch(fetchInvoiceSettings());
    }
  };

  // Set Default Handler
  const handleSetDefault = (id) => {
    dispatch(setDefaultInvoiceSetting(id));
  };

  // Delete Handlers
  const handlePromptDelete = (id) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const res = await dispatch(deleteInvoiceSetting(deleteTargetId));
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
    if (!res.error) {
      dispatch(fetchInvoiceSettings());
    }
  };

  if (loading && profiles.length === 0) {
    return (
      <Card h1="Invoice Settings">
        <Loader />
      </Card>
    );
  }

  return (
    <Card
      h1="Invoice Settings"
      rightNode={
        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          startIcon={<Plus className="w-4 h-4" />}
          className="h-9 px-3.5"
        >
          Add Profile
        </Button>
      }
      bodyClassName="p-4 sm:p-6 space-y-6"
    >
      {/* ─── Profiles Grid ─── */}
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[var(--vs-border)] rounded-2xl bg-[var(--vs-bg-secondary)] gap-3">
          <FileText className="w-12 h-12 text-[var(--vs-text-secondary)] opacity-50" />
          <h3 className="text-base font-bold text-[var(--vs-text-primary)]">No Invoice Profiles Found</h3>
          <p className="text-xs text-[var(--vs-text-secondary)] max-w-sm">
            Create your first GST or business invoice profile to enable customer billing and tax invoice generation.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} startIcon={<Plus className="w-4 h-4" />}>
            Create Profile
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile._id}
              className={`relative rounded-2xl border transition-all duration-200 px-4 py-3 space-y-4 ${profile.isDefault
                ? 'border-indigo-500/50 shadow-md bg-[var(--vs-bg-primary)] ring-1 ring-indigo-500/30'
                : 'border-[var(--vs-border)] bg-[var(--vs-bg-primary)] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              {/* Header: Name & Badges */}
              <div className="flex items-start justify-between gap-3 border-b border-[var(--vs-border)] pb-1 -mx-4 px-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold !text-blue-600 dark:text-blue-400">{profile.name}</h3>
                    {profile.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                        <Star className="w-3 h-3 fill-indigo-600 dark:fill-indigo-400" />
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {profile.businessName}
                  </p>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!profile.isDefault && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleSetDefault(profile._id)}
                      disabled={settingDefault}
                      className="h-8 text-sm"
                    >
                      Make Default
                    </Button>
                  )}
                  <Button
                    // variant="outline"
                    size="xs"
                    onClick={() => handleOpenEditModal(profile)}
                    startIcon={<Edit3 className="w-3.5 h-3.5" />}
                    className="h-8 px-2.5"
                  >
                    {/* Edit */}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handlePromptDelete(profile._id)}
                    disabled={profile.isDefault && profiles.length > 1}
                    title={profile.isDefault ? 'Default profile cannot be deleted' : 'Delete Profile'}
                    startIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                    className="h-8 px-2.5 !bg-red-100 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  />
                </div>
              </div>

              {/* Business & Address Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div className="space-y-1.5 text-[var(--vs-text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate text-[var(--vs-text-primary)] font-medium">{profile.companyEmail || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-[var(--vs-text-primary)] font-medium">{profile.companyPhone || '—'}</span>
                  </div>
                  {profile.gstin && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>GSTIN: <strong className="text-[var(--vs-text-primary)]">{profile.gstin}</strong></span>
                    </div>
                  )}
                  {profile.panNumber && (
                    <div className="flex items-center gap-2 pl-5">
                      <span>PAN: <strong className="text-[var(--vs-text-primary)]">{profile.panNumber}</strong></span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-[var(--vs-text-secondary)]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span className="leading-snug text-[var(--vs-text-primary)] font-medium">
                      {[profile.billingAddress, profile.city, profile.state, profile.pincode]
                        .filter(Boolean)
                        .join(', ') || 'No address specified'}
                    </span>
                  </div>
                  {profile.bankName && (
                    <div className="flex items-center gap-2 pt-1">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        Bank: <strong className="text-[var(--vs-text-primary)]">{profile.bankName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Toggles & Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--vs-border)] text-sm -mx-4 px-4">
                <span
                  className={`px-2.5 py-0.5 rounded-md font-semibold border ${profile.isGSTRegistered
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                >
                  {profile.isGSTRegistered ? 'GST Registered' : 'Unregistered Business'}
                </span>

                {profile.enableTDS && (
                  <span className="px-2.5 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900">
                    TDS Enabled
                  </span>
                )}

                {profile.enableTCS && (
                  <span className="px-2.5 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900">
                    TCS Enabled
                  </span>
                )}

                {Array.isArray(profile.additionalDetails) && profile.additionalDetails.map((item, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    {item.key}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Create / Edit Profile Modal ─── */}
      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 !z-[99990] flex items-center justify-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !saving) handleCloseModal(); }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-[var(--vs-bg-primary)] border border-[var(--vs-border)]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between !px-4 !py-2.5 border-b border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
              <h2 className="!text-md sm:!text-base !font-bold !text-blue-600 dark:!text-blue-400">
                {editingProfileId ? 'Edit Invoice Profile' : 'Create New Invoice Profile'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="!p-1 rounded-md !text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 !text-red-500" />
              </button>
            </div>

            {/* Modal Form Body - Compact padding & spacing */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-12 min-h-[300px]">
                <Loader />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto !p-4 !space-y-3.5">

              {/* Section 1: Profile & Identity */}
              <div className="!space-y-2.5">
                <h3 className="!text-sm !font-bold !uppercase !tracking-wider !text-blue-600 dark:!text-blue-400">
                  Profile & Identity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 !gap-3">
                  <div>
                    <Label htmlFor="name">Profile Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="e.g. GST Profile, Primary Profile"
                      error={!!formErrors.name}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="businessName">Legal Business Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="e.g. Acme India Pvt Ltd"
                      error={!!formErrors.businessName}
                      startIcon={<Building className="w-4 h-4" />}
                    />
                    {formErrors.businessName && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.businessName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 !gap-3">
                  <div>
                    <Label htmlFor="companyEmail">Company Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyEmail"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="finance@company.com"
                      error={!!formErrors.companyEmail}
                      startIcon={<Mail className="w-4 h-4" />}
                    />
                    {formErrors.companyEmail && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.companyEmail}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="companyPhone">Company Phone <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyPhone"
                      name="companyPhone"
                      value={formData.companyPhone}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="10-digit mobile"
                      error={!!formErrors.companyPhone}
                      startIcon={<Phone className="w-4 h-4" />}
                    />
                    {formErrors.companyPhone && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.companyPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full-width section divider touching both ends */}
              <div className="-mx-4 !border-t !border-[var(--vs-border)] !my-2.5" />

              {/* Section 2: Billing Address */}
              <div className="!space-y-2.5">
                <h3 className="!text-sm !font-bold !uppercase !tracking-wider !text-blue-600 dark:!text-blue-400">
                  Billing Address
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 !gap-3">
                  {/* First ask Pincode */}
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <div className="relative">
                      <Input
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handlePincodeChange}
                        disabled={saving}
                        placeholder="e.g. 400001"
                        maxLength={6}
                      />
                      {pincodeLoading && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Second ask City */}
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="City"
                    />
                  </div>

                  {/* Third ask State */}
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="billingAddress">Full Address</Label>
                  <Input
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="Street address, building, floor..."
                  />
                </div>
              </div>

              {/* Full-width section divider touching both ends */}
              <div className="-mx-4 !border-t !border-[var(--vs-border)] !my-2.5" />

              {/* Section 3: Tax Details & Preferences */}
              <div className="!space-y-2.5">
                <h3 className="!text-sm !font-bold !uppercase !tracking-wider !text-blue-600 dark:!text-blue-400">
                  Tax Registrations & Preferences
                </h3>

                <div className="flex flex-wrap justify-between items-center !gap-5 !p-2.5 rounded-xl bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)]">
                  <Switch
                    label="GST Registered"
                    checked={formData.isGSTRegistered}
                    onChange={(checked) => setFormData((p) => ({ ...p, isGSTRegistered: checked }))}
                    color="blue"
                    size="sm"
                    disabled={saving}
                  />

                  <Switch
                    label="Enable TDS"
                    checked={formData.enableTDS}
                    onChange={(checked) => setFormData((p) => ({ ...p, enableTDS: checked }))}
                    color="blue"
                    size="sm"
                    disabled={saving}
                  />

                  <Switch
                    label="Enable TCS"
                    checked={formData.enableTCS}
                    onChange={(checked) => setFormData((p) => ({ ...p, enableTCS: checked }))}
                    color="blue"
                    size="sm"
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 !gap-3">
                  <div>
                    <Label htmlFor="gstin">GSTIN Number {formData.isGSTRegistered && <span className="text-red-500">*</span>}</Label>
                    <Input
                      id="gstin"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="27AAQCP3629R1ZF"
                      className="uppercase"
                      error={!!formErrors.gstin}
                    />
                    {formErrors.gstin && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.gstin}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="AAQCP3629R"
                      className="uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Full-width section divider touching both ends */}
              <div className="-mx-4 !border-t !border-[var(--vs-border)] !my-2.5" />

              {/* Section 4: Bank Details */}
              <div className="!space-y-2.5">
                <h3 className="!text-sm !font-bold !uppercase !tracking-wider !text-blue-600 dark:!text-blue-400">
                  Bank Details (Optional)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 !gap-3">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="HDFC Bank"
                    />
                  </div>

                  <div>
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      name="accountHolderName"
                      value={formData.accountHolderName}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="Acme Pvt Ltd"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 !gap-3">
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="987654321012"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="HDFC0001234"
                      className="uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      name="upiId"
                      value={formData.upiId}
                      onChange={handleInputChange}
                      disabled={saving}
                      placeholder="acme@hdfc"
                    />
                  </div>
                </div>
              </div>

              {/* Full-width section divider touching both ends */}
              <div className="-mx-4 !border-t !border-[var(--vs-border)] !my-2.5" />

              {/* Section 5: Additional Custom Attributes */}
              <div className="!space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="!text-sm !font-bold !uppercase !tracking-wider !text-blue-600 dark:!text-blue-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Additional Custom Attributes
                  </h3>
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddKeyValue}
                  >
                    Add Attribute
                  </Button>
                </div>

                {formData.additionalDetails.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key (e.g. Website)"
                      value={item.key}
                      onChange={(e) => handleKeyValueChange(index, 'key', e.target.value)}
                      disabled={saving}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value (e.g. www.acme.com)"
                      value={item.value}
                      onChange={(e) => handleKeyValueChange(index, 'value', e.target.value)}
                      disabled={saving}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyValue(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Full-width section divider touching both ends */}
              <div className="-mx-4 !border-t !border-[var(--vs-border)] !my-2.5" />

              {/* Section 6: Default Switch */}
              <div className="!pt-1">
                <Switch
                  label="Set as Default Invoice Profile"
                  checked={formData.isDefault}
                  onChange={(checked) => setFormData((p) => ({ ...p, isDefault: checked }))}
                  color="blue"
                  size="sm"
                  disabled={saving}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 !pt-3 border-t border-[var(--vs-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {saving ? 'Saving...' : editingProfileId ? 'Update Profile' : 'Create Profile'}
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* ─── Delete Confirmation Modal ─── */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Invoice Profile"
        message="Are you sure you want to delete this invoice profile? Invoices generated with this profile will retain their saved record."
        isLoading={deleting}
      />

      {/* ─── CoreUI Toast Notifications ─── */}
      {createPortal(
        <CToaster className="p-3" style={{ zIndex: 999999999, position: 'fixed', bottom: '20px', right: '20px' }}>
          {toasts.map((t) => (
            <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2">
              <div className="d-flex">
                <CToastBody className="font-semibold">{t.message}</CToastBody>
              </div>
            </CToast>
          ))}
        </CToaster>,
        document.body
      )}
    </Card>
  );
}
