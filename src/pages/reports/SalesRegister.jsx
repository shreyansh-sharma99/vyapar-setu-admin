import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  IndianRupee,
  Landmark,
  Receipt,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { DataTable, PageHeader, StatusBadge } from '@/components/ui';
import { formatDate } from '@/utility/dateTiming';
import { getSalesRegister } from './services/reportSlice';
import { DateFilterBar, StatRow } from './components/ReportBits';

const STATUS_BADGE = {
  paid: { label: 'Paid' },
  partially_paid: { label: 'Partially Paid' },
  unpaid: { label: 'Unpaid' },
  approved: { label: 'Approved' },
  issued: { label: 'Issued' },
};

const MONEY = 'text-xs tabular-nums';
// returns / credit notes are negative (red); 0 shows as —
const money = (v, cls = '') => (Number(v) ? <span className={`${MONEY} ${cls} ${Number(v) < 0 ? 'text-danger' : ''}`}>{Number(v) < 0 ? '−' : ''}₹{Math.abs(Number(v)).toFixed(2)}</span> : <span className={MONEY}>—</span>);
const DOC_TONE = { Invoice: 'text-ink-muted', 'Sales return': 'text-danger', 'Credit note': 'text-danger' };

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

  const handleApplyFilter = ({ dateFrom: from, dateTo: to }) => {
    setDateFrom(from);
    setDateTo(to);
    fetchReport(from, to);
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
        label: 'Net sales',
        value: `₹${(totals.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: Receipt,
        tone: 'primary',
        chip: `${totals.invoices || 0} invoices${(totals.returns || 0) + (totals.creditNotes || 0) ? ` − ${(totals.returns || 0) + (totals.creditNotes || 0)} returns / credit notes` : ''}`,
      },
      {
        label: 'Total Paid',
        value: `₹${(totals.paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: CreditCard,
        tone: 'success',
      },
      {
        label: 'Outstanding',
        value: `₹${(totals.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: AlertCircle,
        tone: (totals.balance || 0) > 0 ? 'warning' : 'success',
      },
      {
        label: 'Net taxable',
        value: `₹${(totals.taxable || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: IndianRupee,
        tone: 'info',
      },
      {
        label: 'CGST + SGST',
        value: `₹${((totals.cgst || 0) + (totals.sgst || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: Landmark,
        tone: 'neutral',
      },
      {
        label: 'IGST',
        value: `₹${(totals.igst || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: FileText,
        tone: 'neutral',
      },
    ];
  }, [totals]);

  const columns = [
    {
      header: 'Document',
      key: 'docNumber',
      sortable: true,
      mobile: 'title',
      render: (item) => <span className="font-mono text-xs font-semibold text-ink">{item.docNumber}</span>,
    },
    {
      header: 'Kind',
      key: 'docType',
      sortable: true,
      render: (item) => <span className={`text-[11px] font-semibold uppercase ${DOC_TONE[item.docType] || 'text-ink-muted'}`}>{item.docType}</span>,
    },
    {
      header: 'Date',
      key: 'docDate',
      sortable: true,
      render: (item) => <span className="text-xs">{formatDate(item.docDate)}</span>,
    },
    {
      header: 'Against invoice',
      key: 'againstInvoice',
      hideBelow: 'lg',
      render: (item) => (item.againstInvoice ? <span className="font-mono text-xs">{item.againstInvoice}</span> : <span className="text-ink-subtle">—</span>),
    },
    {
      header: 'Customer Name',
      key: 'customer',
      sortable: true,
      render: (item) => <span className="text-xs font-medium">{item.customer || '—'}</span>,
    },
    {
      header: 'GSTIN',
      key: 'gstin',
      sortable: true,
      render: (item) => <span className="font-mono text-xs text-ink-muted">{item.gstin || '—'}</span>,
    },
    {
      header: 'Type',
      key: 'invoiceType',
      sortable: true,
      render: (item) => <span className="text-[11px] font-semibold uppercase text-ink-muted">{item.invoiceType || 'B2C'}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} label={(STATUS_BADGE[item.status] || { label: item.status }).label} />,
    },
    {
      header: 'Place of Supply',
      key: 'placeOfSupply',
      sortable: true,
      hideBelow: 'xl',
      render: (item) => <span className="text-xs">{item.placeOfSupply || '—'}</span>,
    },
    {
      header: 'Taxable Amount',
      key: 'taxable',
      type: 'money',
      sortable: true,
      render: (item) => money(item.taxable, 'font-semibold'),
    },
    {
      header: 'CGST',
      key: 'cgst',
      type: 'money',
      sortable: true,
      render: (item) => money(item.cgst),
    },
    {
      header: 'SGST',
      key: 'sgst',
      type: 'money',
      sortable: true,
      render: (item) => money(item.sgst),
    },
    {
      header: 'IGST',
      key: 'igst',
      type: 'money',
      sortable: true,
      render: (item) => money(item.igst),
    },
    {
      header: 'Cess',
      key: 'cess',
      type: 'money',
      sortable: true,
      hideBelow: 'xl',
      render: (item) => money(item.cess),
    },
    {
      header: 'Discount after GST',
      key: 'afterTaxDiscount',
      type: 'money',
      hideBelow: 'xl',
      render: (item) => money(item.afterTaxDiscount),
    },
    {
      header: 'Total Amount',
      key: 'total',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      render: (item) => money(item.total, 'font-bold text-ink'),
    },
    {
      header: 'Paid Amount',
      key: 'paid',
      type: 'money',
      sortable: true,
      render: (item) => money(item.paid, 'font-semibold text-success'),
    },
    {
      header: 'Balance',
      key: 'balance',
      type: 'money',
      sortable: true,
      render: (item) => money(item.balance, 'font-bold text-warning'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sales Register Report"
        description="Every sales invoice, sales return and credit note in the period with its GST breakup. Returns and credit notes are minus; totals are net."
      />

      <DateFilterBar
        idPrefix="salesRegister"
        value={{ dateFrom, dateTo }}
        defaults={{ dateFrom: '2026-04-01', dateTo: '2027-03-31' }}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
      />

      <StatRow stats={stats} />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        search={{ placeholder: 'Search document no, customer...' }}
        empty={{ icon: FileText, title: 'No sales documents found for the selected period.' }}
        pageSizeOptions={[10, 20, 50, 100, 500]}
      />
    </div>
  );
}
