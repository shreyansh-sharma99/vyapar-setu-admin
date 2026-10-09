import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { getCategories } from '../categories/services/categorySlice';
import { getBrands } from '../brands/services/brandSlice';
import { getManufacturers } from '../manufacturers/services/manufacturerSlice';
import { createProduct, resetProductStatus, clearProductToast } from './services/productSlice';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import ProductForm from './components/ProductForm';
import ToastStack from './components/ToastStack';
import { useToasts } from './utils/productUtils';

export default function CreateProduct() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts(4500);

  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brand);
  const { manufacturers, loading: manufacturersLoading } = useSelector((state) => state.manufacturer);
  const { stores } = useSelector((state) => state.store);
  const { loading, error } = useSelector((state) => state.product);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getBrands());
    dispatch(getManufacturers());
    dispatch(getStores());
    dispatch(resetProductStatus());
  }, [dispatch]);

  const handleSubmit = async (payload) => {
    const result = await dispatch(createProduct(payload));
    dispatch(clearProductToast());
    if (createProduct.fulfilled.match(result)) {
      dispatch(resetProductStatus());
      navigate('/products', { state: { message: 'Product created successfully.', color: 'success' } });
    } else {
      showToast(result.payload || 'Failed to create product.', 'danger');
    }
  };

  const isLoading = categoriesLoading || brandsLoading || manufacturersLoading;

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        h1="Create Product"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading form data...</p>
          </div>
        ) : (
          <ProductForm
            mode="create"
            stores={stores || []}
            categories={categories || []}
            brands={brands || []}
            manufacturers={manufacturers || []}
            submitting={loading}
            error={error}
            onSubmit={handleSubmit}
            onValidationError={(msg) => showToast(msg, 'danger')}
          />
        )}
      </Card>

      <ToastStack toasts={toasts} />
    </div>
  );
}
