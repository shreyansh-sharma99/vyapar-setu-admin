import { useState } from 'react';
import { Provider } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { Mail, Plus, Receipt, Truck, Wallet, AlertTriangle } from 'lucide-react';
import Layout from '@/components/layouts/Layout';
import { useNavigate } from 'react-router-dom';
import DeleteModal from '@/components/modal/DeleteModal';
import Table from '@/components/table/Table';
import { Button, Field, FormGrid, Input, Section, Segmented, Select, StatCard } from '@/components/ui';
import CreatePurchaseOrder from '@/pages/purchase/purchaseOrders/CreatePurchaseOrder';
import CreateSalesInvoice from '@/pages/sales/salesInvoices/CreateSalesInvoice';
import SalesInvoiceList from '@/pages/sales/salesInvoices/SalesInvoiceList';
import PurchaseOrderList from '@/pages/purchase/purchaseOrders/PurchaseOrderList';
import PurchaseBillList from '@/pages/purchase/purchaseBills/PurchaseBillList';
import CreatePurchaseBill from '@/pages/purchase/purchaseBills/CreatePurchaseBill';
import CreatePurchaseReturn from '@/pages/purchase/purchaseReturns/CreatePurchaseReturn';
import CreatePaymentOut from '@/pages/purchase/paymentsOut/CreatePaymentOut';
import SupplierForm from '@/pages/purchase/suppliers/SupplierForm';
import CreateSalesReturn from '@/pages/sales/salesReturn/CreateSalesReturn';
import CreateCreditNote from '@/pages/sales/creditNotes/CreateCreditNote';
import CreateProduct from '@/pages/storeManagement/products/CreateProduct';
import CreateBrand from '@/pages/storeManagement/brands/CreateBrand';
import CreateCategory from '@/pages/storeManagement/categories/CreateCategory';
import CreateSubcategory from '@/pages/storeManagement/subcategories/CreateSubcategory';
import CreateManufacturer from '@/pages/storeManagement/manufacturers/CreateManufacturer';
import CreateCustomer from '@/pages/customer/CreateCustomer';
import StaffForm from '@/pages/staff/StaffForm';
import RoleForm from '@/pages/staff/roles/RoleForm';
import { demoStore } from './previewStore';
import { groupRoutes } from './fixtures';
import './previewApi'; // sample API for the form previews (only under /ui-kit)

/**
 * Dev-only: the real Layout (Sidebar + Header) with a demo owner, at /ui-kit/shell.
 * /ui-kit/shell/po and /ui-kit/shell/sale show the real New purchase / New sales invoice forms.
 * The sample page uses the ui components plus the two adapters still in use (table/Table, modal/DeleteModal).
 */


// Old <Table> props (page-local search and paging), to check the adapter.
const legacyBrands = Array.from({ length: 14 }, (_, i) => ({
  _id: 'b' + i,
  name: ['Amul', 'Tata', 'Fortune', 'Aashirvaad', 'Maggi', 'Colgate', 'Surf Excel'][i % 7] + (i >= 7 ? ' Pro' : ''),
  description: 'Dairy, staples and packaged foods for kirana stores across Maharashtra and Gujarat',
  products: (i * 7) % 23,
  isActive: i % 3 !== 0,
  code: 'BR-' + String(100 + i),
}));
const legacyHeaders = [
  { label: 'Brand', key: 'name', sortable: true, value: 'checked' },
  { label: 'Code', key: 'code', value: 'unchecked' },
  { label: 'Description', key: 'description', value: 'checked' },
  { label: 'Products', key: 'products', sortable: true, value: 'checked' },
];

