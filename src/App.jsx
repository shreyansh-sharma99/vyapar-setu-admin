import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/login/Login';
import CategoryList from './pages/storeManagement/categories/CategoryList';
import CreateCategory from './pages/storeManagement/categories/CreateCategory';
import UpdateCategory from './pages/storeManagement/categories/UpdateCategory';
import CategoryDetails from './pages/storeManagement/categories/CategoryDetails';
import SubcategoryList from './pages/storeManagement/subcategories/SubcategoryList';
import CreateSubcategory from './pages/storeManagement/subcategories/CreateSubcategory';
import UpdateSubcategory from './pages/storeManagement/subcategories/UpdateSubcategory';
import SubcategoryDetails from './pages/storeManagement/subcategories/SubcategoryDetails';
import BrandList from './pages/storeManagement/brands/BrandList';
import CreateBrand from './pages/storeManagement/brands/CreateBrand';
import UpdateBrand from './pages/storeManagement/brands/UpdateBrand';
import BrandDetails from './pages/storeManagement/brands/BrandDetails';
import ManufacturerList from './pages/storeManagement/manufacturers/ManufacturerList';
import CreateManufacturer from './pages/storeManagement/manufacturers/CreateManufacturer';
import UpdateManufacturer from './pages/storeManagement/manufacturers/UpdateManufacturer';
import ManufacturerDetails from './pages/storeManagement/manufacturers/ManufacturerDetails';
import ProductList from './pages/storeManagement/products/ProductList';
import CreateProduct from './pages/storeManagement/products/CreateProduct';
import UpdateProduct from './pages/storeManagement/products/UpdateProduct';
import ProductDetails from './pages/storeManagement/products/ProductDetails';
import ProductAuditReport from './pages/storeManagement/products/ProductAuditReport';
import Inventory from './pages/inventory/inventory/Inventory';
import AdjustStock from './pages/inventory/inventory/AdjustStock';
import StockAuditReport from './pages/inventory/inventory/StockAuditReport';
import StoreList from './pages/storeManagement/stores/StoreList';
import CreateStore from './pages/storeManagement/stores/CreateStore';
import UpdateStore from './pages/storeManagement/stores/UpdateStore';
import CustomerList from './pages/customer/CustomerList';
import CreateCustomer from './pages/customer/CreateCustomer';
import UpdateCustomer from './pages/customer/UpdateCustomer';
import CustomerDetails from './pages/customer/CustomerDetails';
import SalesInvoiceList from './pages/sales/salesInvoices/SalesInvoiceList';
import CreateSalesInvoice from './pages/sales/salesInvoices/CreateSalesInvoice';
import SalesInvoiceDetails from './pages/sales/salesInvoices/SalesInvoiceDetails';
import QuotationList from './pages/sales/quotations/QuotationList';
import CreateQuotation from './pages/sales/quotations/CreateQuotation';
import QuotationDetails from './pages/sales/quotations/QuotationDetails';
import ProformaInvoiceList from './pages/sales/performaInvoice/ProformaInvoiceList';
import CreateProformaInvoice from './pages/sales/performaInvoice/CreateProformaInvoice';
import ProformaInvoiceDetails from './pages/sales/performaInvoice/ProformaInvoiceDetails';
import DeliveryChallanList from './pages/sales/deliveryChallan/DeliveryChallanList';
import CreateDeliveryChallan from './pages/sales/deliveryChallan/CreateDeliveryChallan';
import DeliveryChallanDetails from './pages/sales/deliveryChallan/DeliveryChallanDetails';
import SalesReturnList from './pages/sales/salesReturn/SalesReturnList';
import CreateSalesReturn from './pages/sales/salesReturn/CreateSalesReturn';
import SalesReturnDetails from './pages/sales/salesReturn/SalesReturnDetails';
import CreditNoteList from './pages/sales/creditNotes/CreditNoteList';
import CreateCreditNote from './pages/sales/creditNotes/CreateCreditNote';
import CreditNoteDetails from './pages/sales/creditNotes/CreditNoteDetails';
import PaymentInList from './pages/sales/paymentIn/PaymentInList';
import CreatePaymentIn from './pages/sales/paymentIn/CreatePaymentIn';
import PaymentInDetails from './pages/sales/paymentIn/PaymentInDetails';
import CustomerLedger from './pages/sales/customerLedger/CustomerLedger';
import PaymentAccount from './pages/sales/paymentAccout/PaymentAccount';
import InvoiceSetting from './pages/Invoices/invoiceSetting/InvoiceSetting';
import GeneralInvoiceSetting from './pages/Invoices/generalInvoiceSetting/GeneralInvoiceSetting';
import InvoiceLayout from './pages/Invoices/invoiceLayout/InvoiceLayout';
import SalesRegister from './pages/reports/SalesRegister';
import Gstr1Report from './pages/reports/Gstr1Report';
import HsnSummary from './pages/reports/HsnSummary';
import AgeingReport from './pages/reports/AgeingReport';
import StoreWiseStock from './pages/inventory/inventory/StoreWiseStock';
import DamagedStock from './pages/inventory/inventory/DamagedStock';
import ReorderReport from './pages/inventory/inventory/ReorderReport';
import StockValuation from './pages/inventory/inventory/StockValuation';
import StockTransferList from './pages/inventory/stockTransfers/StockTransferList';
import CreateStockTransfer from './pages/inventory/stockTransfers/CreateStockTransfer';
import StockTransferDetails from './pages/inventory/stockTransfers/StockTransferDetails';
import ProductVariants from './pages/storeManagement/products/ProductVariants';
import ProductImportExport from './pages/storeManagement/products/ProductImportExport';
import BarcodeLabels from './pages/storeManagement/products/BarcodeLabels';
import SupplierList from './pages/purchase/suppliers/SupplierList';
import SupplierForm from './pages/purchase/suppliers/SupplierForm';
import SupplierDetails from './pages/purchase/suppliers/SupplierDetails';
import PurchaseOrderList from './pages/purchase/purchaseOrders/PurchaseOrderList';
import CreatePurchaseOrder from './pages/purchase/purchaseOrders/CreatePurchaseOrder';
import PurchaseOrderDetails from './pages/purchase/purchaseOrders/PurchaseOrderDetails';
import GoodsReceiptList from './pages/purchase/goodsReceipts/GoodsReceiptList';
import CreateGoodsReceipt from './pages/purchase/goodsReceipts/CreateGoodsReceipt';
import GoodsReceiptDetails from './pages/purchase/goodsReceipts/GoodsReceiptDetails';
import PurchaseBillList from './pages/purchase/purchaseBills/PurchaseBillList';
import CreatePurchaseBill from './pages/purchase/purchaseBills/CreatePurchaseBill';
import PurchaseBillDetails from './pages/purchase/purchaseBills/PurchaseBillDetails';
import PurchaseReturnList from './pages/purchase/purchaseReturns/PurchaseReturnList';
import CreatePurchaseReturn from './pages/purchase/purchaseReturns/CreatePurchaseReturn';
import PurchaseReturnDetails from './pages/purchase/purchaseReturns/PurchaseReturnDetails';
import PaymentOutList from './pages/purchase/paymentsOut/PaymentOutList';
import CreatePaymentOut from './pages/purchase/paymentsOut/CreatePaymentOut';
import PaymentOutDetails from './pages/purchase/paymentsOut/PaymentOutDetails';
import PayablesAgeing from './pages/purchase/reports/PayablesAgeing';
import StaffList from './pages/staff/StaffList';
import StaffForm from './pages/staff/StaffForm';
import RoleList from './pages/staff/roles/RoleList';
import RoleForm from './pages/staff/roles/RoleForm';
import DesignationList from './pages/staff/designations/DesignationList';
import PrivateRoute from './utility/PrivateRoute';
import Layout from './components/layouts/Layout';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout setDarkMode={setDarkMode} />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/create" element={<CreateCategory />} />
          <Route path="categories/edit/:id" element={<UpdateCategory />} />
          <Route path="categories/view/:id" element={<CategoryDetails />} />
          <Route path="subcategories" element={<SubcategoryList />} />
          <Route path="subcategories/create" element={<CreateSubcategory />} />
          <Route path="subcategories/edit/:id" element={<UpdateSubcategory />} />
          <Route path="subcategories/view/:id" element={<SubcategoryDetails />} />
          <Route path="brands" element={<BrandList />} />
          <Route path="brands/create" element={<CreateBrand />} />
          <Route path="brands/edit/:id" element={<UpdateBrand />} />
          <Route path="brands/view/:id" element={<BrandDetails />} />
          <Route path="manufacturers" element={<ManufacturerList />} />
          <Route path="manufacturers/create" element={<CreateManufacturer />} />
          <Route path="manufacturers/edit/:id" element={<UpdateManufacturer />} />
          <Route path="manufacturers/view/:id" element={<ManufacturerDetails />} />
          <Route path="stores" element={<StoreList />} />
          <Route path="stores/create" element={<CreateStore />} />
          <Route path="stores/edit/:id" element={<UpdateStore />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products/edit/:id" element={<UpdateProduct />} />
          <Route path="products/view/:id" element={<ProductDetails />} />
          <Route path="products/audit/:id" element={<ProductAuditReport />} />
          <Route path="products/variants/:id" element={<ProductVariants />} />
          <Route path="products/import-export" element={<ProductImportExport />} />
          <Route path="products/labels" element={<BarcodeLabels />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/adjust" element={<AdjustStock />} />
          <Route path="inventory/audit-report" element={<StockAuditReport />} />
          <Route path="inventory/store-wise" element={<StoreWiseStock />} />
          <Route path="inventory/damaged" element={<DamagedStock />} />
          <Route path="inventory/reorder" element={<ReorderReport />} />
          <Route path="inventory/valuation" element={<StockValuation />} />
          <Route path="inventory/transfers" element={<StockTransferList />} />
          <Route path="inventory/transfers/create" element={<CreateStockTransfer />} />
          <Route path="inventory/transfers/edit/:id" element={<CreateStockTransfer />} />
          <Route path="inventory/transfers/view/:id" element={<StockTransferDetails />} />
          <Route path="purchase/suppliers" element={<SupplierList />} />
          <Route path="purchase/suppliers/create" element={<SupplierForm />} />
          <Route path="purchase/suppliers/edit/:id" element={<SupplierForm />} />
          <Route path="purchase/suppliers/view/:id" element={<SupplierDetails />} />
          <Route path="purchase/orders" element={<PurchaseOrderList />} />
          <Route path="purchase/orders/create" element={<CreatePurchaseOrder />} />
          <Route path="purchase/orders/edit/:id" element={<CreatePurchaseOrder />} />
          <Route path="purchase/orders/view/:id" element={<PurchaseOrderDetails />} />
          <Route path="purchase/receipts" element={<GoodsReceiptList />} />
          <Route path="purchase/receipts/create" element={<CreateGoodsReceipt />} />
          <Route path="purchase/receipts/edit/:id" element={<CreateGoodsReceipt />} />
          <Route path="purchase/receipts/view/:id" element={<GoodsReceiptDetails />} />
          <Route path="purchase/bills" element={<PurchaseBillList />} />
          <Route path="purchase/bills/create" element={<CreatePurchaseBill />} />
          <Route path="purchase/bills/edit/:id" element={<CreatePurchaseBill />} />
          <Route path="purchase/bills/view/:id" element={<PurchaseBillDetails />} />
          <Route path="purchase/returns" element={<PurchaseReturnList />} />
          <Route path="purchase/returns/create" element={<CreatePurchaseReturn />} />
          <Route path="purchase/returns/edit/:id" element={<CreatePurchaseReturn />} />
          <Route path="purchase/returns/view/:id" element={<PurchaseReturnDetails />} />
          <Route path="purchase/payments" element={<PaymentOutList />} />
          <Route path="purchase/payments/create" element={<CreatePaymentOut />} />
          <Route path="purchase/payments/view/:id" element={<PaymentOutDetails />} />
          <Route path="purchase/payables-ageing" element={<PayablesAgeing />} />
          <Route path="staff" element={<StaffList />} />
          <Route path="staff/create" element={<StaffForm />} />
          <Route path="staff/edit/:id" element={<StaffForm />} />
          <Route path="staff/roles" element={<RoleList />} />
          <Route path="staff/roles/create" element={<RoleForm />} />
          <Route path="staff/roles/edit/:id" element={<RoleForm />} />
          <Route path="staff/designations" element={<DesignationList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CreateCustomer />} />
          <Route path="customers/edit/:id" element={<UpdateCustomer />} />
          <Route path="customers/view/:id" element={<CustomerDetails />} />
          <Route path="sales/invoices" element={<SalesInvoiceList />} />
          <Route path="sales/invoices/create" element={<CreateSalesInvoice />} />
          <Route path="sales/invoices/edit/:id" element={<CreateSalesInvoice />} />
          <Route path="sales/invoices/view/:id" element={<SalesInvoiceDetails />} />
          <Route path="sales/quotations" element={<QuotationList />} />
          <Route path="sales/quotations/create" element={<CreateQuotation />} />
          <Route path="sales/quotations/edit/:id" element={<CreateQuotation />} />
          <Route path="sales/quotations/view/:id" element={<QuotationDetails />} />
          <Route path="sales/payment-in" element={<PaymentInList />} />
          <Route path="sales/payment-in/record" element={<CreatePaymentIn />} />
          <Route path="sales/payment-in/view/:id" element={<PaymentInDetails />} />
          <Route path="sales/return" element={<SalesReturnList />} />
          <Route path="sales/return/create" element={<CreateSalesReturn />} />
          <Route path="sales/return/edit/:id" element={<CreateSalesReturn />} />
          <Route path="sales/return/view/:id" element={<SalesReturnDetails />} />
          <Route path="sales/credit-note" element={<CreditNoteList />} />
          <Route path="sales/credit-note/create" element={<CreateCreditNote />} />
          <Route path="sales/credit-note/edit/:id" element={<CreateCreditNote />} />
          <Route path="sales/credit-note/view/:id" element={<CreditNoteDetails />} />
          <Route path="sales/delivery-challan" element={<DeliveryChallanList />} />
          <Route path="sales/delivery-challan/create" element={<CreateDeliveryChallan />} />
          <Route path="sales/delivery-challan/edit/:id" element={<CreateDeliveryChallan />} />
          <Route path="sales/delivery-challan/view/:id" element={<DeliveryChallanDetails />} />
          <Route path="sales/proforma-invoice" element={<ProformaInvoiceList />} />
          <Route path="sales/proforma-invoice/create" element={<CreateProformaInvoice />} />
          <Route path="sales/proforma-invoice/edit/:id" element={<CreateProformaInvoice />} />
          <Route path="sales/proforma-invoice/view/:id" element={<ProformaInvoiceDetails />} />
          <Route path="sales/customer-ledger" element={<CustomerLedger />} />
          <Route path="sales/customer-ledger/:customerId" element={<CustomerLedger />} />
          <Route path="sales/payment-account" element={<PaymentAccount />} />
          <Route path="sales/general-invoice-setting" element={<GeneralInvoiceSetting />} />
          <Route path="sales/invoice-setting" element={<InvoiceSetting />} />
          <Route path="sales/invoice-settings" element={<InvoiceSetting />} />
          <Route path="sales/invoice-layout" element={<InvoiceLayout />} />
          <Route path="reports/sales-register" element={<SalesRegister />} />
          <Route path="reports/gstr1" element={<Gstr1Report />} />
          <Route path="reports/hsn-summary" element={<HsnSummary />} />
          <Route path="reports/ageing" element={<AgeingReport />} />
          <Route path="reports" element={<Navigate to="/reports/sales-register" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
