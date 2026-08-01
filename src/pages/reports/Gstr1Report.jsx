import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { PieChart, DollarSign, TrendingUp, Calculator, Layers, FileText } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import DatePicker from '@/components/inputs/Datepicker';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import Tabs from '@/components/inputs/Tabs';
import { getGstr1 } from './services/reportSlice';
import ReportTabs from './ReportTabs';

const GSTR1_SUB_TABS = [
  { label: 'Summary by Invoice Type (B2B / B2C)', value: 'byType' },
  { label: 'Summary by Tax Rate', value: 'byRate' },
  { label: 'View All Summaries', value: 'all' },
];

export default function Gstr1Report() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDateFrom = searchParams.get('dateFrom') || '2026-04-01';
  const initialDateTo = searchParams.get('dateTo') || '2027-03-31';

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [activeSubTab, setActiveSubTab] = useState('byType');

  const { gstr1, loading } = useSelector((state) => ({
    gstr1: state.reports.gstr1,
    loading: state.reports.loading.gstr1,
  }));

  const fetchReport = (from = dateFrom, to = dateTo) => {
    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;

    setSearchParams(params);
    dispatch(getGstr1(params));
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

  const byType = gstr1?.byType || [];
  const byRate = gstr1?.byRate || [];

  // Overall tax statistics computed from byType
  const overallStats = useMemo(() => {
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let grandTotal = 0;

    byType.forEach((row) => {
      totalTaxable += Number(row.taxable || 0);
      totalCgst += Number(row.cgst || 0);
      totalSgst += Number(row.sgst || 0);
      totalIgst += Number(row.igst || 0);
      totalCess += Number(row.cess || 0);
      grandTotal += Number(row.total || 0);
    });

    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    return [
      {
        label: 'Total Taxable Value',
        value: `₹${totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" />,
        colorClass: 'text-indigo-600 dark:text-indigo-400 text-base font-bold',
      },
      {
        label: 'CGST',
        value: `₹${totalCgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-blue-500" />,
      },
      {
        label: 'SGST',
        value: `₹${totalSgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      },
      {
        label: 'IGST',
        value: `₹${totalIgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-purple-500" />,
      },
      {
        label: 'Total Tax Amount',
        value: `₹${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <Calculator className="w-3.5 h-3.5 text-amber-500" />,
        colorClass: 'text-amber-600 dark:text-amber-400 text-base font-bold',
      },
      {
        label: 'Grand Total Value',
        value: `₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <PieChart className="w-3.5 h-3.5 text-emerald-600" />,
        colorClass: 'text-emerald-600 dark:text-emerald-400 text-base font-bold',
      },
    ];
  }, [byType]);

  const byTypeHeaders = [
    {
      label: 'Invoice Type',
      key: 'type',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-[11px] uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          {item.type || '—'}
        </span>
      ),
      value: 'checked',
    },
    {
      label: 'Invoice Count',
      key: 'count',
      sortable: true,
      cellClassName: 'text-center font-semibold text-xs',
      render: (item) => <span>{item.count || 0}</span>,
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
      label: 'Total Invoice Value',
      key: 'total',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs font-bold text-[var(--vs-text-primary)]',
      render: (item) => <span>₹{Number(item.total || 0).toFixed(2)}</span>,
      value: 'checked',
    },
  ];

  const byRateHeaders = [
    {
      label: 'Tax Rate (%)',
      key: 'taxRate',
      sortable: true,
      render: (item) => <span className="font-bold text-xs font-mono">{item.taxRate}%</span>,
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
      label: 'Total Tax',
      key: 'totalTax',
      sortable: true,
      cellClassName: 'text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400',
      render: (item) => {
        const tax = Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0) + Number(item.cess || 0);
        return <span>₹{tax.toFixed(2)}</span>;
      },
      value: 'checked',
    },
  ];

  return (
    <div>
      <Card h1="GSTR-1 Summary Report" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />

        {/* ── Filter Bar ── */}
        <div className="mb-5 bg-[var(--vs-bg-secondary)] p-3 sm:p-4 rounded-xl border border-[var(--vs-border)]">
          <div className="flex flex-wrap  gap-3 sm:gap-4">
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">From Date</Label>
              <DatePicker
                id="gstr1DateFrom"
                placeholder="YYYY-MM-DD"
                defaultDate={dateFrom}
                onChange={(selectedDates, dateStr) => setDateFrom(dateStr)}
              />
            </div>
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">To Date</Label>
              <DatePicker
                id="gstr1DateTo"
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
          <TableInfoCard stats={overallStats} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
        </div>

        {/* ── Sub-Tabs Selector ── */}
        <div className="mb-5">
          <Tabs
            tabs={GSTR1_SUB_TABS}
            activeTab={activeSubTab}
            onChange={(val) => setActiveSubTab(val)}
          />
        </div>

        {/* ── Section 1: Summary by Invoice Type (B2B / B2C) ── */}
        {(activeSubTab === 'byType' || activeSubTab === 'all') && (
          <div className="mb-6">
            <h2 className="!text-sm sm:text-base font-bold !text-[#0f6ebd] dark:!text-blue-400 mb-2.5 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-4 h-4 !text-[#0f6ebd] dark:!text-blue-400" />
              Summary by Invoice Type (B2B / B2C)
            </h2>
            <Table
              headers={byTypeHeaders}
              data={byType}
              loading={loading}
              showSearch={false}
              showPagination={false}
              emptyMessage="No invoice type summaries available for the selected dates."
            />
          </div>
        )}

        {/* ── Section 2: Summary by Tax Rate ── */}
        {(activeSubTab === 'byRate' || activeSubTab === 'all') && (
          <div className="mb-4">
            <h2 className="!text-sm sm:text-base font-bold !text-[#0f6ebd] dark:!text-blue-400 mb-2.5 flex items-center gap-2 uppercase tracking-wide">
              <Calculator className="w-4 h-4 !text-[#0f6ebd] dark:!text-blue-400" />
              Summary by Tax Rate
            </h2>
            <Table
              headers={byRateHeaders}
              data={byRate}
              loading={loading}
              showSearch={false}
              showPagination={false}
              emptyMessage="No rate-wise tax summaries available for the selected dates."
            />
          </div>
        )}
      </Card>
    </div>
  );
}
