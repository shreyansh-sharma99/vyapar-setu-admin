import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Edit, Barcode, ShieldAlert, BadgeInfo, Tag, Box, Layers, Image as ImageIcon } from 'lucide-react';
import { getProductById, clearCurrentProduct } from './services/productSlice';
import Card from '../../../components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Loader from '@/components/loader/Loader';
import { decryptData, encryptData } from '@/utility/crypto';

export default function ProductDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const { currentProduct, loading } = useSelector((state) => state.product);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(getProductById(id));
    }
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (currentProduct?.images && currentProduct.images.length > 0) {
      setActiveImage(currentProduct.images[0]);
    }
  }, [currentProduct]);

  if (loading) {
    return (
      <Card
        h1="Product Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      ><Loader className="mb-4" /></Card>
    );
  }

  if (!currentProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/10 max-w-md mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Product Not Found</h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mt-2">
          The product you are trying to view does not exist or has been deleted.
        </p>
        <Button onClick={() => navigate('/products')} className="mt-6" variant="primary">
          Back to Products
        </Button>
      </div>
    );
  }

  const getImageUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.path || img.url || '';
  };

  // Parse tags
  let tagsList = [];
  if (currentProduct.tags) {
    try {
      tagsList = typeof currentProduct.tags === 'string' ? JSON.parse(currentProduct.tags) : currentProduct.tags;
    } catch (e) {
      tagsList = currentProduct.tags.split(',').map((t) => t.trim());
    }
  }

  // Parse customization fields
  let customizationFields = [];
  if (currentProduct.customizationFields) {
    try {
      customizationFields = typeof currentProduct.customizationFields === 'string'
        ? JSON.parse(currentProduct.customizationFields)
        : currentProduct.customizationFields;
    } catch (e) {
      customizationFields = [];
    }
  }

  const handleEditClick = () => {
    if (currentProduct?._id) {
      const encrypted = encodeURIComponent(encryptData(currentProduct._id));
      navigate(`/products/edit/${encrypted}`);
    }
  };

  const isActive = currentProduct.status === 'active';

  return (
    <div className="flex flex-col gap-6">
      <Card
        h1="Product Details"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Images Section */}
          <div className="flex-1 max-w-lg flex flex-col gap-4">
            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
              {activeImage ? (
                <img
                  src={getImageUrl(activeImage)}
                  alt={currentProduct.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-16 h-16 opacity-30 mb-2" />
                  <span className="text-sm font-semibold">No Image Available</span>
                </div>
              )}
            </div>

            {currentProduct.images && currentProduct.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {currentProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${getImageUrl(activeImage) === getImageUrl(img) ? 'border-indigo-600 scale-95 shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex-1 flex flex-col gap-6">

            {/* Header / Name */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold !text-[var(--vs-active-text)]">{currentProduct.name}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {currentProduct.shortDescription && (
                  <p className="text-sm text-[var(--vs-text-secondary)] mt-1.5 font-medium">{currentProduct.shortDescription}</p>
                )}
              </div>
              <Button startIcon={<Edit className="w-4 h-4" />} onClick={handleEditClick}>
                Edit
              </Button>
            </div>

            {/* Price Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-200 dark:border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Discounted Price</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{currentProduct.discountedPrice}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Base Price</span>
                <span className="text-xl font-bold text-gray-500 dark:text-gray-400 line-through mt-1">₹{currentProduct.basePrice}</span>
              </div>
            </div>

            {/* Key details list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Category</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.categoryId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Subcategory</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.subCategoryId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Box className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Brand</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.brandId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Box className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Manufacturer</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.manufacturerId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Barcode className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Barcode</span>
                  <span className="text-sm font-mono font-semibold text-[var(--vs-text-primary)]">{currentProduct.barcode || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <BadgeInfo className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">HSN/SAC Code</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.hsnSacCode || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Box className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Stock / Alert Level</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">
                    {currentProduct.initialStock} units (Alert threshold: {currentProduct.lowStockAlertThreshold || 0})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400">
                  <Box className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Min Order Qty</span>
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">{currentProduct.minOrderQty || 1} unit(s)</span>
                </div>
              </div>

            </div>

            {/* GST Section */}
            <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
              <h4 className="text-xs font-bold !text-[var(--vs-active-text)] dark:text-gray-400 uppercase tracking-wider">GST Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-[var(--vs-text-secondary)]">
                <div>GST Applicable: <span className="font-bold text-[var(--vs-text-primary)]">{currentProduct.isGstApplicable ? 'Yes' : 'No'}</span></div>
                {currentProduct.isGstApplicable && (
                  <div>GST Override Rate: <span className="font-bold text-[var(--vs-text-primary)]">{currentProduct.gstRateOverride}%</span></div>
                )}
                <div>GST Included in Price: <span className="font-bold text-[var(--vs-text-primary)]">{currentProduct.isGstIncludedInPrice ? 'Yes' : 'No'}</span></div>
              </div>
            </div>

            {/* Tags Badge list */}
            {tagsList.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tagsList.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Customization fields */}
            {currentProduct.isCustomizable && customizationFields.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customizable Fields</h4>
                <div className="overflow-hidden border border-gray-200 dark:border-white/10 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold">
                        <th className="py-2 px-3">Field Label</th>
                        <th className="py-2 px-3">Field Type</th>
                        <th className="py-2 px-3">Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[var(--vs-text-secondary)]">
                      {customizationFields.map((field, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-semibold text-[var(--vs-text-primary)]">{field.label}</td>
                          <td className="py-2.5 px-3">{field.fieldType}</td>
                          <td className="py-2.5 px-3">{field.isRequired ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Full description */}
            {currentProduct.fullDescription && (
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold !text-[var(--vs-active-text)] dark:text-gray-400 uppercase tracking-wider">Full Product Description</h4>
                <p className="text-sm text-[var(--vs-text-secondary)] whitespace-pre-line leading-relaxed">
                  {currentProduct.fullDescription}
                </p>
              </div>
            )}

          </div>

        </div>
      </Card>
    </div>
  );
}
