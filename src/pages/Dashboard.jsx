import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  AlertTriangle, ArrowRight, Boxes, FileText, HandCoins, IndianRupee, PackagePlus, Plus, RotateCcw,
  ShoppingCart, SlidersHorizontal, Truck, UserPlus, Wallet, BarChart3, LayoutDashboard,
} from 'lucide-react';
import {
  Alert, Avatar, Badge, Button, DataTable, EmptyState, PageHeader, Section, Skeleton, SkeletonRows, StatCard,
} from '@/components/ui';
import { encryptData } from '@/utility/crypto';
import { can } from '@/utility/shopPermissions';
import { getSalesInvoiceSummaryApi, getSalesInvoicesApi } from '@/pages/sales/salesInvoices/services/salesInvoiceService';
import { getPurchaseBillsApi } from '@/pages/purchase/purchaseBills/services/purchaseBillService';
import { getInventoryApi } from '@/pages/inventory/inventory/services/inventoryService';

/* ── Data (existing GET endpoints only) ───────────────────────────────── */

// Sales that count as money in: drafts and voided / cancelled bills are left out.
const NOT_A_SALE = ['draft', 'void', 'voided', 'cancelled'];
const OPEN_STATUSES = ['unpaid', 'partially_paid'];

/** GET /sales-invoices/summary → [{ _id: status, count, totalAmount, paidAmount }] */
const loadSummary = async () => {
  const body = await getSalesInvoiceSummaryApi();
  const open = (body?.data || []).filter((s) => OPEN_STATUSES.includes(s._id));
  return {
    amount: open.reduce((n, s) => n + Math.max(0, Number(s.totalAmount || 0) - Number(s.paidAmount || 0)), 0),
    count: open.reduce((n, s) => n + Number(s.count || 0), 0),
  };
};

/** GET /sales-invoices?dateFrom=today&dateTo=today (no page → every bill of the day) */
const loadToday = async () => {
  const today = dayjs().format('YYYY-MM-DD');
  const body = await getSalesInvoicesApi({ dateFrom: today, dateTo: today });
  const sales = (body?.data || []).filter((i) => !NOT_A_SALE.includes(i.status));
  return {
    amount: sales.reduce((n, i) => n + Number(i.totalAmount || 0), 0),
    count: sales.length,
  };
};

/** GET /sales-invoices?page=1&limit=8 → newest first */
const loadRecent = async () => {
  const body = await getSalesInvoicesApi({ page: 1, limit: 8 });
  return body?.data || [];
};

/** GET /inventory?stockStatus=low → stats { lowStock, outOfStock } + the 5 lowest items */
const loadStock = async () => {
  const body = await getInventoryApi({ stockStatus: 'low', sort: 'qty', order: 'asc', page: 1, limit: 5 });
  return { stats: body?.stats || {}, items: body?.data || [] };
};

/** GET /purchase-bills?page=1&limit=1 → stats { due, overdue } over all bills */
const loadBills = async () => {
  const body = await getPurchaseBillsApi({ page: 1, limit: 1 });
  return body?.stats || {};
};

const errorText = (err) => err?.response?.data?.message || err?.message || 'Check your connection and try again.';

/** Loads one dashboard block on its own, so one failing call does not break the others. */
function useBlock(loader, enabled) {
  const [state, setState] = useState({ loading: enabled, data: null, error: null, run: 0 });
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    loader()
      .then((data) => live && setState((s) => ({ ...s, loading: false, data, error: null })))
      .catch((err) => live && setState((s) => ({ ...s, loading: false, error: errorText(err) })));
    return () => {
      live = false;
    };
  }, [loader, enabled, state.run]);
  const retry = () => setState((s) => ({ ...s, loading: true, error: null, run: s.run + 1 }));
  return { ...state, retry };
}

/* ── Formatting ───────────────────────────────────────────────────────── */

const inr0 = (n) => '₹ ' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const customerName = (inv) =>
  inv.customerSnapshot?.name ||
  [inv.customerId?.firstName, inv.customerId?.lastName].filter(Boolean).join(' ') ||
  'Walk-in customer';

const kpiValue = (block, value) =>
  block.loading ? (
    <Skeleton className="h-8 w-28" />
  ) : (
    // Smaller on phones so a ₹ 12,34,567 still fits a half-width card.
    <span className="block truncate text-xl sm:text-2xl" title={block.error ? undefined : value}>{block.error ? '—' : value}</span>
  );

