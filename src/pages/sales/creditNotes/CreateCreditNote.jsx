import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Save, Send, Calendar } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Select from '@/components/inputs/Select';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';
import { getSalesInvoiceByIdApi } from '../salesInvoices/services/salesInvoiceService';
import {
  createCreditNote,
  updateCreditNote,
  getCreditNoteById,
  clearCurrentCreditNote,
  resetCreditNoteStatus,
} from './services/creditNoteSlice';

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

  if ((isEditMode && creditLoading) || invoiceLoading) {
    return (
      <Card h1="Credit Note" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={isEditMode ? 'Edit Credit Note' : 'Create Credit Note'}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left / Main Form ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
                <div className="font-semibold text-sm">{typeof error === 'string' ? error : error.message || 'Validation failed'}</div>
                {error.errors && error.errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {error.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            {/* Invoice Select & Customer Info */}
            <Card title="Sales Invoice Information" bodyClassName="px-4 py-3 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Source Sales Invoice <span className="text-red-500">*</span></Label>
                  <Select
                    options={invoiceOptions}
                    value={selectedInvoiceId}
                    onChange={handleInvoiceChange}
                    disabled={isEditMode}
                    placeholder="Search/Select Invoice..."
                    className={isSubmitted && !selectedInvoiceId ? '!border-red-500' : ''}
                  />
                  {isSubmitted && !selectedInvoiceId && <div className="text-red-500 text-xs mt-0.5">Invoice selection is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Credit Note Date</Label>
                  <Input type="date" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} />
                </div>
              </div>

              {selectedInvoice && (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col gap-2.5 text-sm">
                  <h4 className="font-bold text-xs uppercase tracking-wider !text-blue-600 dark:text-blue-400">Customer Details (from Invoice)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                    <div><span className="text-[var(--vs-text-secondary)] font-medium">Name:</span> {selectedInvoice.customerSnapshot?.name || 'Walk-in'}</div>
                    <div><span className="text-[var(--vs-text-secondary)] font-medium">Phone:</span> {selectedInvoice.customerSnapshot?.phone || '—'}</div>
                    <div><span className="text-[var(--vs-text-secondary)] font-medium">Email:</span> {selectedInvoice.customerSnapshot?.email || '—'}</div>
                    <div><span className="text-[var(--vs-text-secondary)] font-medium">GSTIN:</span> {selectedInvoice.customerSnapshot?.gstin || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[var(--vs-text-secondary)] font-medium">Billing Address:</span>{' '}
                    {[
                      selectedInvoice.customerSnapshot?.billingAddress?.street,
                      selectedInvoice.customerSnapshot?.billingAddress?.city,
                      selectedInvoice.customerSnapshot?.billingAddress?.state,
                      selectedInvoice.customerSnapshot?.billingAddress?.pincode
                    ].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card title="Notes" bodyClassName="px-4 py-3 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label>Credit Note Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for credit note, adjustments made, etc..."
                  className="w-full h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none resize-none text-[var(--vs-text-primary)] focus:border-indigo-500/60"
                />
              </div>
            </Card>

          </div>

          {/* ── Right Summary Sidebar ── */}
          <div className="flex flex-col gap-6">
            <Card title="Credit Note Summary" bodyClassName="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                <span className="text-sm font-semibold">Round Off Amount</span>
                <input
                  type="checkbox"
                  checked={roundOff}
                  onChange={(e) => setRoundOff(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 outline-none cursor-pointer"
                />
              </div>

              {/* Price Calculation */}
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>GST Total</span>
                  <span className="font-mono">₹{totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-3 text-base font-bold text-[var(--vs-text-primary)]">
                  <span>Total Credit Value</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-white/10 pt-4">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleSave('issued')}
                  disabled={creditLoading || !selectedInvoiceId}
                >
                  {creditLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {creditLoading ? 'Saving...' : 'Save & Issue'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-dashed"
                  onClick={() => handleSave('draft')}
                  disabled={creditLoading || !selectedInvoiceId}
                >
                  {creditLoading ? (
                    <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {creditLoading ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </Card>
          </div>

        </div>

        {/* ── Line Items (Prepopulated from Sales Invoice) ── */}
        {selectedInvoiceId && (
          <Card
            title="Creditable Line Items"
            bodyClassName="p-2 flex flex-col gap-4 mt-6"
          >
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-300 dark:border-white/20">
              <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[5%] text-center">Credit</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[35%]">Product</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[10%] text-center">Invoiced Qty</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[15%] text-center">Rate (₹)</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[10%] text-center">Discount (%)</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[10%] text-center">GST (%)</th>
                    <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[12%] text-center">Credit Qty</th>
                    <th className="py-3 px-3 border-b border-gray-300 dark:border-white/20 text-center">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => {
                    const qty = Number(item.qty || 0);
                    const rate = Number(item.rate || 0);
                    const disc = Number(item.discountPercent || 0);
                    const gst = Number(item.taxPercent || 0);
                    const taxable = qty * rate * (1 - disc / 100);
                    const lineTotal = taxable * (1 + gst / 100);

                    const isLast = idx === lineItems.length - 1;
                    const rowBorder = isLast ? '' : 'border-b border-gray-300 dark:border-white/20';

                    const hasQtyError = item.included && (qty <= 0 || qty > item.maxQty);

                    return (
                      <tr key={idx} className={`${rowBorder} align-middle hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors ${!item.included ? 'opacity-50' : ''}`}>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) => handleLineItemChange(idx, 'included', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-middle">
                          <span className="font-semibold text-[var(--vs-text-primary)]">{item.productName}</span>
                          {item.hsnCode && <span className="block text-[10px] text-[var(--vs-text-secondary)] font-mono">HSN: {item.hsnCode}</span>}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 text-center font-mono align-middle">
                          {item.maxQty}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 text-center font-mono align-middle">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 text-center font-mono align-middle">
                          {disc}%
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 text-center font-mono align-middle">
                          {gst}%
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-middle">
                          <Input
                            type="number"
                            min="1"
                            max={item.maxQty}
                            value={item.qty}
                            disabled={!item.included}
                            onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                            className={`text-center !h-9 !rounded-lg ${hasQtyError ? '!border-red-500 focus:!border-red-500' : ''}`}
                          />
                          {hasQtyError && (
                            <div className="text-red-500 text-[10px] mt-1 text-center font-semibold">
                              Qty must be 1 to {item.maxQty}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium align-middle text-indigo-600 dark:text-indigo-400 font-mono">
                          ₹{item.included ? lineTotal.toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="flex flex-col gap-4 md:hidden">
              {lineItems.map((item, idx) => {
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const disc = Number(item.discountPercent || 0);
                const gst = Number(item.taxPercent || 0);
                const taxable = qty * rate * (1 - disc / 100);
                const lineTotal = taxable * (1 + gst / 100);

                const hasQtyError = item.included && (qty <= 0 || qty > item.maxQty);

                return (
                  <div
                    key={idx}
                    className={`border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col gap-3 transition-opacity ${!item.included ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(e) => handleLineItemChange(idx, 'included', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-[var(--vs-text-primary)]">{item.productName}</span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--vs-text-secondary)]">Max: {item.maxQty}</span>
                    </div>

                    {item.included && (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <Label>Rate (₹)</Label>
                            <div className="text-sm font-semibold font-mono mt-1">₹{rate.toFixed(2)}</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label>Disc (%)</Label>
                            <div className="text-sm font-semibold font-mono mt-1">{disc}%</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label>GST (%)</Label>
                            <div className="text-sm font-semibold font-mono mt-1">{gst}%</div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Credit Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.maxQty}
                            value={item.qty}
                            onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                            className={`${hasQtyError ? '!border-red-500' : ''}`}
                          />
                          {hasQtyError && (
                            <div className="text-red-500 text-[10px] mt-0.5">Max {item.maxQty} allowed</div>
                          )}
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-150 dark:border-white/5 pt-2 mt-1 text-sm font-semibold">
                          <span>Line Total:</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isSubmitted && lineItems.filter((i) => i.included).length === 0 && (
              <div className="text-red-500 text-sm mt-2 font-medium">
                Please select at least one item to credit.
              </div>
            )}
          </Card>
        )}
      </Card>
    </div>
  );
}
