import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store as StoreIcon,
  MapPin,
  Search,
  Loader2,
  Building2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import {
  getStoreById,
  updateStore,
  clearStoreStatus,
} from './services/storeSlice';

export default function UpdateStore() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentStore, loading, saving, error, successMessage } = useSelector(
    (state) => state.store
  );

  const [formData, setFormData] = useState({
    name: '',
    code: '',
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
      formattedAddress: '',
      latitude: null,
      longitude: null,
    },
    isDefault: false,
    isActive: true, // Visible in Edit mode!
  });

  const [errors, setErrors] = useState({});

  // Location suggestions state
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    dispatch(clearStoreStatus());
    if (id) {
      dispatch(getStoreById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentStore && currentStore._id === id) {
      setFormData({
        name: currentStore.name || '',
        code: currentStore.code || '',
        contactPerson: currentStore.contactPerson || '',
        phone: currentStore.phone || '',
        email: currentStore.email || '',
        address: {
          street: currentStore.address?.street || '',
          area: currentStore.address?.area || '',
          city: currentStore.address?.city || '',
          state: currentStore.address?.state || '',
          pincode: currentStore.address?.pincode || '',
          country: currentStore.address?.country || 'India',
          formattedAddress: currentStore.address?.formattedAddress || '',
          latitude: currentStore.address?.latitude || null,
          longitude: currentStore.address?.longitude || null,
        },
        isDefault: !!currentStore.isDefault,
        isActive: currentStore.isActive !== undefined ? currentStore.isActive : true,
      });
      setLocationQuery(currentStore.address?.formattedAddress || '');
    }
  }, [currentStore, id]);

  useEffect(() => {
    if (successMessage) {
      dispatch(clearStoreStatus());
      navigate('/stores');
    }
  }, [successMessage, dispatch, navigate]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle location search input with debounce (Photon OpenStreetMap API)
  const handleLocationSearchChange = (e) => {
    const query = e.target.value;
    setLocationQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`
        );
        const data = await response.json();
        if (data && data.features) {
          const parsed = data.features.map((item) => {
            const props = item.properties || {};
            const coords = item.geometry?.coordinates || [null, null];
            return {
              formattedAddress: [props.name, props.street, props.city, props.state, props.country]
                .filter(Boolean)
                .join(', '),
              name: props.name || '',
              street: props.street || '',
              city: props.city || props.district || props.county || '',
              state: props.state || '',
              pincode: props.postcode || '',
              country: props.country || 'India',
              latitude: coords[1],
              longitude: coords[0],
            };
          });
          setSuggestions(parsed);
          setShowSuggestions(parsed.length > 0);
        }
      } catch (err) {
        console.error('Error fetching location suggestions:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        street: suggestion.street || suggestion.name || prev.address.street,
        city: suggestion.city || prev.address.city,
        state: suggestion.state || prev.address.state,
        pincode: suggestion.pincode || prev.address.pincode,
        country: suggestion.country || 'India',
        formattedAddress: suggestion.formattedAddress,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      },
    }));
    setLocationQuery(suggestion.formattedAddress);
    setShowSuggestions(false);
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.trim();
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, pincode: pin },
    }));

    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
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
              city: po.District || po.Division || prev.address.city,
              state: po.State || prev.address.state,
              area: po.Name || prev.address.area,
            },
          }));
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    await dispatch(
      updateStore({
        id,
        // Store code is system generated and cannot be changed
        payload: { ...formData, code: undefined },
      })
    );
  };

  if (loading && !currentStore) {
    return (
      <div className="w-full min-h-screen pb-12 text-[var(--vs-text-primary)]">
        <Card
          h1="Edit Store / Warehouse"
          buttonName="Back"
          navigation="/stores"
          buttonVariant="danger"
          buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          bodyClassName="p-12 flex flex-col items-center justify-center gap-4"
        >
          <Loader />
          <p className="text-sm text-gray-500">Loading store details...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-12 text-[var(--vs-text-primary)]">
      <Card
        h1="Edit Store / Warehouse"
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
          <Card title="Store & Identification Details" bodyClassName="p-6">
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

              {/* Store Code / Identifier */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Store Code / Identifier</Label>
                <div className="relative flex items-center">
                  <Input
                    id="code"
                    type="text"
                    value={formData.code}
                    readOnly
                    disabled
                    className="font-mono tracking-wider uppercase font-semibold text-indigo-600 dark:text-indigo-400 cursor-not-allowed"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
                </div>
                <p className="!mb-0 text-[11px] text-gray-500 dark:text-gray-400">
                  Auto-generated on creation. Locked as it is used in invoices and audit logs.
                </p>
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
          </Card>

          {/* Section 2: Address & Location with Smart Auto-Suggestions */}
          <Card title="Address & Location Details" bodyClassName="p-6">
            <div className="flex flex-col gap-y-5">
              <div className="relative" ref={suggestionsRef}>
                <Label htmlFor="locationSearch">
                  Smart Address Search (Auto-Suggest with OpenStreetMap)
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="locationSearch"
                    type="text"
                    placeholder="Search building, street, area, city or landmark..."
                    value={locationQuery}
                    onChange={handleLocationSearchChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="pr-10 !h-11"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
                    {isSearchingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-start gap-2.5 cursor-pointer text-xs"
                      >
                        <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {item.name || item.formattedAddress.split(',')[0]}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-[11px] line-clamp-1">
                            {item.formattedAddress}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="street">Street Address / Building</Label>
                  <Input
                    id="street"
                    type="text"
                    placeholder="e.g. Plot No 42, Sector 18"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="area">Area / Locality / Landmark</Label>
                  <Input
                    id="area"
                    type="text"
                    placeholder="e.g. Udyog Vihar Phase 4"
                    value={formData.address.area}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, area: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pincode">PIN Code (Auto-fetches City & State)</Label>
                  <div className="relative">
                    <Input
                      id="pincode"
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 110001"
                      value={formData.address.pincode}
                      onChange={handlePincodeChange}
                      className="font-mono"
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="e.g. Delhi"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    value={formData.address.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, country: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Store Preferences (Includes Active Status ONLY in Edit Mode) */}
          <Card title="Store Settings & Status" bodyClassName="p-6">
            <div className="flex flex-col gap-y-4">
              {/* Default Store Toggle */}
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

              {/* Active Status Toggle (Shown ONLY at the time of Edit) */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--vs-text-primary)]">
                      Active Status
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        formData.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Inactive stores will be hidden from new sales invoices and dispatch options.
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
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
                  <span>Updating Store...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Store</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
