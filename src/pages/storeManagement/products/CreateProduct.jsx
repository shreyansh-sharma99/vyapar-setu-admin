import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, PageHeader, Spinner } from '@/components/ui';
import { getCategories } from '../categories/services/categorySlice';
import { getBrands } from '../brands/services/brandSlice';
import { getManufacturers } from '../manufacturers/services/manufacturerSlice';
import { createProduct, resetProductStatus, clearProductToast } from './services/productSlice';
import ProductForm from './components/ProductForm';
import ToastStack from './components/ToastStack';
import { useToasts } from './utils/productUtils';

export default function CreateProduct({ itemType = 'goods' }) {
  const label = itemType === 'service' ? 'Service' : 'Product';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts(4500);

  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brand);
  const { manufacturers, loading: manufacturersLoading } = useSelector((state) => state.manufacturer);
  const { loading, error } = useSelector((state) => state.product);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getBrands());
    dispatch(getManufacturers());
    dispatch(resetProductStatus());
  }, [dispatch]);

  const handleSubmit = async (payload) => {
    const result = await dispatch(createProduct(payload));
    dispatch(clearProductToast());
    if (createProduct.fulfilled.match(result)) {
      dispatch(resetProductStatus());
      navigate('/products', { state: { message: `${label} created successfully.`, color: 'success' } });
    } else {
      showToast(result.payload || `Failed to create ${label.toLowerCase()}.`, 'danger');
    }
  };

  const isLoading = categoriesLoading || brandsLoading || manufacturersLoading;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Create ${label}`}
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      {isLoading ? (
        <Card>
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading form data..." />
          </div>
        </Card>
      ) : (
        <ProductForm
          mode="create"
          itemType={itemType}
          categories={categories || []}
          brands={brands || []}
          manufacturers={manufacturers || []}
          submitting={loading}
          error={error}
          onSubmit={handleSubmit}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
