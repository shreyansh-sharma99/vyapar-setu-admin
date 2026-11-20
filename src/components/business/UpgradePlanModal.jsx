import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Check, Crown, Headset, PhoneCall } from 'lucide-react';
import { Alert, Badge, Button, Field, Input, Modal, Segmented, Skeleton, toast } from '@/components/ui';
import { completeUpgradeApi, getBillingPlansApi, getUpgradePreviewApi, startUpgradeApi, talkToSalesApi } from '@/pages/business/services/businessService';
import { payWithRazorpay } from '@/utility/razorpay';
import UpgradeArt from './UpgradeArt';

const rupees = (paise) => `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
const TENURE_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', halfYearly: '6 months', yearly: 'Yearly' };
const PER = { monthly: 'month', quarterly: 'quarter', halfYearly: '6 months', yearly: 'year' };

/** Words for each limit the pop-up can be opened for. */
const COPY = {
  maximumBusinesses: {
    kicker: 'More than one business',
    title: 'Run all your businesses from one login',
    points: ['Separate stock, bills and GST for each business', 'Switch between businesses in one click', 'One login and one plan for all of them'],
    unit: (n) => `business${n === 1 ? '' : 'es'}`,
  },
  maximumProduct: {
    kicker: 'Product limit reached',
    title: 'Add more products to your catalogue',
    points: ['Keep adding products and services', 'Barcodes, batches and stock for every item', 'Everything you have stays as it is'],
    unit: (n) => `product${n === 1 ? '' : 's'}`,
  },
  maximumClients: {
    kicker: 'Customer limit reached',
    title: 'Add more customers',
    points: ['Keep adding customers and their ledgers', 'Reminders and statements for everyone', 'Everything you have stays as it is'],
    unit: (n) => `customer${n === 1 ? '' : 's'}`,
  },
};

const limitText = (v, unit) => (v === null || v === undefined ? `Unlimited ${unit(2)}` : `Up to ${v} ${unit(v)}`);

/**
 * Upgrade pop-up. Left: what the upgrade gives (icon art + points + current use).
 * Right: the recommended plan, billing period, amount due now, then "Upgrade & pay" (Razorpay)
 * and "Talk to Sales" (a call-back ticket). detail: { feature, limit, currentCount } from the server.
 */
export default function UpgradePlanModal({ open, onClose, detail = {} }) {
  const { user } = useSelector((s) => s.auth || {});
  const feature = COPY[detail.feature] ? detail.feature : 'maximumBusinesses';
  const copy = COPY[feature];
  const [billing, setBilling] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [tenure, setTenure] = useState('yearly');
  const [preview, setPreview] = useState(null);
  const [paying, setPaying] = useState(false);
  // fresh each time: UpgradeHost remounts the pop-up per opening
  const [sales, setSales] = useState(() => ({ open: false, phone: user?.business?.phone || user?.phone || '', sent: false, sending: false }));

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getBillingPlansApi().then((b) => {
      if (!alive) return;
      setBilling(b);
      const now = b.plans?.find((p) => p.isCurrent)?.limits?.[feature];
      const better = b.plans?.find((p) => !p.isCurrent && now !== null && (now === undefined || p.limits?.[feature] === null || p.limits?.[feature] > now));
      const pick = (feature === 'maximumBusinesses' && b.recommendedPlanId) || better?._id || null;
      setPlanId(pick);
      const cycles = b.plans?.find((p) => p._id === pick)?.cycles || [];
      setTenure(cycles.some((c) => c.tenure === 'yearly') ? 'yearly' : (cycles[0]?.tenure || 'yearly'));
    }).catch(() => alive && setBilling({ plans: [], payOnline: false }));
    return () => { alive = false; };
  }, [open, feature]);

  const plan = useMemo(() => billing?.plans?.find((p) => p._id === planId) || null, [billing, planId]);
  // Only plans that raise the limit that was hit (null = unlimited)
  const choices = useMemo(() => {
    const plans = billing?.plans || [];
    const now = plans.find((p) => p.isCurrent)?.limits?.[feature];
    const raises = (v) => (now === null ? false : now === undefined || v === null || v > now);
    return plans.filter((p) => !p.isCurrent && raises(p.limits?.[feature]));
  }, [billing, feature]);
  const cycle = plan?.cycles.find((c) => c.tenure === tenure) || plan?.cycles[0];

  useEffect(() => {
    if (!open || !plan || !billing?.payOnline) return undefined;
    let alive = true;
    getUpgradePreviewApi({ planId: plan._id, tenure }).then((p) => alive && setPreview(p)).catch(() => alive && setPreview(null));
    return () => { alive = false; setPreview(null); };
  }, [open, plan, tenure, billing?.payOnline]);

  const used = detail.currentCount ?? billing?.usage?.businesses?.used;
  const limit = detail.limit ?? billing?.usage?.businesses?.limit;
  const due = preview?.proration?.totalDuePaise;

  const pay = async () => {
    setPaying(true);
    try {
      const start = await startUpgradeApi({ planId: plan._id, tenure });
      let payment = {};
      if (start.requiresPayment) {
        payment = await payWithRazorpay({
          keyId: start.razorpayKeyId,
          orderId: start.razorpayOrderId,
          subscriptionId: start.razorpaySubscriptionId,
          amount: start.amount,
          currency: start.currency,
          name: 'ecnbiz',
          description: `${start.planName} · ${TENURE_LABEL[tenure] || tenure}`,
          prefill: { email: user?.email, contact: user?.phone || user?.business?.phone || '' },
        });
      }
      const done = await completeUpgradeApi({ token: start.token, ...payment });
      toast.success(done.message || 'Plan upgraded');
      onClose();
      setTimeout(() => window.location.reload(), 600); // fresh limits everywhere
    } catch (err) {
      if (!err.cancelled) toast.error(err.response?.data?.message || err.message || 'Payment did not go through');
    } finally {
      setPaying(false);
    }
  };

  const sendSales = async () => {
    setSales((s) => ({ ...s, sending: true }));
    try {
      await talkToSalesApi({ phone: sales.phone, planId: plan?._id || '', message: `Asked from the ${copy.kicker.toLowerCase()} pop-up` });
      setSales((s) => ({ ...s, sending: false, sent: true }));
    } catch (err) {
      setSales((s) => ({ ...s, sending: false }));
      toast.error(err.response?.data?.message || 'Could not send your request');
    }
  };

  return (
    <Modal open={open} onClose={() => !paying && onClose()} size="xl" closeOnBackdrop={!paying} bodyClassName="p-0 sm:p-0" className="overflow-hidden">
      <div className="grid md:grid-cols-[1.05fr_1fr]">
        {/* ── What you get ── */}
        <div className="flex flex-col gap-4 bg-brand-soft/60 px-5 pb-6 pt-2 sm:px-7 md:pt-7">
          <UpgradeArt className="mx-auto w-full max-w-[300px]" />
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-ink/80">{copy.kicker}</p>
            <h2 className="m-0 mt-1 !text-xl !font-extrabold leading-snug text-ink">{copy.title}</h2>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {copy.points.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white"><Check className="size-3.5" strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
          {used !== undefined && limit !== undefined && (
            <div className="mt-auto rounded-card bg-surface/80 px-4 py-3 text-sm">
              <span className="font-semibold text-ink">You use {used} of {limit ?? '∞'} {copy.unit(limit ?? 2)}</span>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
                <div className="h-full rounded-full bg-highlight" style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Plan + actions ── */}
        <div className="flex flex-col gap-4 px-5 py-6 sm:px-7">
          {!billing ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-11" /><Skeleton className="h-11" /></div>
          ) : !plan ? (
            <Alert tone="info" title="You're on our biggest plan">Talk to our sales team for a custom plan.</Alert>
          ) : (
            <>
              {choices.length > 1 && (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Plan">
                  {choices.map((p) => (
                    <Button
                      key={p._id}
                      size="sm"
                      role="radio"
                      aria-checked={p._id === planId}
                      variant={p._id === planId ? 'primary' : 'secondary'}
                      className="rounded-full"
                      onClick={() => setPlanId(p._id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              )}
              <div className="relative rounded-card border-2 border-brand/70 p-5 pt-6 text-center">
                {plan._id === billing.recommendedPlanId && (
                  <Badge tone="primary" size="xs" className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface ring-1 ring-brand/40">Recommended for you</Badge>
                )}
                <p className="m-0 flex items-center justify-center gap-1.5 font-bold text-brand-ink"><Crown className="size-4" aria-hidden="true" />{plan.name}</p>
                <p className="m-0 mt-2 text-3xl font-extrabold text-ink">
                  {cycle ? rupees(cycle.totalPrice) : '—'}
                  {cycle && <span className="ml-1 text-sm font-medium text-ink-muted">/ {PER[cycle.tenure] || cycle.tenure}</span>}
                </p>
                <p className="m-0 mt-1 text-sm text-ink-muted">{limitText(plan.limits[feature], copy.unit)}</p>
              </div>
              {plan.cycles.length > 1 && (
                <Segmented
                  fullWidth
                  size="sm"
                  aria-label="Billing period"
                  value={tenure}
                  onChange={setTenure}
                  options={plan.cycles.map((c) => ({ value: c.tenure, label: TENURE_LABEL[c.tenure] || c.tenure }))}
                />
              )}
              {billing.payOnline && (
                <p className="m-0 text-center text-xs text-ink-muted" aria-live="polite">
                  {preview ? (
                    <>Due today <b className="text-ink">{rupees(due)}</b>{preview.proration?.creditAppliedPaise > 0 && <> after {rupees(preview.proration.creditAppliedPaise)} credit for your current plan</>}</>
                  ) : 'Working out the amount…'}
                </p>
              )}
              {billing.payOnline && (
                <Button size="lg" fullWidth loading={paying} onClick={pay} disabled={!cycle}>
                  {due === 0 ? 'Upgrade now' : `Upgrade & pay${due ? ` ${rupees(due)}` : ''}`}
                </Button>
              )}
            </>
          )}

          {billing && (sales.sent ? (
            <Alert tone="success" title="Thanks — we'll call you">Our team will call you on {sales.phone || 'your number'} shortly.</Alert>
          ) : sales.open ? (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3">
              <Field label="Number to call you on">
                <Input value={sales.phone} onChange={(e) => setSales((s) => ({ ...s, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 13) }))} inputMode="tel" startIcon={<PhoneCall />} placeholder="10-digit mobile" />
              </Field>
              <Button variant="secondary" fullWidth loading={sales.sending} onClick={sendSales} disabled={!/^\+?\d{10,12}$/.test(sales.phone)}>Request a call</Button>
            </div>
          ) : (
            <Button variant={billing.payOnline && plan ? 'secondary' : 'primary'} size="lg" fullWidth startIcon={<Headset />} onClick={() => setSales((s) => ({ ...s, open: true }))}>
              Talk to Sales
            </Button>
          ))}
          {billing && !billing.payOnline && <p className="m-0 text-center text-xs text-ink-muted">Online payment isn&apos;t available for your account — our team will help you upgrade.</p>}
        </div>
      </div>
    </Modal>
  );
}
