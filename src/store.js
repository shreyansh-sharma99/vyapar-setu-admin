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
import invoiceLayoutReducer from './pages/Invoices/invoiceLayout/services/invoiceLayoutSlice';
import reportsReducer from './pages/reports/services/reportSlice';
import inventoryReducer from './pages/inventory/inventory/services/inventorySlice';
import staffReducer from './pages/staff/services/staffSlice';
import stockTransferReducer from './pages/inventory/stockTransfers/services/stockTransferSlice';
import supplierReducer from './pages/purchase/suppliers/services/supplierSlice';
import purchaseOrderReducer from './pages/purchase/purchaseOrders/services/purchaseOrderSlice';
import goodsReceiptReducer from './pages/purchase/goodsReceipts/services/goodsReceiptSlice';
import purchaseBillReducer from './pages/purchase/purchaseBills/services/purchaseBillSlice';
import purchaseReturnReducer from './pages/purchase/purchaseReturns/services/purchaseReturnSlice';
import paymentOutReducer from './pages/purchase/paymentsOut/services/paymentOutSlice';
import storeReducer from './pages/storeManagement/stores/services/storeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    category: categoryReducer,
    subcategory: subcategoryReducer,
    brand: brandReducer,
    manufacturer: manufacturerReducer,
    product: productReducer,
    store: storeReducer,
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
    invoiceLayout: invoiceLayoutReducer,
    reports: reportsReducer,
    inventory: inventoryReducer,
    staff: staffReducer,
    stockTransfer: stockTransferReducer,
    supplier: supplierReducer,
    purchaseOrder: purchaseOrderReducer,
    goodsReceipt: goodsReceiptReducer,
    purchaseBill: purchaseBillReducer,
    purchaseReturn: purchaseReturnReducer,
    paymentOut: paymentOutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
