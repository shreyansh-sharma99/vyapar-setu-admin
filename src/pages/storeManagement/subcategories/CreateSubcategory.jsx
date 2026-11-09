import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Field, FormActions, FormGrid, Input, PageHeader, Section, Select, Spinner, Textarea } from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
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
  const [fileError, setFileError] = useState(null);

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
      dispatch(resetSubcategoryStatus());
      navigate('/subcategories', { state: { message: 'Subcategory created successfully.', color: 'success' } });
    }
  }, [success, dispatch, reset, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds the 5 MB limit. Please choose a smaller image.');
        return;
      }
      setSelectedFile(file);
      setFileError(null);
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create Subcategory"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      {categoriesLoading ? (
        <Card>
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner label="Loading categories..." />
          </div>
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
              onRemove={() => {
                setSelectedFile(null);
                setFileError(null);
                setImagePreview(null);
                setUploadedImageUrl(null);
              }}
            />
            {fileError && (
              <p role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">{fileError}</p>
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
              Create Subcategory
            </Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}
