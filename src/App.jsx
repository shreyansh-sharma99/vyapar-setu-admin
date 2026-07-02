import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/login/Login';
import CategoryList from './pages/storeManagement/categories/CategoryList';
import CreateCategory from './pages/storeManagement/categories/CreateCategory';
import UpdateCategory from './pages/storeManagement/categories/UpdateCategory';
import SubcategoryList from './pages/storeManagement/subcategories/SubcategoryList';
import CreateSubcategory from './pages/storeManagement/subcategories/CreateSubcategory';
import UpdateSubcategory from './pages/storeManagement/subcategories/UpdateSubcategory';
import BrandList from './pages/storeManagement/brands/BrandList';
import CreateBrand from './pages/storeManagement/brands/CreateBrand';
import UpdateBrand from './pages/storeManagement/brands/UpdateBrand';
import ManufacturerList from './pages/storeManagement/manufacturers/ManufacturerList';
import CreateManufacturer from './pages/storeManagement/manufacturers/CreateManufacturer';
import UpdateManufacturer from './pages/storeManagement/manufacturers/UpdateManufacturer';
import ProductList from './pages/storeManagement/products/ProductList';
import CreateProduct from './pages/storeManagement/products/CreateProduct';
import UpdateProduct from './pages/storeManagement/products/UpdateProduct';
import ProductDetails from './pages/storeManagement/products/ProductDetails';
import CustomerList from './pages/customer/CustomerList';
import CreateCustomer from './pages/customer/CreateCustomer';
import UpdateCustomer from './pages/customer/UpdateCustomer';
import CustomerDetails from './pages/customer/CustomerDetails';
import PrivateRoute from './utility/PrivateRoute';
import Layout from './components/layouts/Layout';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
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
          <Route path="subcategories" element={<SubcategoryList />} />
          <Route path="subcategories/create" element={<CreateSubcategory />} />
          <Route path="subcategories/edit/:id" element={<UpdateSubcategory />} />
          <Route path="brands" element={<BrandList />} />
          <Route path="brands/create" element={<CreateBrand />} />
          <Route path="brands/edit/:id" element={<UpdateBrand />} />
          <Route path="manufacturers" element={<ManufacturerList />} />
          <Route path="manufacturers/create" element={<CreateManufacturer />} />
          <Route path="manufacturers/edit/:id" element={<UpdateManufacturer />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products/edit/:id" element={<UpdateProduct />} />
          <Route path="products/view/:id" element={<ProductDetails />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CreateCustomer />} />
          <Route path="customers/edit/:id" element={<UpdateCustomer />} />
          <Route path="customers/view/:id" element={<CustomerDetails />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
