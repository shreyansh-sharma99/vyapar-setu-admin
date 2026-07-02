import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
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
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        h1="Create Customer"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* Card 1: Basic Information */}
          <Card title="Basic Information" bodyClassName="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name<span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter first name"
                  error={errors.firstName}
                  {...register('firstName', { required: 'First name is required' })}
                />
                {errors.firstName && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.firstName.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name<span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter last name"
                  error={errors.lastName}
                  {...register('lastName', { required: 'Last name is required' })}
                />
                {errors.lastName && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.lastName.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address<span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  error={errors.email}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
                  })}
                />
                {errors.email && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.email.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number<span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="Enter phone number"
                  error={errors.phone}
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: { value: /^\d{10}$/, message: 'Must be a 10 digit number' }
                  })}
                />
                {errors.phone && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.phone.message}</span>
                )}
              </div>

            </div>
          </Card>

          {/* Card 2: Address Details */}
          <Card title="Address Details" bodyClassName="p-6">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Address Type</Label>
                  <Controller
                    name="address.type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={[
                          { value: 'home', label: 'Home' },
                          { value: 'work', label: 'Work' },
                          { value: 'other', label: 'Other' },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="pincode">PIN Code<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="pincode"
                      type="text"
                      placeholder="Enter 6-digit PIN code"
                      error={errors.address?.pincode}
                      {...register('address.pincode', {
                        required: 'PIN Code is required',
                        pattern: { value: /^\d{6}$/, message: 'Must be 6 digits' }
                      })}
                      onChange={handlePincodeChange}
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      </div>
                    )}
                  </div>
                  {errors.address?.pincode && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address.pincode.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="street">Street Address<span className="text-red-500">*</span></Label>
                  <Input
                    id="street"
                    type="text"
                    placeholder="e.g. Apartment, Suite, House No, Street name"
                    error={errors.address?.street}
                    {...register('address.street', { required: 'Street Address is required' })}
                  />
                  {errors.address?.street && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address.street.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City / District<span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="City"
                    error={errors.address?.city}
                    {...register('address.city', { required: 'City is required' })}
                  />
                  {errors.address?.city && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address.city.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State<span className="text-red-500">*</span></Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="State"
                    error={errors.address?.state}
                    {...register('address.state', { required: 'State is required' })}
                  />
                  {errors.address?.state && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address.state.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="country">Country<span className="text-red-500">*</span></Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Country"
                    error={errors.address?.country}
                    {...register('address.country', { required: 'Country is required' })}
                  />
                  {errors.address?.country && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.address.country.message}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/customers')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              startIcon={loading && <Loader2 className="w-4 h-4 animate-spin" />}
            >
              Create Customer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
