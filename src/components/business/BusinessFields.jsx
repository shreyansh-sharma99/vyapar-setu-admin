import { useState } from 'react';
import { Field, FormGrid, Input, Select } from '@/components/ui';
import { STATE_OPTIONS } from './businessForm';

/**
 * Name, contact and address of a business. Controlled: value + onChange(nextValue).
 * A 6-digit PIN fills city and state. GST details are added later in Invoice Settings.
 */
export default function BusinessFields({ value, onChange, errors = {}, disabled }) {
  const [pinLoading, setPinLoading] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  const onPincode = async (raw) => {
    const pincode = raw.replace(/\D/g, '').slice(0, 6);
    set({ pincode });
    if (pincode.length !== 6) return;
    setPinLoading(true);
    try {
      const data = await (await fetch(`https://api.postalpincode.in/pincode/${pincode}`)).json();
      const po = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null;
      if (po) onChange({ ...value, pincode, city: po.District || po.Block || value.city, state: po.State || value.state });
    } catch {
      // the lookup is only a help; the owner can type city and state
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <FormGrid cols={2}>
        <Field label="Business name" required error={errors.businessName} className="col-span-full">
          <Input value={value.businessName} onChange={(e) => set({ businessName: e.target.value })} disabled={disabled} placeholder="e.g. Sharma Electronics (Rajasthan)" maxLength={120} autoFocus />
        </Field>
        <Field label="Mobile" error={errors.companyPhone}>
          <Input value={value.companyPhone} onChange={(e) => set({ companyPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} disabled={disabled} inputMode="numeric" placeholder="10-digit mobile" />
        </Field>
        <Field label="Email" error={errors.companyEmail}>
          <Input type="email" value={value.companyEmail} onChange={(e) => set({ companyEmail: e.target.value.trim() })} disabled={disabled} placeholder="accounts@business.in" />
        </Field>
      </FormGrid>

      <FormGrid cols={2}>
        <Field label="PIN code" error={errors.pincode} hint={pinLoading ? 'Finding city and state…' : 'Fills city and state'}>
          <Input value={value.pincode} onChange={(e) => onPincode(e.target.value)} disabled={disabled} inputMode="numeric" placeholder="6 digits" />
        </Field>
        <Field label="City">
          <Input value={value.city} onChange={(e) => set({ city: e.target.value })} disabled={disabled} placeholder="City" />
        </Field>
        <Field label="State" error={errors.state}>
          <Select options={STATE_OPTIONS} value={value.state || null} onChange={(v) => set({ state: v || '' })} disabled={disabled} placeholder="Select state" clearable />
        </Field>
        <Field label="Address">
          <Input value={value.billingAddress} onChange={(e) => set({ billingAddress: e.target.value })} disabled={disabled} placeholder="Shop no., street, area" />
        </Field>
      </FormGrid>
    </div>
  );
}
