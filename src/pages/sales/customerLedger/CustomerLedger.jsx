import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, FileText, ArrowUpRight, ArrowDownLeft, TrendingUp, Info } from 'lucide-react';
import { formatDate } from '@/utility/dateTiming';
import { encryptData, decryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '@/components/breadCrumbs/Card';
import Select from '@/components/inputs/Select';
import { Label } from '@/components/inputs/Label';
import DatePicker from '@/components/inputs/Datepicker';
import Table from '@/components/table/Table';
import { getCustomers } from '@/pages/customer/services/customerSlice';
import TableInfoCard from '@/components/table/TableInfoCard';
import {
  getCustomerLedger,
  getCustomerLedgerStats,
  clearLedgerData,
} from './services/customerLedgerSlice';

// ─── Transaction Type Config ──────────────────────────────────────────────────
const TRANSACTION_TYPE_CONFIG = {
  opening_balance: { label: 'Opening Balance', className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  invoice: { label: 'Sales Invoice', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  payment: { label: 'Payment In', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  credit_note: { label: 'Credit Note', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  sales_return: { label: 'Sales Return', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
  adjustment: { label: 'Adjustment', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function CustomerLedger() {
  const { customerId: encryptedCustomerId } = useParams();
  const customerId = useMemo(() => {
    if (!encryptedCustomerId) return null;
    try {
      return decryptData(decodeURIComponent(encryptedCustomerId));
    } catch (e) {
      console.error('Failed to decrypt customer ID:', e);
      return null;
    }
  }, [encryptedCustomerId]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux Selectors
  const { customers, loading: customersLoading } = useSelector((state) => state.customer);
  const { ledgerEntries, stats, meta, loading } = useSelector((state) => state.customerLedger);

  // Local state for filters and pagination
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Load customers on mount
  useEffect(() => {
    dispatch(getCustomers({ page: 1, limit: 1000 }));
    return () => {
      dispatch(clearLedgerData());
    };
  }, [dispatch]);

  // Fetch ledger & stats whenever params change
  useEffect(() => {
    if (customerId) {
      const params = { page: currentPage, limit: pageSize };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      dispatch(getCustomerLedger({ customerId, params }));
      dispatch(getCustomerLedgerStats(customerId));
    } else {
      dispatch(clearLedgerData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, customerId, currentPage, pageSize, dateFrom, dateTo]);

  // Build options for Customer select dropdown
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c._id,
      label: `${c.firstName} ${c.lastName}`.trim() + (c.phone ? ` (${c.phone})` : ''),
    }));
  }, [customers]);

  const ledgerStats = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Opening Bal',
        value: `₹${(stats.openingBalance || 0).toFixed(2)}`,
        icon: <Calendar className="w-4 h-4 text-slate-500" />,
        subValue: stats.openingBalanceDate ? `As of ${formatDate(stats.openingBalanceDate)}` : undefined,
      },
      {
        label: 'Invoiced',
        value: `₹${(stats.totalInvoiced || 0).toFixed(2)}`,
        icon: <ArrowUpRight className="w-4 h-4 text-blue-500" />,
        colorClass: 'text-blue-600 dark:text-blue-400',
      },
      {
        label: 'Paid',
        value: `₹${(stats.totalPaid || 0).toFixed(2)}`,
        icon: <ArrowDownLeft className="w-4 h-4 text-emerald-500" />,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        label: 'Returned',
        value: `₹${(stats.totalCredited || 0).toFixed(2)}`,
        icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
        colorClass: 'text-amber-600 dark:text-amber-400',
      },
      {
        label: 'Outstanding',
        value: `₹${(stats.outstandingBalance || 0).toFixed(2)}`,
        icon: <Info className="w-4 h-4 text-indigo-500" />,
        colorClass: stats.outstandingBalance >= 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500',
        subValue: stats.outstandingBalance > 0
          ? 'Customer owes'
          : stats.outstandingBalance < 0
            ? 'You owe'
            : 'Settled',
      },
    ];
  }, [stats]);

  const handleCustomerChange = (val) => {
    setCurrentPage(1);
    setSearchTerm('');
    if (val) {
      const encryptedId = encodeURIComponent(encryptData(val));
      navigate(`/sales/customer-ledger/${encryptedId}`);
    } else {
      navigate('/sales/customer-ledger');
    }
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setCurrentPage(1);

    const fromInput = document.getElementById('dateFrom');
    const toInput = document.getElementById('dateTo');
    if (fromInput && fromInput._flatpickr) {
      fromInput._flatpickr.clear();
    }
    if (toInput && toInput._flatpickr) {
      toInput._flatpickr.clear();
    }
  };


  // Table Columns config
  const headers = [
    {
      label: 'Date',
      key: 'date',
      sortable: true,
      render: (item) => <span className="font-medium">{formatDate(item.date)}</span>,
      value: 'checked',
    },
    {
      label: 'Type',
      key: 'transactionType',
      sortable: true,
      render: (item) => {
        const config = TRANSACTION_TYPE_CONFIG[item.transactionType] || {
          label: item.transactionType,
          className: 'bg-slate-100 text-slate-800',
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${config.className}`}>
            {config.label}
          </span>
        );
      },
      value: 'checked',
    },
    {
      label: 'Voucher / Ref No',
      key: 'referenceNumber',
      sortable: true,
      render: (item) => <span className="font-mono text-sm font-semibold">{item.referenceNumber || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Debit (+)',
      key: 'debit',
      sortable: true,
      cellClassName: 'text-right font-mono font-semibold text-rose-600 dark:text-rose-400',
      render: (item) => <span>{item.debit > 0 ? `₹${item.debit.toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Credit (-)',
      key: 'credit',
      sortable: true,
      cellClassName: 'text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400',
      render: (item) => <span>{item.credit > 0 ? `₹${item.credit.toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Running Balance',
      key: 'balance',
      sortable: true,
      cellClassName: 'text-right font-mono font-bold text-[var(--vs-text-primary)]',
      render: (item) => <span>₹{item.balance.toFixed(2)}</span>,
      value: 'checked',
    },
    {
      label: 'Notes',
      key: 'notes',
      sortable: true,
      render: (item) => <span className="text-xs text-[var(--vs-text-secondary)]">{item.notes || '—'}</span>,
      value: 'checked',
    },
  ];

  return (
    <div>
      <Card
        h1="Customer Ledger"
        bodyClassName="px-4 pb-4 pt-2"
      >
        {/* ─── Filters & Selectors ─── */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>
                Select Customer
              </Label>
              <Select
                options={customerOptions}
                value={customerId || ''}
                onChange={handleCustomerChange}
                placeholder="Search and select customer..."
                loading={customersLoading}
              />
            </div>
            <div>
              <Label>
                From Date
              </Label>
              <DatePicker
                id="dateFrom"
                placeholder="YYYY-MM-DD"
                defaultDate={dateFrom}
                onChange={(selectedDates, dateStr) => {
                  setDateFrom(dateStr);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <Label>
                To Date
              </Label>
              <DatePicker
                id="dateTo"
                placeholder="YYYY-MM-DD"
                defaultDate={dateTo}
                onChange={(selectedDates, dateStr) => {
                  setDateTo(dateStr);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {(dateFrom || dateTo || searchTerm) && (
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="h-9 px-3 text-xs"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* ─── Summary Dashboard ─── */}
        {customerId && stats && (
          <div className="mb-6">
            <TableInfoCard stats={ledgerStats} className="!flex-nowrap overflow-x-auto !gap-6 py-2.5 [&_*]:whitespace-nowrap" />
          </div>
        )}

        {/* ─── Ledger Entries Table ─── */}
        {customerId ? (
          <Table
            headers={headers}
            data={ledgerEntries}
            loading={loading}
            showSearch={true}
            searchPlaceholder="Search notes or reference no..."
            searchTerm={searchTerm}
            onSearchTermChange={(val) => setSearchTerm(val)}
            onSearchClick={() => {
              setCurrentPage(1);
              const params = { page: 1, limit: pageSize };
              if (dateFrom) params.dateFrom = dateFrom;
              if (dateTo) params.dateTo = dateTo;
              if (searchTerm.trim()) params.search = searchTerm.trim();
              dispatch(getCustomerLedger({ customerId, params }));
            }}
            onSearchClear={() => {
              setSearchTerm('');
              setCurrentPage(1);
              const params = { page: 1, limit: pageSize };
              if (dateFrom) params.dateFrom = dateFrom;
              if (dateTo) params.dateTo = dateTo;
              dispatch(getCustomerLedger({ customerId, params }));
            }}
            emptyMessage="No ledger entries found for the selected period."
            currentPage={currentPage}
            pageSize={pageSize}
            totalRows={meta?.total || 0}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-[var(--vs-border)] rounded-2xl p-8 text-center bg-[var(--vs-bg-primary)]">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--vs-text-primary)]">No Customer Selected</h3>
            <p className="text-sm text-[var(--vs-text-secondary)] mt-1 max-w-sm">
              Please choose a customer from the dropdown above to load and view their financial ledger and balance statistics.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
