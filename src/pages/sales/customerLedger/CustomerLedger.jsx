import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft, Calendar, FileText, ArrowUpRight, ArrowDownLeft, TrendingUp, Info } from 'lucide-react';
import { formatDate } from '@/utility/dateTiming';
import { encryptData, decryptData } from '@/utility/crypto';
import {
  Badge, Button, Card, DataTable, DatePicker, EmptyState, Field, FormGrid, PageHeader, Select, StatCard,
} from '@/components/ui';
import { getCustomers } from '@/pages/customer/services/customerSlice';
import {
  getCustomerLedger,
  getCustomerLedgerStats,
  clearLedgerData,
} from './services/customerLedgerSlice';

// ─── Transaction Type Config ──────────────────────────────────────────────────
const TRANSACTION_TYPE_CONFIG = {
  opening_balance: { label: 'Opening Balance', tone: 'neutral' },
  invoice: { label: 'Sales Invoice', tone: 'info' },
  payment: { label: 'Payment In', tone: 'success' },
  credit_note: { label: 'Credit Note', tone: 'warning' },
  sales_return: { label: 'Sales Return', tone: 'danger' },
  adjustment: { label: 'Adjustment', tone: 'primary' },
};

/** 'YYYY-MM-DD' filter string ↔ the dayjs value the date picker wants. */
const toDay = (s) => (s ? dayjs(s) : null);
const fromDay = (d) => (d ? d.format('YYYY-MM-DD') : '');

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
  const [pageSize, setPageSize] = useState(10);

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
        icon: Calendar,
        tone: 'neutral',
        chip: stats.openingBalanceDate ? `As of ${formatDate(stats.openingBalanceDate)}` : undefined,
      },
      {
        label: 'Invoiced',
        value: `₹${(stats.totalInvoiced || 0).toFixed(2)}`,
        icon: ArrowUpRight,
        tone: 'info',
      },
      {
        label: 'Paid',
        value: `₹${(stats.totalPaid || 0).toFixed(2)}`,
        icon: ArrowDownLeft,
        tone: 'success',
      },
      {
        label: 'Returned',
        value: `₹${(stats.totalCredited || 0).toFixed(2)}`,
        icon: TrendingUp,
        tone: 'warning',
      },
      {
        label: 'Outstanding',
        value: `₹${(stats.outstandingBalance || 0).toFixed(2)}`,
        icon: Info,
        tone: stats.outstandingBalance >= 0 ? 'warning' : 'success',
        chip: stats.outstandingBalance > 0
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
      navigate(`/customers/ledger/${encryptedId}`);
    } else {
      navigate('/customers');
    }
  };

  // Opened from a customer row: show whose ledger it is instead of the picker.
  const selectedCustomer = customerId ? customers.find((c) => String(c._id) === String(customerId)) : null;
  const customerLabel = selectedCustomer ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim() : '';

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
  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item) => <span className="font-medium">{formatDate(item.date)}</span>,
    },
    {
      key: 'transactionType',
      header: 'Type',
      sortable: true,
      render: (item) => {
        const config = TRANSACTION_TYPE_CONFIG[item.transactionType] || { label: item.transactionType, tone: 'neutral' };
        return <Badge tone={config.tone}>{config.label}</Badge>;
      },
    },
    {
      key: 'referenceNumber',
      header: 'Voucher / Ref No',
      sortable: true,
      mobile: 'title',
      render: (item) => <span className="font-mono text-[13px] font-semibold">{item.referenceNumber || '—'}</span>,
    },
    {
      key: 'debit',
      header: 'Debit (+)',
      type: 'money',
      sortable: true,
      render: (item) => (item.debit > 0 ? <span className="text-danger">₹{item.debit.toFixed(2)}</span> : <span className="text-ink-subtle">—</span>),
    },
    {
      key: 'credit',
      header: 'Credit (-)',
      type: 'money',
      sortable: true,
      render: (item) => (item.credit > 0 ? <span className="text-success">₹{item.credit.toFixed(2)}</span> : <span className="text-ink-subtle">—</span>),
    },
    {
      key: 'balance',
      header: 'Running Balance',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      cellClassName: 'font-bold',
      render: (item) => `₹${item.balance.toFixed(2)}`,
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: true,
      hideBelow: 'lg',
      render: (item) => <span className="text-xs text-ink-muted">{item.notes || '—'}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={customerLabel ? `Customer Ledger — ${customerLabel}` : 'Customer Ledger'}
        actions={
          <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate('/customers')}>
            Back to customers
          </Button>
        }
      />

      {/* ─── Filters & Selectors ─── */}
      <Card padding="sm">
        <FormGrid cols={4} className="items-end">
          {!customerId && (
            <Field label="Select Customer" className="md:col-span-2">
              <Select
                options={customerOptions}
                value=""
                onChange={handleCustomerChange}
                placeholder="Search and select customer..."
                loading={customersLoading}
              />
            </Field>
          )}
          <Field label="From Date">
            <DatePicker
              id="dateFrom"
              placeholder="From date"
              value={toDay(dateFrom)}
              onChange={(d) => {
                setDateFrom(fromDay(d));
                setCurrentPage(1);
              }}
            />
          </Field>
          <Field label="To Date">
            <DatePicker
              id="dateTo"
              placeholder="To date"
              value={toDay(dateTo)}
              onChange={(d) => {
                setDateTo(fromDay(d));
                setCurrentPage(1);
              }}
            />
          </Field>
          {(dateFrom || dateTo || searchTerm) && (
            <div className="flex md:justify-end">
              <Button variant="ghost" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </FormGrid>
      </Card>

      {/* ─── Summary Dashboard ─── */}
      {customerId && stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ledgerStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} chip={s.chip} />
          ))}
        </div>
      )}

      {/* ─── Ledger Entries Table ─── */}
      {customerId ? (
        <DataTable
          columns={columns}
          rows={ledgerEntries}
          loading={loading}
          search={{
            value: searchTerm,
            onChange: (val) => setSearchTerm(val),
            placeholder: 'Search notes or reference no...',
            onSubmit: () => {
              setCurrentPage(1);
              const params = { page: 1, limit: pageSize };
              if (dateFrom) params.dateFrom = dateFrom;
              if (dateTo) params.dateTo = dateTo;
              if (searchTerm.trim()) params.search = searchTerm.trim();
              dispatch(getCustomerLedger({ customerId, params }));
            },
            onClear: () => {
              setSearchTerm('');
              setCurrentPage(1);
              const params = { page: 1, limit: pageSize };
              if (dateFrom) params.dateFrom = dateFrom;
              if (dateTo) params.dateTo = dateTo;
              dispatch(getCustomerLedger({ customerId, params }));
            },
          }}
          empty={{ icon: FileText, title: 'No ledger entries found', text: 'No ledger entries found for the selected period.' }}
          pagination={{
            page: currentPage,
            pageSize,
            total: meta?.total || 0,
            onPageChange: (page) => setCurrentPage(page),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setCurrentPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100, 500],
          }}
        />
      ) : (
        <Card>
          <EmptyState
            icon={FileText}
            title="No Customer Selected"
            text="Please choose a customer from the dropdown above to load and view their financial ledger and balance statistics."
          />
        </Card>
      )}
    </div>
  );
}
