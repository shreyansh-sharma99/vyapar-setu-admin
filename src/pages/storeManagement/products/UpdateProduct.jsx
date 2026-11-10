import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, X } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { getCategories } from '../categories/services/categorySlice';
import { getBrands } from '../brands/services/brandSlice';
import { getManufacturers } from '../manufacturers/services/manufacturerSlice';
import { getProductById, updateProduct, resetProductStatus, clearProductToast } from './services/productSlice';
import { decryptData } from '@/utility/crypto';
import ProductForm from './components/ProductForm';
import ToastStack from './components/ToastStack';
import { useToasts } from './utils/productUtils';

export default function UpdateProduct() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toasts, showToast } = useToasts(4500);

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brand);
  const { manufacturers, loading: manufacturersLoading } = useSelector((state) => state.manufacturer);
  const { currentProduct, loading, error } = useSelector((state) => state.product);

  const [loadedId, setLoadedId] = useState(null);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getBrands());
    dispatch(getManufacturers());
    dispatch(resetProductStatus());
    if (id) {
      dispatch(getProductById(id)).finally(() => setLoadedId(id));
    }
  }, [dispatch, id]);

  const handleSubmit = async (payload) => {
    const result = await dispatch(updateProduct({ productId: id, payload }));
    dispatch(clearProductToast());
    if (updateProduct.fulfilled.match(result)) {
      dispatch(resetProductStatus());
      navigate('/products', { state: { message: `${label} updated successfully.`, color: 'success' } });
    } else {
      showToast(result.payload || `Failed to update ${label.toLowerCase()}.`, 'danger');
    }
  };

  const productReady = !!currentProduct && String(currentProduct._id) === String(id);
  const label = productReady && currentProduct.itemType === 'service' ? 'Service' : 'Product';
  const isFormLoading =
    categoriesLoading || brandsLoading || manufacturersLoading || (!!id && loadedId !== id && !productReady);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Update ${label}`}
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      {isFormLoading ? (
        <Card>
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading product details..." />
          </div>
        </Card>
      ) : !productReady ? (
        <Card>
          <EmptyState
            icon={X}
            title="Product Not Found"
            text={!id ? 'Invalid product ID.' : 'The product you are trying to edit does not exist or has been deleted.'}
            action={
              <Button variant="secondary" onClick={() => navigate('/products')}>
                Back to Products
              </Button>
            }
          />
        </Card>
      ) : (
        <ProductForm
          key={currentProduct._id}
          mode="edit"
          product={currentProduct}
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
