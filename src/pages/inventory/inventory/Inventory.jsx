import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Package,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '@/components/breadCrumbs/Card';
import { getInventory, clearInventoryToast } from './services/inventorySlice';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function Inventory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { inventoryData, loading, toast: reduxToast } = useSelector(
    (state) => state.inventory
  );

  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'lowStock' | 'highStock' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchInventory = (customParams = {}) => {
    const searchVal = customParams.search !== undefined ? customParams.search : appliedSearch;
    const queryParams = {
      page: customParams.page ?? currentPage,
      limit: customParams.limit ?? pageSize,
      sort: customParams.sort ?? sortConfig.key,
      order: customParams.order ?? sortConfig.direction,
      search: searchVal,
    };
    if (selectedStatus !== 'all') {
      queryParams.status = selectedStatus;
    }
    dispatch(getInventory(queryParams));
  };

  // Fetch inventory on mount, pagination, or sort change
  useEffect(() => {
    fetchInventory();
  }, [dispatch, currentPage, pageSize, sortConfig]);

  // Handle location state message (e.g. redirected from AdjustStock)
  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.color || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redux toast listener
  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearInventoryToast());
    }
  }, [reduxToast, dispatch]);

  const threshold = inventoryData?.threshold ?? 10;
  const allProducts = useMemo(() => inventoryData?.all || [], [inventoryData?.all]);
  const lowStockProducts = useMemo(() => inventoryData?.lowStock || [], [inventoryData?.lowStock]);
  const highStockProducts = useMemo(() => inventoryData?.highStock || [], [inventoryData?.highStock]);

  const activeCount = useMemo(() => {
    return allProducts.filter((p) => p.status === 'active').length;
  }, [allProducts]);

  const inactiveCount = useMemo(() => {
    return allProducts.filter((p) => p.status === 'inactive').length;
  }, [allProducts]);

  const totalStockUnits = useMemo(() => {
    return allProducts.reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
  }, [allProducts]);

  // Filter list based on selectedStatus
  const statusFilteredProducts = useMemo(() => {
    if (selectedStatus === 'lowStock') return lowStockProducts;
    if (selectedStatus === 'highStock') return highStockProducts;
    if (selectedStatus === 'active') return allProducts.filter((p) => p.status === 'active');
    if (selectedStatus === 'inactive') return allProducts.filter((p) => p.status === 'inactive');
    return allProducts;
  }, [selectedStatus, lowStockProducts, highStockProducts, allProducts]);

  // Displayed products without local search (search is handled via API)
  const displayedProducts = useMemo(() => {
    let list = [...statusFilteredProducts];

    // Sort
    if (sortConfig.key) {
      list.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'desc' ? 1 : -1;
        if (valA > valB) return sortConfig.direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return list;
  }, [statusFilteredProducts, sortConfig]);

  // Paginated slice of current view
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedProducts.slice(start, start + pageSize);
  }, [displayedProducts, currentPage, pageSize]);

  const handleSearchClick = () => {
    const term = searchTerm.trim();
    setAppliedSearch(term);
    setCurrentPage(1);
    fetchInventory({ page: 1, search: term });
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setCurrentPage(1);
    fetchInventory({ page: 1, search: '' });
  };

  const handleAdjustClick = (product) => {
    navigate(`/inventory/adjust?productId=${product._id || product.id}`, {
      state: { selectedProduct: product },
    });
  };

  const headers = [
    {
      label: 'Product Name',
      key: 'name',
      sortable: true,
      cellClassName: 'font-semibold text-[var(--vs-text-primary)]',
      value: 'checked',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {item.name}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            ID: {item._id || item.id}
          </span>
        </div>
      ),
    },
    {
      label: 'Current Stock',
      key: 'currentStock',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const stock = Number(item.currentStock ?? 0);
        const isLow = stock <= threshold;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                isLow
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
              }`}
            >
              {stock} units
            </span>
          </div>
        );
      },
    },
    {
      label: 'Initial Stock',
      key: 'initialStock',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
          {item.initialStock ?? '—'}
        </span>
      ),
    },
    {
      label: 'Stock Health',
      key: 'health',
      value: 'checked',
      render: (item) => {
        const stock = Number(item.currentStock ?? 0);
        const isLow = stock <= threshold;
        return (
          <div>
            {isLow ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Low Stock (≤ {threshold})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Adequate Stock
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: 'Product Status',
      key: 'status',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const isActive = item.status === 'active';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
            }`}
          >
            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Active'}
          </span>
        );
      },
    },
    {
      label: 'Created By',
      key: 'createdBy',
      value: 'checked',
      render: (item) => (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {item.createdBy?.name || '—'}
        </span>
      ),
    },
    {
      label: 'Updated By',
      key: 'updatedBy',
      value: 'checked',
      render: (item) => (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {item.updatedBy?.name || '—'}
        </span>
      ),
    },
    {
      label: 'Actions',
      key: 'actions',
      value: 'checked',
      render: (item) => (
        <button
          type="button"
          onClick={() => handleAdjustClick(item)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
          title="Adjust stock for this product"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Adjust
        </button>
      ),
    },
  ];

  return (
    <div>
      <Card
        h1="Inventory Management"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="lowStock">Low Stock (≤ {threshold})</option>
            <option value="highStock">Adequate Stock</option>
            <option value="active">Active Products</option>
            <option value="inactive">Inactive Products</option>
          </select>
        }
      >
        {/* Top Metric Cards following TableInfoCard UI */}
        <div className="pb-2">
          <TableInfoCard
            stats={[
              {
                label: 'All Items',
                value: allProducts.length,
                subValue: `(${totalStockUnits} Units)`,
                icon: <Package className="w-4 h-4 text-slate-500" />,
                colorClass: 'text-slate-700 dark:text-slate-200',
                isActive: selectedStatus === 'all',
                onClick: () => {
                  setSelectedStatus('all');
                  setCurrentPage(1);
                },
              },
              {
                label: 'Low Stock',
                value: lowStockProducts.length,
                subValue: `(≤ ${threshold})`,
                icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
                colorClass: 'text-rose-600 dark:text-rose-400',
                isActive: selectedStatus === 'lowStock',
                onClick: () => {
                  setSelectedStatus(selectedStatus === 'lowStock' ? 'all' : 'lowStock');
                  setCurrentPage(1);
                },
              },
              {
                label: 'Adequate Stock',
                value: highStockProducts.length,
                subValue: '(Healthy)',
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                colorClass: 'text-emerald-600 dark:text-emerald-400',
                isActive: selectedStatus === 'highStock',
                onClick: () => {
                  setSelectedStatus(selectedStatus === 'highStock' ? 'all' : 'highStock');
                  setCurrentPage(1);
                },
              },
              {
                label: 'Active',
                value: activeCount,
                icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
                colorClass: 'text-blue-600 dark:text-blue-400',
                isActive: selectedStatus === 'active',
                onClick: () => {
                  setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active');
                  setCurrentPage(1);
                },
              },
              {
                label: 'Inactive',
                value: inactiveCount,
                icon: <XCircle className="w-4 h-4 text-slate-400" />,
                colorClass: 'text-slate-500 dark:text-slate-400',
                isActive: selectedStatus === 'inactive',
                onClick: () => {
                  setSelectedStatus(selectedStatus === 'inactive' ? 'all' : 'inactive');
                  setCurrentPage(1);
                },
              },
            ]}
          />
        </div>

        {/* Application Table Component */}
        <Table
          headers={headers}
          data={paginatedData}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search inventory by product name, ID, or creator..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={handleSearchClick}
          onSearchClear={handleSearchClear}
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/inventory/adjust')}
                className="!h-10"
                startIcon={<SlidersHorizontal className="w-4 h-4" />}
              >
                Adjust Stock
              </Button>
            </div>
          }
          emptyMessage={
            selectedStatus === 'lowStock'
              ? 'Great news! No products are currently below the low-stock threshold.'
              : 'No products found in inventory.'
          }
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={displayedProducts.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          sortConfig={sortConfig}
          onSortChange={({ key, direction }) =>
            setSortConfig({ key, direction })
          }
        />
      </Card>

      {/* CoreUI Toast notifications */}
      <CToaster
        className="p-3"
        style={{ zIndex: 2000, position: 'fixed', bottom: '20px', right: '20px' }}
      >
        {toasts.map((t) => (
          <CToast
            key={t.id}
            visible={true}
            color={t.color}
            className="text-white align-items-center mb-2"
          >
            <div className="d-flex">
              <CToastBody className="font-semibold">{t.message}</CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
