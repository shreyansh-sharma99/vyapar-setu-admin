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
import SalesRegister from './pages/reports/SalesRegister';
import Gstr1Report from './pages/reports/Gstr1Report';
import HsnSummary from './pages/reports/HsnSummary';
import AgeingReport from './pages/reports/AgeingReport';
import PrivateRoute from './utility/PrivateRoute';
import Layout from './components/layouts/Layout';

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-center">
      <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">{title}</h2>
      <p className="text-sm text-[var(--vs-text-secondary)]">This module is under development and will be available soon.</p>
    </div>
  );
}

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
          <Route path="products" element={<ProductList />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products/edit/:id" element={<UpdateProduct />} />
          <Route path="products/view/:id" element={<ProductDetails />} />
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
