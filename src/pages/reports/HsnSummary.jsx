import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Layers, DollarSign, TrendingUp, Package } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import DatePicker from '@/components/inputs/Datepicker';
import Table from '@/components/table/Table';
import TableInfoCard from '@/components/table/TableInfoCard';
import { getHsnSummary } from './services/reportSlice';
import ReportTabs from './ReportTabs';

export default function HsnSummary() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDateFrom = searchParams.get('dateFrom') || '2026-04-01';
  const initialDateTo = searchParams.get('dateTo') || '2027-03-31';

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const { hsnSummary, loading } = useSelector((state) => ({
    hsnSummary: state.reports.hsnSummary,
    loading: state.reports.loading.hsnSummary,
  }));

  const fetchReport = (from = dateFrom, to = dateTo) => {
    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;

    setSearchParams(params);
    dispatch(getHsnSummary(params));
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

  const dataList = Array.isArray(hsnSummary) ? hsnSummary : [];

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let grandTotal = 0;

    dataList.forEach((row) => {
      totalQty += Number(row.qty || 0);
      totalTaxable += Number(row.taxable || 0);
      totalCgst += Number(row.cgst || 0);
      totalSgst += Number(row.sgst || 0);
      totalIgst += Number(row.igst || 0);
      totalCess += Number(row.cess || 0);
      grandTotal += Number(row.total || 0);
    });

    return [
      {
        label: 'HSN Items',
        value: dataList.length,
        icon: <Layers className="w-3.5 h-3.5 text-blue-500" />,
      },
      {
        label: 'Total Quantity',
        value: totalQty.toLocaleString(),
        icon: <Package className="w-3.5 h-3.5 text-purple-500" />,
      },
      {
        label: 'Total Taxable',
        value: `₹${totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <DollarSign className="w-3.5 h-3.5 text-indigo-500" />,
        colorClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
      },
      {
        label: 'CGST + SGST',
        value: `₹${(totalCgst + totalSgst).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
      },
      {
        label: 'IGST',
        value: `₹${totalIgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-amber-500" />,
      },
      {
        label: 'Grand Total Amount',
        value: `₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />,
        colorClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
      },
    ];
  }, [dataList]);

  const headers = [
    {
      label: 'HSN / SAC Code',
      key: 'hsnCode',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
          {item.hsnCode || '—'}
        </span>
      ),
      value: 'checked',
    },
    {
      label: 'Quantity',
      key: 'qty',
      sortable: true,
      cellClassName: 'text-center font-semibold text-xs',
      render: (item) => <span>{item.qty || 0}</span>,
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
  ];

  return (
    <div>
      <Card h1="HSN Summary Report" bodyClassName="px-4 pb-4 pt-2">
        <ReportTabs />

        {/* ── Filter Bar ── */}
        <div className="mb-5 bg-[var(--vs-bg-secondary)] p-3 sm:p-4 rounded-xl border border-[var(--vs-border)]">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">From Date</Label>
              <DatePicker
                id="hsnDateFrom"
                placeholder="YYYY-MM-DD"
                defaultDate={dateFrom}
                onChange={(selectedDates, dateStr) => setDateFrom(dateStr)}
              />
            </div>
            <div className="w-40 sm:w-48">
              <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">To Date</Label>
              <DatePicker
                id="hsnDateTo"
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
          <TableInfoCard stats={totals} className="!flex-nowrap overflow-x-auto !gap-5 py-2 [&_*]:whitespace-nowrap" />
        </div>

        {/* ── Table ── */}
        <Table
          headers={headers}
          data={dataList}
          loading={loading}
          showSearch={true}
          searchPlaceholder="Search HSN code..."
          emptyMessage="No HSN summary data found for the selected period."
        />
      </Card>
    </div>
  );
}
