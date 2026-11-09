import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, X, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Field, FormActions, FormGrid, Input, PageHeader, Section, Spinner, Textarea } from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Update Category"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      {!isInitialized ? (
        <Card>
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading category details..." />
          </div>
        </Card>
      ) : !currentCategory ? (
        <Card>
          <EmptyState
            icon={X}
            title="Category Not Found"
            text={!id ? "Invalid category ID." : "The category you are trying to edit does not exist or has been deleted."}
            action={
              <Button variant="secondary" onClick={() => navigate('/categories')}>
                Back to Categories
              </Button>
            }
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Section title="Category details" description="Name and a short description">
            <FormGrid cols={2}>
              <Field label="Category Name" required error={errors.name?.message}>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter category name"
                  {...register('name', { required: 'Category name is required' })}
                />
              </Field>
              <Field label="Description" className="col-span-full">
                <Textarea
                  id="description"
                  placeholder="Enter category description"
                  rows={4}
                  {...register('description')}
                />
              </Field>
            </FormGrid>
          </Section>

          <Section title="Category Image" description="Optional">
            <FileInput
              fileName={selectedFile?.name}
              imagePreview={imagePreview}
              onChange={handleFileChange}
              onUploadSuccess={handleUploadSuccess}
              onRemove={handleRemoveImage}
            />
            {fileError && (
              <p role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">{fileError}</p>
            )}
            {existingImage && !imageRemoved && !newPreview && !uploadedImageUrl && (
              <div className="mt-3">
                <Button variant="danger-soft" size="xs" startIcon={<Trash2 />} onClick={handleRemoveImage}>
                  Remove image
                </Button>
              </div>
            )}
            {existingImage && imageRemoved && !uploadedImageUrl && !newPreview && (
              <p className="m-0 mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                The current image will be removed when you save.{' '}
                <Button variant="link" size="xs" onClick={() => setImageRemoved(false)}>
                  Undo
                </Button>
              </p>
            )}
          </Section>

          {error && (
            <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <FormActions>
            <Button variant="secondary" onClick={() => navigate('/categories')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Category
            </Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}
