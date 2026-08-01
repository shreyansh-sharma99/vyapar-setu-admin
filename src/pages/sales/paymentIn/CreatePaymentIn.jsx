import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus, IndianRupee, Calendar, RefreshCw } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Select from '@/components/inputs/Select';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { getCustomers } from '../../customer/services/customerSlice';
import { getSalesInvoices } from '../salesInvoices/services/salesInvoiceSlice';
import { recordPaymentIn, resetPaymentInStatus, clearPaymentInToast } from './services/paymentInSlice';
import { CToaster, CToast, CToastBody } from '@coreui/react';

export default function CreatePaymentIn() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { customers, loading: loadingCustomers } = useSelector((state) => state.customer);
  const { invoices, loading: loadingInvoices } = useSelector((state) => state.salesInvoice);
  const { loading: loadingPayment, success, error, toast: reduxToast } = useSelector((state) => state.paymentIn);

  const [toasts, setToasts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reference, setReference] = useState('');
  const [razorpayPaymentId, setRazorpayPaymentId] = useState('');
  const [notes, setNotes] = useState('');

  // Local allocations state: salesInvoiceId -> allocation amount (string)
  const [allocations, setAllocations] = useState({});

  const showToast = (message, color = 'success') => {
    const tid = Date.now();
    setToasts((p) => [...p, { id: tid, message, color }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== tid)), 3500);
  };

  useEffect(() => {
    dispatch(getCustomers({ page: 1, limit: 1000 }));
    dispatch(getSalesInvoices({ limit: 1000 }));
    return () => {
      dispatch(resetPaymentInStatus());
    };
  }, [dispatch]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearPaymentInToast());
    }
  }, [reduxToast, dispatch]);

  useEffect(() => {
    if (success) {
      navigate('/sales/payment-in');
    }
  }, [success, navigate]);

  // Filter outstanding invoices for the selected customer
  const outstandingInvoices = invoices.filter((inv) => {
    const invCustId = inv.customerId?._id || inv.customerId;
    return (
      invCustId === customerId &&
      inv.balanceAmount > 0 &&
      inv.status !== 'voided' &&
      inv.status !== 'draft'
    );
  }).sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate)); // Oldest first

  // Handle customer change
  const handleCustomerChange = (val) => {
    setCustomerId(val);
    setAllocations({});
  };

  // Handle individual allocation input change
  const handleAllocationChange = (invoiceId, val, maxVal) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;
    if (num > maxVal) {
      showToast(`Allocation cannot exceed invoice outstanding balance (₹${maxVal.toFixed(2)})`, 'danger');
      return;
    }

    // Calculate sum of other allocations
    const otherAllocationsSum = Object.entries(allocations).reduce((sum, [id, amt]) => {
      if (id === invoiceId) return sum;
      return sum + (Number(amt) || 0);
    }, 0);

    const totalAmt = Number(amount) || 0;
    if (otherAllocationsSum + num > totalAmt) {
      showToast(`Total allocations cannot exceed payment amount (₹${totalAmt.toFixed(2)})`, 'danger');
      return;
    }

    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  // Automatically allocate payment amount across outstanding invoices (oldest first)
  const handleAutoAllocate = () => {
    const totalAmt = Number(amount) || 0;
    if (totalAmt <= 0) {
      showToast('Please enter a payment amount first.', 'danger');
      return;
    }

    let remaining = totalAmt;
    const newAllocations = {};

    for (const inv of outstandingInvoices) {
      if (remaining <= 0) break;
      const outstanding = inv.balanceAmount || 0;
      const allocate = Math.min(remaining, outstanding);
      if (allocate > 0) {
        newAllocations[inv._id] = allocate.toFixed(2);
        remaining -= allocate;
      }
    }

    setAllocations(newAllocations);
    showToast('Payment amount allocated across outstanding invoices.', 'success');
  };

  // Calculate totals
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const remainingAdvance = Math.max(0, (Number(amount) || 0) - totalAllocated);

  const handleSubmit = (e) => {
    e.preventDefault();

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showToast('Please enter a valid payment amount.', 'danger');
      return;
    }

    if (!customerId) {
      showToast('Please select a customer.', 'danger');
      return;
    }

    // Prepare allocations payload
    const allocationsPayload = Object.entries(allocations)
      .map(([invoiceId, amtStr]) => ({
        salesInvoiceId: invoiceId,
        amount: Number(amtStr) || 0,
      }))
      .filter((alloc) => alloc.amount > 0);

    // Make sure we either target invoices or customerId (which is handled by customerId in root payload)
    const payload = {
      customerId,
      amount: paymentAmount,
      paymentMethod,
      paymentDate,
      reference,
      allocations: allocationsPayload,
      notes,
    };

    if (razorpayPaymentId) {
      payload.razorpayPaymentId = razorpayPaymentId;
    }

    dispatch(recordPaymentIn(payload));
  };

  const customerOptions = customers.map((c) => ({
    label: `${c.firstName} ${c.lastName || ''} (${c.phone || 'No Phone'})`,
    value: c._id,
  }));

  return (
    <div className="w-full flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <CToaster className="p-3" placement="top-end">
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white">
            <CToastBody className="font-medium">{t.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <Card
        h1="Record Payment In"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6"
      >
        {(loadingCustomers || loadingInvoices || loadingPayment) && <Loader />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* Main Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4  pb-3">
            <div className="flex flex-col gap-1">
              <Label>Select Customer <span className="text-red-500">*</span></Label>
              <Select
                value={customerId}
                onChange={handleCustomerChange}
                options={customerOptions}
                placeholder="Choose Customer..."
                error={!customerId}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Payment Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                startIcon={<Calendar className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:!text-white outline-none cursor-pointer focus:border-indigo-500/60 focus:bg-indigo-500/[0.04]"
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="online">Online / Gateway</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Amount Received (₹) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAllocations({}); // Clear allocations if total amount changes
                }}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Reference / UTR ID</Label>
              <Input
                type="text"
                placeholder="e.g. UTR12345678"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Razorpay Payment ID (Gateway Idempotency)</Label>
              <Input
                type="text"
                placeholder="e.g. pay_Nabc123"
                value={razorpayPaymentId}
                onChange={(e) => setRazorpayPaymentId(e.target.value)}
              />
            </div>
          </div>

          {/* Allocation Section */}
          {customerId && (
            <div className=" pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-lg font-bold !text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-blue-500" />
                    Invoice Allocations
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Allocate the received amount across this customer's outstanding invoices.
                  </p>
                </div>
                {outstandingInvoices.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    startIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleAutoAllocate}
                  >
                    Auto Allocate
                  </Button>
                )}
              </div>

              {outstandingInvoices.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                  <IndianRupee className="w-8 h-8 mx-auto text-gray-400 mb-2 opacity-50" />
                  No outstanding invoices found for this customer. <br />The entire payment amount of{' '}
                  <span className="font-bold text-slate-900 dark:text-white">₹{Number(amount || 0).toFixed(2)}</span> will be held as{' '}
                  <span className="font-bold text-amber-500">Unallocated Advance</span>.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                  <table className="w-full border-collapse text-left text-sm text-[var(--vs-text-primary)]">
                    <thead className="bg-blue-600 dark:bg-blue-700 text-white border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider border-x border-blue-500 dark:border-blue-600">Invoice #</th>
                        <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider border-x border-blue-500 dark:border-blue-600">Date</th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-right border-x border-blue-500 dark:border-blue-600 w-44">Invoice Amount</th>
                        <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-right border-x border-blue-500 dark:border-blue-600">Outstanding</th>
                        <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-right border-x border-blue-500 dark:border-blue-600 w-48">Allocated Amt (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-transparent">
                      {outstandingInvoices.map((inv) => {
                        const outstanding = inv.balanceAmount || 0;
                        const allocatedVal = allocations[inv._id] || '';
                        return (
                          <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-white/10">{inv.invoiceNumber}</td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 border-x border-gray-200 dark:border-white/10">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-medium border-x border-gray-200 dark:border-white/10">₹{inv.totalAmount?.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left font-medium text-rose-500 border-x border-gray-200 dark:border-white/10">₹{outstanding.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right border-x border-gray-200 dark:border-white/10">
                              <Input
                                type="number"
                                min="0"
                                max={outstanding}
                                step="0.01"
                                placeholder="0.00"
                                className="!h-9 text-right bg-white dark:bg-black/20 focus:bg-white dark:focus:bg-black/40 transition-colors"
                                value={allocatedVal}
                                onChange={(e) => handleAllocationChange(inv._id, e.target.value, outstanding)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Allocation Summary Footer (integrated into table container) */}
                  <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/10 flex flex-wrap justify-between items-center gap-4 text-sm">
                    <div className="flex gap-8">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Total Amount</span>
                        <p className="text-base font-bold text-gray-900 dark:text-white">₹{Number(amount || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Allocated</span>
                        <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">₹{totalAllocated.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Held as Advance</span>
                        <p className="text-base font-bold text-amber-500">₹{remainingAdvance.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-[280px] text-right">
                      Remaining amount not allocated to invoices will automatically be stored as an advance on the customer's ledger.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <Label>Notes / Remarks</Label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter payment notes..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:!text-white placeholder:text-gray-400 outline-none focus:border-indigo-500/60 focus:bg-indigo-500/[0.04]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 ">
            <Button type="button" variant="outline" onClick={() => navigate('/sales/payment-in')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" startIcon={<Check className="w-4 h-4" />}>
              Save Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
