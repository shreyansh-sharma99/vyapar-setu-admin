import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, Calendar, CreditCard, DollarSign, Wallet, Landmark, FileCheck, Globe } from 'lucide-react';
import { encryptData } from '@/utility/crypto';
import { formatDateWithTiming } from '@/utility/dateTiming';
import Button from '@/components/inputs/Button';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Card from '../../../components/breadCrumbs/Card';
import DeleteModal from '@/components/modal/DeleteModal';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import {
  getPaymentsIn,
  deletePaymentIn,
  clearPaymentInToast,
} from './services/paymentInSlice';

const METHOD_CONFIG = {
  cash: { label: 'Cash', textCls: 'text-emerald-600 dark:text-emerald-400', icon: <Wallet className="w-4 h-4 text-emerald-500" /> },
  upi: { label: 'UPI', textCls: 'text-indigo-600 dark:text-indigo-400', icon: <CreditCard className="w-4 h-4 text-indigo-500" /> },
  card: { label: 'Card', textCls: 'text-amber-600 dark:text-amber-400', icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
  bank_transfer: { label: 'Bank Transfer', textCls: 'text-blue-600 dark:text-blue-400', icon: <Landmark className="w-4 h-4 text-blue-500" /> },
  cheque: { label: 'Cheque', textCls: 'text-purple-600 dark:text-purple-400', icon: <FileCheck className="w-4 h-4 text-purple-500" /> },
  online: { label: 'Online', textCls: 'text-pink-600 dark:text-pink-400', icon: <Globe className="w-4 h-4 text-pink-500" /> },
};

export default function PaymentInList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { paymentsIn, summary, loading, meta, toast: reduxToast } = useSelector((state) => state.paymentIn);

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const showToast = (message, color = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const fetchPayments = () => {
    const params = { page: currentPage, limit: pageSize };
    if (selectedMethod !== 'all') params.paymentMethod = selectedMethod;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    dispatch(getPaymentsIn(params));
  };

  useEffect(() => {
    fetchPayments();
  }, [dispatch, currentPage, pageSize, selectedMethod]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearPaymentInToast());
      fetchPayments();
    }
  }, [reduxToast, dispatch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    const params = { page: 1, limit: pageSize };
    if (selectedMethod !== 'all') params.paymentMethod = selectedMethod;
    dispatch(getPaymentsIn(params));
  };

  const handleConfirmDelete = () => {
    if (deleteModal.id) {
      dispatch(deletePaymentIn(deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const getSummaryMetric = (methodKey) => {
    const item = (summary || []).find((s) => s._id === methodKey);
    return {
      count: item?.count || 0,
      amount: item?.totalAmount || item?.amount || 0,
    };
  };

  // ─── Table columns ───
  const headers = [
    {
      label: 'Reference',
      key: 'reference',
      sortable: true,
      value: 'checked',
      cellClassName: 'font-mono font-semibold text-[var(--vs-text-primary)]',
      render: (item) => <span>{item.reference || 'N/A'}</span>,
    },
    {
      label: 'Date',
      key: 'paymentDate',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <span>{formatDateWithTiming(item.paymentDate)}</span>
      ),
    },
    {
      label: 'Customer',
      key: 'customer',
      sortable: true,
      value: 'checked',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--vs-text-primary)]">
            {item.customerSnapshot?.name || 'Walk-in'}
          </span>
          <span className="text-[10px] text-[var(--vs-text-secondary)]">
            ({item.customerSnapshot?.phone || 'No Phone'})
          </span>
        </div>
      ),
    },
    {
      label: 'Payment Method',
      key: 'paymentMethod',
      sortable: true,
      value: 'checked',
      render: (item) => {
        const method = item.paymentMethod || 'cash';
        const cfg = METHOD_CONFIG[method] || { label: method, textCls: 'text-slate-600' };
        return (
          <span className={`font-semibold text-xs capitalize ${cfg.textCls}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      label: 'Total Amount',
      key: 'amount',
      sortable: true,
      value: 'checked',
      cellClassName: 'font-semibold text-right text-[var(--vs-text-primary)]',
      render: (item) => <span className="font-bold text-slate-900 dark:text-white">₹{item.amount?.toFixed(2) || '0.00'}</span>,
    },
    {
      label: 'Unallocated (Advance)',
      key: 'unallocatedAmount',
      sortable: true,
      value: 'checked',
      cellClassName: 'text-right',
      render: (item) => {
        const unallocated = item.unallocatedAmount || 0;
        if (unallocated > 0) {
          return (
            <span className="font-bold text-amber-600 dark:text-amber-400">
              ₹{unallocated.toFixed(2)}
            </span>
          );
        }
        return <span className="text-slate-400 dark:text-slate-600">₹0.00</span>;
      },
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 mx-auto">
      {/* Toast notifications */}
      <CToaster className="p-3" placement="top-end">
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white">
            <CToastBody className="font-medium">{t.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <Card
        h1="Payments Received"
        bodyClassName="px-4 pb-4 pt-2"
        rightNode={
          <select
            value={selectedMethod}
            onChange={(e) => { setSelectedMethod(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 text-sm rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] outline-none cursor-pointer shadow-sm"
          >
            <option value="all">All Methods</option>
            {Object.entries(METHOD_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        }
      >
        <div className="pb-2">
          <TableInfoCard
            stats={Object.entries(METHOD_CONFIG).map(([key, cfg]) => {
              const metric = getSummaryMetric(key);
              return {
                label: cfg.label,
                value: metric.count || paymentsIn.filter((p) => p.paymentMethod === key).length,
                amount: metric.amount,
                icon: cfg.icon,
                colorClass: cfg.textCls,
                isActive: selectedMethod === key,
                onClick: () => { setSelectedMethod(selectedMethod === key ? 'all' : key); setCurrentPage(1); },
              };
            })}
          />
        </div>

        <Table
          headers={headers}
          data={paymentsIn}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search by reference or customer..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => setSearchTerm(val)}
          onSearchClick={() => { setCurrentPage(1); fetchPayments(); }}
          onSearchClear={handleClearSearch}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/sales/payment-in/record')}>Record Payment</Button>
            </div>
          }
          emptyMessage="No payments found. Click 'Record Payment' to record a receipt."
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={meta?.total || meta?.totalRows || meta?.count || 0}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          onView={(item) => navigate(`/sales/payment-in/view/${encodeURIComponent(encryptData(item._id))}`)}
          onDelete={(item) => setDeleteModal({ isOpen: true, id: item._id })}
        />
      </Card>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        isLoading={loading}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? This action will restore outstanding balances on the related invoices."
      />
    </div>
  );
}
