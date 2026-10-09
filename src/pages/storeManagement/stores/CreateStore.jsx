import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store as StoreIcon,
  Loader2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Hash,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Switch from '@/components/inputs/Switch';
import { createStore, clearStoreStatus } from './services/storeSlice';

export default function CreateStore() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { saving, error } = useSelector((state) => state.store);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    isDefault: false,
    isActive: true, // Default to true, hidden in Add mode
  });

  const [errors, setErrors] = useState({});
  const [pincodeLoading, setPincodeLoading] = useState(false);

  useEffect(() => {
    dispatch(clearStoreStatus());
  }, [dispatch]);

  const setAddressField = (field, value) => {
    setFormData((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Auto-fetch city & state from Indian Pincode API
  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressField('pincode', pin);

    if (pin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setFormData((prev) => ({
            ...prev,
            address: {
              ...prev.address,
              city: po.District || po.Block || prev.address.city,
              state: po.State || prev.address.state,
              country: po.Country || 'India',
            },
          }));
          setErrors((prev) => ({ ...prev, city: null, state: null, pincode: null }));
        }
      } catch (err) {
        console.error('Pincode lookup error:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Store / Warehouse Name is required';
    if (formData.phone && !/^\+?[0-9\s-]{8,15}$/.test(formData.phone)) {
      errs.phone = 'Please enter a valid phone number';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (formData.address.pincode && !/^\d{6}$/.test(formData.address.pincode)) {
      errs.pincode = 'PIN Code must be 6 digits';
    }
    if (!formData.address.city.trim()) errs.city = 'City is required';
    if (!formData.address.state.trim()) errs.state = 'State is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await dispatch(createStore(formData)).unwrap();
      dispatch(clearStoreStatus());
      const code = res?.data?.code;
      navigate('/stores', {
        state: {
          message: code ? `Store created successfully (Code: ${code})` : 'Store created successfully',
          color: 'success',
        },
      });
    } catch {
      // error is shown from redux state
    }
  };

  return (
    <div className="w-full min-h-screen pb-12 text-[var(--vs-text-primary)]">
      <Card
        h1="Add Store / Warehouse"
        buttonName="Back"
        navigation="/stores"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Basic Store Information */}
          <Card title="Store & Contact Details" bodyClassName="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Store Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">
                  Store / Warehouse Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Central Warehouse, Downtown Retail Outlet"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                    }}
                    className={errors.name ? '!border-red-500' : ''}
                  />
                  <StoreIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
              </div>

              {/* Contact Person */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactPerson">Contact Person / Manager</Label>
                <div className="relative">
                  <Input
                    id="contactPerson"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                  <User className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                    }}
                    className={errors.phone ? '!border-red-500' : ''}
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. warehouse@vyaparsetu.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    className={errors.email ? '!border-red-500' : ''}
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
              </div>
            </div>

            {/* Auto-generated code info */}
            <div className="mt-5 flex items-start gap-3 p-3.5 rounded-xl bg-[var(--vs-active-bg)] border border-indigo-100 dark:border-indigo-500/20">
              <Hash className="w-4 h-4 text-[var(--vs-active-text)] shrink-0 mt-0.5" />
              <p className="!mb-0 text-xs text-[var(--vs-text-secondary)] leading-relaxed">
                <span className="font-semibold text-[var(--vs-text-primary)]">Store Code is generated automatically</span>{' '}
                on save from City, State and Locality — e.g.{' '}
                <span className="font-mono font-semibold text-[var(--vs-active-text)]">JP-RJ-MN-001</span>{' '}
                (Jaipur · Rajasthan · Malviya Nagar · 1st store).
              </p>
            </div>
          </Card>

          {/* Section 2: Address */}
          <Card title="Address & Location Details" bodyClassName="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="street">Street Address / Building</Label>
                <Input
                  id="street"
                  type="text"
                  placeholder="e.g. Plot No 42, Sector 18"
                  value={formData.address.street}
                  onChange={(e) => setAddressField('street', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="area">Area / Locality / Landmark</Label>
                <Input
                  id="area"
                  type="text"
                  placeholder="e.g. Malviya Nagar"
                  value={formData.address.area}
                  onChange={(e) => setAddressField('area', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pincode">PIN Code</Label>
                <div className="relative">
                  <Input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 302017"
                    value={formData.address.pincode}
                    onChange={handlePincodeChange}
                    className={`font-mono ${errors.pincode ? '!border-red-500' : ''}`}
                  />
                  {pincodeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>
                {errors.pincode ? (
                  <span className="text-red-500 text-xs">{errors.pincode}</span>
                ) : (
                  <span className="text-[11px] text-[var(--vs-text-secondary)]">City & State are filled automatically.</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="e.g. Jaipur"
                  value={formData.address.city}
                  onChange={(e) => setAddressField('city', e.target.value)}
                  className={errors.city ? '!border-red-500' : ''}
                />
                {errors.city && <span className="text-red-500 text-xs">{errors.city}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="e.g. Rajasthan"
                  value={formData.address.state}
                  onChange={(e) => setAddressField('state', e.target.value)}
                  className={errors.state ? '!border-red-500' : ''}
                />
                {errors.state && <span className="text-red-500 text-xs">{errors.state}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => setAddressField('country', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Store Preferences */}
          <Card title="Store Settings & Default Status" bodyClassName="p-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
              <div>
                <div className="font-semibold text-sm text-[var(--vs-text-primary)]">
                  Set as Default Dispatch Store
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  This store will be pre-selected automatically when generating invoices and billing sales.
                </div>
              </div>
              <Switch
                checked={formData.isDefault}
                onChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>
            {/* NOTE: Active Status is NOT displayed when adding a store, per requirement */}
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/stores')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="flex items-center gap-2 px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Store...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Store</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
