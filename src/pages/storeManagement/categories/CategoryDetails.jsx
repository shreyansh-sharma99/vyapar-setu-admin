import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, ShieldAlert, ImageIcon } from 'lucide-react';
import { Button, Card, DetailList, EmptyState, PageHeader, Section, Skeleton, StatusBadge } from '@/components/ui';
import { decryptData, encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { getCategoryById, clearCurrentCategory } from './services/categorySlice';


export default function CategoryDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentCategory, loading } = useSelector((state) => state.category);

  useEffect(() => {
    if (id) {
      dispatch(getCategoryById(id));
    }
    return () => {
      dispatch(clearCurrentCategory());
    };
  }, [dispatch, id]);

  const handleEditClick = () => {
    if (currentCategory?._id) {
      const encrypted = encodeURIComponent(encryptData(currentCategory._id));
      navigate(`/categories/edit/${encrypted}`);
    }
  };

  const backButton = (
    <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
      Back
    </Button>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Category Details" actions={backButton} />
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,280px)_1fr]">
          <Card padding="sm">
            <Skeleton className="aspect-square w-full rounded-control" />
          </Card>
          <Card className="flex flex-col gap-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <Card className="mx-auto my-12 w-full max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="Category Not Found"
          text="The category details you are trying to view are not available."
          action={<Button onClick={() => navigate('/categories')}>Back to Categories</Button>}
        />
      </Card>
    );
  }

  const isActive = currentCategory.status === 'active';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={currentCategory.name}
        description="Category Details"
        actions={
          <>
            <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} size="md" />
            {backButton}
            <Button size="sm" startIcon={<Edit2 />} onClick={handleEditClick}>
              Edit Category
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,280px)_1fr]">
        <Card padding="sm">
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-control bg-fill text-ink-subtle">
            {currentCategory.categoryImage ? (
              <img
                src={currentCategory.categoryImage}
                alt={currentCategory.name}
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/300x300?text=No+Image';
                }}
              />
            ) : (
              <ImageIcon className="size-16 opacity-40" aria-hidden="true" />
            )}
          </div>
        </Card>

        <Section title="About">
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {currentCategory.description || <span className="text-ink-subtle">No description provided.</span>}
          </p>
          <DetailList
            className="mt-5 border-t border-line pt-5"
            cols={3}
            items={[
              { label: 'Created By', value: currentCategory.createdBy?.name },
              { label: 'Updated By', value: currentCategory.updatedBy?.name },
              { label: 'Created At', value: currentCategory.createdAt ? formatDateWithTiming(currentCategory.createdAt) : '' },
            ]}
          />
        </Section>
      </div>
    </div>
  );
}
