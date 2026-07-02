import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/table';
import {
  getManufacturers,
  deleteManufacturer,
  changeManufacturerStatus,
  clearManufacturerToast,
} from './services/manufacturerSlice';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function ManufacturerList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { manufacturers, loading, toast: reduxToast } = useSelector((state) => state.manufacturer);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, manufacturerId: null });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    dispatch(getManufacturers());
  }, [dispatch]);

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearManufacturerToast());
    }
  }, [reduxToast, dispatch]);

  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, manufacturerId: item._id });
  };

  const handleEditClick = (item) => {
    const encryptedId = encodeURIComponent(encryptData(item._id));
    navigate(`/manufacturers/edit/${encryptedId}`);
  };

  const handleConfirmDelete = () => {
    if (deleteModal.manufacturerId) {
      dispatch(deleteManufacturer(deleteModal.manufacturerId));
      setDeleteModal({ isOpen: false, manufacturerId: null });
    }
  };

  const handleStatusToggle = (item, newVal) => {
    const newStatus = newVal ? 'active' : 'inactive';
    dispatch(changeManufacturerStatus({ manufacturerId: item._id, status: newStatus }));
  };

  const headers = [
    {
      label: 'Logo',
      key: 'logo',
      type: 'image',
      width: '80px',
      value: 'checked'
    },
    {
      label: 'Name',
      key: 'name',
      width: '25%',
      sortable: true,
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      value: 'checked'
    },
    {
      label: 'Description',
      key: 'description',
      sortable: true,
      value: 'checked'
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (item) => {
        const isActive = item.status === 'active';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
      value: 'checked'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card h1="Manufacturers" bodyClassName="p-4">
        <Table
          headers={headers}
          data={manufacturers}
          loading={loading}
          searchPlaceholder="Search manufacturers..."
          emptyMessage="No manufacturers found. Click 'Add New Manufacturer' to create one."
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onToggle={handleStatusToggle}
          toggleField="status"
          actions={
            <Button
              className="!h-10"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/manufacturers/create')}
            >
              Add New Manufacturer
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, manufacturerId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Manufacturer"
        message="Are you sure you want to delete this manufacturer? This action cannot be undone."
      />

      <CToaster className="p-3" style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2">
            <div className="d-flex">
              <CToastBody className="font-semibold">{t.message}</CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
