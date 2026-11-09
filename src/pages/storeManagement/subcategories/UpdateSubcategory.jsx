import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, X, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Field, FormActions, FormGrid, Input, PageHeader, Section, Select, Spinner, Textarea } from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
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
  const [newPreview, setNewPreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(!id);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm({
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
    }
  }, [currentSubcategory, setValue]);

  useEffect(() => {
    if (success) {
      dispatch(resetSubcategoryStatus());
      navigate('/subcategories', { state: { message: 'Subcategory updated successfully.', color: 'success' } });
    }
  }, [success, dispatch, navigate]);

  const existingImage = currentSubcategory?.categoryImage || '';
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
    setImageRemoved(false);
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
    const finalImageUrl = uploadedImageUrl || (imageRemoved ? '' : existingImage);

    const payload = {
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: (data.description || '').trim(),
      categoryImage: finalImageUrl,
    };

    dispatch(updateSubcategory({ subCategoryId: id, payload }));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Update Subcategory"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      {!isInitialized ? (
        <Card>
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading subcategory details..." />
          </div>
        </Card>
      ) : !currentSubcategory ? (
        <Card>
          <EmptyState
            icon={X}
            title="Subcategory Not Found"
            text={!id ? "Invalid subcategory ID." : "The subcategory you are trying to edit does not exist or has been deleted."}
            action={
              <Button variant="secondary" onClick={() => navigate('/subcategories')}>
                Back to Subcategories
              </Button>
            }
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Section title="Subcategory details" description="Pick the parent category and name it">
            <FormGrid cols={2}>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: 'Category selection is required' }}
                render={({ field }) => (
                  <Field label="Category" required error={errors.categoryId?.message}>
                    <Select
                      id="categoryId"
                      options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                      placeholder="Select Category"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.categoryId}
                      loading={categoriesLoading}
                    />
                  </Field>
                )}
              />
              <Field label="Subcategory Name" required error={errors.name?.message}>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter subcategory name"
                  {...register('name', { required: 'Subcategory name is required' })}
                />
              </Field>
              <Field label="Description" className="col-span-full">
                <Textarea
                  id="description"
                  placeholder="Enter subcategory description"
                  rows={4}
                  {...register('description')}
                />
              </Field>
            </FormGrid>
          </Section>

          <Section title="Subcategory Image" description="Optional">
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
            <Button variant="secondary" onClick={() => navigate('/subcategories')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Subcategory
            </Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}
