import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Field, FormActions, FormGrid, Input, PageHeader, Section, Textarea } from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
import { createCategory, resetCategoryStatus } from './services/categorySlice';

export default function CreateCategory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, success } = useSelector((state) => state.category);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [fileError, setFileError] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    dispatch(resetCategoryStatus());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      reset();
      dispatch(resetCategoryStatus());
      navigate('/categories');
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
    if (response) {
      setUploadedImageUrl(response.data.url);
    }
  };

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name.trim());
    formData.append('description', (data.description || '').trim());

    if (uploadedImageUrl) {
      formData.append('categoryImage', typeof uploadedImageUrl === 'string' ? uploadedImageUrl : JSON.stringify(uploadedImageUrl));
    } else if (selectedFile) {
      formData.append('categoryImage', selectedFile);
    }

    dispatch(createCategory(formData));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create Category"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
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
          <Button variant="secondary" onClick={() => navigate('/categories')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Category
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
