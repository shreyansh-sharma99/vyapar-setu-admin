// Dev-only: preview of the shared catalog helpers (U7 "misc" group) and the Settings modal.
//   /ui-kit/shell/u7-misc/helpers                 alternate units, price checks, search picker
//   /ui-kit/shell/u7-misc/helpers?show=confirm    + products ConfirmDialog (via PriceChangeConfirm)
//   /ui-kit/shell/u7-misc/helpers?show=settings   + header Settings modal
import { createElement as h, useState } from 'react';
import { Section } from '@/components/ui';
import AlternateUnitsEditor from '@/pages/storeManagement/products/components/AlternateUnitsEditor';
import AsyncSearchSelect from '@/pages/storeManagement/products/components/AsyncSearchSelect';
import PriceCheck from '@/pages/storeManagement/products/components/PriceCheck';
import PriceChangeConfirm from '@/pages/purchase/components/PriceChangeConfirm';
import SettingsModal from '@/pages/settings/components/SettingsModal';

const SETTINGS = {
  lowStockAlertThreshold: 10,
  razorpayKeyId: 'rzp_test_demo',
  razorpayKeySecret: 'demo-secret',
  razorpayWebhookSecret: '',
  blockInvoiceOnCreditLimit: true,
  salesReturnWindowDays: 7,
  barcodeHoldDays: 20,
  createdAt: '2026-01-04T10:15:00.000Z',
  updatedAt: '2026-10-20T16:40:00.000Z',
};

export function answer(url) {
  if (url === '/settings') return { success: true, data: SETTINGS };
  return undefined;
}

const SUPPLIER_OPTIONS = [
  { value: 's1', label: 'Shree Ganesh Traders', sublabel: 'Pune · 27AABCS1234F1Z5' },
  { value: 's2', label: 'Mumbai Wholesale Mart', sublabel: 'Mumbai · 27AAACM5678K1Z2' },
  { value: 's3', label: 'Kisan Agro Supplies', sublabel: 'Nashik' },
];
const fetchSuppliers = (q) =>
  Promise.resolve(SUPPLIER_OPTIONS.filter((o) => o.label.toLowerCase().includes((q || '').toLowerCase())));

const PRICE_CASES = [
  { title: 'Within MRP', values: { mrp: 120, costPrice: 90, basePrice: 105, discountedPrice: '', isGstApplicable: true, isGstIncludedInPrice: false, gstRateOverride: 5 } },
  { title: 'Above MRP', values: { mrp: 100, costPrice: 80, basePrice: 110, discountedPrice: 115, isGstApplicable: true, isGstIncludedInPrice: false, gstRateOverride: 12 } },
  { title: 'Below cost', values: { mrp: 60, costPrice: 50, basePrice: 45, discountedPrice: '', isGstApplicable: true, isGstIncludedInPrice: true, gstRateOverride: 5 } },
];

const PRICE_CHANGES = [
  { key: 'a', name: 'Tata Salt 1 kg', oldPrice: 26, newPrice: 28 },
  { key: 'b', name: 'Aashirvaad Atta 5 kg (whole wheat, long product name that wraps)', oldPrice: 245, newPrice: 255 },
  { key: 'c', name: 'Amul Butter 100 g', oldPrice: 0, newPrice: 58 },
];

function HelpersDemo() {
  const show = new URLSearchParams(window.location.search).get('show');
  const [units, setUnits] = useState([
    { unit: 'box', factor: 12, barcode: '8901234567890' },
    { unit: '', factor: '', barcode: '' },
  ]);
  const [supplier, setSupplier] = useState({ value: 's1', label: 'Shree Ganesh Traders' });
  const [open, setOpen] = useState(show);

  return h('div', { className: 'flex flex-col gap-4' },
    h(Section, { title: 'Alternate units' },
      h(AlternateUnitsEditor, {
        baseUnit: 'pcs',
        rows: units,
        onChange: setUnits,
        errors: { 1: { unit: 'Enter a unit name.' } },
      })),
    h(Section, { title: 'Alternate units (empty)' },
      h(AlternateUnitsEditor, { baseUnit: '', rows: [], onChange: () => {} })),
    h(Section, { title: 'Price check' },
      h('div', { className: 'grid gap-3 lg:grid-cols-3' },
        PRICE_CASES.map((c) => h('div', { key: c.title, className: 'flex flex-col gap-1.5' },
          h('div', { className: 'text-xs font-semibold text-ink-muted' }, c.title),
          h(PriceCheck, { values: c.values }))))),
    h(Section, { title: 'Search picker' },
      h('div', { className: 'grid gap-3 md:grid-cols-2' },
        h(AsyncSearchSelect, {
          value: supplier?.value,
          selectedLabel: supplier?.label || '',
          onChange: setSupplier,
          fetchOptions: fetchSuppliers,
          placeholder: 'Search supplier...',
        }),
        h(AsyncSearchSelect, { value: null, onChange: () => {}, fetchOptions: fetchSuppliers, placeholder: 'Disabled', disabled: true }))),
    h(PriceChangeConfirm, {
      changes: open === 'confirm' ? PRICE_CHANGES : [],
      onConfirm: () => setOpen(null),
      onClose: () => setOpen(null),
    }),
    h(SettingsModal, { isOpen: open === 'settings', onClose: () => setOpen(null) }),
  );
}

export const routes = [{ path: 'u7-misc/helpers', element: h(HelpersDemo) }];
