import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, ShieldAlert, ImageIcon, Calendar } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { decryptData, encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import { getManufacturerById, clearCurrentManufacturer } from './services/manufacturerSlice';

export default function ManufacturerDetails() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { currentManufacturer, loading } = useSelector((state) => state.manufacturer);

  useEffect(() => {
    if (id) {
      dispatch(getManufacturerById(id));
    }
    return () => {
      dispatch(clearCurrentManufacturer());
    };
  }, [dispatch, id]);

  const handleEditClick = () => {
    if (currentManufacturer?._id) {
      const encrypted = encodeURIComponent(encryptData(currentManufacturer._id));
      navigate(`/manufacturers/edit/${encrypted}`);
    }
  };

  if (loading) {
    return (
      <Card
        h1="Manufacturer Details"
        bodyClassName="p-6"
      >
        <Loader className="mb-4" />
      </Card>
    );
  }

  if (!currentManufacturer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--vs-bg-primary)] rounded-2xl border border-[var(--vs-border)] max-w-md mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Manufacturer Not Found</h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mt-2">
          The manufacturer details you are trying to view are not available.
        </p>
        <Button onClick={() => navigate('/manufacturers')} className="mt-6" variant="primary">
          Back to Manufacturers
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto w-full">
      <Card
        h1="Manufacturer Details"
        bodyClassName="p-6"
        rightNode={
          <div className="flex items-center gap-2.5">
            <Button
              size="xs"
              variant="outline"
              startIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={handleEditClick}
              className="shrink-0"
            >
              Edit Manufacturer
            </Button>

            <Button
              size="xs"
              variant="danger"
              startIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row gap-8 items-start relative">

          {/* Left Side: Big Image */}
          <div className="w-full md:w-1/3 max-w-[280px] aspect-square rounded-2xl overflow-hidden border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]/30 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
            {currentManufacturer.logo ? (
              <img
                src={currentManufacturer.logo}
                alt={currentManufacturer.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/300x300?text=No+Image';
                }}
              />
            ) : (
              <ImageIcon className="w-16 h-16 opacity-30" />
            )}
          </div>

          {/* Right Side: Details */}
          <div className="flex-1 flex flex-col gap-2 min-w-0 w-full md:self-stretch">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold !text-blue-600 leading-tight">
                  {currentManufacturer.name}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentManufacturer.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentManufacturer.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {currentManufacturer.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <p className="text-sm !text-[var(--vs-text-primary)] font-medium leading-relaxed whitespace-pre-wrap mt-2">
              {currentManufacturer.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center justify-between text-xs text-[var(--vs-text-secondary)] mt-auto pt-4 border-t border-[var(--vs-border)] gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                {currentManufacturer.createdBy?.name && (
                  <span>Created By: <strong className="text-[var(--vs-text-primary)]">{currentManufacturer.createdBy.name}</strong></span>
                )}
                {currentManufacturer.updatedBy?.name && (
                  <span>Updated By: <strong className="text-[var(--vs-text-primary)]">{currentManufacturer.updatedBy.name}</strong></span>
                )}
              </div>

              {currentManufacturer.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Created At:{' '}
                    <span className="font-semibold text-[var(--vs-text-primary)]">
                      {formatDateWithTiming(currentManufacturer.createdAt)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
}
