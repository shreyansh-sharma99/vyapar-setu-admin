import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import FileInput from '@/components/inputs/FileInput';
import Loader from '@/components/loader/Loader';
import { getCategories } from '../categories/services/categorySlice';
import {
  getSubcategoryById,
  updateSubcategory,
  resetSubcategoryStatus,
} from './services/subcategorySlice';
import { decryptData } from '@/utility/crypto';

export default function UpdateSubcategory() {
  const { id: encryptedId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const categoryIdParam = searchParams.get('categoryId');

  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { currentSubcategory, loading, error, success } = useSelector((state) => state.subcategory);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
    },
  });

  useEffect(() => {
    dispatch(resetSubcategoryStatus());
    dispatch(getCategories());
    if (id) {
      dispatch(getSubcategoryById({ subCategoryId: id, categoryId: categoryIdParam })).finally(() => {
        setIsInitialized(true);
      });
    } else {
      setIsInitialized(true);
    }
  }, [dispatch, id, categoryIdParam]);

  useEffect(() => {
    if (currentSubcategory) {
      setValue('name', currentSubcategory.name);
      const catId = typeof currentSubcategory.categoryId === 'object'
        ? currentSubcategory.categoryId?._id
        : currentSubcategory.categoryId;
      setValue('categoryId', catId || '');
      setValue('description', currentSubcategory.description || '');
      setImagePreview(currentSubcategory.categoryImage || null);
    }
  }, [currentSubcategory, setValue]);

  useEffect(() => {
    if (success) {
      dispatch(resetSubcategoryStatus());
      navigate('/subcategories', { state: { message: 'Subcategory updated successfully.', color: 'success' } });
    }
  }, [success, dispatch, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB limit.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSuccess = (response) => {
    if (response && response.data && response.data.url) {
      setUploadedImageUrl(response.data.url);
    } else if (response && typeof response === 'string') {
      setUploadedImageUrl(response);
    }
  };

  const onSubmit = (data) => {
    // If user uploaded a new image, use uploadedImageUrl.
    // If user removed the preview, set to empty.
    // Otherwise, keep the existing categoryImage.
    const finalImageUrl = uploadedImageUrl !== null
      ? uploadedImageUrl
      : (imagePreview ? (currentSubcategory?.categoryImage || '') : '');

    const payload = {
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: (data.description || '').trim(),
      categoryImage: finalImageUrl,
    };

    dispatch(updateSubcategory({ subCategoryId: id, payload }));
  };

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        h1="Update Subcategory"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading subcategory details...</p>
          </div>
        ) : !currentSubcategory ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center py-12">
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-full text-red-500">
              <X className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Subcategory Not Found</h2>
              <p className="text-sm text-[var(--vs-text-secondary)] mt-1">
                {!id ? "Invalid subcategory ID." : "The subcategory you are trying to edit does not exist or has been deleted."}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/subcategories')} className="mt-2">
              Back to Subcategories
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  rules={{ required: 'Category selection is required' }}
                  render={({ field }) => (
                    <Select
                      id="categoryId"
                      options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                      placeholder="Select Category"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.categoryId}
                      loading={categoriesLoading}
                    />
                  )}
                />
                {errors.categoryId && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.categoryId.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="name">Subcategory Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter subcategory name"
                  error={errors.name}
                  {...register('name', { required: 'Subcategory name is required' })}
                />
                {errors.name && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Enter subcategory description"
                rows="4"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                {...register('description')}
              />
            </div>

            <div>
              <Label>Subcategory Image</Label>
              <FileInput
                fileName={selectedFile?.name}
                imagePreview={imagePreview}
                onChange={handleFileChange}
                onUploadSuccess={handleUploadSuccess}
                onRemove={() => {
                  setSelectedFile(null);
                  setImagePreview(null);
                  setUploadedImageUrl(null);
                }}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/subcategories')}
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
                Update Subcategory
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
