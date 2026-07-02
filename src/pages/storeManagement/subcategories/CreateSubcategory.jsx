import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Select from '@/components/inputs/Select';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import FileInput from '@/components/inputs/FileInput';
import Loader from '@/components/loader/Loader';
import { getCategories } from '../categories/services/categorySlice';
import {
  createSubcategory,
  resetSubcategoryStatus,
} from './services/subcategorySlice';

export default function CreateSubcategory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { categories, loading: categoriesLoading } = useSelector((state) => state.category);
  const { loading, error, success } = useSelector((state) => state.subcategory);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
    },
  });

  useEffect(() => {
    dispatch(getCategories());
    dispatch(resetSubcategoryStatus());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      reset();
      setSelectedFile(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
      dispatch(resetSubcategoryStatus());
      navigate('/subcategories', { state: { message: 'Subcategory created successfully.', color: 'success' } });
    }
  }, [success, dispatch, reset, navigate]);

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
    const payload = {
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: (data.description || '').trim(),
      categoryImage: uploadedImageUrl || '',
    };

    dispatch(createSubcategory(payload));
  };

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card
        h1="Create Subcategory"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {categoriesLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading categories...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category<span className="text-red-500">*</span></Label>
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
                <Label htmlFor="name">Subcategory Name<span className="text-red-500">*</span></Label>
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

            <div className="mt-4 flex justify-end gap-3">
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
                Create Subcategory
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
