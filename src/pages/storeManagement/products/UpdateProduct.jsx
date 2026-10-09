import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, X } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { getCategories } from '../categories/services/categorySlice';
import { getBrands } from '../brands/services/brandSlice';
import { getManufacturers } from '../manufacturers/services/manufacturerSlice';
import { getProductById, updateProduct, resetProductStatus, clearProductToast } from './services/productSlice';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
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
  const { stores } = useSelector((state) => state.store);
  const { currentProduct, loading, error } = useSelector((state) => state.product);

  const [loadedId, setLoadedId] = useState(null);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getBrands());
    dispatch(getManufacturers());
    dispatch(getStores());
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
      navigate('/products', { state: { message: 'Product updated successfully.', color: 'success' } });
    } else {
      showToast(result.payload || 'Failed to update product.', 'danger');
    }
  };

  const productReady = !!currentProduct && String(currentProduct._id) === String(id);
  const isFormLoading =
    categoriesLoading || brandsLoading || manufacturersLoading || (!!id && loadedId !== id && !productReady);

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        title="Update Product"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6"
      >
        {isFormLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading product details...</p>
          </div>
        ) : !productReady ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center py-12">
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-full text-red-500">
              <X className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Product Not Found</h2>
              <p className="text-sm text-[var(--vs-text-secondary)] mt-1">
                {!id ? 'Invalid product ID.' : 'The product you are trying to edit does not exist or has been deleted.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')} className="mt-2">
              Back to Products
            </Button>
          </div>
        ) : (
          <ProductForm
            key={currentProduct._id}
            mode="edit"
            product={currentProduct}
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
