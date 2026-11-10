import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Save, Send, Info } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import {
  Button, Checkbox, DocumentLayout, Field, FormGrid, Input, Label, LINE_TD, LINE_TH, LineItemsTable, LineRow,
  PartyCard, Section, Select, Spinner, Textarea, TotalsPanel, TotalsRow, TotalsToggle, useShortcuts,
} from '@/components/ui';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';
import { getSalesInvoiceByIdApi } from '../salesInvoices/services/salesInvoiceService';
import {
  createSalesReturn,
  updateSalesReturn,
  getSalesReturnById,
  clearCurrentReturn,
  resetReturnStatus,
} from './services/salesReturnSlice';

const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
];

/** Good → back to sellable stock; Damaged → damaged stock (not for sale). */
function ConditionSelect({ value, onChange, disabled = false, size = 'md' }) {
  const isDamaged = value === 'damaged';
  return (
    <div title={isDamaged ? 'Goes to damaged stock — not available for sale' : 'Goes back to sellable stock'}>
      <Select
        size={size}
        options={CONDITION_OPTIONS}
        value={isDamaged ? 'damaged' : 'good'}
        onChange={(val) => onChange(val)}
        disabled={disabled}
        searchable={false}
        aria-label="Condition"
        className={isDamaged ? 'bg-danger-soft text-danger' : undefined}
      />
    </div>
  );
}

/** Same per-line maths the table always showed (display only). */
function lineMath(item) {
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);
  const disc = Number(item.discountPercent || 0);
  const gst = Number(item.taxPercent || 0);
  const taxable = qty * rate * (1 - disc / 100);
  const lineTotal = taxable * (1 + gst / 100);
  const hasQtyError = item.included && (qty <= 0 || qty > item.maxQty);
  return { rate, disc, gst, lineTotal, hasQtyError };
}

