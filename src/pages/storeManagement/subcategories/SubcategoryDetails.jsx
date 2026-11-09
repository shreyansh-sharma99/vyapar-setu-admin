import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, ShieldAlert, ImageIcon } from 'lucide-react';
import { Button, Card, DetailList, EmptyState, PageHeader, Section, Skeleton, StatusBadge } from '@/components/ui';
import { decryptData, encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { getSubcategoryById, clearCurrentSubcategory } from './services/subcategorySlice';


export default function SubcategoryDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentSubcategory, loading } = useSelector((state) => state.subcategory);

  useEffect(() => {
    if (id) {
      dispatch(getSubcategoryById({ subCategoryId: id }));
    }
    return () => {
      dispatch(clearCurrentSubcategory());
    };
  }, [dispatch, id]);

  const handleEditClick = () => {
    if (currentSubcategory?._id) {
      const encrypted = encodeURIComponent(encryptData(currentSubcategory._id));
      const categoryId = currentSubcategory.categoryId?._id || currentSubcategory.categoryId || '';
      navigate(`/subcategories/edit/${encrypted}?categoryId=${categoryId}`);
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
        <PageHeader title="Subcategory Details" actions={backButton} />
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

  if (!currentSubcategory) {
    return (
      <Card className="mx-auto my-12 w-full max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="Subcategory Not Found"
          text="The subcategory details you are trying to view are not available."
          action={<Button onClick={() => navigate('/subcategories')}>Back to Subcategories</Button>}
        />
      </Card>
    );
  }

  const isActive = currentSubcategory.status === 'active';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={currentSubcategory.name}
        description="Subcategory Details"
        actions={
          <>
            <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} size="md" />
            {backButton}
            <Button size="sm" startIcon={<Edit2 />} onClick={handleEditClick}>
              Edit Subcategory
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,280px)_1fr]">
        <Card padding="sm">
          <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-control bg-fill text-ink-subtle">
            {currentSubcategory.categoryImage ? (
              <img
                src={currentSubcategory.categoryImage}
                alt={currentSubcategory.name}
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
            {currentSubcategory.description || <span className="text-ink-subtle">No description provided.</span>}
          </p>
          <DetailList
            className="mt-5 border-t border-line pt-5"
            cols={2}
            items={[
              { label: 'Category', value: currentSubcategory.categoryId?.name },
              { label: 'Created By', value: currentSubcategory.createdBy?.name },
              { label: 'Updated By', value: currentSubcategory.updatedBy?.name },
              { label: 'Created At', value: currentSubcategory.createdAt ? formatDateWithTiming(currentSubcategory.createdAt) : '' },
            ]}
          />
        </Section>
      </div>
    </div>
  );
}
