import { STATE_CODES } from '@/pages/purchase/components/helpers';

export const STATE_OPTIONS = Object.values(STATE_CODES).map((s) => ({ value: s, label: s }));

export const EMPTY_BUSINESS = {
  businessName: '', companyPhone: '', companyEmail: '', state: '', city: '', pincode: '', billingAddress: '',
};

/** What is wrong with the form, per field (same rules as the server). */
export const businessErrors = (f) => {
  const e = {};
  if (!f.businessName.trim() || f.businessName.trim().length < 2) e.businessName = 'Enter the business name';
  if (f.companyPhone && !/^\d{10}$/.test(f.companyPhone)) e.companyPhone = 'Enter a 10-digit mobile number';
  if (f.companyEmail && !/^\S+@\S+\.\S+$/.test(f.companyEmail)) e.companyEmail = 'Enter a valid email';
  if (f.pincode && !/^\d{6}$/.test(f.pincode)) e.pincode = 'Enter a 6-digit PIN code';
  return e;
};