/* Quick links — each shows only when the user's role allows it. */
const QUICK_LINKS = [
  { label: 'New sale', to: '/sales/invoices/create', icon: Plus, module: 'sales', level: 'create' },
  { label: 'Add customer', to: '/customers/create', icon: UserPlus, module: 'customers', level: 'create' },
  { label: 'Sales return', to: '/sales/return/create', icon: RotateCcw, module: 'sales', level: 'create' },
  { label: 'Purchase bill', to: '/purchase/bills/create', icon: Truck, module: 'purchase', level: 'create' },
  { label: 'Pay supplier', to: '/purchase/payments/create', icon: HandCoins, module: 'purchase', level: 'create' },
  { label: 'Add product', to: '/products/create', icon: PackagePlus, module: 'catalog', level: 'create' },
  { label: 'Adjust stock', to: '/inventory/adjust', icon: SlidersHorizontal, module: 'inventory', level: 'update' },
  { label: 'Reports', to: '/reports/sales-register', icon: BarChart3, module: 'reports', level: 'view' },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);

  const canSales = can(user, 'sales');
  const canInventory = can(user, 'inventory');
  const canPurchase = can(user, 'purchase');

  const summary = useBlock(loadSummary, canSales);
  const today = useBlock(loadToday, canSales);
  const recent = useBlock(loadRecent, canSales);
  const stock = useBlock(loadStock, canInventory);
  const bills = useBlock(loadBills, canPurchase);

  const openInvoice = (inv) => navigate(`/sales/invoices/view/${encodeURIComponent(encryptData(inv._id))}`);
  const links = QUICK_LINKS.filter((l) => can(user, l.module, l.level));

  const stockStats = stock.data?.stats || {};
  const lowCount = Number(stockStats.lowStock || 0);
  const outCount = Number(stockStats.outOfStock || 0);
  const due = Number(bills.data?.due || 0);
  const overdue = Number(bills.data?.overdue || 0);

  const cards = [
    canSales && {
      key: 'today',
      block: today,
      label: "Today's sales",
      value: inr0(today.data?.amount),
      chip: today.data ? plural(today.data.count, 'bill', 'bills') : null,
      icon: IndianRupee,
      tone: 'success',
      to: '/sales/invoices',
      what: "today's sales",
    },
    canSales && {
      key: 'collect',
      block: summary,
      label: 'To collect',
      value: inr0(summary.data?.amount),
      chip: summary.data ? plural(summary.data.count, 'invoice', 'invoices') : null,
      icon: Wallet,
      tone: 'warning',
      to: '/sales/invoices',
      what: 'amounts to collect',
    },
    canInventory && {
      key: 'stock',
      block: stock,
      label: 'Low stock',
      value: plural(lowCount, 'item', 'items'),
      chip: stock.data ? (outCount > 0 ? `${outCount} out of stock` : 'Nothing out of stock') : null,
      chipTone: outCount > 0 ? 'danger' : 'neutral',
      icon: Boxes,
      tone: 'danger',
      to: '/inventory',
      what: 'stock levels',
    },
    canPurchase && {
      key: 'pay',
      block: bills,
      label: 'To pay suppliers',
      value: inr0(due),
      chip: bills.data ? (overdue > 0 ? `${inr0(overdue)} overdue` : 'Nothing overdue') : null,
      chipTone: overdue > 0 ? 'danger' : 'neutral',
      icon: Truck,
      tone: 'info',
      to: '/purchase/bills',
      what: 'supplier dues',
    },
  ].filter(Boolean);

  const failed = cards.filter((c) => c.block.error);

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice', type: 'mono', mobile: 'title', cellClassName: 'font-semibold' },
    {
      key: 'customer',
      header: 'Customer',
      render: (inv) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={customerName(inv)} size="sm" />
          <span className="truncate font-semibold text-ink">{customerName(inv)}</span>
        </div>
      ),
    },
    { key: 'invoiceDate', header: 'Date', type: 'date' },
    { key: 'totalAmount', header: 'Amount (₹)', type: 'money', mobile: 'amount' },
    { key: 'status', header: 'Status', type: 'status' },
  ];

  const headerActions = (
    <>
      {can(user, 'purchase', 'create') && (
        <Button as={Link} to="/purchase/bills/create" variant="secondary" startIcon={<ShoppingCart />}>
          New purchase
        </Button>
      )}
      {can(user, 'sales', 'create') && (
        <Button as={Link} to="/sales/invoices/create" startIcon={<Plus />}>
          New sale
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${greeting()}, ${firstName(user?.name)}`}
        description={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Here's how the shop is doing.`}
        actions={headerActions}
      />

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {cards.map((c) => (
            <StatCard
              key={c.key}
              label={c.label}
              value={kpiValue(c.block, c.value)}
              chip={c.block.loading || c.block.error ? null : c.chip}
              chipTone={c.chipTone}
              icon={c.icon}
              tone={c.tone}
              onClick={() => navigate(c.to)}
              className="min-w-0"
            />
          ))}
        </div>
      )}

      {failed.map((c) => (
        <Alert
          key={c.key}
          tone="danger"
          title={`Couldn't load ${c.what}`}
          action={
            <Button size="sm" variant="secondary" startIcon={<RotateCcw />} onClick={c.block.retry}>
              Retry
            </Button>
          }
        >
          {c.block.error}
        </Alert>
      ))}

      {!canSales && !canInventory && !canPurchase && links.length === 0 && (
        <Section>
          <EmptyState
            icon={LayoutDashboard}
            title="Nothing to show yet"
            text="Your role doesn't include sales, stock or purchases. Ask the shop owner for access."
          />
        </Section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {canSales && (
          <div className="flex min-w-0 flex-col lg:col-span-2">
            <DataTable
              columns={columns}
              rows={recent.data || []}
              loading={recent.loading}
              error={recent.error}
              onRetry={recent.retry}
              columnPicker={false}
              pagination={false}
              filters={<h2 className="m-0 !text-[15px] !font-extrabold !leading-6 text-ink">Recent invoices</h2>}
              toolbar={
                <Button as={Link} to="/sales/invoices" variant="link" size="sm" endIcon={<ArrowRight />}>
                  View all
                </Button>
              }
              onRowClick={openInvoice}
              maxHeight="none"
              empty={{
                icon: FileText,
                title: 'No sales invoices yet',
                text: 'Your latest bills will show up here.',
                action: can(user, 'sales', 'create') && (
                  <Button as={Link} to="/sales/invoices/create" startIcon={<Plus />}>New sale</Button>
                ),
              }}
            />
          </div>
        )}

        {(canInventory || links.length > 0) && (
          <div className={`flex min-w-0 flex-col gap-5 ${canSales ? '' : 'lg:col-span-3'}`}>
            {canInventory && (
              <Section
                title="Running low"
                actions={
                  <Button as={Link} to="/inventory" variant="link" size="sm" endIcon={<ArrowRight />}>
                    View stock
                  </Button>
                }
              >
                {stock.loading ? (
                  <SkeletonRows rows={4} cols={2} />
                ) : stock.error ? (
                  <Alert
                    tone="danger"
                    title="Couldn't load stock"
                    action={<Button size="sm" variant="secondary" onClick={stock.retry}>Retry</Button>}
                  />
                ) : stock.data.items.length === 0 ? (
                  <p className="m-0 py-4 text-center text-sm text-ink-muted">All items are above their reorder level.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                    {stock.data.items.map((p) => (
                      <li key={p._id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-warning-soft text-warning">
                          <AlertTriangle className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                          <div className="text-xs text-ink-subtle">
                            Reorder at {Number(p.threshold ?? p.lowStockAlertThreshold ?? 0)} {p.unit || ''}
                          </div>
                        </div>
                        <Badge tone="warning" className="shrink-0 tabular-nums">
                          {Number(p.qty ?? p.currentStock ?? 0)} {p.unit || ''} left
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {links.length > 0 && (
              <Section title="Quick links">
                <div className="grid grid-cols-2 gap-2">
                  {links.map((l) => (
                    <Button
                      key={l.to}
                      as={Link}
                      to={l.to}
                      variant="soft"
                      startIcon={<l.icon />}
                      className="min-w-0 justify-start"
                    >
                      <span className="truncate">{l.label}</span>
                    </Button>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
