import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import PurchaseToaster from '../components/PurchaseToaster';
import { Field, PageLoading, PageShell, Section, TextArea } from '../components/ui';
import { notify, notifyError } from '../components/toast';
import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX, STATE_CODES, decId, errMsg, num, stateName, viewPath } from '../components/helpers';
import { createSupplier, fetchSupplier, updateSupplier } from './services/supplierSlice';

const STATE_OPTIONS = Object.entries(STATE_CODES).map(([code, name]) => ({ value: code, label: `${name} (${code})` }));

const defaults = (s) => ({
  name: s?.name || '',
  companyName: s?.companyName || '',
  phone: s?.phone || '',
  email: s?.email || '',
  gstin: s?.gstin || '',
  stateCode: s?.stateCode || '',
  pan: s?.pan || '',
  address: {
    street: s?.address?.street || '',
    city: s?.address?.city || '',
    state: s?.address?.state || '',
    pincode: s?.address?.pincode || '',
    country: s?.address?.country || 'India',
  },
  bankDetails: {
    accountName: s?.bankDetails?.accountName || '',
    accountNumber: s?.bankDetails?.accountNumber || '',
    ifsc: s?.bankDetails?.ifsc || '',
    bankName: s?.bankDetails?.bankName || '',
    upiId: s?.bankDetails?.upiId || '',
  },
  openingBalance: s ? String(s.openingBalance ?? 0) : '',
  paymentTermsDays: s ? String(s.paymentTermsDays ?? 0) : '',
  notes: s?.notes || '',
  isActive: s ? s.isActive !== false : true,
});