export default function CreateSalesReturn() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;
  const location = useLocation();
  // Opened with the Return button on an invoice: that invoice is fixed (create mode only).
  const [presetInvoiceId] = useState(() => (isEditMode ? '' : location.state?.invoiceId || ''));
  // Opened from one product on the invoice: that line starts ticked, at its full quantity.
  const [presetLineIndex] = useState(() => (isEditMode ? -1 : location.state?.lineIndex ?? -1));

  const { currentReturn, loading: returnLoading, success, error } = useSelector((s) => s.salesReturn);
  const { invoices } = useSelector((s) => s.salesInvoice);

  // ─── Local State ─────────────────────────────────────────────────────────────
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(presetInvoiceId);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundOff, setRoundOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  // one click = one return: a key made once for this form, buttons locked from the first click
  const [requestKey] = useState(() => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  // Line items state:
  // Each contains: { productId, productName, hsnCode, qty, rate, discountPercent, taxPercent, returnReason, maxQty, included }
  const [lineItems, setLineItems] = useState([]);

  // ─── Load Initial Dependencies ──────────────────────────────────────────────
  useEffect(() => {
    // only invoices still inside the return window (Settings → Sales return days)
    dispatch(getSalesInvoices({ limit: 1000, returnable: true }));
    dispatch(resetReturnStatus());
    if (isEditMode) {
      dispatch(getSalesReturnById(id));
    }
    return () => {
      dispatch(clearCurrentReturn());
      dispatch(resetReturnStatus());
    };
  }, [dispatch, id, isEditMode]);

  // ─── Populate Form in Edit Mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && currentReturn) {
      if (currentReturn.status !== 'draft') {
        navigate('/sales/return', {
          state: { message: 'Only draft sales returns can be edited.', color: 'warning' }
        });
        return;
      }
      setReturnDate(currentReturn.returnDate ? new Date(currentReturn.returnDate).toISOString().split('T')[0] : '');
      setRoundOff(!!currentReturn.roundOff);
      setNotes(currentReturn.notes || '');
      setSelectedInvoiceId(currentReturn.salesInvoiceId?._id || currentReturn.salesInvoiceId || '');

      // Load invoice detail to know the max returnable quantities
      fetchInvoiceDetails(currentReturn.salesInvoiceId?._id || currentReturn.salesInvoiceId, currentReturn.lineItems);
    }
  }, [currentReturn, isEditMode, navigate]);

  // ─── Pre-filled from an invoice (Return button on the invoice page) ─────────
  useEffect(() => {
    if (presetInvoiceId) fetchInvoiceDetails(presetInvoiceId);
    // Runs once for the invoice passed in the navigation state.
  }, [presetInvoiceId]);

  // ─── Navigation on Success ──────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      dispatch(resetReturnStatus());
      navigate('/sales/return');
    }
  }, [success, dispatch, navigate]);

  // ─── Fetch Invoice Helper ───────────────────────────────────────────────────
  const fetchInvoiceDetails = async (invoiceId, editLineItems = null) => {
    if (!invoiceId) {
      setSelectedInvoice(null);
      setLineItems([]);
      return;
    }
    setInvoiceLoading(true);
    try {
      const response = await getSalesInvoiceByIdApi(invoiceId);
      const invoice = response?.data;
      setSelectedInvoice(invoice);

      if (invoice) {
        // If editing, map backend return lineItems with matching invoice lineItem limit
        if (editLineItems) {
          const mapped = editLineItems.map((retItem) => {
            const match = invoice.lineItems?.find(
              (invItem) => (invItem.productId?._id || invItem.productId) === (retItem.productId?._id || retItem.productId)
            );
            return {
              productId: retItem.productId?._id || retItem.productId || null,
              productName: retItem.productName,
              hsnCode: retItem.hsnCode,
              qty: retItem.qty,
              rate: retItem.rate,
              discountPercent: retItem.discountPercent,
              taxPercent: retItem.taxPercent,
              returnReason: retItem.returnReason || '',
              condition: retItem.condition === 'damaged' ? 'damaged' : 'good',
              maxQty: match ? match.qty : retItem.qty, // Fallback to returned qty if match not found
              included: true,
            };
          });
          setLineItems(mapped);
        } else {
          // Creating mode: pre-fill items with qty 0 and included false
          const presetLine = invoice.lineItems?.[presetLineIndex];
          const mapped = (invoice.lineItems || []).filter((invItem) => invItem.itemType !== 'service').map((invItem) => ({
            productId: invItem.productId?._id || invItem.productId || null,
            productName: invItem.productName,
            hsnCode: invItem.hsnCode,
            qty: invItem === presetLine ? invItem.qty : 1, // Start with 1 returned item by default
            rate: invItem.rate,
            discountPercent: invItem.discountPercent,
            taxPercent: invItem.taxPercent,
            returnReason: '',
            condition: 'good',
            maxQty: invItem.qty,
            included: invItem === presetLine,
          }));
          setLineItems(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch invoice details', err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    fetchInvoiceDetails(invoiceId);
  };

  // ─── Calculation Logic ───────────────────────────────────────────────────────
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    lineItems.forEach((item) => {
      if (!item.included) return;
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discountPercent || 0);
      const gst = Number(item.taxPercent || 0);

      const discAmt = qty * rate * (disc / 100);
      const taxable = qty * rate - discAmt;
      const taxAmt = taxable * (gst / 100);

      subtotal += taxable;
      taxAmount += taxAmt;
    });

    let totalAmount = subtotal + taxAmount;
    if (roundOff) {
      totalAmount = Math.round(totalAmount);
    }

    return {
      subtotal,
      taxAmount,
      totalAmount,
    };
  };

  const totals = calculateTotals();

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const handleSave = (status = 'draft') => {
    if (busyRef.current) return;
    setIsSubmitted(true);
    if (!selectedInvoiceId) return;

    const checkedItems = lineItems.filter((item) => item.included);
    if (checkedItems.length === 0) return;

    const hasInvalidQty = checkedItems.some((item) => Number(item.qty) <= 0 || Number(item.qty) > item.maxQty);
    if (hasInvalidQty) return;

    const payload = {
      salesInvoiceId: selectedInvoiceId,
      returnDate,
      roundOff,
      status,
      notes,
      lineItems: checkedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        hsnCode: item.hsnCode,
        qty: Number(item.qty),
        rate: Number(item.rate),
        discountPercent: Number(item.discountPercent),
        taxPercent: Number(item.taxPercent),
        returnReason: item.returnReason,
        condition: item.condition === 'damaged' ? 'damaged' : 'good',
      })),
    };

    busyRef.current = true;
    setBusy(true);
    const release = (res) => {
      // saved → the page moves on; refused → the user may fix and save again
      if (res?.error) {
        busyRef.current = false;
        setBusy(false);
      }
    };
    if (isEditMode) {
      dispatch(updateSalesReturn({ id, payload })).then(release);
    } else {
      dispatch(createSalesReturn({ ...payload, requestKey })).then(release);
    }
  };

  // Only settled invoices can have returns raised against them
  const returnableInvoices = invoices.filter((inv) =>
    ['unpaid', 'partially_paid', 'paid'].includes(inv.status)
  );

  if (presetInvoiceId && selectedInvoice && !returnableInvoices.some((inv) => inv._id === selectedInvoice._id)) {
    returnableInvoices.push(selectedInvoice);
  }

  const invoiceOptions = [
    { value: '', label: 'Select Sales Invoice...' },
    ...returnableInvoices.map((inv) => ({
      value: inv._id,
      label: `${inv.invoiceNumber} - ${inv.customerSnapshot?.name || 'Walk-in'} (₹${inv.totalAmount?.toFixed(2)})`
    })),
  ];

  useShortcuts({
    'mod+s': () => !returnLoading && !busy && selectedInvoiceId && handleSave('draft'),
  });

  const header = {
    title: isEditMode ? 'Edit Sales Return' : 'Create Sales Return',
    docNo: isEditMode ? currentReturn?.returnNumber : undefined,
  };

  if ((isEditMode && returnLoading) || invoiceLoading) {
    return (
      <DocumentLayout
        header={{ ...header, title: 'Sales Return', actions: <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button> }}
      >
        <Section>
          <div className="flex justify-center py-10"><Spinner /></div>
        </Section>
      </DocumentLayout>
    );
  }

  const approveButton = (className) => (
    <Button
      onClick={() => handleSave('approved')}
      loading={returnLoading}
      disabled={busy || !selectedInvoiceId}
      startIcon={<Send />}
      className={className}
    >
      {returnLoading ? 'Saving...' : 'Save & Approve'}
    </Button>
  );

  const customer = selectedInvoice?.customerSnapshot;
  const customerLine = (label, value) => (
    <div className="min-w-0">
      <span className="font-medium text-ink-muted">{label}:</span> <span className="text-ink">{value}</span>
    </div>
  );

  return (
    <DocumentLayout
      header={{
        ...header,
        actions: (
          <>
            <Button variant="ghost" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave('draft')}
              loading={returnLoading}
              disabled={busy || !selectedInvoiceId}
              startIcon={<Save />}
            >
              {returnLoading ? 'Saving...' : 'Save Draft'}
            </Button>
            {approveButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel title="Return Summary" total={inr(totals.totalAmount)} totalLabel="Total Return Value" note="Ctrl S saves a draft.">
          <TotalsRow label="Subtotal" value={inr(totals.subtotal)} />
          <TotalsRow label="GST Total" value={inr(totals.taxAmount)} />
          <TotalsToggle label="Round Off Amount" checked={roundOff} onChange={setRoundOff} />
        </TotalsPanel>
      }
      mobileBar={{ label: 'Total Return Value', value: inr(totals.totalAmount), action: approveButton() }}
    >
      {error && (
        <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-danger">
          <div className="text-sm font-semibold">{typeof error === 'string' ? error : error.message || 'Validation failed'}</div>
          {error.errors && error.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {error.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Source invoice + customer */}
      <Section title="Sales Invoice Information">
        <div className="flex flex-col gap-4">
          <FormGrid cols={2}>
            <Field
              label="Source Sales Invoice"
              required
              error={isSubmitted && !selectedInvoiceId ? 'Invoice selection is required' : undefined}
              hint={presetInvoiceId && selectedInvoice ? `Return against ${selectedInvoice.invoiceNumber}` : undefined}
            >
              <Select
                options={invoiceOptions}
                value={selectedInvoiceId}
                onChange={handleInvoiceChange}
                disabled={isEditMode || !!presetInvoiceId} // Cannot change invoice in edit mode / when opened from an invoice
                placeholder="Search/Select Invoice..."
                invalid={isSubmitted && !selectedInvoiceId}
              />
            </Field>
            <Field label="Return Date">
              <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </Field>
          </FormGrid>

          {selectedInvoice && (
            <PartyCard name={customer?.name || 'Walk-in'} sub="Customer Details (from Invoice)">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 pt-1 text-sm md:grid-cols-2">
                {customerLine('Phone', customer?.phone || '—')}
                {customerLine('Email', customer?.email || '—')}
                {customerLine('GSTIN', customer?.gstin || '—')}
                {customerLine(
                  'Billing Address',
                  [
                    customer?.billingAddress?.street,
                    customer?.billingAddress?.city,
                    customer?.billingAddress?.state,
                    customer?.billingAddress?.pincode,
                  ].filter(Boolean).join(', ') || '—'
                )}
              </div>
            </PartyCard>
          )}
        </div>
      </Section>

      {/* Line items (prepopulated from the sales invoice) */}
      {selectedInvoiceId && (
        <Section title="Returnable Line Items" bodyClassName="px-3 sm:px-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-control bg-highlight-soft px-3 py-2.5 text-xs text-ink">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Services are not listed: refund them with a Credit Note. Set the <strong>Condition</strong> of each returned item. <strong>Good</strong> items go back into sellable stock.
                {' '}<strong>Damaged</strong> items are moved to damaged stock — they will not be available for sale and can later be
                restored or written off from Inventory → Damaged Stock.
              </span>
            </div>

            {/* Desktop table */}
            <LineItemsTable
              className="hidden md:block"
              minWidth={960}
              head={
                <tr>
                  <th className={`${LINE_TH} w-[6%] text-center`}>Return</th>
                  <th className={`${LINE_TH} w-auto min-w-[180px]`}>Product</th>
                  <th className={`${LINE_TH} w-[9%] text-right`}>Invoiced Qty</th>
                  <th className={`${LINE_TH} w-[11%] text-right`}>Rate (₹)</th>
                  <th className={`${LINE_TH} w-[8%] text-right`}>GST (%)</th>
                  <th className={`${LINE_TH} w-[11%] min-w-[100px] text-right`}>Return Qty</th>
                  <th className={`${LINE_TH} w-[13%] min-w-[130px]`}>Condition</th>
                  <th className={`${LINE_TH} w-[16%] min-w-[150px]`}>Return Reason</th>
                  <th className={`${LINE_TH} w-[11%] text-right`}>Total (₹)</th>
                </tr>
              }
            >
              {lineItems.map((item, idx) => {
                const { rate, disc, gst, lineTotal, hasQtyError } = lineMath(item);
                return (
                  <LineRow key={idx} tone={hasQtyError ? 'warning' : undefined} className={item.included ? undefined : 'opacity-50'}>
                    <td className={`${LINE_TD} pt-5 text-center`}>
                      <Checkbox
                        checked={item.included}
                        onChange={(checked) => handleLineItemChange(idx, 'included', checked)}
                        aria-label={`Return ${item.productName}`}
                      />
                    </td>
                    <td className={`${LINE_TD} pt-4`}>
                      <span className="font-semibold text-ink">{item.productName}</span>
                      {item.hsnCode && <span className="block text-[11px] tabular-nums text-ink-subtle">HSN: {item.hsnCode}</span>}
                    </td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>{item.maxQty}</td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>
                      ₹{rate.toFixed(2)}
                      {disc > 0 && <span className="block text-[11px] font-semibold text-danger">-{disc}% off</span>}
                    </td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>{gst}%</td>
                    <td className={LINE_TD}>
                      <Input
                        size="sm"
                        type="number"
                        min="1"
                        max={item.maxQty}
                        value={item.qty}
                        disabled={!item.included}
                        onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                        invalid={hasQtyError}
                        className="text-right tabular-nums"
                      />
                      {hasQtyError && (
                        <div className="mt-1 text-right text-xs font-semibold text-danger">Qty must be 1 to {item.maxQty}</div>
                      )}
                    </td>
                    <td className={LINE_TD}>
                      <ConditionSelect
                        size="sm"
                        value={item.condition}
                        disabled={!item.included}
                        onChange={(val) => handleLineItemChange(idx, 'condition', val)}
                      />
                    </td>
                    <td className={LINE_TD}>
                      <Input
                        size="sm"
                        placeholder="Reason (e.g. Damaged)"
                        value={item.returnReason}
                        disabled={!item.included}
                        onChange={(e) => handleLineItemChange(idx, 'returnReason', e.target.value)}
                      />
                    </td>
                    <td className={`${LINE_TD} pt-5 text-right font-bold tabular-nums`}>
                      ₹{item.included ? lineTotal.toFixed(2) : '0.00'}
                    </td>
                  </LineRow>
                );
              })}
            </LineItemsTable>

            {/* Phone: one card per line */}
            <div className="flex flex-col gap-3 md:hidden">
              {lineItems.map((item, idx) => {
                const { rate, gst, lineTotal, hasQtyError } = lineMath(item);
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-3 rounded-control p-4 transition-opacity ${hasQtyError ? 'bg-highlight-soft' : 'bg-surface ring-1 ring-line'} ${item.included ? '' : 'opacity-60'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Checkbox
                        checked={item.included}
                        onChange={(checked) => handleLineItemChange(idx, 'included', checked)}
                        label={item.productName}
                      />
                      <span className="shrink-0 text-xs font-semibold text-ink-muted">Max: {item.maxQty}</span>
                    </div>

                    {item.included && (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <Label>Rate (₹)</Label>
                            <div className="text-sm font-semibold tabular-nums text-ink">₹{rate.toFixed(2)}</div>
                          </div>
                          <div className="flex flex-col">
                            <Label>GST (%)</Label>
                            <div className="text-sm font-semibold tabular-nums text-ink">{gst}%</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Return Qty" error={hasQtyError ? `Max ${item.maxQty} allowed` : undefined}>
                            <Input
                              type="number"
                              min="1"
                              max={item.maxQty}
                              value={item.qty}
                              onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                            />
                          </Field>
                          <Field label="Reason">
                            <Input
                              placeholder="Reason"
                              value={item.returnReason}
                              onChange={(e) => handleLineItemChange(idx, 'returnReason', e.target.value)}
                            />
                          </Field>
                        </div>

                        <div className="flex flex-col">
                          <Label>Condition</Label>
                          <ConditionSelect
                            value={item.condition}
                            onChange={(val) => handleLineItemChange(idx, 'condition', val)}
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
                          <span className="text-ink-muted">Line Total:</span>
                          <span className="tabular-nums text-ink">₹{lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isSubmitted && lineItems.filter((i) => i.included).length === 0 && (
              <div role="alert" className="text-sm font-medium text-danger">
                Please select at least one item to return.
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <Field label="Return Notes">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for return, adjustments made, etc..."
          />
        </Field>
      </Section>
    </DocumentLayout>
  );
}
