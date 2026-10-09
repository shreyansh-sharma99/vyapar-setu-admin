import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Loader2, X, Trash2 } from 'lucide-react';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import FileInput from '@/components/inputs/FileInput';
import Loader from '@/components/loader/Loader';
import {
  getCategoryById,
  updateCategory,
  resetCategoryStatus,
} from './services/categorySlice';
import { decryptData } from '@/utility/crypto';

export default function UpdateCategory() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentCategory, loading, error, success } = useSelector((state) => state.category);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newPreview, setNewPreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(!id);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);


  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    dispatch(resetCategoryStatus());
    if (id) {
      dispatch(getCategoryById(id)).finally(() => {
        setIsInitialized(true);
      });
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (currentCategory) {
      setValue('name', currentCategory.name);
      setValue('description', currentCategory.description || '');
    }
  }, [currentCategory, setValue]);

  useEffect(() => {
    if (success) {
      dispatch(resetCategoryStatus());
      navigate('/categories');
    }
  }, [success, dispatch, navigate]);

  const existingImage = currentCategory?.categoryImage || '';
  const imagePreview = newPreview || uploadedImageUrl || (!imageRemoved && existingImage ? existingImage : null);

  // Drop a newly picked image; if there is none, mark the saved image for removal.
  const handleRemoveImage = () => {
    const hadNewImage = !!(newPreview || uploadedImageUrl || selectedFile);
    setSelectedFile(null);
    setNewPreview(null);
    setUploadedImageUrl(null);
    setFileError(null);
    if (!hadNewImage) setImageRemoved(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds the 5 MB limit. Please choose a smaller image.');
        return;
      }
      setSelectedFile(file);
      setFileError(null);
      setImageRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSuccess = (response) => {
    const url = response?.data?.url || (typeof response === 'string' ? response : null);
    if (url) {
      setUploadedImageUrl(url);
      setImageRemoved(false);
    }
  };

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name.trim());
    formData.append('description', (data.description || '').trim());
    // New upload wins; "Remove image" sends '' so the backend clears it; otherwise keep the current image.
    formData.append('categoryImage', (uploadedImageUrl || (imageRemoved ? '' : existingImage)).trim());
    dispatch(updateCategory({ categoryId: id, formData }));
  };

  return (
    <div className="flex flex-col gap-6  mx-auto">
      <Card
        h1="Update Category"
        buttonName="Back "
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
            <Loader className="mb-4" />
            <p className="text-sm text-[var(--vs-text-secondary)] font-medium">Loading category details...</p>
          </div>
        ) : !currentCategory ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center py-12">
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-full text-red-500">
              <X className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Category Not Found</h2>
              <p className="text-sm text-[var(--vs-text-secondary)] mt-1">
                {!id ? "Invalid category ID." : "The category you are trying to edit does not exist or has been deleted."}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/categories')} className="mt-2">
              Back to Categories
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter category name"
                error={errors.name}
                {...register('name', { required: 'Category name is required' })}
              />
              {errors.name && (
                <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Enter category description"
                rows="4"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-200 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04] dark:focus:bg-indigo-500/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                {...register('description')}
              />
            </div>

            <div>
              <Label>Category Image</Label>
              <FileInput
                fileName={selectedFile?.name}
                imagePreview={imagePreview}
                onChange={handleFileChange}
                onUploadSuccess={handleUploadSuccess}
                onRemove={handleRemoveImage}
              />
              {fileError && (
                <span className="text-xs text-red-500 mt-1 block">{fileError}</span>
              )}
              {existingImage && !imageRemoved && !newPreview && !uploadedImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove image
                </button>
              )}
              {existingImage && imageRemoved && !uploadedImageUrl && !newPreview && (
                <div className="mt-2 text-xs text-[var(--vs-text-secondary)]">
                  The current image will be removed when you save.{' '}
                  <button
                    type="button"
                    onClick={() => setImageRemoved(false)}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Undo
                  </button>
                </div>
              )}
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
                onClick={() => navigate('/categories')}
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
                Update Category
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