function LegacyTableDemo() {
  const [rows, setRows] = useState(legacyBrands);
  return (
    <Section title="Brands (old Table props)" description="components/table/Table.jsx → DataTable adapter" bodyClassName="p-0">
      <Table
        headers={legacyHeaders}
        data={rows}
        searchPlaceholder="Search brands..."
        onView={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggle={(item, val) => setRows((rs) => rs.map((r) => (r._id === item._id ? { ...r, isActive: val } : r)))}
        actions={<Button size="sm">Add brand</Button>}
      />
    </Section>
  );
}

function SamplePage() {
  const [tab, setTab] = useState('all');
  const [unit, setUnit] = useState('kg');
  const [del, setDel] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's sales" value="₹ 48,230" icon={Wallet} tone="primary" chip="+12%" chipTone="success" />
        <StatCard label="To collect" value="₹ 1,73,120" icon={Receipt} tone="warning" chip="24 invoices" />
        <StatCard label="Low stock" value="18 items" icon={AlertTriangle} tone="danger" chip="Reorder now" />
        <StatCard label="To deliver" value="7 orders" icon={Truck} tone="success" chip="3 out today" />
      </div>
      <Section
        title="Create Customer"
        description="ui Section + Field + Segmented"
        actions={<Button variant="secondary" size="sm" onClick={() => navigate('/ui-kit/shell')}>Back</Button>}
      >
        <Segmented
          options={[{ value: 'all', label: 'Basic details' }, { value: 'gst', label: 'GST' }, { value: 'addr', label: 'Address' }]}
          value={tab}
          onChange={setTab}
        />
        <FormGrid className="mt-4">
          <Field label="Customer Name">
            <Input placeholder="Sharma General Store" />
          </Field>
          <Field label="Email" error="Enter a valid email">
            <Input startIcon={<Mail className="size-4" />} placeholder="name@company.com" />
          </Field>
          <Field label="Unit">
            <Select options={[{ value: 'kg', label: 'Kilogram' }, { value: 'pc', label: 'Piece' }]} value={unit} onChange={setUnit} />
          </Field>
        </FormGrid>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="danger-soft" onClick={() => setDel(true)}>Delete</Button>
          <Button variant="primary" startIcon={<Plus className="size-4" />}>Save customer</Button>
        </div>
      </Section>
      <LegacyTableDemo />
      <DeleteModal isOpen={del} onClose={() => setDel(false)} onConfirm={() => setDel(false)} title="Delete customer?" />
    </div>
  );
}

export default function ShellPreview({ setDarkMode }) {
  return (
    <Provider store={demoStore}>
      <Routes>
        <Route element={<Layout setDarkMode={setDarkMode} />}>
          <Route index element={<SamplePage />} />
          {/* The real document forms, new mode (they make no API call until you search). */}
          <Route path="po" element={<CreatePurchaseOrder />} />
          <Route path="sale" element={<CreateSalesInvoice />} />
          {/* The real list pages (U3). */}
          <Route path="invoices" element={<SalesInvoiceList />} />
          <Route path="purchases" element={<PurchaseOrderList />} />
          <Route path="bills" element={<PurchaseBillList />} />
          {/* U4 forms (new mode). */}
          <Route path="bill-new" element={<CreatePurchaseBill />} />
          <Route path="purchase-return-new" element={<CreatePurchaseReturn />} />
          <Route path="payment-new" element={<CreatePaymentOut />} />
          <Route path="supplier-new" element={<SupplierForm />} />
          <Route path="sales-return-new" element={<CreateSalesReturn />} />
          <Route path="credit-note-new" element={<CreateCreditNote />} />
          <Route path="product-new" element={<CreateProduct />} />
          <Route path="brand-new" element={<CreateBrand />} />
          <Route path="category-new" element={<CreateCategory />} />
          <Route path="subcategory-new" element={<CreateSubcategory />} />
          <Route path="manufacturer-new" element={<CreateManufacturer />} />
          <Route path="customer-new" element={<CreateCustomer />} />
          <Route path="staff-new" element={<StaffForm />} />
          <Route path="role-new" element={<RoleForm />} />
          {/* U5 details / inventory / money pages (src/dev/fixtures/*). */}
          {groupRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
          <Route path="*" element={<SamplePage />} />
        </Route>
      </Routes>
    </Provider>
  );
}
