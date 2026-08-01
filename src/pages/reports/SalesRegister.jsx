import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import DatePicker from '@/components/inputs/Datepicker';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { formatDate } from '@/utility/dateTiming';
import { getSalesRegister } from './services/reportSlice';
import ReportTabs from './ReportTabs';

const STATUS_BADGE = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  partially_paid: { label: 'Partially Paid', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  unpaid: { label: 'Unpaid', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
};

export default function SalesRegister() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDateFrom = searchParams.get('dateFrom') || '2026-04-01';
  const initialDateTo = searchParams.get('dateTo') || '2027-03-31';

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const { salesRegister, loading } = useSelector((state) => ({
    salesRegister: state.reports.salesRegister,
    loading: state.reports.loading.salesRegister,
  }));

  const fetchReport = (from = dateFrom, to = dateTo) => {
    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;

    setSearchParams(params);
    dispatch(getSalesRegister(params));
  };

  useEffect(() => {
    fetchReport(initialDateFrom, initialDateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilter = () => {
    fetchReport(dateFrom, dateTo);
  };

  const handleResetFilters = () => {
    const defaultFrom = '2026-04-01';
    const defaultTo = '2027-03-31';
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    fetchReport(defaultFrom, defaultTo);
  };

  const totals = salesRegister?.totals || {};
  const rows = salesRegister?.rows || [];

  const stats = useMemo(() => {
    return [
      {
        label: 'Total Invoices',
        value: totals.count || 0,
        icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
      },
      {
        label: 'Total Taxable',
        value: `₹${(totals.taxable || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" />,
        colorClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
      },
      {
        label: 'CGST + SGST',
        value: `₹${((totals.cgst || 0) + (totals.sgst || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      },
      {
        label: 'IGST',
        value: `₹${(totals.igst || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-purple-500" />,
      },
      {
        label: 'Total Invoiced',
        value: `₹${(totals.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
        colorClass: 'text-blue-600 dark:text-blue-400 font-bold',
      },
      {
        label: 'Total Paid',
        value: `₹${(totals.paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
        colorClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
      },
      {
        label: 'Outstanding Balance',
        value: `₹${(totals.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
        colorClass: (totals.balance || 0) > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold',
      },
    ];
  }, [totals]);

  const headers = [
    {
      label: 'Invoice Number',
      key: 'invoiceNumber',
      sortable: true,
      render: (item) => <span className="font-mono font-semibold text-xs text-[var(--vs-text-primary)]">{item.invoiceNumber}</span>,
      value: 'checked',
    },
    {
      label: 'Invoice Date',
      key: 'invoiceDate',
      sortable: true,
      render: (item) => <span className="text-xs">{formatDate(item.invoiceDate)}</span>,
      value: 'checked',
    },
    {
      label: 'Customer Name',
      key: 'customer',
      sortable: true,
      render: (item) => <span className="font-medium text-xs">{item.customer || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'GSTIN',
      key: 'gstin',
      sortable: true,
      render: (item) => <span className="font-mono text-xs text-[var(--vs-text-secondary)]">{item.gstin || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Type',
      key: 'invoiceType',
      sortable: true,
      render: (item) => <span className="text-[11px] font-semibold uppercase">{item.invoiceType || 'B2C'}</span>,
      value: 'checked',
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (item) => {
        const badge = STATUS_BADGE[item.status] || { label: item.status, className: 'bg-slate-100 text-slate-800' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
      value: 'checked',
    },
    {
      label: 'Place of Supply',
      key: 'placeOfSupply',
      sortable: true,
      render: (item) => <span className="text-xs">{item.placeOfSupply || '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Taxable Amount',
      key: 'taxable',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs font-semibold',
      render: (item) => <span>₹{Number(item.taxable || 0).toFixed(2)}</span>,
      value: 'checked',
    },
    {
      label: 'CGST',
      key: 'cgst',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs',
      render: (item) => <span>{item.cgst > 0 ? `₹${Number(item.cgst).toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'SGST',
      key: 'sgst',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs',
      render: (item) => <span>{item.sgst > 0 ? `₹${Number(item.sgst).toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'IGST',
      key: 'igst',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs',
      render: (item) => <span>{item.igst > 0 ? `₹${Number(item.igst).toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Cess',
      key: 'cess',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs',
      render: (item) => <span>{item.cess > 0 ? `₹${Number(item.cess).toFixed(2)}` : '—'}</span>,
      value: 'checked',
    },
    {
      label: 'Total Amount',
      key: 'total',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs font-bold text-[var(--vs-text-primary)]',
      render: (item) => <span>₹{Number(item.total || 0).toFixed(2)}</span>,
      value: 'checked',
    },
    {
      label: 'Paid Amount',
      key: 'paid',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold',
      render: (item) => <span>₹{Number(item.paid || 0).toFixed(2)}</span>,
      value: 'checked',
    },
    {
      label: 'Balance',
      key: 'balance',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs text-amber-600 dark:text-amber-400 font-bold',
      render: (item) => <span>₹{Number(item.balance || 0).toFixed(2)}</span>,
      value: 'checked',
    },
  ];

  return (
    <div>
      <Card h1="Sales Register Report" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />

        {/* ── Filter Bar ── */}
        <div className="mb-5 bg-[var(--vs-bg-secondary)] p-3 sm:p-4 rounded-xl border border-[var(--vs-border)]">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">From Date</Label>
              <DatePicker
                id="salesRegisterDateFrom"
                placeholder="YYYY-MM-DD"
                defaultDate={dateFrom}
                onChange={(selectedDates, dateStr) => setDateFrom(dateStr)}
              />
            </div>
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">To Date</Label>
              <DatePicker
                id="salesRegisterDateTo"
                placeholder="YYYY-MM-DD"
                defaultDate={dateTo}
                onChange={(selectedDates, dateStr) => setDateTo(dateStr)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleApplyFilter} className="h-9 px-4 text-xs font-bold !bg-[#0f6ebd] hover:!bg-[#0d60a6] text-white">
                Apply Filter
              </Button>
              <Button variant="outline" onClick={handleResetFilters} className="h-9 px-3 text-xs">
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="mb-5">
          <TableInfoCard stats={stats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
        </div>

        {/* ── Table ── */}
        <Table
          headers={headers}
          data={rows}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search invoice no, customer..."
          emptyMessage="No sales invoices found for the selected period."
        />
      </Card>
    </div>
  );
}
