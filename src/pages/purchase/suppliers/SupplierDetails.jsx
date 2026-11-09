import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, FileText, ClipboardList, IndianRupee, Power, Receipt, Truck, AlertTriangle, ShoppingCart, Wallet } from 'lucide-react';
import { Badge, Button, DataTable, DetailList, PageHeader, Section, StatCard, StatusBadge } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import { PageLoading } from '../components/ui';
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
  { value: 'orders', label: 'Purchases' },
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
    <Button variant="link" size="sm" className="font-mono font-semibold" onClick={() => navigate(viewPath(kind, id))}>
      {text}
    </Button>
  );

  const ledgerLink = (row) => {
    const kind = { PurchaseBill: 'bills', PaymentOut: 'payments', PurchaseReturn: 'returns' }[row.referenceModel];
    if (!kind || !row.referenceId || row.transactionType === 'adjustment') return <span className="font-mono text-[13px]">{row.referenceNumber || '—'}</span>;
    return link(kind, row.referenceId, row.referenceNumber || 'View');
  };

  const columns = {
    ledger: [
      { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
      { key: 'transactionType', header: 'Type', mobile: 'title', render: (r) => LEDGER_TYPES[r.transactionType] || r.transactionType },
      { key: 'referenceNumber', header: 'Reference', render: ledgerLink },
      { key: 'credit', header: 'Billed (Cr)', type: 'money', render: (r) => (num(r.credit) ? <span className="text-danger">{formatINR(r.credit)}</span> : '—') },
      { key: 'debit', header: 'Paid / returned (Dr)', type: 'money', render: (r) => (num(r.debit) ? <span className="text-success">{formatINR(r.debit)}</span> : '—') },
      { key: 'balance', header: 'Balance', type: 'money', mobile: 'amount', render: (r) => formatINR(r.balance) },
      { key: 'notes', header: 'Notes', hideBelow: 'xl', render: (r) => <span className="text-ink-muted">{r.notes || '—'}</span> },
    ],
    bills: [
      { key: 'billNumber', header: 'Bill', mobile: 'title', render: (b) => link('bills', b._id, b.billNumber) },
      { key: 'supplierBillNo', header: 'Supplier bill no', hideBelow: 'lg', render: (b) => b.supplierBillNo || '—' },
      { key: 'billDate', header: 'Date', render: (b) => fmtDate(b.billDate) },
      {
        key: 'dueDate',
        header: 'Due',
        render: (b) => <span className={isOverdue(b.dueDate, b.balanceAmount) && b.status !== 'draft' ? 'font-semibold text-danger' : ''}>{fmtDate(b.dueDate)}</span>,
      },
      { key: 'totalAmount', header: 'Total', type: 'money', render: (b) => formatINR(b.totalAmount) },
      {
        key: 'balanceAmount',
        header: 'Balance',
        type: 'money',
        mobile: 'amount',
        render: (b) => <span className={num(b.balanceAmount) > 0 ? 'text-danger' : 'font-normal text-ink-subtle'}>{formatINR(b.balanceAmount)}</span>,
      },
      { key: 'status', header: 'Status', type: 'status' },
    ],
    orders: [
      { key: 'poNumber', header: 'PO', mobile: 'title', render: (p) => link('orders', p._id, p.poNumber) },
      { key: 'poDate', header: 'Date', render: (p) => fmtDate(p.poDate) },
      { key: 'expectedDate', header: 'Expected', render: (p) => fmtDate(p.expectedDate) },
      { key: 'totalAmount', header: 'Total', type: 'money', render: (p) => formatINR(p.totalAmount) },
      { key: 'status', header: 'Status', type: 'status' },
    ],
    payments: [
      { key: 'paymentNumber', header: 'Payment', mobile: 'title', render: (p) => link('payments', p._id, p.paymentNumber) },
      { key: 'paymentDate', header: 'Date', render: (p) => fmtDate(p.paymentDate) },
      { key: 'paymentMethod', header: 'Method', render: (p) => methodLabel(p.paymentMethod) },
      { key: 'reference', header: 'Reference', hideBelow: 'lg', render: (p) => p.reference || '—' },
      { key: 'amount', header: 'Amount', type: 'money', render: (p) => formatINR(p.amount) },
      { key: 'unallocatedAmount', header: 'Advance', type: 'money', render: (p) => (num(p.unallocatedAmount) ? formatINR(p.unallocatedAmount) : '—') },
      { key: 'status', header: 'Status', type: 'status' },
    ],
  };

  return (
    <DataTable
      key={tab}
      columns={columns[tab]}
      rows={rows}
      loading={loading}
      error={error || undefined}
      tabs={TABS}
      tab={tab}
      onTabChange={(v) => {
        setTab(v);
        setPage(1);
      }}
      filters={
        tab === 'ledger' && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
            <span>
              Opening balance: <strong className="tabular-nums text-ink">{formatINR(data?.supplier?.openingBalance ?? supplier.openingBalance)}</strong>
            </span>
            <span>
              Current payable: <strong className="tabular-nums text-danger">{formatINR(data?.supplier?.payableBalance ?? supplier.payableBalance)}</strong>
            </span>
            <span className="text-xs text-ink-subtle">Latest entries first. Balance is what you owe after each entry.</span>
          </div>
        )
      }
      empty={{ icon: tab === 'ledger' ? Wallet : FileText, title: tab === 'ledger' ? 'No ledger entries yet.' : 'Nothing recorded yet.' }}
      pagination={{
        page,
        pageSize,
        total,
        onPageChange: setPage,
        onPageSizeChange: (s) => {
          setPageSize(s);
          setPage(1);
        },
        pageSizeOptions: [10, 20, 50, 100],
      }}
    />
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

  const hasBank = s.bankDetails?.accountNumber || s.bankDetails?.upiId;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={s.name}
        description={s.companyName || undefined}
        actions={
          <>
            <StatusBadge status={s.isActive ? 'active' : 'inactive'} size="md" />
            {s.gstin ? (
              <Badge tone="neutral" size="md" className="font-mono font-medium">
                GSTIN {s.gstin}
              </Badge>
            ) : (
              <Badge tone="warning" size="md">
                Unregistered (no ITC)
              </Badge>
            )}
            <Button variant="secondary" onClick={() => navigate(editPath('suppliers', s._id))} startIcon={<Edit2 />}>
              Edit
            </Button>
            <Button variant="secondary" disabled={saving} onClick={toggleActive} startIcon={<Power />}>
              {s.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="soft" disabled={!s.isActive} onClick={() => navigate(`${PATHS.orders}/create`, { state: { prefill: { supplierId: s._id } } })} startIcon={<ClipboardList />}>
              New PO
            </Button>
            <Button variant="soft" disabled={!s.isActive} onClick={() => navigate(`${PATHS.bills}/create`, { state: { supplierId: s._id } })} startIcon={<FileText />}>
              New bill
            </Button>
            <Button onClick={() => navigate(`${PATHS.payments}/create`, { state: { supplierId: s._id } })} startIcon={<IndianRupee />}>
              Pay
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard
          label="Payable now"
          value={payable < 0 ? `${formatINR(-payable)} adv.` : formatINR(payable)}
          tone={payable > 0 ? 'danger' : 'success'}
          icon={Wallet}
          chip={payable < 0 ? 'Advance paid to supplier' : 'What you owe'}
        />
        <StatCard label="Total purchased" value={formatINR(st.totalPurchased)} tone="primary" icon={ShoppingCart} chip={`${st.bills || 0} bills`} />
        <StatCard label="Bills due" value={formatINR(st.billsDue)} tone="warning" icon={Receipt} />
        <StatCard label="Overdue" value={formatINR(st.overdue)} tone={num(st.overdue) > 0 ? 'danger' : 'neutral'} icon={AlertTriangle} />
        <StatCard label="Open orders" value={st.openPurchaseOrders || 0} tone="info" icon={ClipboardList} />
        <StatCard
          label="Last receipt"
          value={st.lastReceipt ? fmtDate(st.lastReceipt.date) : '—'}
          tone="neutral"
          icon={Truck}
          chip={st.lastReceipt ? `${st.lastReceipt.number} · ${formatINR(st.lastReceipt.amount)}` : 'No goods received yet'}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Section title="Profile" className="lg:col-span-2">
          <DetailList
            cols={3}
            items={[
              { label: 'Contact name', value: s.name },
              { label: 'Company', value: s.companyName },
              { label: 'Phone', value: s.phone },
              { label: 'Email', value: s.email },
              { label: 'State', value: s.stateCode ? `${stateName(s.stateCode) || ''} (${s.stateCode})` : '' },
              { label: 'PAN', value: s.pan, mono: true },
              { label: 'Credit period', value: num(s.paymentTermsDays) ? `${s.paymentTermsDays} days` : 'Due on receipt' },
              { label: 'Opening balance', value: formatINR(s.openingBalance) },
              { label: 'Address', value: address, wide: true },
            ]}
          />
        </Section>
        <div className="flex flex-col gap-5">
          <Section title="Bank details">
            {hasBank ? (
              <DetailList
                cols={1}
                items={[
                  s.bankDetails.accountName && { label: 'Account name', value: s.bankDetails.accountName },
                  s.bankDetails.accountNumber && { label: 'Account number', value: s.bankDetails.accountNumber, mono: true },
                  s.bankDetails.ifsc && { label: 'IFSC', value: s.bankDetails.ifsc, mono: true },
                  s.bankDetails.bankName && { label: 'Bank', value: s.bankDetails.bankName },
                  s.bankDetails.upiId && { label: 'UPI ID', value: s.bankDetails.upiId, mono: true },
                ]}
              />
            ) : (
              <p className="m-0 text-sm text-ink-subtle">No bank details saved.</p>
            )}
          </Section>
          <Section title="Notes">
            <p className="m-0 whitespace-pre-wrap text-sm text-ink-muted">{s.notes || 'No notes.'}</p>
          </Section>
        </div>
      </div>

      <SupplierTabs key={s._id} supplier={s} />
      <PurchaseToaster />
    </div>
  );
}
