import { useState } from 'react';
import {
  AlertTriangle, Calendar, Download, FileText, Mail, MoreHorizontal, Pencil, Plus, Printer, Receipt, Search, Trash2, Truck, Wallet,
} from 'lucide-react';
import {
  Alert, Avatar, Badge, Button, Checkbox, ConfirmDialog, DatePicker, DetailList, DateRangePicker, Drawer, DropdownMenu, EmptyState, Field, FormGrid,
  Input, Kbd, Modal, MoneyInput, MultiSelect, TagInput, NumberInput, PageHeader, Popover, Section, Segmented, Select, SettingRow, SkeletonRows, Spinner, StatCard,
  StatusBadge, Switch, Textarea, Tooltip, toast,
} from '@/components/ui';

/** Component rows for /ui-kit (dev only). Every variant and state of every ui/* component. */

const VARIANTS = ['primary', 'secondary', 'soft', 'ghost', 'accent', 'danger', 'danger-soft', 'success', 'link', 'link-inverse'];
const SIZES = ['xs', 'sm', 'md', 'lg'];
const STATES = [
  ['India Gate Basmati Rice 25 kg', 'rice'], ['Fortune Sunflower Oil 15 L', 'oil'], ['Tata Salt 1 kg', 'salt'], ['Surf Excel Matic 2 kg', 'surf'],
];
const CUSTOMERS = ['Sharma General Store', 'Gupta Kirana', 'Mehta Electricals', 'Krishna Traders', 'Sai Medicals', 'Fresh Mart', 'Priya Patel']
  .map((name, i) => ({ value: `c${i}`, label: name, description: `27AABCS14${i}9B1Z5 · Mumbai` }));

