import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, FileText, ClipboardList, IndianRupee, Power, Receipt, Truck, AlertTriangle, ShoppingCart, Wallet } from 'lucide-react';
import Button from '@/components/inputs/Button';
import Tabs from '@/components/inputs/Tabs';
import Table from '@/components/table/Table';
import PurchaseToaster from '../components/PurchaseToaster';
import { InfoRow, PageLoading, PageShell, Section, StatCard, StatusBadge } from '../components/ui';
import useApi from '../components/useApi';
import { notify, notifyError } from '../components/toast';
import { LEDGER_TYPES, PATHS, decId, editPath, errMsg, fmtDate, formatINR, isOverdue, methodLabel, num, stateName, viewPath } from '../components/helpers';
import { fetchSupplier, setSupplierStatus } from './services/supplierSlice';
import { getSupplierLedgerApi } from './services/supplierService';
import { getPurchaseBillsApi } from '../purchaseBills/services/purchaseBillService';
import { getPurchaseOrdersApi } from '../purchaseOrders/services/purchaseOrderService';
import { getPaymentsOutApi } from '../paymentsOut/services/paymentOutService';

const TABS = [
  { value: 'ledger', label: 'Ledger' },
  { value: 'bills', label: 'Bills' },
  { value: 'orders', label: 'Purchase orders' },
  { value: 'payments', label: 'Payments' },
];

const LOADERS = {
  ledger: (id, page, limit) => getSupplierLedgerApi(id, { page, limit }),
  bills: (id, page, limit) => getPurchaseBillsApi({ supplierId: id, page, limit, sort: 'billDate', order: 'desc' }),
  orders: (id, page, limit) => getPurchaseOrdersApi({ supplierId: id, page, limit, sort: 'poDate', order: 'desc' }),
  payments: (id, page, limit) => getPaymentsOutApi({ supplierId: id, page, limit, sort: 'paymentDate', order: 'desc' }),
};

