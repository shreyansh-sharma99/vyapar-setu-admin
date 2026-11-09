import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Edit3,
  Trash2,
  Star,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Save,
  Globe,
  PlusCircle,
  MinusCircle,
  Loader2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  FormGrid,
  Input,
  Modal,
  PageHeader,
  SettingRow,
  SkeletonRows,
  Spinner,
  Switch,
  ToastStack,
} from '@/components/ui';
import { cn } from '@/lib/utils';
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

  const header = (
    <PageHeader
      title="Invoice Settings"
      description="Business profiles printed on your invoices — name, GSTIN, address and bank details."
      actions={
        <Button onClick={handleOpenCreateModal} startIcon={<Plus className="size-4" />}>
          Add Profile
        </Button>
      }
    />
  );

  if (loading && profiles.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <SkeletonRows rows={4} cols={2} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}

      {/* ─── Profiles Grid ─── */}
      {profiles.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={FileText}
            title="No Invoice Profiles Found"
            text="Create your first GST or business invoice profile to enable customer billing and tax invoice generation."
            action={
              <Button size="sm" onClick={handleOpenCreateModal} startIcon={<Plus className="size-4" />}>
                Create Profile
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Card
              key={profile._id}
              padding="none"
              className={cn('flex flex-col', profile.isDefault && 'ring-2 ring-brand')}
            >
              {/* Header: Name & Badges */}
              <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 truncate !text-[15px] !font-extrabold text-ink">{profile.name}</h3>
                    {profile.isDefault && (
                      <Badge tone="primary" icon={Star}>Default</Badge>
                    )}
                  </div>
                  <p className="m-0 mt-0.5 truncate text-[13px] font-semibold text-brand-ink">
                    {profile.businessName}
                  </p>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {!profile.isDefault && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleSetDefault(profile._id)}
                      disabled={settingDefault}
                    >
                      Make Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleOpenEditModal(profile)}
                    aria-label="Edit profile"
                    title="Edit Profile"
                  >
                    <Edit3 className="size-4" />
                  </Button>
                  <Button
                    variant="danger-soft"
                    size="icon-sm"
                    onClick={() => handlePromptDelete(profile._id)}
                    disabled={profile.isDefault && profiles.length > 1}
                    aria-label="Delete profile"
                    title={profile.isDefault ? 'Default profile cannot be deleted' : 'Delete Profile'}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Business & Address Info */}
              <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 text-[13px] sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2 text-ink-muted">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0 text-ink-subtle" />
                    <span className="truncate font-medium text-ink">{profile.companyEmail || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-ink-subtle" />
                    <span className="font-medium tabular-nums text-ink">{profile.companyPhone || '—'}</span>
                  </div>
                  {profile.gstin && (
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 shrink-0 text-ink-subtle" />
                      <span>GSTIN: <strong className="font-mono font-semibold text-ink">{profile.gstin}</strong></span>
                    </div>
                  )}
                  {profile.panNumber && (
                    <div className="flex items-center gap-2 pl-[22px]">
                      <span>PAN: <strong className="font-mono font-semibold text-ink">{profile.panNumber}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-2 text-ink-muted">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" />
                    <span className="font-medium leading-snug text-ink">
                      {[profile.billingAddress, profile.city, profile.state, profile.pincode]
                        .filter(Boolean)
                        .join(', ') || 'No address specified'}
                    </span>
                  </div>
                  {profile.bankName && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-3.5 shrink-0 text-ink-subtle" />
                      <span className="truncate">
                        Bank: <strong className="font-semibold text-ink">{profile.bankName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Toggles & Tags */}
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                <Badge tone={profile.isGSTRegistered ? 'success' : 'neutral'}>
                  {profile.isGSTRegistered ? 'GST Registered' : 'Unregistered Business'}
                </Badge>

                {profile.enableTDS && <Badge tone="info">TDS Enabled</Badge>}

                {profile.enableTCS && <Badge tone="info">TCS Enabled</Badge>}

                {Array.isArray(profile.additionalDetails) && profile.additionalDetails.map((item, idx) => (
                  <Badge key={idx} tone="neutral" className="font-medium">
                    {item.key}: {item.value}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Create / Edit Profile Modal ─── */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        closeOnBackdrop={!saving}
        size="lg"
        title={editingProfileId ? 'Edit Invoice Profile' : 'Create New Invoice Profile'}
        subtitle="The business details printed on invoices raised with this profile."
        footer={
          loading ? undefined : (
            <>
              <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="invoice-profile-form"
                disabled={saving}
                loading={saving}
                startIcon={<Save className="size-4" />}
              >
                {saving ? 'Saving...' : editingProfileId ? 'Update Profile' : 'Create Profile'}
              </Button>
            </>
          )
        }
      >
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading profile" />
          </div>
        ) : (
          <form id="invoice-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Section 1: Profile & Identity */}
            <FormBlock title="Profile & Identity">
              <FormGrid cols={2}>
                <Field label="Profile Name" required error={formErrors.name}>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="e.g. GST Profile, Primary Profile"
                    error={!!formErrors.name}
                  />
                </Field>

                <Field label="Legal Business Name" required error={formErrors.businessName}>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="e.g. Acme India Pvt Ltd"
                    error={!!formErrors.businessName}
                    startIcon={<Building />}
                  />
                </Field>

                <Field label="Company Email" required error={formErrors.companyEmail}>
                  <Input
                    id="companyEmail"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="finance@company.com"
                    error={!!formErrors.companyEmail}
                    startIcon={<Mail />}
                  />
                </Field>

                <Field label="Company Phone" required error={formErrors.companyPhone}>
                  <Input
                    id="companyPhone"
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="10-digit mobile"
                    error={!!formErrors.companyPhone}
                    startIcon={<Phone />}
                  />
                </Field>
              </FormGrid>
            </FormBlock>

            {/* Section 2: Billing Address */}
            <FormBlock title="Billing Address">
              <FormGrid cols={3}>
                {/* First ask Pincode */}
                <Field label="Pincode" hint="City & state fill in from a 6-digit PIN">
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    disabled={saving}
                    placeholder="e.g. 400001"
                    maxLength={6}
                    inputMode="numeric"
                    endIcon={pincodeLoading ? <Loader2 className="animate-spin text-brand" /> : undefined}
                  />
                </Field>

                <Field label="City">
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="City"
                  />
                </Field>

                <Field label="State">
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="State"
                  />
                </Field>

                <Field label="Full Address" className="col-span-full">
                  <Input
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="Street address, building, floor..."
                  />
                </Field>
              </FormGrid>
            </FormBlock>

            {/* Section 3: Tax Details & Preferences */}
            <FormBlock title="Tax Registrations & Preferences">
              <div className="rounded-control bg-fill-2 px-4 py-3">
                <SettingRow title="GST Registered" description="GSTIN becomes required and tax invoices are issued">
                  <Switch
                    checked={formData.isGSTRegistered}
                    onChange={(checked) => setFormData((p) => ({ ...p, isGSTRegistered: checked }))}
                    disabled={saving}
                  />
                </SettingRow>
                <SettingRow title="Enable TDS">
                  <Switch
                    checked={formData.enableTDS}
                    onChange={(checked) => setFormData((p) => ({ ...p, enableTDS: checked }))}
                    disabled={saving}
                  />
                </SettingRow>
                <SettingRow title="Enable TCS">
                  <Switch
                    checked={formData.enableTCS}
                    onChange={(checked) => setFormData((p) => ({ ...p, enableTCS: checked }))}
                    disabled={saving}
                  />
                </SettingRow>
              </div>

              <FormGrid cols={2}>
                <Field label="GSTIN Number" required={formData.isGSTRegistered} error={formErrors.gstin}>
                  <Input
                    id="gstin"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="27AAQCP3629R1ZF"
                    className="font-mono uppercase"
                    error={!!formErrors.gstin}
                  />
                </Field>

                <Field label="PAN Number">
                  <Input
                    id="panNumber"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="AAQCP3629R"
                    className="font-mono uppercase"
                  />
                </Field>
              </FormGrid>
            </FormBlock>

            {/* Section 4: Bank Details */}
            <FormBlock title="Bank Details (Optional)">
              <FormGrid cols={2}>
                <Field label="Bank Name">
                  <Input
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="HDFC Bank"
                  />
                </Field>

                <Field label="Account Holder Name">
                  <Input
                    id="accountHolderName"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="Acme Pvt Ltd"
                  />
                </Field>
              </FormGrid>

              <FormGrid cols={3}>
                <Field label="Account Number">
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="987654321012"
                    className="font-mono"
                  />
                </Field>

                <Field label="IFSC Code">
                  <Input
                    id="ifscCode"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="HDFC0001234"
                    className="font-mono uppercase"
                  />
                </Field>

                <Field label="UPI ID">
                  <Input
                    id="upiId"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    disabled={saving}
                    placeholder="acme@hdfc"
                  />
                </Field>
              </FormGrid>
            </FormBlock>

            {/* Section 5: Additional Custom Attributes */}
            <FormBlock
              title="Additional Custom Attributes"
              icon={Globe}
              actions={
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleAddKeyValue}
                  startIcon={<PlusCircle className="size-3.5" />}
                >
                  Add Attribute
                </Button>
              }
            >
              {formData.additionalDetails.length === 0 && (
                <p className="m-0 text-xs text-ink-subtle">Extra lines printed on the invoice, e.g. Website or FSSAI No.</p>
              )}
              {formData.additionalDetails.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Key (e.g. Website)"
                    value={item.key}
                    onChange={(e) => handleKeyValueChange(index, 'key', e.target.value)}
                    disabled={saving}
                    aria-label="Attribute name"
                    wrapperClassName="flex-1"
                  />
                  <Input
                    placeholder="Value (e.g. www.acme.com)"
                    value={item.value}
                    onChange={(e) => handleKeyValueChange(index, 'value', e.target.value)}
                    disabled={saving}
                    aria-label="Attribute value"
                    wrapperClassName="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveKeyValue(index)}
                    aria-label="Remove attribute"
                    title="Remove"
                    className="text-danger"
                  >
                    <MinusCircle className="size-4" />
                  </Button>
                </div>
              ))}
            </FormBlock>

            {/* Section 6: Default Switch */}
            <div className="rounded-control bg-fill-2 px-4 py-3">
              <SettingRow title="Set as Default Invoice Profile" description="Used for new invoices unless you pick another">
                <Switch
                  checked={formData.isDefault}
                  onChange={(checked) => setFormData((p) => ({ ...p, isDefault: checked }))}
                  disabled={saving}
                />
              </SettingRow>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Delete Confirmation Modal ─── */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Invoice Profile"
        message="Are you sure you want to delete this invoice profile? Invoices generated with this profile will retain their saved record."
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* ─── Toast Notifications ─── */}
      {createPortal(
        <ToastStack toasts={toasts} />,
        document.body
      )}
    </div>
  );
}

/** Titled group inside the profile modal. */
function FormBlock({ title, icon: Icon, actions, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="m-0 flex items-center gap-1.5 !text-xs !font-bold uppercase tracking-wider text-ink-subtle">
          {Icon && <Icon className="size-3.5" aria-hidden="true" />}
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </div>
  );
}
