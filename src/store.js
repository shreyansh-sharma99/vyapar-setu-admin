import { configureStore } from '@reduxjs/toolkit';
import authReducer from './pages/login/services/authSlice';
import userReducer from './pages/login/services/userSlice';
import categoryReducer from './pages/storeManagement/categories/services/categorySlice';
import subcategoryReducer from './pages/storeManagement/subcategories/services/subcategorySlice';
import brandReducer from './pages/storeManagement/brands/services/brandSlice';
import manufacturerReducer from './pages/storeManagement/manufacturers/services/manufacturerSlice';
import productReducer from './pages/storeManagement/products/services/productSlice';
import customerReducer from './pages/customer/services/customerSlice';
import salesInvoiceReducer from './pages/sales/salesInvoices/services/salesInvoiceSlice';
import quotationReducer from './pages/sales/quotations/services/quotationSlice';
import proformaInvoiceReducer from './pages/sales/performaInvoice/services/proformaInvoiceSlice';
import deliveryChallanReducer from './pages/sales/deliveryChallan/services/deliveryChallanSlice';
import salesReturnReducer from './pages/sales/salesReturn/services/salesReturnSlice';
import creditNoteReducer from './pages/sales/creditNotes/services/creditNoteSlice';
import paymentInReducer from './pages/sales/paymentIn/services/paymentInSlice';
import settingsReducer from './pages/settings/services/settingsSlice';
import customerLedgerReducer from './pages/sales/customerLedger/services/customerLedgerSlice';
import paymentAccountReducer from './pages/sales/paymentAccout/services/paymentAccountSlice';
import invoiceSettingReducer from './pages/Invoices/invoiceSetting/services/invoiceSettingSlice';
import generalInvoiceSettingReducer from './pages/Invoices/generalInvoiceSetting/services/generalInvoiceSettingSlice';
import reportsReducer from './pages/reports/services/reportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    category: categoryReducer,
    subcategory: subcategoryReducer,
    brand: brandReducer,
    manufacturer: manufacturerReducer,
    product: productReducer,
    customer: customerReducer,
    salesInvoice: salesInvoiceReducer,
    quotation: quotationReducer,
    proformaInvoice: proformaInvoiceReducer,
    deliveryChallan: deliveryChallanReducer,
    salesReturn: salesReturnReducer,
    creditNote: creditNoteReducer,
    paymentIn: paymentInReducer,
    settings: settingsReducer,
    customerLedger: customerLedgerReducer,
    paymentAccount: paymentAccountReducer,
    invoiceSetting: invoiceSettingReducer,
    generalInvoiceSetting: generalInvoiceSettingReducer,
    reports: reportsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
