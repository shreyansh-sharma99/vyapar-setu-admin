import AsyncSearchSelect from './AsyncSearchSelect';
import { searchSuppliersApi } from '../services/productService';

const fetchSuppliers = async (query) => {
  const res = await searchSuppliersApi(query, 20);
  return (res?.data || []).map((s) => ({
    value: s._id,
    label: s.name,
    sublabel: [s.companyName, s.phone].filter(Boolean).join(' · '),
    raw: s,
  }));
};

/** Preferred supplier picker (GET /suppliers?search=&limit=20). */
export default function SupplierPicker({ value, label, onChange, disabled }) {
  return (
    <AsyncSearchSelect
      value={value}
      selectedLabel={label}
      fetchOptions={fetchSuppliers}
      onChange={(opt) => onChange(opt ? { id: opt.value, name: opt.label } : null)}
      placeholder="Search supplier by name or phone"
      emptyText="No suppliers found"
      disabled={disabled}
    />
  );
}
