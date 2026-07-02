import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Loader2, Plus, Trash2, Image as ImageIcon, X, QrCode } from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import FileInput from '@/components/inputs/FileInput';
import TagInput from '@/components/inputs/TagInputs';
import Checkbox from '@/components/inputs/Checkbox';
import Loader from '@/components/loader/Loader';
import { getCategories } from '../categories/services/categorySlice';
import { getBrands } from '../brands/services/brandSlice';
import { getManufacturers } from '../manufacturers/services/manufacturerSlice';
import { getProductById, updateProduct, resetProductStatus } from './services/productSlice';
import { getSubcategoriesApi } from '../subcategories/services/subcategoryService';
import { decryptData } from '@/utility/crypto';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';

export default function UpdateProduct() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  // Selectors
  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { brands, loading: brandsLoading } = useSelector((state) => state.brand);
  const { manufacturers, loading: manufacturersLoading } = useSelector((state) => state.manufacturer);
  const { currentProduct, loading, error, success } = useSelector((state) => state.product);

  // Local State
  const [subcategories, setSubcategories] = useState([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [images, setImages] = useState([]); // array of image URLs
  const [customFields, setCustomFields] = useState([]); // array of { label, fieldType, isRequired }
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      subCategoryId: '',
      brandId: '',
      manufacturerId: '',
      shortDescription: '',
      fullDescription: '',
      basePrice: '',
      discountedPrice: '',
      minOrderQty: '1',
      initialStock: '',
      lowStockAlertThreshold: '',
      hsnSacCode: '',
      barcode: '',
      tags: '',
      isGstApplicable: 'false',
      gstRateOverride: '0',
      isGstIncludedInPrice: 'false',
      isCustomizable: 'false',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const isGstApplicable = watch('isGstApplicable');
  const isCustomizable = watch('isCustomizable');

  // Load configuration dropdown options
  useEffect(() => {
    dispatch(getCategories());
    dispatch(getBrands());
    dispatch(getManufacturers());
    dispatch(resetProductStatus());

    if (id) {
      dispatch(getProductById(id)).finally(() => {
        setIsInitialized(true);
      });
    } else {
      setIsInitialized(true);
    }
  }, [dispatch, id]);

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      setSubcategoriesLoading(true);
      getSubcategoriesApi(selectedCategoryId)
        .then((res) => {
          setSubcategories(res.data || []);
        })
        .catch(() => {
          setSubcategories([]);
        })
        .finally(() => {
          setSubcategoriesLoading(false);
        });
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  // Set form values once currentProduct is loaded
  useEffect(() => {
    if (currentProduct) {
      const catId = currentProduct.categoryId?._id || currentProduct.categoryId || '';
      const subCatId = currentProduct.subCategoryId?._id || currentProduct.subCategoryId || '';
      const brandId = currentProduct.brandId?._id || currentProduct.brandId || '';
      const manufacturerId = currentProduct.manufacturerId?._id || currentProduct.manufacturerId || '';

      setValue('name', currentProduct.name || '');
      setValue('categoryId', catId);
      setValue('subCategoryId', subCatId);
      setValue('brandId', brandId);
      setValue('manufacturerId', manufacturerId);
      setValue('shortDescription', currentProduct.shortDescription || '');
      setValue('fullDescription', currentProduct.fullDescription || '');
      setValue('basePrice', currentProduct.basePrice || '');
      setValue('discountedPrice', currentProduct.discountedPrice || '');
      setValue('minOrderQty', currentProduct.minOrderQty || '1');
      setValue('initialStock', currentProduct.initialStock || '');
      setValue('lowStockAlertThreshold', currentProduct.lowStockAlertThreshold || '');
      setValue('hsnSacCode', currentProduct.hsnSacCode || '');
      setValue('barcode', currentProduct.barcode || '');

      // Parse tags
      let parsedTags = '';
      if (currentProduct.tags) {
        try {
          const arr = JSON.parse(currentProduct.tags);
          parsedTags = Array.isArray(arr) ? arr.join(', ') : (currentProduct.tags || '');
        } catch (e) {
          parsedTags = currentProduct.tags || '';
        }
      }
      setValue('tags', parsedTags);

      setValue('isGstApplicable', String(currentProduct.isGstApplicable ?? 'false'));
      setValue('gstRateOverride', String(currentProduct.gstRateOverride || '0'));
      setValue('isGstIncludedInPrice', String(currentProduct.isGstIncludedInPrice ?? 'false'));
      setValue('isCustomizable', String(currentProduct.isCustomizable ?? 'false'));

      // Images
      setImages(currentProduct.images || []);

      // Custom fields
      let parsedFields = [];
      if (currentProduct.customizationFields) {
        try {
          parsedFields = typeof currentProduct.customizationFields === 'string'
            ? JSON.parse(currentProduct.customizationFields)
            : currentProduct.customizationFields;
        } catch (e) {
          parsedFields = [];
        }
      }
      setCustomFields(Array.isArray(parsedFields) ? parsedFields : []);
    }
  }, [currentProduct, setValue]);

  // Handle updates success
  useEffect(() => {
    if (success) {
      dispatch(resetProductStatus());
      navigate('/products', { state: { message: 'Product updated successfully.', color: 'success' } });
    }
  }, [success, dispatch, navigate]);

  useEffect(() => {
    if (isCustomizable === 'true' && customFields.length === 0) {
      setCustomFields([{ label: '', fieldType: 'TextInput', isRequired: false }]);
    }
  }, [isCustomizable, customFields.length]);

  const getImageUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.path || img.url || '';
  };

  // Image Upload handler
  const handleUploadSuccess = (response) => {
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        const urls = response.data.map(item => item.url).filter(Boolean);
        setImages((prev) => [...prev, ...urls]);
      } else if (response.data.url) {
        setImages((prev) => [...prev, response.data.url]);
      }
    } else if (response && typeof response === 'string') {
      setImages((prev) => [...prev, response]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Custom Fields Builder handler
  const handleCustomFieldChange = (index, key, value) => {
    setCustomFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, [key]: value } : field))
    );
  };

  const addCustomFieldRow = (index) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, { label: '', fieldType: 'TextInput', isRequired: false });
      return next;
    });
  };

  const removeCustomFieldRow = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data) => {
    let tagsPayload = '[]';
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        const tagList = data.tags.map((t) => String(t).trim()).filter(Boolean);
        tagsPayload = JSON.stringify(tagList);
      } else if (typeof data.tags === 'string') {
        const tagList = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
        tagsPayload = JSON.stringify(tagList);
      }
    }

    const payload = {
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      name: data.name.trim(),
      shortDescription: (data.shortDescription || '').trim(),
      fullDescription: (data.fullDescription || '').trim(),
      basePrice: String(data.basePrice),
      discountedPrice: String(data.discountedPrice),
      minOrderQty: String(data.minOrderQty),
      initialStock: String(data.initialStock),
      lowStockAlertThreshold: String(data.lowStockAlertThreshold),
      hsnSacCode: (data.hsnSacCode || '').trim(),
      brandId: data.brandId,
      manufacturerId: data.manufacturerId,
      isGstApplicable: String(data.isGstApplicable),
      gstRateOverride: String(data.isGstApplicable === 'true' ? data.gstRateOverride : '0'),
      isGstIncludedInPrice: String(data.isGstIncludedInPrice),
      isCustomizable: String(data.isCustomizable),
      barcode: (data.barcode || '').trim(),
      tags: tagsPayload,
      images: images,
      customizationFields: data.isCustomizable === 'true' ? JSON.stringify(customFields) : '[]',
    };

    dispatch(updateProduct({ productId: id, payload }));
  };

  const isFormLoading = categoriesLoading || brandsLoading || manufacturersLoading || !isInitialized;

  return (
    <div className="flex flex-col gap-6 mx-auto">
      {/* Top Header Card */}
      <Card
        title="Update Product"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >

        {isFormLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading product details...</p>
          </div>
        ) : !currentProduct ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center py-12">
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-full text-red-500">
              <X className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Product Not Found</h2>
              <p className="text-sm text-[var(--vs-text-secondary)] mt-1">
                {!id ? "Invalid product ID." : "The product you are trying to edit does not exist or has been deleted."}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')} className="mt-2">
              Back to Products
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            <Card title="Basic Information" bodyClassName="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name<span className="text-rose-500">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Product Name"
                    error={errors.name}
                    {...register('name', { required: 'Product name is required' })}
                  />
                  {errors.name && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="barcode"
                        type="text"
                        placeholder="e.g. 123456789012"
                        {...register('barcode')}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBarcodeModalOpen(true)}
                      className="px-3"
                      title="Scan Barcode"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="categoryId">Category<span className="text-rose-500">*</span></Label>
                  <Controller
                    name="categoryId"
                    control={control}
                    rules={{ required: 'Category is required' }}
                    render={({ field }) => (
                      <Select
                        id="categoryId"
                        options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                        placeholder="Select Category"
                        value={field.value}
                        onChange={field.onChange}
                        error={!!errors.categoryId}
                      />
                    )}
                  />
                  {errors.categoryId && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.categoryId.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="subCategoryId">Subcategory<span className="text-rose-500">*</span></Label>
                  <Controller
                    name="subCategoryId"
                    control={control}
                    rules={{ required: 'Subcategory is required' }}
                    render={({ field }) => (
                      <Select
                        id="subCategoryId"
                        options={subcategories.map((sub) => ({ value: sub._id, label: sub.name }))}
                        placeholder={selectedCategoryId ? "Select Subcategory" : "Select Category first"}
                        value={field.value}
                        onChange={field.onChange}
                        error={!!errors.subCategoryId}
                        disabled={!selectedCategoryId || subcategoriesLoading}
                        loading={subcategoriesLoading}
                      />
                    )}
                  />
                  {errors.subCategoryId && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.subCategoryId.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="brandId">Brand<span className="text-rose-500">*</span></Label>
                  <Controller
                    name="brandId"
                    control={control}
                    rules={{ required: 'Brand is required' }}
                    render={({ field }) => (
                      <Select
                        id="brandId"
                        options={brands.map((b) => ({ value: b._id, label: b.name }))}
                        placeholder="Select Brand"
                        value={field.value}
                        onChange={field.onChange}
                        error={!!errors.brandId}
                      />
                    )}
                  />
                  {errors.brandId && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.brandId.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="manufacturerId">Manufacturer<span className="text-rose-500">*</span></Label>
                  <Controller
                    name="manufacturerId"
                    control={control}
                    rules={{ required: 'Manufacturer is required' }}
                    render={({ field }) => (
                      <Select
                        id="manufacturerId"
                        options={manufacturers.map((m) => ({ value: m._id, label: m.name }))}
                        placeholder="Select Manufacturer"
                        value={field.value}
                        onChange={field.onChange}
                        error={!!errors.manufacturerId}
                      />
                    )}
                  />
                  {errors.manufacturerId && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.manufacturerId.message}</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Card 2: Pricing & Inventory */}
            <Card title="Pricing & Inventory" bodyClassName="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="basePrice">Base Price (₹)<span className="text-rose-500">*</span></Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    placeholder="999"
                    error={errors.basePrice}
                    {...register('basePrice', { required: 'Base price is required', min: 0 })}
                  />
                  {errors.basePrice && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.basePrice.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="discountedPrice">Discounted Price (₹)<span className="text-rose-500">*</span></Label>
                  <Input
                    id="discountedPrice"
                    type="number"
                    step="0.01"
                    placeholder="899"
                    error={errors.discountedPrice}
                    {...register('discountedPrice', { required: 'Discounted price is required', min: 0 })}
                  />
                  {errors.discountedPrice && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.discountedPrice.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="minOrderQty">Min Order Qty</Label>
                  <Input
                    id="minOrderQty"
                    type="number"
                    placeholder="1"
                    {...register('minOrderQty', { min: 1 })}
                  />
                </div>

                <div>
                  <Label htmlFor="initialStock">Stock / Initial Stock<span className="text-rose-500">*</span></Label>
                  <Input
                    id="initialStock"
                    type="number"
                    placeholder="100"
                    error={errors.initialStock}
                    {...register('initialStock', { required: 'Stock is required', min: 0 })}
                  />
                  {errors.initialStock && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.initialStock.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="lowStockAlertThreshold">Low Stock Alert Threshold</Label>
                  <Input
                    id="lowStockAlertThreshold"
                    type="number"
                    placeholder="10"
                    {...register('lowStockAlertThreshold', { min: 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="hsnSacCode">HSN / SAC Code</Label>
                  <Input
                    id="hsnSacCode"
                    type="text"
                    placeholder="e.g. 85171200"
                    {...register('hsnSacCode')}
                  />
                </div>
              </div>
            </Card>

            {/* Card 3: Descriptions & Tags */}
            <Card title="Descriptions & Tags" bodyClassName="p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="shortDescription">Short Description<span className="text-rose-500">*</span></Label>
                  <Input
                    id="shortDescription"
                    type="text"
                    placeholder="Short summary of the product..."
                    error={errors.shortDescription}
                    {...register('shortDescription', { required: 'Short description is required' })}
                  />
                  {errors.shortDescription && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.shortDescription.message}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="fullDescription">Full Description</Label>
                  <textarea
                    id="fullDescription"
                    placeholder="Detailed explanation of the product features, specs..."
                    rows="5"
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                    {...register('fullDescription')}
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (Comma Separated)</Label>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="smartphone, apple, 5g"
                      />
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Card 4: GST Configuration */}
            <Card title="GST Configuration" bodyClassName="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="isGstApplicable">Is GST Applicable?</Label>
                  <Controller
                    name="isGstApplicable"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="isGstApplicable"
                        options={[
                          { value: 'true', label: 'Yes' },
                          { value: 'false', label: 'No' },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {isGstApplicable === 'true' && (
                  <div>
                    <Label htmlFor="gstRateOverride">GST Rate Override (%)</Label>
                    <Input
                      id="gstRateOverride"
                      type="number"
                      placeholder="18"
                      {...register('gstRateOverride', { min: 0, max: 100 })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="isGstIncludedInPrice">Is GST Included In Price?</Label>
                  <Controller
                    name="isGstIncludedInPrice"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="isGstIncludedInPrice"
                        options={[
                          { value: 'true', label: 'Yes' },
                          { value: 'false', label: 'No' },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Card 5: Product Customization */}
            <Card title="Product Customization" bodyClassName="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="isCustomizable">Is Product Customizable?</Label>
                  <Controller
                    name="isCustomizable"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="isCustomizable"
                        options={[
                          { value: 'true', label: 'Yes' },
                          { value: 'false', label: 'No' },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              {isCustomizable === 'true' && (
                <div className="bg-[var(--vs-bg-secondary)] p-6 rounded-2xl border border-[var(--vs-border)] flex flex-col gap-4">
                  <span className="text-sm font-semibold text-[var(--vs-text-primary)]">Custom Fields Builder</span>
                  
                  <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)]">
                    <table className="w-full border-collapse border-spacing-0">
                      <thead className="bg-[var(--vs-active-bg)] dark:bg-indigo-950/40 text-[var(--vs-active-text)] dark:text-indigo-300">
                        <tr>
                          <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-left">Field Label</th>
                          <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-left w-64">Field Type</th>
                          <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-center w-36">Required</th>
                          <th className="border border-[var(--vs-border)] p-3 text-sm font-semibold text-center w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--vs-bg-primary)]">
                        {customFields.map((field, idx) => (
                          <tr key={idx} className="hover:bg-[var(--vs-drop-hover)] transition-colors">
                            {/* Field Label Input Column */}
                            <td className="border border-[var(--vs-border)] p-3">
                              <input
                                type="text"
                                placeholder="e.g. Engraving Name"
                                value={field.label}
                                onChange={(e) => handleCustomFieldChange(idx, 'label', e.target.value)}
                                className="w-full rounded-xl border border-[var(--vs-input-border)] bg-[var(--vs-input-bg)] px-3.5 py-2 text-sm text-[var(--vs-text-primary)] placeholder:text-[var(--vs-text-secondary)]/50 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08]"
                              />
                            </td>

                            {/* Field Type Select Column */}
                            <td className="border border-[var(--vs-border)] p-3 align-middle">
                              <Select
                                options={[
                                  { value: 'TextInput', label: 'Text Input' },
                                  { value: 'ImageUpload', label: 'Image Upload' },
                                ]}
                                value={field.fieldType}
                                onChange={(val) => handleCustomFieldChange(idx, 'fieldType', val)}
                              />
                            </td>

                            {/* Is Required Checkbox Column */}
                            <td className="border border-[var(--vs-border)] p-3 align-middle">
                              <div className="flex justify-center items-center h-11">
                                <Checkbox
                                  id={`isRequired-${idx}`}
                                  label="Required"
                                  checked={field.isRequired}
                                  onChange={(checked) => handleCustomFieldChange(idx, 'isRequired', checked)}
                                />
                              </div>
                            </td>

                            {/* Action Buttons Column */}
                            <td className="border border-[var(--vs-border)] p-3 align-middle">
                              <div className="flex gap-2 justify-center items-center h-11">
                                <button
                                  type="button"
                                  onClick={() => addCustomFieldRow(idx)}
                                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--vs-active-bg)] hover:opacity-90 text-[var(--vs-active-text)] transition-all border border-[var(--vs-border-sidebar-line)] hover:scale-[1.02] active:scale-[0.98]"
                                  title="Add Field"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                
                                {customFields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCustomFieldRow(idx)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all border border-rose-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                    title="Remove Field"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>

            {/* Card 6: Product Images */}
            <Card title="Product Images" bodyClassName="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Upload Image</Label>
                  <FileInput
                    onUploadSuccess={handleUploadSuccess}
                    fieldName="files"
                    enableUploadModal={true}
                    title="Upload product images"
                    description="Drag & drop or select multiple files"
                    multiple={true}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Images List ({images.length})</span>
                  {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02]">
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">No images uploaded yet.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[220px] p-1">
                      {images.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 aspect-square">
                          <img
                            src={getImageUrl(url)}
                            alt={`Product image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-md cursor-pointer z-10"
                            title="Remove Image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <BarcodeScannerModal
              isOpen={isBarcodeModalOpen}
              onClose={() => setIsBarcodeModalOpen(false)}
              onSave={(val) => {
                setValue('barcode', val, { shouldValidate: true, shouldDirty: true });
              }}
              initialValue={watch('barcode') || ''}
            />

            {/* Form Actions */}
            <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                startIcon={loading && <Loader2 className="w-4 h-4 animate-spin" />}
              >
                Update Product
              </Button>
            </div>

          </form>
        )}</Card>
    </div>
  );
}
