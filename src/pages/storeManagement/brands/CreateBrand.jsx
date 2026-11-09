import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Field, FormActions, FormGrid, Input, PageHeader, Section, Textarea } from '@/components/ui';
import FileInput from '@/components/inputs/FileInput';
import {
  createBrand,
  resetBrandStatus,
} from './services/brandSlice';

export default function CreateBrand() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, success } = useSelector((state) => state.brand);

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
    dispatch(resetBrandStatus());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      reset();
      dispatch(resetBrandStatus());
      navigate('/brands');
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
      name: data.name.trim(),
      description: (data.description || '').trim(),
      logo: uploadedImageUrl || '',
    };

    dispatch(createBrand(payload));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create Brand"
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Section title="Brand details" description="Name and a short description">
          <FormGrid cols={2}>
            <Field label="Brand Name" required error={errors.name?.message}>
              <Input
                id="name"
                type="text"
                placeholder="Enter brand name"
                {...register('name', { required: 'Brand name is required' })}
              />
            </Field>
            <Field label="Description" className="col-span-full">
              <Textarea
                id="description"
                placeholder="Enter brand description"
                rows={4}
                {...register('description')}
              />
            </Field>
          </FormGrid>
        </Section>

        <Section title="Brand Logo" description="Optional">
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
          <Button variant="secondary" onClick={() => navigate('/brands')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Brand
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
