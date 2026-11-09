// Dev-only sample API answers and preview routes for the U6 settings pages (/ui-kit/shell/...).
// answer(url, params) returns the response body, or undefined to let the next fixture / default answer.
// routes: [{ path, element }] mounted under /ui-kit/shell (element built with createElement, no JSX here).
import { createElement } from 'react';
import GeneralInvoiceSetting from '@/pages/Invoices/generalInvoiceSetting/GeneralInvoiceSetting';
import InvoiceSetting from '@/pages/Invoices/invoiceSetting/InvoiceSetting';
import InvoiceLayout from '@/pages/Invoices/invoiceLayout/InvoiceLayout';

const GENERAL = {
  prefix: 'INV-',
  suffix: '',
  financialYearFormat: 'YYYY-YY',
  seriesStartsFrom: 1,
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  dueDays: 15,
  defaultTerms: 'Goods once sold will not be taken back. Payment due within 15 days. Subject to Pune jurisdiction.',
  defaultNotes: 'Thank you for shopping at Shree Ganesh Kirana Stores!',
  showAuthorizedSignatory: true,
  bankDetails: {
    accountName: 'Shree Ganesh Kirana Stores',
    accountNumber: '50200041872263',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    branch: 'Kothrud, Pune',
  },
  numberingConfig: {
    salesInvoice: { prefix: 'INV-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    salesReturn: { prefix: 'SR-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 1, resetPerYear: true },
    creditNote: { prefix: 'CN-', suffix: '', financialYearFormat: 'YY-YY', seriesStartsFrom: 1, resetPerYear: false },
    paymentReceipt: { prefix: 'PR-', suffix: '', financialYearFormat: 'YYYY-YY', seriesStartsFrom: 101, resetPerYear: true },
  },
  sequences: {
    salesInvoice: { '2025-26': 1842, '2026-27': 412 },
    salesReturn: { '2025-26': 37, '2026-27': 9 },
    creditNote: { '2026-27': 14 },
    paymentReceipt: { '2025-26': 1290, '2026-27': 388 },
  },
};

const PROFILES = [
  {
    _id: 'inv-prof-1',
    name: 'GST Profile',
    businessName: 'Shree Ganesh Kirana Stores',
    companyPhone: '9822012345',
    companyEmail: 'accounts@shreeganeshkirana.in',
    billingAddress: 'Shop 4, Sai Plaza, Paud Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    isGSTRegistered: true,
    gstin: '27AAQCS3629R1ZF',
    panNumber: 'AAQCS3629R',
    enableTDS: false,
    enableTCS: true,
    bankName: 'HDFC Bank',
    accountNumber: '50200041872263',
    ifscCode: 'HDFC0001234',
    accountHolderName: 'Shree Ganesh Kirana Stores',
    upiId: 'shreeganesh@hdfcbank',
    additionalDetails: [{ key: 'FSSAI No.', value: '11521035000123' }],
    isDefault: true,
  },
  {
    _id: 'inv-prof-2',
    name: 'Retail Counter',
    businessName: 'Ganesh Provisions (Andheri)',
    companyPhone: '9867054321',
    companyEmail: 'andheri@ganeshprovisions.in',
    billingAddress: '12, Veera Desai Road, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    isGSTRegistered: false,
    gstin: '',
    panNumber: 'BQRPK4821M',
    enableTDS: false,
    enableTCS: false,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
    additionalDetails: [],
    isDefault: false,
  },
];

const LAYOUT = {
  theme: 'modern',
  branding: { accentColor: '#1f6f5c', logo: null, signature: null },
  documentVisibility: { showHsn: true, showDiscount: true, showTaxBreakup: true, showUpiQr: true, showSignature: true },
  orderAutomation: { autoRaiseInvoiceOnDelivery: true, autoRecordCashPaymentOnDelivery: false },
  numberingFormat: {
    template: '{PREFIX}/{FYSHORT}/{SEQ}',
    zeroPadding: 5,
    prefixPerSeries: { INV: 'SGK', QT: 'QT', PI: 'PI', DC: 'DC', CN: 'CN', SR: 'SR', PUR: 'PUR', PO: 'PO', DN: 'DN' },
  },
  bankDetails: {
    accountName: 'Shree Ganesh Kirana Stores',
    accountNumber: '50200041872263',
    ifsc: 'HDFC0001234',
    upiId: 'shreeganesh@hdfcbank',
    bankName: 'HDFC Bank',
  },
  terms: 'Goods once sold will not be taken back.\nSubject to Pune jurisdiction.',
  notes: 'Thank you for shopping with us!',
};

export function answer(url) {
  if (url === '/general-invoice-settings') return { success: true, data: GENERAL };
  if (url === '/invoice-layout') return { success: true, data: LAYOUT };
  if (url === '/invoice-settings') return { success: true, data: PROFILES };
  const one = url.match(/^\/invoice-settings\/([^/?]+)$/);
  if (one) return { success: true, data: PROFILES.find((p) => p._id === one[1]) || PROFILES[0] };
  return undefined;
}

export const routes = [
  { path: 'settings/general', element: createElement(GeneralInvoiceSetting) },
  { path: 'settings/invoice', element: createElement(InvoiceSetting) },
  { path: 'settings/layout', element: createElement(InvoiceLayout) },
];
