import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Store,
  Plus,
  MapPin,
  Phone,
  User,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import DeleteModal from '@/components/modal/DeleteModal';
import {
  getStoreList,
  setDefaultStore,
  deleteStore,
  updateStore,
  clearStoreStatus,
} from './services/storeSlice';

export default function StoreList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { storeList, pagination, stats, listLoading, saving, error, successMessage } = useSelector(
    (state) => state.store
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, store: null });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, color = 'success') => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchStores = useCallback(() => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedStatus !== 'all') params.isActive = selectedStatus === 'active';
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    dispatch(getStoreList(params));
  }, [dispatch, currentPage, pageSize, selectedStatus, debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Debounce search input -> backend search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Message passed from Create / Update pages
  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, 'success');
      dispatch(clearStoreStatus());
      fetchStores();
    }
    if (error) {
      showToast(error, 'danger');
      dispatch(clearStoreStatus());
    }
  }, [successMessage, error, dispatch, fetchStores]);

  const changeStatusFilter = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleDeleteClick = (store) => {
    if (store.isDefault) {
      showToast('Default store cannot be deleted. Set another store as default first.', 'danger');
      return;
    }
    setDeleteModal({ isOpen: true, store });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.store) {
      await dispatch(deleteStore(deleteModal.store._id));
      setDeleteModal({ isOpen: false, store: null });
    }
  };

  const handleStatusToggle = (store, isActive) => {
    if (store.isDefault && !isActive) {
      showToast('Default store cannot be deactivated. Set another store as default first.', 'danger');
      return;
    }
    dispatch(updateStore({ id: store._id, payload: { isActive } }));
  };

  const headers = [
    {
      label: 'Store / Warehouse',
      key: 'name',
      sortable: true,
      render: (store) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${store.isDefault
              ? 'bg-indigo-600 text-white'
              : 'bg-[var(--vs-active-bg)] text-[var(--vs-active-text)]'
              }`}
          >
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[var(--vs-text-primary)]">{store.name}</span>
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[var(--vs-active-text)]">
              {store.code || '—'}
            </span>
          </div>
        </div>
      ),
      value: 'checked',
    },
    {
      label: 'Location',
      key: 'location',
      render: (store) => {
        const a = store.address || {};
        const line1 = [a.street, a.area].filter(Boolean).join(', ');
        const line2 = [a.city, a.state, a.pincode].filter(Boolean).join(', ');
        if (!line1 && !line2) return <span className="text-[var(--vs-text-secondary)] text-xs">—</span>;
        return (
          <div className="flex items-start gap-1.5 text-xs min-w-[180px]">
            <MapPin className="w-3.5 h-3.5 text-[var(--vs-text-secondary)] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              {line2 && <span className="font-medium text-[var(--vs-text-primary)]">{line2}</span>}
              {line1 && <span className="text-[var(--vs-text-secondary)] line-clamp-1">{line1}</span>}
            </div>
          </div>
        );
      },
      value: 'checked',
    },
    {
      label: 'Contact',
      key: 'contactPerson',
      render: (store) =>
        store.contactPerson || store.phone ? (
          <div className="flex flex-col gap-0.5 text-xs">
            {store.contactPerson && (
              <span className="flex items-center gap-1.5 text-[var(--vs-text-primary)]">
                <User className="w-3 h-3 text-[var(--vs-text-secondary)]" />
                {store.contactPerson}
              </span>
            )}
            {store.phone && (
              <span className="flex items-center gap-1.5 text-[var(--vs-text-secondary)]">
                <Phone className="w-3 h-3" />
                {store.phone}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[var(--vs-text-secondary)] text-xs">—</span>
        ),
      value: 'checked',
    },
    {
      label: 'Default',
      key: 'isDefault',
      render: (store) =>
        store.isDefault ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--vs-active-bg)] text-[var(--vs-active-text)] ring-1 ring-indigo-500/20 whitespace-nowrap">
            <Star className="w-3 h-3 fill-current" />
            Default
          </span>
        ) : (
          <button
            type="button"
            onClick={() => dispatch(setDefaultStore(store._id))}
            disabled={!store.isActive}
            title={store.isActive ? 'Set as default dispatch store' : 'Activate the store first'}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--vs-text-secondary)] hover:text-[var(--vs-active-text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <Star className="w-3 h-3" />
            Set Default
          </button>
        ),
      value: 'checked',
    },
    {
      label: 'Status',
      key: 'isActive',
      sortable: true,
      render: (store) => (
        <span
          className={`font-semibold text-xs ${store.isActive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
            }`}
        >
          {store.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
      value: 'checked',
    },
  ];

  return (
    <div>
      <Card
        h1="Stores & Warehouses"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <select
            value={selectedStatus}
            onChange={(e) => changeStatusFilter(e.target.value)}
            className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'Total Stores',
                value: stats?.total ?? 0,
                icon: <Store className="w-4 h-4 text-indigo-500" />,
                colorClass: 'text-indigo-600 dark:text-indigo-400',
                isActive: selectedStatus === 'all',
                onClick: () => changeStatusFilter('all'),
              },
              {
                label: 'Active',
                value: stats?.active ?? 0,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                isActive: selectedStatus === 'active',
                onClick: () => changeStatusFilter(selectedStatus === 'active' ? 'all' : 'active'),
              },
              {
                label: 'Inactive',
                value: stats?.inactive ?? 0,
                icon: <XCircle className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: selectedStatus === 'inactive',
                onClick: () => changeStatusFilter(selectedStatus === 'inactive' ? 'all' : 'inactive'),
              },
              {
                label: 'Cities Covered',
                value: stats?.cities ?? 0,
                icon: <MapPin className="w-4 h-4 text-blue-500" />,
                colorClass: 'text-blue-600 dark:text-blue-400',
              },
            ]}
          />
        </div>

        <Table
          headers={headers}
          data={storeList}
          loading={listLoading}
          showSearch={true}
          searchPlaceholder="Search name, code, city, state, PIN..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
          }}
          onSearchClear={() => {
            setSearchTerm('');
            setDebouncedSearch('');
            setCurrentPage(1);
          }}
          emptyMessage={
            debouncedSearch
              ? 'No matching stores found. Try a different search term.'
              : "No stores or warehouses yet. Click 'Add Store' to create your first one."
          }
          onEdit={(store) => navigate(`/stores/edit/${store._id}`)}
          onDelete={handleDeleteClick}
          onToggle={saving ? undefined : handleStatusToggle}
          toggleField="isActive"
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={pagination?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          actions={
            <Button onClick={() => navigate('/stores/create')} startIcon={<Plus className="w-4 h-4" />}>
              Add Store
            </Button>
          }
        />
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, store: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Store"
        message={`Are you sure you want to delete "${deleteModal.store?.name || ''}"? This action cannot be undone.`}
      />

      <CToaster className="p-3" style={{ zIndex: 99999, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
            <div className="d-flex">
              <CToastBody className="flex items-center gap-2 font-semibold">
                {t.color === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-white shrink-0" />
                )}
                <span>{t.message}</span>
              </CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