function SupplierFormBody({ initial }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.supplier.saving);
  const isEdit = !!initial;
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm({ defaultValues: defaults(initial) });

  const gstin = useWatch({ control, name: 'gstin' });
  const stateCode = useWatch({ control, name: 'stateCode' });
  const notes = useWatch({ control, name: 'notes' });
  const gstinValid = !!gstin && GSTIN_REGEX.test(gstin);

  const onGstinChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15);
    setValue('gstin', value, { shouldValidate: value.length === 15 });
    if (GSTIN_REGEX.test(value)) {
      const code = value.slice(0, 2);
      setValue('stateCode', code);
      if (!getValues('pan')) setValue('pan', value.slice(2, 12));
      if (!getValues('address.state') && stateName(code)) setValue('address.state', stateName(code));
    }
  };

  const onPincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue('address.pincode', val);
    if (val.length !== 6) return;
    setPincodeLoading(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
      const data = await response.json();
      const po = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null;
      if (po) {
        if (!getValues('address.city')) setValue('address.city', po.District || po.Block || '');
        if (!getValues('address.state')) setValue('address.state', po.State || '');
      }
    } catch {
      // Pincode lookup is only a convenience.
    } finally {
      setPincodeLoading(false);
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      name: data.name.trim(),
      gstin: data.gstin.trim().toUpperCase(),
      pan: data.pan.trim().toUpperCase(),
      bankDetails: { ...data.bankDetails, ifsc: data.bankDetails.ifsc.trim().toUpperCase() },
      openingBalance: num(data.openingBalance),
      paymentTermsDays: Math.max(0, Math.round(num(data.paymentTermsDays))),
    };
    try {
      const res = isEdit
        ? await dispatch(updateSupplier({ id: initial._id, payload })).unwrap()
        : await dispatch(createSupplier(payload)).unwrap();
      notify(res?.message || (isEdit ? 'Supplier updated' : 'Supplier added'));
      navigate(viewPath('suppliers', res?.data?._id || initial?._id), { replace: true });
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  const err = (path) => path.split('.').reduce((o, k) => o?.[k], errors)?.message;

  return (
    <PageShell title={isEdit ? `Edit supplier - ${initial.name}` : 'Add supplier'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Section title="Basic details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Supplier / contact name" required error={err('name')}>
              <Input placeholder="e.g. Sharma Traders" error={!!err('name')} {...register('name', { required: 'Name is required', maxLength: { value: 120, message: 'Keep it under 120 characters' } })} />
            </Field>
            <Field label="Company name" error={err('companyName')}>
              <Input placeholder="Registered business name" {...register('companyName', { maxLength: { value: 150, message: 'Too long' } })} />
            </Field>
            <Field label="Phone" error={err('phone')}>
              <Input
                placeholder="10-digit mobile"
                inputMode="tel"
                error={!!err('phone')}
                {...register('phone', { pattern: { value: /^[0-9+\-\s]{6,20}$/, message: 'Enter a valid phone number' } })}
              />
            </Field>
            <Field label="Email" error={err('email')}>
              <Input
                type="email"
                placeholder="accounts@supplier.com"
                error={!!err('email')}
                {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })}
              />
            </Field>
            <Field label="Credit period (days)" hint="Bill due date = bill date + these days" error={err('paymentTermsDays')}>
              <Input
                type="number"
                min="0"
                max="365"
                placeholder="0"
                error={!!err('paymentTermsDays')}
                {...register('paymentTermsDays', {
                  validate: (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 365) || 'Enter 0 to 365 days',
                })}
              />
            </Field>
            <Field
              label="Opening balance (₹)"
              hint={isEdit ? 'Amount you owed before using the app. Locked once bills or payments exist.' : 'Amount you already owe this supplier. Use a negative amount for an advance.'}
              error={err('openingBalance')}
            >
              <Input type="number" step="0.01" placeholder="0.00" {...register('openingBalance')} />
            </Field>
          </div>
        </Section>

        <Section title="GST & tax">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="GSTIN"
              error={err('gstin')}
              hint={gstinValid ? `Valid GSTIN · ${stateName(gstin.slice(0, 2)) || 'State'} (${gstin.slice(0, 2)})` : 'Leave empty for unregistered suppliers (no input tax credit).'}
            >
              <Input
                placeholder="e.g. 27AAPFU0939F1ZV"
                className="font-mono uppercase"
                error={!!err('gstin')}
                {...register('gstin', {
                  validate: (v) => !v || GSTIN_REGEX.test(v) || 'Enter a valid 15-character GSTIN',
                  onChange: onGstinChange,
                })}
              />
            </Field>
            <Field label="State (place of supply)" hint={stateCode ? 'Decides CGST + SGST or IGST on bills' : 'Filled from the GSTIN automatically'}>
              <input type="hidden" {...register('stateCode')} />
              <Select
                options={STATE_OPTIONS}
                value={stateCode || ''}
                placeholder="Type to search state"
                onChange={(code) => {
                  setValue('stateCode', code || '', { shouldDirty: true });
                  // Fill the address state too, if it is still empty.
                  if (code && !getValues('address.state') && stateName(code)) {
                    setValue('address.state', stateName(code), { shouldDirty: true });
                  }
                }}
              />
            </Field>
            <Field label="PAN" error={err('pan')}>
              <Input
                placeholder="ABCDE1234F"
                className="font-mono uppercase"
                error={!!err('pan')}
                {...register('pan', {
                  setValueAs: (v) => String(v || '').toUpperCase().trim(),
                  validate: (v) => !v || PAN_REGEX.test(v) || 'Enter a valid 10-character PAN',
                })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Address">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Street / area" className="md:col-span-2 lg:col-span-4">
              <Input placeholder="Shop no, building, street" {...register('address.street')} />
            </Field>
            <Field label="Pincode">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="6 digits"
                endIcon={pincodeLoading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : null}
                {...register('address.pincode', { onChange: onPincodeChange })}
              />
            </Field>
            <Field label="City">
              <Input {...register('address.city')} />
            </Field>
            <Field label="State">
              <Input {...register('address.state')} />
            </Field>
            <Field label="Country">
              <Input {...register('address.country')} />
            </Field>
          </div>
        </Section>

        <Section title="Bank details (for payments)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Account holder name">
              <Input {...register('bankDetails.accountName')} />
            </Field>
            <Field label="Account number" error={err('bankDetails.accountNumber')}>
              <Input
                inputMode="numeric"
                error={!!err('bankDetails.accountNumber')}
                {...register('bankDetails.accountNumber', { pattern: { value: /^[0-9]{6,20}$/, message: 'Digits only (6 to 20)' } })}
              />
            </Field>
            <Field label="IFSC" error={err('bankDetails.ifsc')}>
              <Input
                className="font-mono uppercase"
                placeholder="SBIN0001234"
                error={!!err('bankDetails.ifsc')}
                {...register('bankDetails.ifsc', {
                  setValueAs: (v) => String(v || '').toUpperCase().trim(),
                  validate: (v) => !v || IFSC_REGEX.test(v) || 'Enter a valid 11-character IFSC',
                })}
              />
            </Field>
            <Field label="Bank name">
              <Input {...register('bankDetails.bankName')} />
            </Field>
            <Field label="UPI ID" error={err('bankDetails.upiId')}>
              <Input
                placeholder="name@bank"
                error={!!err('bankDetails.upiId')}
                {...register('bankDetails.upiId', { pattern: { value: /^[\w.-]{2,}@[\w.-]{2,}$/, message: 'Enter a valid UPI ID' } })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Notes">
          <TextArea value={notes} onChange={(v) => setValue('notes', v)} rows={3} placeholder="Delivery days, contact person, anything useful" />
          {isEdit && (
            <label className="mt-4 flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600" {...register('isActive')} />
              Active (inactive suppliers can't be picked on new orders or bills)
            </label>
          )}
        </Section>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
            {isEdit ? 'Save changes' : 'Add supplier'}
          </Button>
        </div>
      </form>
      <PurchaseToaster />
    </PageShell>
  );
}

/** Used for both purchase/suppliers/create and purchase/suppliers/edit/:id */
export default function SupplierForm() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.supplier);

  useEffect(() => {
    if (id) dispatch(fetchSupplier(id));
  }, [dispatch, id]);

  if (!encryptedId) return <SupplierFormBody key="new" initial={null} />;
  if (!id) return <PageLoading title="Edit supplier" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit supplier" error={currentError} />;
  return <SupplierFormBody key={current._id} initial={current} />;
}
