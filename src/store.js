import { configureStore } from '@reduxjs/toolkit';
import authReducer from './pages/login/services/authSlice';
import userReducer from './pages/login/services/userSlice';
import categoryReducer from './pages/storeManagement/categories/services/categorySlice';
import subcategoryReducer from './pages/storeManagement/subcategories/services/subcategorySlice';
import brandReducer from './pages/storeManagement/brands/services/brandSlice';
import manufacturerReducer from './pages/storeManagement/manufacturers/services/manufacturerSlice';
import productReducer from './pages/storeManagement/products/services/productSlice';
import customerReducer from './pages/customer/services/customerSlice';

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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
