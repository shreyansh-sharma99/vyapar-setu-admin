import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Layers, IndianRupee, Landmark, Package } from 'lucide-react';
import { Badge, DataTable, PageHeader, Segmented } from '@/components/ui';
import { getHsnSummary } from './services/reportSlice';
import { DateFilterBar, StatRow } from './components/ReportBits';

const MONEY = 'text-xs tabular-nums';
// sales returns / credit notes are already taken off; a net minus shows red
const money = (v, cls = '') => (Number(v) ? <span className={`${MONEY} ${cls} ${Number(v) < 0 ? 'text-danger' : ''}`}>{Number(v) < 0 ? '−' : ''}₹{Math.abs(Number(v)).toFixed(2)}</span> : <span className={MONEY}>—</span>);

export default function HsnSummary() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDateFrom = searchParams.get('dateFrom') || '2026-04-01';
  const initialDateTo = searchParams.get('dateTo') || '2027-03-31';

  const [typeFilter, setTypeFilter] = useState('');
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

  const dataList = (Array.isArray(hsnSummary) ? hsnSummary : []).filter((r) => !typeFilter || r.itemType === typeFilter);

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
        label: 'Grand Total Amount',
        value: `₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: IndianRupee,
        tone: 'success',
      },
      {
        label: 'Total Taxable',
        value: `₹${totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: IndianRupee,
        tone: 'primary',
      },
      {
        label: 'CGST + SGST',
        value: `₹${(totalCgst + totalSgst).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: Landmark,
        tone: 'info',
      },
      {
        label: 'IGST',
        value: `₹${totalIgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        icon: Landmark,
        tone: 'neutral',
      },
      {
        label: 'Total Quantity',
        value: totalQty.toLocaleString(),
        icon: Package,
        tone: 'warning',
      },
      {
        label: 'HSN Items',
        value: dataList.length,
        icon: Layers,
        tone: 'neutral',
      },
    ];
  }, [dataList]);

  const columns = [
    {
      header: 'Type',
      key: 'itemType',
      render: (item) => <Badge tone={item.itemType === 'service' ? 'info' : 'neutral'}>{item.itemType === 'service' ? 'Service' : 'Goods'}</Badge>,
    },
    {
      header: 'HSN / SAC Code',
      key: 'hsnCode',
      sortable: true,
      mobile: 'title',
      render: (item) => (
        <span className="rounded-chip bg-fill px-2 py-0.5 font-mono text-xs font-bold text-ink">{item.hsnCode || '—'}</span>
      ),
    },
    {
      header: 'GST Rate',
      key: 'taxRate',
      sortable: true,
      render: (item) => <span className="font-mono text-xs font-bold">{Number(item.taxRate || 0)}%</span>,
    },
    {
      header: 'Unit (UQC)',
      key: 'unit',
      render: (item) => <span className="text-xs uppercase">{item.unit || '—'}</span>,
    },
    {
      header: 'Quantity',
      key: 'qty',
      type: 'number',
      sortable: true,
      render: (item) => <span className="text-xs font-semibold tabular-nums">{item.qty || 0}</span>,
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
      render: (item) => money(item.cess),
    },
    {
      header: 'Total Amount',
      key: 'total',
      type: 'money',
      sortable: true,
      mobile: 'amount',
      render: (item) => money(item.total, 'font-bold text-ink'),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="HSN / SAC Summary"
        description="Quantity, taxable value and GST for each HSN / SAC code sold in the period."
      />

      <DateFilterBar
        idPrefix="hsn"
        value={{ dateFrom, dateTo }}
        defaults={{ dateFrom: '2026-04-01', dateTo: '2027-03-31' }}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
      />

      <Segmented
        aria-label="Item type"
        value={typeFilter}
        onChange={setTypeFilter}
        options={[{ value: '', label: 'All' }, { value: 'goods', label: 'Goods' }, { value: 'service', label: 'Services' }]}
        className="self-start"
      />

      <StatRow stats={totals} />

      <DataTable
        columns={columns}
        rows={dataList}
        loading={loading}
        search={{ placeholder: 'Search HSN / SAC code...' }}
        empty={{ icon: Layers, title: 'No HSN summary data found for the selected period.' }}
        pageSizeOptions={[10, 20, 50, 100, 500]}
      />
    </div>
  );
}