// Fake async search so the async Select can be tried without the API.
const searchCustomers = (q) =>
  new Promise((resolve) => setTimeout(() => resolve(CUSTOMERS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))), 400));

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Block({ title, note, children }) {
  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-6">
      <div>
        <h2 className="m-0 !text-base !font-extrabold text-ink">{title}</h2>
        {note && <p className="m-0 mt-1 text-sm text-ink-subtle">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function UiKitComponents() {
  const [product, setProduct] = useState('rice');
  const [customer, setCustomer] = useState('');
  const [roles, setRoles] = useState(['sales', 'stock']);
  const [tags, setTags] = useState(['organic', 'best seller']);
  const [money, setMoney] = useState('105600');
  const [qty, setQty] = useState(12);
  const [tab, setTab] = useState('all');
  const [mode, setMode] = useState('saved');
  const [checked, setChecked] = useState(true);
  const [whatsApp, setWhatsApp] = useState(true);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Block title="Button" note='<Button variant="…" size="…" />. Old names still work: outline → secondary, login → primary · lg · full width.'>
        <Row label="Variants">
          {VARIANTS.map((v) => <Button key={v} variant={v}>{v}</Button>)}
        </Row>
        <Row label="Sizes">
          {SIZES.map((s) => <Button key={s} size={s} startIcon={<Plus />}>New invoice</Button>)}
        </Row>
        <Row label="States and icons">
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" startIcon={<Download />}>Export</Button>
          <Button variant="accent" startIcon={<Printer />}>Save &amp; print</Button>
          <Button variant="secondary" size="icon" aria-label="Print"><Printer /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="More"><MoreHorizontal /></Button>
        </Row>
      </Block>

      <Block title="Inputs and Field" note="Filled fields; focus = brand border + ring; invalid = red border + soft red fill + message.">
        <FormGrid>
          <Field label="Customer name" required hint="As printed on the invoice">
            <Input placeholder="Sharma General Store" />
          </Field>
          <Field label="Email">
            <Input type="email" startIcon={<Mail />} placeholder="name@company.com" />
          </Field>
          <Field label="GSTIN" error="Enter a 15-character GSTIN">
            <Input defaultValue="27AABCS1429" className="font-mono" />
          </Field>
          <Field label="Amount received">
            <MoneyInput value={money} onChange={setMoney} />
          </Field>
          <Field label="Quantity" hint="Only 42 in stock">
            <NumberInput value={qty} onChange={setQty} min={1} max={42} stepper />
          </Field>
          <Field label="Disabled">
            <Input disabled value="Read only value" />
          </Field>
          <Field label="Delivery instructions" className="col-span-full">
            <Textarea placeholder="Deliver to the back gate before 11 am." />
          </Field>
        </FormGrid>
        <Row label="Sizes">
          <div className="w-48"><Input size="sm" placeholder="sm" /></div>
          <div className="w-48"><Input size="md" placeholder="md" /></div>
          <div className="w-48"><Input size="lg" placeholder="lg" startIcon={<Search />} /></div>
        </Row>
      </Block>

      <Block title="Select and DatePicker" note="Type to filter · ↑ ↓ Enter Esc. Async loads results as you type (fake 400 ms search here).">
        <FormGrid>
          <Field label="Product">
            <Select options={STATES.map(([label, value]) => ({ value, label }))} value={product} onChange={setProduct} clearable />
          </Field>
          <Field label="Customer (async)" hint="Try “gupta”">
            <Select loadOptions={searchCustomers} value={customer} onChange={setCustomer} placeholder="Search customer…" clearable />
          </Field>
          <Field label="Place of supply" error="Pick a state">
            <Select options={[{ value: '27', label: 'Maharashtra (27)' }, { value: '29', label: 'Karnataka (29)' }]} value="" onChange={() => {}} />
          </Field>
          <Field label="Order date">
            <DatePicker suffixIcon={<Calendar className="size-4" />} />
          </Field>
          <Field label="Permissions (MultiSelect)" hint="↑ ↓ Enter ticks · Backspace removes the last chip">
            <MultiSelect
              value={roles}
              onChange={setRoles}
              placeholder="Pick modules"
              options={[{ value: 'sales', label: 'Sales' }, { value: 'stock', label: 'Inventory' }, { value: 'purchase', label: 'Purchases' }, { value: 'reports', label: 'Reports', description: 'GSTR-1, HSN, profit' }, { value: 'staff', label: 'Staff & Roles' }]}
            />
          </Field>
          <Field label="Product tags (TagInput)" hint="Type and press Enter">
            <TagInput value={tags} onChange={setTags} placeholder="Add a tag" />
          </Field>
          <Field label="Report period" className="md:col-span-2">
            <DateRangePicker />
          </Field>
        </FormGrid>
      </Block>

      <Block title="Checkbox, Switch, Segmented">
        <Row label="Checkbox">
          <Checkbox label="Track batches" checked={checked} onChange={setChecked} />
          <Checkbox label="Indeterminate" indeterminate />
          <Checkbox label="Disabled" disabled checked />
          <Checkbox label="With help" description="Shows expiry on bills" />
        </Row>
        <Row label="Switch">
          <Switch label="Send PDF on WhatsApp" checked={whatsApp} onChange={setWhatsApp} />
          <Switch label="Small" size="sm" defaultChecked />
          <Switch label="Disabled" disabled />
        </Row>
        <Row label="Segmented">
          <Segmented
            aria-label="Invoice status"
            value={tab}
            onChange={setTab}
            options={[{ value: 'all', label: 'All', count: 412 }, { value: 'paid', label: 'Paid', count: 356 }, { value: 'partial', label: 'Partial', count: 18 }, { value: 'overdue', label: 'Overdue', count: 6 }]}
          />
          <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'walkin', label: 'Walk-in' }, { value: 'saved', label: 'Saved customer' }]} />
        </Row>
      </Block>

      <Block title="Badges, avatars, hints">
        <Row label="Badge tones">
          {['success', 'warning', 'danger', 'info', 'neutral', 'primary'].map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}
          <Badge tone="warning" size="md" icon={AlertTriangle}>Only 5 left</Badge>
          <Badge tone="success" size="xs">In stock</Badge>
          <Badge tone="primary" size="xs">Oldest</Badge>
        </Row>
        <Row label="StatusBadge">
          {['paid', 'partial', 'overdue', 'draft', 'partially_received', 'sent', 'cancelled'].map((s) => <StatusBadge key={s} status={s} />)}
        </Row>
        <Row label="Avatar, Kbd, Tooltip, Spinner">
          {['Sharma General Store', 'Gupta Kirana', 'Mehta Electricals'].map((n) => <Avatar key={n} name={n} />)}
          <Kbd>F2</Kbd><Kbd>Ctrl S</Kbd>
          <Tooltip content="Print invoice"><Button variant="secondary" size="icon" aria-label="Print"><Printer /></Button></Tooltip>
          <Spinner label="Saving…" />
        </Row>
      </Block>

      <Block title="Cards" note="PageHeader, StatCard, Section, EmptyState, SkeletonRows.">
        <PageHeader
          title="New purchase order"
          docNo="PO-2026-0087"
          actions={<><Button variant="secondary">Save draft</Button><Button>Save &amp; send</Button></>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Today's sales" value="₹ 48,230" icon={Wallet} tone="primary" chip="+12%" chipTone="success" />
          <StatCard label="To collect" value="₹ 1,73,120" icon={Receipt} tone="warning" chip="24 invoices" />
          <StatCard label="Low stock" value="18 items" icon={AlertTriangle} tone="danger" chip="Reorder now" />
          <StatCard label="To deliver" value="7 orders" icon={Truck} tone="success" chip="3 out today" />
        </div>
        <div className="grid gap-4 rounded-card bg-page p-4 lg:grid-cols-2">
          <Section title="Supplier" description="Who you're ordering from" actions={<Button variant="secondary" size="sm">Change</Button>}>
            <div className="flex items-center gap-3 rounded-control bg-fill p-3">
              <Avatar name="Annapurna Wholesale" />
              <div className="min-w-0">
                <div className="font-bold text-ink">Annapurna Wholesale</div>
                <div className="font-mono text-xs text-ink-subtle">27AAFCA4410P1Z3 · Pune</div>
              </div>
            </div>
          </Section>
          <Section title="Loading">
            <SkeletonRows rows={4} cols={4} />
          </Section>
          <Section className="lg:col-span-2">
            <EmptyState icon={FileText} title="No invoices yet" text="Your sales invoices will show here." action={<Button startIcon={<Plus />}>New invoice</Button>} />
          </Section>
        </div>
      </Block>

      <Block title="Details and notes" note="Alert (tone), DetailList (read-only label / value grid for details pages), SettingRow, link-inverse button on a dark panel.">
        <div className="flex flex-col gap-3">
          <Alert tone="info">Stock comes in through a Purchase, or the opening stock below.</Alert>
          <Alert tone="success" title="Payment recorded">₹ 12,000 against PB-2026-0031.</Alert>
          <Alert tone="warning" title="Supplier has no GSTIN">No input tax credit on this bill.</Alert>
          <Alert tone="danger" action={<Button size="sm" variant="secondary">Retry</Button>}>Could not load the ledger.</Alert>
        </div>
        <DetailList
          items={[
            { label: 'Supplier', value: 'Annapurna Wholesale' },
            { label: 'GSTIN', value: '27AAFCA4410P1Z3', mono: true },
            { label: 'Balance', value: '₹ 42,000.00', tone: 'danger' },
            { label: 'Email', value: '' },
            { label: 'Address', value: 'Shop 12, Market Yard, Gultekdi, Pune 411037', wide: true },
          ]}
        />
        <Section title="Settings rows">
          <SettingRow title="Active" description="Inactive roles cannot be given to staff"><Switch defaultChecked /></SettingRow>
          <SettingRow title="Round off totals" description="Rounds the bill total to the nearest rupee"><Switch /></SettingRow>
        </Section>
        <div className="rounded-card bg-nav p-5"><Button variant="link-inverse">Use cost + GST again</Button></div>
      </Block>

      <Block title="Menus and overlays" note="Esc closes · Tab stays inside dialogs · focus returns to the button that opened them.">
        <Row label="Open">
          <DropdownMenu
            trigger={<Button variant="secondary" endIcon={<MoreHorizontal />}>Row actions</Button>}
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => toast.info('Edit clicked') },
              { label: 'Print', icon: Printer, shortcut: 'Ctrl P', onClick: () => toast.info('Print clicked') },
              { divider: true },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => setConfirm(true) },
            ]}
          />
          <Popover trigger={<Button variant="secondary">Filter: Date</Button>}>
            <div className="flex w-64 flex-col gap-3">
              <span className="text-sm font-semibold text-ink">Date range</span>
              <DateRangePicker size="sm" />
            </div>
          </Popover>
          <Button variant="soft" onClick={() => setModal(true)}>Modal</Button>
          <Button variant="danger-soft" onClick={() => setConfirm(true)}>ConfirmDialog</Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>Drawer</Button>
        </Row>
        <Row label="Toasts">
          <Button variant="secondary" onClick={() => toast.success('Purchase order saved')}>success</Button>
          <Button variant="secondary" onClick={() => toast.error('Could not save. Check your connection.')}>error</Button>
          <Button variant="secondary" onClick={() => toast.warning('Only 5 Maggi left in stock')}>warning</Button>
          <Button variant="secondary" onClick={() => toast.info('Downloading PDF…')}>info</Button>
        </Row>
      </Block>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Record payment"
        subtitle="INV-2026-0411 · Gupta Kirana"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => { setModal(false); toast.success('Payment recorded'); }}>Save payment</Button></>}
      >
        <FormGrid cols={2}>
          <Field label="Amount"><MoneyInput value="2230" onChange={() => {}} /></Field>
          <Field label="Mode"><Select options={[{ value: 'upi', label: 'UPI' }, { value: 'cash', label: 'Cash' }]} value="upi" onChange={() => {}} /></Field>
        </FormGrid>
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setLoading(true); setTimeout(() => { setLoading(false); setConfirm(false); toast.success('Deleted'); }, 900); }}
        loading={loading}
        loadingLabel="Deleting…"
        title="Delete this invoice?"
        message="INV-2026-0405 for Fresh Mart will be removed. This can't be undone."
      />

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="INV-2026-0407"
        subtitle="Krishna Traders"
        footer={<><Button variant="secondary" startIcon={<Printer />}>Print</Button><Button variant="accent">Record payment</Button></>}
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between"><span className="text-ink-muted">Total</span><span className="font-bold tabular-nums">₹ 1,05,600.00</span></div>
          <div className="flex justify-between"><span className="text-ink-muted">Received</span><span className="tabular-nums text-success">60,000.00</span></div>
          <div className="flex justify-between"><span className="text-ink-muted">Balance</span><span className="tabular-nums text-warning">45,600.00</span></div>
          <StatusBadge status="partial" />
        </div>
      </Drawer>
    </>
  );
}
