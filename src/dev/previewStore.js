// Dev-only Redux store for /ui-kit/shell: the app's own reducers, with a demo signed-in owner.
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/pages/login/services/userSlice';
import categoryReducer from '@/pages/storeManagement/categories/services/categorySlice';
import subcategoryReducer from '@/pages/storeManagement/subcategories/services/subcategorySlice';
import brandReducer from '@/pages/storeManagement/brands/services/brandSlice';
import manufacturerReducer from '@/pages/storeManagement/manufacturers/services/manufacturerSlice';
import productReducer from '@/pages/storeManagement/products/services/productSlice';
import customerReducer from '@/pages/customer/services/customerSlice';
import salesInvoiceReducer from '@/pages/sales/salesInvoices/services/salesInvoiceSlice';
import salesReturnReducer from '@/pages/sales/salesReturn/services/salesReturnSlice';
import creditNoteReducer from '@/pages/sales/creditNotes/services/creditNoteSlice';
import customerLedgerReducer from '@/pages/sales/customerLedger/services/customerLedgerSlice';
import paymentAccountReducer from '@/pages/sales/paymentAccout/services/paymentAccountSlice';
import invoiceSettingReducer from '@/pages/Invoices/invoiceSetting/services/invoiceSettingSlice';
import generalInvoiceSettingReducer from '@/pages/Invoices/generalInvoiceSetting/services/generalInvoiceSettingSlice';
import invoiceLayoutReducer from '@/pages/Invoices/invoiceLayout/services/invoiceLayoutSlice';
import reportsReducer from '@/pages/reports/services/reportSlice';
import inventoryReducer from '@/pages/inventory/inventory/services/inventorySlice';
import staffReducer from '@/pages/staff/services/staffSlice';
import supplierReducer from '@/pages/purchase/suppliers/services/supplierSlice';
import purchaseOrderReducer from '@/pages/purchase/purchaseOrders/services/purchaseOrderSlice';
import purchaseBillReducer from '@/pages/purchase/purchaseBills/services/purchaseBillSlice';
import purchaseReturnReducer from '@/pages/purchase/purchaseReturns/services/purchaseReturnSlice';
import paymentOutReducer from '@/pages/purchase/paymentsOut/services/paymentOutSlice';

const demoUser = { name: 'Ramesh Kumar', email: 'ramesh@sharmastore.in', userType: 'owner' };

export const demoStore = configureStore({
  reducer: {
    auth: () => ({ user: demoUser, isAuthenticated: true }),
    settings: () => ({}),
    user: userReducer,
    category: categoryReducer,
    subcategory: subcategoryReducer,
    brand: brandReducer,
    manufacturer: manufacturerReducer,
    product: productReducer,
    customer: customerReducer,
    salesInvoice: salesInvoiceReducer,
    salesReturn: salesReturnReducer,
    creditNote: creditNoteReducer,
    customerLedger: customerLedgerReducer,
    paymentAccount: paymentAccountReducer,
    invoiceSetting: invoiceSettingReducer,
    generalInvoiceSetting: generalInvoiceSettingReducer,
    invoiceLayout: invoiceLayoutReducer,
    reports: reportsReducer,
    inventory: inventoryReducer,
    staff: staffReducer,
    supplier: supplierReducer,
    purchaseOrder: purchaseOrderReducer,
    purchaseBill: purchaseBillReducer,
    purchaseReturn: purchaseReturnReducer,
    paymentOut: paymentOutReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
