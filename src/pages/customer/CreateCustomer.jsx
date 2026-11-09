import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Field, FormActions, FormGrid, Input, PageHeader, Section, Select } from '@/components/ui';
import { createCustomer, resetCustomerStatus } from './services/customerSlice';

export default function CreateCustomer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, success } = useSelector((state) => state.customer);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'active',
      gstin: '',
      stateCode: '',
      creditLimit: '',
      openingBalance: '',
      address: {
        type: 'home',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        isDefault: true,
      },
    },
  });

  useEffect(() => {
    dispatch(resetCustomerStatus());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      reset();
      dispatch(resetCustomerStatus());
      navigate('/customers');
    }
  }, [success, dispatch, reset, navigate]);

  const handlePincodeChange = async (e) => {
    const val = e.target.value.trim();
    setValue('address.pincode', val);

    if (val.length === 6 && /^\d{6}$/.test(val)) {
      setPincodeLoading(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          if (postOffice) {
            setValue('address.city', postOffice.District || postOffice.Block || '');
            setValue('address.state', postOffice.State || '');
            setValue('address.country', postOffice.Country || 'India');
          }
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const onSubmit = (data) => {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin || '',
      stateCode: data.stateCode || '',
      creditLimit: Number(data.creditLimit) || 0,
      openingBalance: Number(data.openingBalance) || 0,
      status: 'active',
      addresses: [
        {
          ...data.address,
          isDefault: true,
        },
      ],
    };
    dispatch(createCustomer(payload));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create Customer"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Section title="Basic Information" description="Name, contact and billing details">
          <FormGrid cols={2}>
            <Field label="First Name" required error={errors.firstName?.message}>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                {...register('firstName', { required: 'First name is required' })}
              />
            </Field>

            <Field label="Last Name" required error={errors.lastName?.message}>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                {...register('lastName', { required: 'Last name is required' })}
              />
            </Field>

            <Field label="Email Address" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
                })}
              />
            </Field>

            <Field label="Phone Number" required error={errors.phone?.message}>
              <Input
                id="phone"
                type="text"
                placeholder="Enter phone number"
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: { value: /^\d{10}$/, message: 'Must be a 10 digit number' }
                })}
              />
            </Field>

            <Field label="GSTIN" error={errors.gstin?.message}>
              <Input
                id="gstin"
                type="text"
                placeholder="e.g. 07AAQCP3629R1ZF"
                {...register('gstin', {
                  validate: value => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(value) || 'Invalid GSTIN format',
                  onChange: (e) => {
                    const val = e.target.value.toUpperCase();
                    setValue('gstin', val);
                    if (val.length >= 2) {
                      const code = val.substring(0, 2);
                      if (/^\d{2}$/.test(code)) {
                        setValue('stateCode', code);
                      }
                    }
                  }
                })}
              />
            </Field>

            <Field label="State Code" error={errors.stateCode?.message}>
              <Input
                id="stateCode"
                type="text"
                placeholder="e.g. 07"
                maxLength={2}
                {...register('stateCode', {
                  validate: value => !value || /^\d{2}$/.test(value) || 'State code must be 2 digits',
                })}
              />
            </Field>

            <Field label="Credit Limit" error={errors.creditLimit?.message}>
              <Input
                id="creditLimit"
                type="number"
                placeholder="e.g. 50000"
                {...register('creditLimit', {
                  min: { value: 0, message: 'Credit limit cannot be negative' }
                })}
              />
            </Field>

            <Field label="Opening Balance" error={errors.openingBalance?.message}>
              <Input
                id="openingBalance"
                type="number"
                placeholder="e.g. 0"
                {...register('openingBalance')}
              />
            </Field>
          </FormGrid>
        </Section>

        <Section title="Address Details" description="Billing address for this customer">
          <FormGrid cols={3}>
            <Controller
              name="address.type"
              control={control}
              render={({ field }) => (
                <Field label="Address Type">
                  <Select
                    options={[
                      { value: 'home', label: 'Home' },
                      { value: 'work', label: 'Work' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Field label="PIN Code" required error={errors.address?.pincode?.message}>
              <Input
                id="pincode"
                type="text"
                placeholder="Enter 6-digit PIN code"
                endIcon={pincodeLoading ? <Loader2 className="animate-spin text-brand" /> : undefined}
                {...register('address.pincode', {
                  required: 'PIN Code is required',
                  pattern: { value: /^\d{6}$/, message: 'Must be 6 digits' }
                })}
                onChange={handlePincodeChange}
              />
            </Field>

            <Field label="Street Address" required error={errors.address?.street?.message}>
              <Input
                id="street"
                type="text"
                placeholder="e.g. Apartment, Suite, House No, Street name"
                {...register('address.street', { required: 'Street Address is required' })}
              />
            </Field>

            <Field label="City / District" required error={errors.address?.city?.message}>
              <Input
                id="city"
                type="text"
                placeholder="City"
                {...register('address.city', { required: 'City is required' })}
              />
            </Field>

            <Field label="State" required error={errors.address?.state?.message}>
              <Input
                id="state"
                type="text"
                placeholder="State"
                {...register('address.state', { required: 'State is required' })}
              />
            </Field>

            <Field label="Country" required error={errors.address?.country?.message}>
              <Input
                id="country"
                type="text"
                placeholder="Country"
                {...register('address.country', { required: 'Country is required' })}
              />
            </Field>
          </FormGrid>
        </Section>

        {error && (
          <div className="rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <FormActions>
          <Button variant="secondary" onClick={() => navigate('/customers')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Customer
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