function SupplierTabs({ supplier }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ledger');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, loading, error } = useApi(`${supplier._id}:${tab}:${page}:${pageSize}`, () => LOADERS[tab](supplier._id, page, pageSize));
  const rows = data?.data || [];
  const total = data?.meta?.total ?? data?.pagination?.total ?? 0;

  const link = (kind, id, text) => (
    <button type="button" onClick={() => navigate(viewPath(kind, id))} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
      {text}
    </button>
  );

  const ledgerLink = (row) => {
    const kind = { PurchaseBill: 'bills', PaymentOut: 'payments', PurchaseReturn: 'returns' }[row.referenceModel];
    if (!kind || !row.referenceId || row.transactionType === 'adjustment') return <span className="font-mono">{row.referenceNumber || '—'}</span>;
    return link(kind, row.referenceId, row.referenceNumber || 'View');
  };

  const headers = {
    ledger: [
      { label: 'Date', key: 'date', value: 'checked', render: (r) => fmtDate(r.date) },
      { label: 'Type', key: 'transactionType', value: 'checked', render: (r) => LEDGER_TYPES[r.transactionType] || r.transactionType },
      { label: 'Reference', key: 'referenceNumber', value: 'checked', render: ledgerLink },
      { label: 'Billed (Cr)', key: 'credit', value: 'checked', render: (r) => (num(r.credit) ? <span className="text-rose-600 dark:text-rose-400">{formatINR(r.credit)}</span> : '—') },
      { label: 'Paid / returned (Dr)', key: 'debit', value: 'checked', render: (r) => (num(r.debit) ? <span className="text-emerald-600 dark:text-emerald-400">{formatINR(r.debit)}</span> : '—') },
      { label: 'Balance', key: 'balance', value: 'checked', render: (r) => <span className="font-semibold">{formatINR(r.balance)}</span> },
      { label: 'Notes', key: 'notes', value: 'checked', render: (r) => r.notes || '—' },
    ],
    bills: [
      { label: 'Bill', key: 'billNumber', value: 'checked', render: (b) => link('bills', b._id, b.billNumber) },
      { label: 'Supplier bill no', key: 'supplierBillNo', value: 'checked', render: (b) => b.supplierBillNo || '—' },
      { label: 'Date', key: 'billDate', value: 'checked', render: (b) => fmtDate(b.billDate) },
      {
        label: 'Due',
        key: 'dueDate',
        value: 'checked',
        render: (b) => <span className={isOverdue(b.dueDate, b.balanceAmount) && b.status !== 'draft' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>{fmtDate(b.dueDate)}</span>,
      },
      { label: 'Total', key: 'totalAmount', value: 'checked', render: (b) => formatINR(b.totalAmount) },
      { label: 'Balance', key: 'balanceAmount', value: 'checked', render: (b) => <span className={num(b.balanceAmount) > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>{formatINR(b.balanceAmount)}</span> },
      { label: 'Status', key: 'status', value: 'checked', render: (b) => <StatusBadge status={b.status} /> },
    ],
    orders: [
      { label: 'PO', key: 'poNumber', value: 'checked', render: (p) => link('orders', p._id, p.poNumber) },
      { label: 'Date', key: 'poDate', value: 'checked', render: (p) => fmtDate(p.poDate) },
      { label: 'Expected', key: 'expectedDate', value: 'checked', render: (p) => fmtDate(p.expectedDate) },
      { label: 'Store', key: 'store', value: 'checked', render: (p) => p.storeId?.name || p.storeSnapshot?.name || '—' },
      { label: 'Total', key: 'totalAmount', value: 'checked', render: (p) => formatINR(p.totalAmount) },
      { label: 'Status', key: 'status', value: 'checked', render: (p) => <StatusBadge status={p.status} /> },
    ],
    payments: [
      { label: 'Payment', key: 'paymentNumber', value: 'checked', render: (p) => link('payments', p._id, p.paymentNumber) },
      { label: 'Date', key: 'paymentDate', value: 'checked', render: (p) => fmtDate(p.paymentDate) },
      { label: 'Method', key: 'paymentMethod', value: 'checked', render: (p) => methodLabel(p.paymentMethod) },
      { label: 'Reference', key: 'reference', value: 'checked', render: (p) => p.reference || '—' },
      { label: 'Amount', key: 'amount', value: 'checked', render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
      { label: 'Advance', key: 'unallocatedAmount', value: 'checked', render: (p) => (num(p.unallocatedAmount) ? formatINR(p.unallocatedAmount) : '—') },
      { label: 'Status', key: 'status', value: 'checked', render: (p) => <StatusBadge status={p.status} /> },
    ],
  };

  return (
    <div>
      <Tabs
        tabs={TABS}
        activeTab={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      />
      {tab === 'ledger' && (
        <div className="mb-3 flex flex-wrap gap-4 text-sm text-[var(--vs-text-secondary)]">
          <span>
            Opening balance: <strong className="text-[var(--vs-text-primary)]">{formatINR(data?.supplier?.openingBalance ?? supplier.openingBalance)}</strong>
          </span>
          <span>
            Current payable: <strong className="text-rose-600 dark:text-rose-400">{formatINR(data?.supplier?.payableBalance ?? supplier.payableBalance)}</strong>
          </span>
          <span className="text-xs">Latest entries first. Balance is what you owe after each entry.</span>
        </div>
      )}
      {error && <div className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>}
      <Table
        headers={headers[tab]}
        data={rows}
        loading={loading}
        showSearch={false}
        emptyMessage={tab === 'ledger' ? 'No ledger entries yet.' : 'Nothing recorded yet.'}
        currentPage={page}
        pageSize={pageSize}
        totalRows={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}

export default function SupplierDetails() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, currentError, saving } = useSelector((state) => state.supplier);

  useEffect(() => {
    if (id) dispatch(fetchSupplier(id));
  }, [dispatch, id]);

  if (!id) return <PageLoading title="Supplier" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Supplier" error={currentError} />;

  const s = current;
  const st = s.stats || {};
  const payable = num(s.payableBalance);
  const address = [s.address?.street, s.address?.city, s.address?.state, s.address?.pincode].filter(Boolean).join(', ');

  const toggleActive = async () => {
    try {
      const res = await dispatch(setSupplierStatus({ id: s._id, isActive: !s.isActive })).unwrap();
      notify(res?.message || 'Status updated');
      dispatch(fetchSupplier(s._id));
    } catch (e) {
      notifyError(errMsg(e));
    }
  };

  return (
    <PageShell title={s.name} description={s.companyName || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vs-border)] pb-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={s.isActive ? 'active' : 'inactive'} size="lg" />
          {s.gstin ? <span className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--vs-bg-secondary)]">GSTIN {s.gstin}</span> : <span className="text-xs text-[var(--vs-text-secondary)]">Unregistered (no ITC)</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!s.isActive} onClick={() => navigate(`${PATHS.orders}/create`, { state: { prefill: { supplierId: s._id } } })} startIcon={<ClipboardList className="w-4 h-4" />}>
            New PO
          </Button>
          <Button size="sm" disabled={!s.isActive} onClick={() => navigate(`${PATHS.bills}/create`, { state: { supplierId: s._id } })} startIcon={<FileText className="w-4 h-4" />}>
            New bill
          </Button>
          <Button size="sm" onClick={() => navigate(`${PATHS.payments}/create`, { state: { supplierId: s._id } })} startIcon={<IndianRupee className="w-4 h-4" />}>
            Pay
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(editPath('suppliers', s._id))} startIcon={<Edit2 className="w-4 h-4" />}>
            Edit
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={toggleActive} startIcon={<Power className="w-4 h-4" />}>
            {s.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Payable now"
          value={payable < 0 ? `${formatINR(-payable)} adv.` : formatINR(payable)}
          tone={payable > 0 ? 'rose' : 'emerald'}
          icon={<Wallet className="w-3.5 h-3.5" />}
          hint={payable < 0 ? 'Advance paid to supplier' : 'What you owe'}
        />
        <StatCard label="Total purchased" value={formatINR(st.totalPurchased)} tone="indigo" icon={<ShoppingCart className="w-3.5 h-3.5" />} hint={`${st.bills || 0} bills`} />
        <StatCard label="Bills due" value={formatINR(st.billsDue)} tone="amber" icon={<Receipt className="w-3.5 h-3.5" />} />
        <StatCard label="Overdue" value={formatINR(st.overdue)} tone={num(st.overdue) > 0 ? 'rose' : 'default'} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <StatCard label="Open orders" value={st.openPurchaseOrders || 0} tone="blue" icon={<ClipboardList className="w-3.5 h-3.5" />} />
        <StatCard
          label="Last receipt"
          value={st.lastReceipt ? fmtDate(st.lastReceipt.grnDate) : '—'}
          icon={<Truck className="w-3.5 h-3.5" />}
          hint={st.lastReceipt ? `${st.lastReceipt.grnNumber} · ${formatINR(st.lastReceipt.totalValue)}` : 'No goods received yet'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Profile" bodyClassName="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Contact name" value={s.name} />
          <InfoRow label="Company" value={s.companyName} />
          <InfoRow label="Phone" value={s.phone} />
          <InfoRow label="Email" value={s.email} />
          <InfoRow label="State" value={s.stateCode ? `${stateName(s.stateCode) || ''} (${s.stateCode})` : ''} />
          <InfoRow label="PAN" value={s.pan} mono />
          <InfoRow label="Credit period" value={num(s.paymentTermsDays) ? `${s.paymentTermsDays} days` : 'Due on receipt'} />
          <InfoRow label="Opening balance" value={formatINR(s.openingBalance)} />
          <div className="sm:col-span-2">
            <InfoRow label="Address" value={address} />
          </div>
        </Section>
        <Section title="Bank details" bodyClassName="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {s.bankDetails?.accountNumber || s.bankDetails?.upiId ? (
            <>
              <InfoRow label="Account name" value={s.bankDetails.accountName} />
              <InfoRow label="Account number" value={s.bankDetails.accountNumber} mono />
              <InfoRow label="IFSC" value={s.bankDetails.ifsc} mono />
              <InfoRow label="Bank" value={s.bankDetails.bankName} />
              <InfoRow label="UPI ID" value={s.bankDetails.upiId} mono />
            </>
          ) : (
            <span className="text-sm text-[var(--vs-text-secondary)]">No bank details saved.</span>
          )}
        </Section>
        <Section title="Notes" bodyClassName="p-4">
          <p className="text-sm whitespace-pre-wrap text-[var(--vs-text-secondary)]">{s.notes || 'No notes.'}</p>
        </Section>
      </div>

      <SupplierTabs key={s._id} supplier={s} />
      <PurchaseToaster />
    </PageShell>
  );
}
