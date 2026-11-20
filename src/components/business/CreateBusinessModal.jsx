import { useState } from 'react';
import { Button, Modal, toast } from '@/components/ui';
import { createBusinessApi } from '@/pages/business/services/businessService';
import { switchBusiness } from '@/utility/switchBusiness';
import BusinessFields from './BusinessFields';
import { EMPTY_BUSINESS, businessErrors } from './businessForm';

/**
 * New business: its own products, stock, customers, bills, GST and reports.
 * On save the app switches to it. At the plan limit the upgrade pop-up opens instead.
 */
export default function CreateBusinessModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_BUSINESS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const close = () => { if (!saving) { setForm(EMPTY_BUSINESS); setErrors({}); onClose(); } };

  const submit = async (e) => {
    e.preventDefault();
    const found = businessErrors(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await createBusinessApi({ ...form, businessName: form.businessName.trim() });
      toast.success(`${res.data.name} created — opening it now`);
      await switchBusiness(res.data._id);
    } catch (err) {
      const data = err.response?.data || {};
      setSaving(false);
      if (data.code === 'PLAN_LIMIT_REACHED') { onClose(); return; } // Http.js opens the upgrade pop-up
      toast.error(data.message || 'Could not create the business');
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Create a new business"
      subtitle="It gets its own products, stock, customers, bills, GST and reports. You can switch between businesses any time."
      closeOnBackdrop={!saving}
      footer={(
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" form="create-business-form" loading={saving}>Create &amp; open</Button>
        </>
      )}
    >
      <form id="create-business-form" onSubmit={submit} noValidate>
        <BusinessFields value={form} onChange={setForm} errors={errors} disabled={saving} />
      </form>
    </Modal>
  );
}
