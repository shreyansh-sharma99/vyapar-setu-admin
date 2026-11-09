import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import {
  Button, Checkbox, DocumentLayout, Field, FormGrid, Input, Label, LINE_TD, LINE_TH, LineItemsTable, LineRow,
  PartyCard, Section, Select, Spinner, Textarea, TotalsPanel, TotalsRow, TotalsToggle, useShortcuts,
} from '@/components/ui';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';
import { getSalesInvoiceByIdApi } from '../salesInvoices/services/salesInvoiceService';
import {
  createCreditNote,
  updateCreditNote,
  getCreditNoteById,
  clearCurrentCreditNote,
  resetCreditNoteStatus,
} from './services/creditNoteSlice';

const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

export default function CreateCreditNote() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;

  const { currentCreditNote, loading: creditLoading, success, error } = useSelector((s) => s.creditNote);
  const { invoices, loading: invoicesLoading } = useSelector((s) => s.salesInvoice);

  // ─── Local State ─────────────────────────────────────────────────────────────
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundOff, setRoundOff] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Line items state
  // Each contains: { productId, productName, hsnCode, qty, rate, discountPercent, taxPercent, maxQty, included }
  const [lineItems, setLineItems] = useState([]);

  // ─── Load Initial Dependencies ──────────────────────────────────────────────
  useEffect(() => {
    dispatch(getSalesInvoices({ limit: 1000 }));
    dispatch(resetCreditNoteStatus());
    if (isEditMode) {
      dispatch(getCreditNoteById(id));
    }
    return () => {
      dispatch(clearCurrentCreditNote());
      dispatch(resetCreditNoteStatus());
    };
  }, [dispatch, id, isEditMode]);

  // ─── Populate Form in Edit Mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && currentCreditNote) {
      if (currentCreditNote.status !== 'draft') {
        navigate('/sales/credit-note', {
          state: { message: 'Only draft credit notes can be edited.', color: 'warning' }
        });
        return;
      }
      setCreditNoteDate(currentCreditNote.creditNoteDate ? new Date(currentCreditNote.creditNoteDate).toISOString().split('T')[0] : '');
      setRoundOff(!!currentCreditNote.roundOff);
      setNotes(currentCreditNote.notes || '');
      setSelectedInvoiceId(currentCreditNote.salesInvoiceId?._id || currentCreditNote.salesInvoiceId || '');

      // Load invoice details to know the max returnable quantities
      fetchInvoiceDetails(currentCreditNote.salesInvoiceId?._id || currentCreditNote.salesInvoiceId, currentCreditNote.lineItems);
    }
  }, [currentCreditNote, isEditMode, navigate]);

  // ─── Navigation on Success ──────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      dispatch(resetCreditNoteStatus());
      navigate('/sales/credit-note');
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
              maxQty: match ? match.qty : retItem.qty, // Fallback to returned qty if match not found
              included: true,
            };
          });
          setLineItems(mapped);
        } else {
          // Creating mode: pre-fill items with qty 1 and included false by default
          const mapped = (invoice.lineItems || []).map((invItem) => ({
            productId: invItem.productId?._id || invItem.productId || null,
            productName: invItem.productName,
            hsnCode: invItem.hsnCode,
            qty: 1, // Start with 1 credited item by default
            rate: invItem.rate,
            discountPercent: invItem.discountPercent,
            taxPercent: invItem.taxPercent,
            maxQty: invItem.qty,
            included: false,
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
    setIsSubmitted(true);
    if (!selectedInvoiceId) return;

    const checkedItems = lineItems.filter((item) => item.included);
    if (checkedItems.length === 0) return;

    const hasInvalidQty = checkedItems.some((item) => Number(item.qty) <= 0 || Number(item.qty) > item.maxQty);
    if (hasInvalidQty) return;

    const payload = {
      salesInvoiceId: selectedInvoiceId,
      creditNoteDate,
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
      })),
    };

    if (isEditMode) {
      dispatch(updateCreditNote({ id, payload }));
    } else {
      dispatch(createCreditNote(payload));
    }
  };

  // Settled/Unpaid invoices can have credit notes raised
  const creditNotesInvoices = invoices.filter((inv) =>
    ['unpaid', 'partially_paid', 'paid'].includes(inv.status)
  );

  const invoiceOptions = [
    { value: '', label: 'Select Sales Invoice...' },
    ...creditNotesInvoices.map((inv) => ({
      value: inv._id,
      label: `${inv.invoiceNumber} - ${inv.customerSnapshot?.name || 'Walk-in'} (₹${inv.totalAmount?.toFixed(2)})`
    })),
  ];

  useShortcuts({
    'mod+s': () => !creditLoading && selectedInvoiceId && handleSave('draft'),
  });

  const header = {
    title: isEditMode ? 'Edit Credit Note' : 'Create Credit Note',
    docNo: isEditMode ? currentCreditNote?.creditNoteNumber : undefined,
  };

  if ((isEditMode && creditLoading) || invoiceLoading) {
    return (
      <DocumentLayout
        header={{ ...header, title: 'Credit Note', actions: <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button> }}
      >
        <Section>
          <div className="flex justify-center py-10"><Spinner /></div>
        </Section>
      </DocumentLayout>
    );
  }

  const issueButton = (className) => (
    <Button
      onClick={() => handleSave('issued')}
      loading={creditLoading}
      disabled={!selectedInvoiceId}
      startIcon={<Send />}
      className={className}
    >
      {creditLoading ? 'Saving...' : 'Save & Issue'}
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
              loading={creditLoading}
              disabled={!selectedInvoiceId}
              startIcon={<Save />}
            >
              {creditLoading ? 'Saving...' : 'Save Draft'}
            </Button>
            {issueButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel title="Credit Note Summary" total={inr(totals.totalAmount)} totalLabel="Total Credit Value" note="Ctrl S saves a draft.">
          <TotalsRow label="Subtotal" value={inr(totals.subtotal)} />
          <TotalsRow label="GST Total" value={inr(totals.taxAmount)} />
          <TotalsToggle label="Round Off Amount" checked={roundOff} onChange={setRoundOff} />
        </TotalsPanel>
      }
      mobileBar={{ label: 'Total Credit Value', value: inr(totals.totalAmount), action: issueButton() }}
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
            >
              <Select
                options={invoiceOptions}
                value={selectedInvoiceId}
                onChange={handleInvoiceChange}
                disabled={isEditMode}
                placeholder="Search/Select Invoice..."
                invalid={isSubmitted && !selectedInvoiceId}
              />
            </Field>
            <Field label="Credit Note Date">
              <Input type="date" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} />
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
        <Section title="Creditable Line Items" bodyClassName="px-3 sm:px-4">
          <div className="flex flex-col gap-3">
            {/* Desktop table */}
            <LineItemsTable
              className="hidden md:block"
              minWidth={760}
              head={
                <tr>
                  <th className={`${LINE_TH} w-[7%] text-center`}>Credit</th>
                  <th className={`${LINE_TH} w-auto min-w-[200px]`}>Product</th>
                  <th className={`${LINE_TH} w-[10%] text-right`}>Invoiced Qty</th>
                  <th className={`${LINE_TH} w-[12%] text-right`}>Rate (₹)</th>
                  <th className={`${LINE_TH} w-[10%] text-right`}>Discount (%)</th>
                  <th className={`${LINE_TH} w-[9%] text-right`}>GST (%)</th>
                  <th className={`${LINE_TH} w-[12%] min-w-[100px] text-right`}>Credit Qty</th>
                  <th className={`${LINE_TH} w-[12%] text-right`}>Total (₹)</th>
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
                        aria-label={`Credit ${item.productName}`}
                      />
                    </td>
                    <td className={`${LINE_TD} pt-4`}>
                      <span className="font-semibold text-ink">{item.productName}</span>
                      {item.hsnCode && <span className="block text-[11px] tabular-nums text-ink-subtle">HSN: {item.hsnCode}</span>}
                    </td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>{item.maxQty}</td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>₹{rate.toFixed(2)}</td>
                    <td className={`${LINE_TD} pt-5 text-right tabular-nums`}>{disc}%</td>
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
                const { rate, disc, gst, lineTotal, hasQtyError } = lineMath(item);
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
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col">
                            <Label>Rate (₹)</Label>
                            <div className="text-sm font-semibold tabular-nums text-ink">₹{rate.toFixed(2)}</div>
                          </div>
                          <div className="flex flex-col">
                            <Label>Disc (%)</Label>
                            <div className="text-sm font-semibold tabular-nums text-ink">{disc}%</div>
                          </div>
                          <div className="flex flex-col">
                            <Label>GST (%)</Label>
                            <div className="text-sm font-semibold tabular-nums text-ink">{gst}%</div>
                          </div>
                        </div>

                        <Field label="Credit Qty" error={hasQtyError ? `Max ${item.maxQty} allowed` : undefined}>
                          <Input
                            type="number"
                            min="1"
                            max={item.maxQty}
                            value={item.qty}
                            onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                          />
                        </Field>

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
                Please select at least one item to credit.
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <Field label="Credit Note Notes">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for credit note, adjustments made, etc..."
          />
        </Field>
      </Section>
    </DocumentLayout>
  );
}
