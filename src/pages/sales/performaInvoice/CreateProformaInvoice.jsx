import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Select from '@/components/inputs/Select';
import { getCustomers } from '../../customer/services/customerSlice';
import { getProducts } from '../../storeManagement/products/services/productSlice';
import {
  createProformaInvoice,
  updateProformaInvoice,
  getProformaInvoiceById,
  clearCurrentProformaInvoice,
  resetProformaInvoiceStatus,
} from './services/proformaInvoiceSlice';

export default function CreateProformaInvoice() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;

  const { currentProformaInvoice, loading: proformaLoading, success, error } = useSelector((state) => state.proformaInvoice);
  const { customers } = useSelector((state) => state.customer);
  const { products } = useSelector((state) => state.product);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSnapshot, setCustomerSnapshot] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    stateCode: '',
    billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
    shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
  });

  const [proformaDate, setProformaDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [invoiceType, setInvoiceType] = useState('B2C');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [overallDiscountType, setOverallDiscountType] = useState('before_tax');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(true);
  const [notes, setNotes] = useState('Thank you for choosing us.');
  const [terms, setTerms] = useState('');

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [lineItems, setLineItems] = useState([
    {
      productId: '',
      productName: '',
      hsnCode: '',
      sku: '',
      qty: 1,
      unit: 'pcs',
      rate: 0,
      discountPercent: 0,
      isGstApplicable: true,
      taxPercent: 18,
      cessPercent: 0,
    },
  ]);

  // Load dependency data
  useEffect(() => {
    dispatch(getCustomers({ page: 1, limit: 1000 }));
    dispatch(getProducts());
    dispatch(resetProformaInvoiceStatus());

    if (isEditMode) {
      dispatch(getProformaInvoiceById(id));
    }

    return () => {
      dispatch(clearCurrentProformaInvoice());
      dispatch(resetProformaInvoiceStatus());
    };
  }, [dispatch, id, isEditMode]);

  // Populate form if in edit mode
  useEffect(() => {
    if (isEditMode && currentProformaInvoice) {
      setSelectedCustomerId(currentProformaInvoice.customerId?._id || '');
      setCustomerSnapshot(currentProformaInvoice.customerSnapshot || {
        name: '',
        phone: '',
        email: '',
        gstin: '',
        stateCode: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
      });
      setProformaDate(currentProformaInvoice.proformaDate ? new Date(currentProformaInvoice.proformaDate).toISOString().split('T')[0] : '');
      setValidUntil(currentProformaInvoice.validUntil ? new Date(currentProformaInvoice.validUntil).toISOString().split('T')[0] : '');
      setPlaceOfSupply(currentProformaInvoice.placeOfSupply || '');
      setInvoiceType(currentProformaInvoice.invoiceType || 'B2C');
      setReverseCharge(!!currentProformaInvoice.reverseCharge);
      setOverallDiscountType(currentProformaInvoice.overallDiscountType || 'before_tax');
      setOverallDiscountPercent(currentProformaInvoice.overallDiscountPercent || 0);
      setRoundOff(!!currentProformaInvoice.roundOff);
      setNotes(currentProformaInvoice.notes || '');
      setTerms(currentProformaInvoice.terms || '');
      if (currentProformaInvoice.lineItems && currentProformaInvoice.lineItems.length > 0) {
        setLineItems(
          currentProformaInvoice.lineItems.map((item) => ({
            productId: item.productId?._id || item.productId || '',
            productName: item.productName || '',
            hsnCode: item.hsnCode || '',
            sku: item.sku || '',
            qty: item.qty || 1,
            unit: item.unit || 'pcs',
            rate: item.rate || 0,
            discountPercent: item.discountPercent || 0,
            isGstApplicable: item.isGstApplicable !== false,
            taxPercent: item.taxPercent || 0,
            cessPercent: item.cessPercent || 0,
          }))
        );
      }
    }
  }, [currentProformaInvoice, isEditMode]);

  // Redirect on success
  useEffect(() => {
    if (success) {
      dispatch(resetProformaInvoiceStatus());
      navigate('/sales/proforma-invoice');
    }
  }, [success, dispatch, navigate]);

  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerSnapshot({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        stateCode: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
      });
      setInvoiceType('B2C');
      return;
    }

    const customer = customers.find((c) => c._id === customerId);
    if (customer) {
      const addresses = customer.addresses || [];
      const primaryAddr = addresses.find((a) => a.isDefault) || addresses[0] || customer.address || {};
      const snap = {
        name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        phone: customer.phone || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        stateCode: customer.stateCode || '',
        billingAddress: {
          street: primaryAddr.street || '',
          city: primaryAddr.city || '',
          state: primaryAddr.state || '',
          pincode: primaryAddr.pincode || '',
          country: primaryAddr.country || 'India',
        },
        shippingAddress: {
          street: primaryAddr.street || '',
          city: primaryAddr.city || '',
          state: primaryAddr.state || '',
          pincode: primaryAddr.pincode || '',
          country: primaryAddr.country || 'India',
        },
      };
      setCustomerSnapshot(snap);
      setInvoiceType(customer.gstin ? 'B2B' : 'B2C');
      if (primaryAddr.state) {
        setPlaceOfSupply(primaryAddr.state);
      }
    }
  };

  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCustomerSnapshot((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, pincode: val },
    }));

    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await response.json();

        if (data && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setCustomerSnapshot((prev) => ({
            ...prev,
            billingAddress: {
              ...prev.billingAddress,
              city: postOffice.District,
              state: postOffice.State,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];

    if (field === 'productId') {
      const product = products.find((p) => p._id === value);
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: product._id,
          productName: product.name,
          sku: product.sku || '',
          hsnCode: product.hsnCode || '8471',
          unit: product.unit || 'pcs',
          rate: product.discountedPrice || product.basePrice || 0,
          isGstApplicable: !!product.isGstApplicable,
          taxPercent: product.isGstApplicable ? (product.gstRateOverride || 0) : 0,
          cessPercent: product.cessPercent || 0,
        };
      } else {
        updated[index] = {
          ...updated[index],
          productId: '',
          productName: '',
          sku: '',
          hsnCode: '',
          rate: 0,
        };
      }
    } else {
      updated[index][field] = value;
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: '',
        productName: '',
        hsnCode: '',
        sku: '',
        qty: 1,
        unit: 'pcs',
        rate: 0,
        discountPercent: 0,
        taxPercent: 18,
        cessPercent: 0,
      },
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    lineItems.forEach((item) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const discountPct = Number(item.discountPercent || 0);
      const taxPct = Number(item.taxPercent || 0);

      const grossValue = qty * rate;
      const discountAmt = grossValue * (discountPct / 100);
      const taxableValue = grossValue - discountAmt;
      const itemTax = taxableValue * (taxPct / 100);

      subtotal += taxableValue;
      taxAmount += itemTax;
    });

    let overallDiscount = 0;
    if (overallDiscountPercent > 0) {
      overallDiscount = subtotal * (Number(overallDiscountPercent) / 100);
    }

    let finalTotal = subtotal + taxAmount - overallDiscount;
    if (roundOff) {
      finalTotal = Math.round(finalTotal);
    }

    return {
      subtotal,
      taxAmount,
      overallDiscount,
      totalAmount: finalTotal,
    };
  };

  const totals = calculateTotals();

  const handleSaveProforma = (status = 'draft') => {
    setIsSubmitted(true);
    const hasInvalidCustomerFields = !customerSnapshot.name || !customerSnapshot.phone || !customerSnapshot.billingAddress.pincode;
    const invalidItem = lineItems.find((item) => !item.productId || Number(item.qty) <= 0 || Number(item.rate) < 0);
    const gstin = customerSnapshot.gstin;
    const invalidGstin = gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(gstin);

    if (invalidItem || hasInvalidCustomerFields || invalidGstin) {
      return;
    }

    const payload = {
      customerId: selectedCustomerId || null,
      customerSnapshot,
      proformaDate,
      validUntil: validUntil || null,
      placeOfSupply,
      invoiceType,
      reverseCharge,
      overallDiscountType,
      overallDiscountPercent: Number(overallDiscountPercent),
      roundOff,
      status,
      notes,
      terms,
      lineItems: lineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        hsnCode: item.hsnCode,
        sku: item.sku,
        qty: Number(item.qty),
        unit: item.unit,
        rate: Number(item.rate),
        discountPercent: Number(item.discountPercent),
        isGstApplicable: !!item.isGstApplicable,
        taxPercent: Number(item.taxPercent),
        cessPercent: Number(item.cessPercent),
      })),
    };

    if (isEditMode) {
      dispatch(updateProformaInvoice({ id, payload }));
    } else {
      dispatch(createProformaInvoice(payload));
    }
  };

  // Map to select options format
  const customerOptions = [
    { value: '', label: 'Walk-in Customer' },
    ...customers.map((c) => ({
      value: c._id,
      label: `${c.firstName} ${c.lastName || ''} (${c.phone || 'No Phone'})`,
    })),
  ];

  if (isEditMode && proformaLoading) {
    return (
      <Card
        h1="Proforma Invoice"
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        <Loader className="mb-4" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={isEditMode ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main form elements */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
                <div className="font-semibold text-sm">{error.message || 'Validation failed'}</div>
                {error.errors && error.errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {error.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            {/* Customer Details section */}
            <Card title="Customer Information" bodyClassName="p-5 flex flex-col gap-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Select Customer (Or leave as Walk-in)</Label>
                  <Select
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                    placeholder="Search/Select Customer..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Name <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    value={customerSnapshot.name}
                    onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, name: e.target.value })}
                    className={`${isSubmitted && !customerSnapshot.name ? '!border-red-500' : ''}`}
                  />
                  {isSubmitted && !customerSnapshot.name && <div className="text-red-500 text-xs mt-0.5">Customer Name is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Phone <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    value={customerSnapshot.phone}
                    onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, phone: e.target.value })}
                    className={`${isSubmitted && !customerSnapshot.phone ? '!border-red-500' : ''}`}
                  />
                  {isSubmitted && !customerSnapshot.phone && <div className="text-red-500 text-xs mt-0.5">Customer Phone is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={customerSnapshot.email}
                    onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, email: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer GSTIN</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 27AAQCP3629R1ZF"
                    value={customerSnapshot.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomerSnapshot({ ...customerSnapshot, gstin: val });
                      setInvoiceType(val ? 'B2B' : 'B2C');
                    }}
                    className={`${isSubmitted && customerSnapshot.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(customerSnapshot.gstin) ? '!border-red-500' : ''}`}
                  />
                  {isSubmitted && customerSnapshot.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(customerSnapshot.gstin) && (
                    <div className="text-red-500 text-xs mt-0.5">Please enter a valid 15-character GSTIN.</div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Billing Pin Code <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={6}
                      value={customerSnapshot.billingAddress.pincode}
                      onChange={handlePincodeChange}
                      className={`${isSubmitted && !customerSnapshot.billingAddress.pincode ? '!border-red-500' : ''}`}
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      </div>
                    )}
                  </div>
                  {isSubmitted && !customerSnapshot.billingAddress.pincode && <div className="text-red-500 text-xs mt-0.5">Billing Pin Code is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>City</Label>
                  <Input
                    type="text"
                    value={customerSnapshot.billingAddress.city || ''}
                    onChange={(e) =>
                      setCustomerSnapshot({
                        ...customerSnapshot,
                        billingAddress: { ...customerSnapshot.billingAddress, city: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>State</Label>
                  <Input
                    type="text"
                    value={customerSnapshot.billingAddress.state || ''}
                    onChange={(e) =>
                      setCustomerSnapshot({
                        ...customerSnapshot,
                        billingAddress: { ...customerSnapshot.billingAddress, state: e.target.value },
                      })
                    }
                  />
                </div>

              </div>
              <div className="">
                <Label>Billing Address (Street)</Label>
                <Input
                  type="text"
                  placeholder="Street details..."
                  value={customerSnapshot.billingAddress.street}
                  onChange={(e) =>
                    setCustomerSnapshot({
                      ...customerSnapshot,
                      billingAddress: { ...customerSnapshot.billingAddress, street: e.target.value },
                    })
                  }
                />
              </div>
            </Card>

            {/* Terms and notes */}
            <Card title="Terms & Notes" className="flex flex-1 flex-col" bodyClassName="px-5 pb-2.5 pt-2.5 flex flex-col gap-3 flex-1">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none resize-none text-[var(--vs-text-primary)] focus:border-indigo-500/60"
                />
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <Label>Terms & Conditions</Label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full h-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none resize-none text-[var(--vs-text-primary)] focus:border-indigo-500/60"
                />
              </div>
            </Card>

          </div>

          {/* Right sidebar form elements */}
          <div className="flex flex-col gap-6">
            {/* Proforma Configuration section */}
            <Card title="Details & Summary" bodyClassName="p-5 flex flex-col gap-4">

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <Label>Proforma Date</Label>
                  <Input
                    type="date"
                    required
                    value={proformaDate}
                    onChange={(e) => setProformaDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Place of Supply (State)</Label>
                  <Input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Invoice Type</Label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none text-[var(--vs-text-primary)]"
                  >
                    <option value="B2C">B2C (Retail)</option>
                    <option value="B2B">B2B (Business)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 mt-1">
                  <span className="text-sm font-semibold">Reverse Charge</span>
                  <input
                    type="checkbox"
                    checked={reverseCharge}
                    onChange={(e) => setReverseCharge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3">
                  <span className="text-sm font-semibold">Round Off Total</span>
                  <input
                    type="checkbox"
                    checked={roundOff}
                    onChange={(e) => setRoundOff(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4 flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>GST Total</span>
                  <span className="font-mono">₹{totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--vs-text-secondary)]">
                  <span>Overall Discount</span>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      value={overallDiscountPercent}
                      onChange={(e) => setOverallDiscountPercent(Number(e.target.value))}
                      className="w-12 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1 py-0.5 text-center text-xs outline-none text-[var(--vs-text-primary)]"
                    />
                    <span>%</span>
                  </div>
                </div>
                {totals.overallDiscount > 0 && (
                  <div className="flex items-center justify-between text-[var(--vs-text-secondary)] text-xs">
                    <span>Discount Amt</span>
                    <span className="text-rose-500 font-mono">-₹{totals.overallDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-3 text-base font-bold text-[var(--vs-text-primary)]">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-white/10 pt-4">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleSaveProforma('sent')}
                  disabled={proformaLoading}
                >
                  {proformaLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {proformaLoading ? 'Saving...' : 'Save & Send'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-dashed"
                  onClick={() => handleSaveProforma('draft')}
                  disabled={proformaLoading}
                >
                  {proformaLoading ? (
                    <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {proformaLoading ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Line items section */}
        <Card
          title="Line Items"
          bodyClassName="p-2 flex flex-col gap-4"
          rightNode={
            <Button type="button" onClick={addLineItem} variant="primary" className="!h-8 px-2.5 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
          }
        >

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-300 dark:border-white/20">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-auto min-w-[250px]">Product <span className="text-red-500">*</span></th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[10%] text-center min-w-[80px]">Qty <span className="text-red-500">*</span></th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[15%] text-center min-w-[100px]">Rate (₹) <span className="text-red-500">*</span></th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[12%] text-center min-w-[100px]">Discount (%)</th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[15%] text-center min-w-[100px]">GST (%)</th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 text-center w-[15%] min-w-[100px]">Total (₹)</th>
                  <th className="py-3 px-3 border-b border-gray-300 dark:border-white/20 w-[5%] text-center min-w-[40px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems && lineItems?.map((item, idx) => {
                  const qty = Number(item.qty || 0);
                  const rate = Number(item.rate || 0);
                  const disc = Number(item.discountPercent || 0);
                  const gst = Number(item.taxPercent || 0);
                  const taxable = qty * rate * (1 - disc / 100);
                  const lineTotal = taxable * (1 + gst / 100);

                  const isLast = idx === lineItems.length - 1;
                  const rowBorder = isLast ? "" : "border-b border-gray-300 dark:border-white/20";

                  return (
                    <tr key={idx} className={`${rowBorder} align-middle hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <select
                          value={item.productId}
                          onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                          className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none text-[var(--vs-text-primary)] focus:ring-2 ${isSubmitted && !item.productId ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-white/10 focus:border-indigo-500/60 focus:ring-indigo-500/20'}`}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} {p.barcode ? `(Barcode: ${p.barcode})` : ''}
                            </option>
                          ))}
                        </select>
                        {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-1">Product is required</div>}
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                          className={`text-center !h-9 !rounded-lg ${isSubmitted && Number(item.qty) <= 0 ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/20' : ''}`}
                        />
                        {isSubmitted && Number(item.qty) <= 0 && <div className="text-red-500 text-xs mt-1 text-center">Invalid Qty</div>}
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleLineItemChange(idx, 'rate', Number(e.target.value))}
                          className={`text-center !h-9 !rounded-lg ${isSubmitted && Number(item.rate) < 0 ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/20' : ''}`}
                        />
                        {isSubmitted && Number(item.rate) < 0 && <div className="text-red-500 text-xs mt-1 text-center">Invalid Rate</div>}
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleLineItemChange(idx, 'discountPercent', Number(e.target.value))}
                          className="text-center !h-9 !rounded-lg"
                        />
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top text-center pt-4 font-medium text-[var(--vs-text-primary)]">
                        {item.isGstApplicable ? `${item.taxPercent}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium align-top pt-4 border-r border-gray-300 dark:border-white/20 text-indigo-600 dark:text-indigo-400">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center align-top pt-3.5">
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          disabled={lineItems.length <= 1}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors mx-auto flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Visible on mobile) */}
          <div className="flex flex-col gap-4 md:hidden">
            {lineItems.map((item, idx) => {
              const qty = Number(item.qty || 0);
              const rate = Number(item.rate || 0);
              const disc = Number(item.discountPercent || 0);
              const gst = Number(item.taxPercent || 0);
              const taxable = qty * rate * (1 - disc / 100);
              const lineTotal = taxable * (1 + gst / 100);

              return (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-white/[0.01] relative flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                      Item #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length <= 1}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Product <span className="text-red-500">*</span></Label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                      className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none text-[var(--vs-text-primary)] ${isSubmitted && !item.productId ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} {p.barcode ? `(${p.barcode})` : ''}
                        </option>
                      ))}
                    </select>
                    {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-0.5">Product is required</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label>Qty <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                        className={`${isSubmitted && Number(item.qty) <= 0 ? '!border-red-500' : ''}`}
                      />
                      {isSubmitted && Number(item.qty) <= 0 && <div className="text-red-500 text-xs mt-0.5">Invalid Qty</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Rate (₹) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(idx, 'rate', Number(e.target.value))}
                        className={`${isSubmitted && Number(item.rate) < 0 ? '!border-red-500' : ''}`}
                      />
                      {isSubmitted && Number(item.rate) < 0 && <div className="text-red-500 text-xs mt-0.5">Invalid Rate</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) => handleLineItemChange(idx, 'discountPercent', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>GST (%)</Label>
                      <div className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50 px-3 py-2.5 text-sm text-[var(--vs-text-primary)] text-center font-medium">
                        {item.isGstApplicable ? `${item.taxPercent}%` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-150 dark:border-white/5 pt-2 mt-1 text-sm font-semibold">
                    <span>Line Total:</span>
                    <span>₹{lineTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {isSubmitted && lineItems.some(item => !item.productId || Number(item.qty) <= 0 || Number(item.rate) < 0) && (
            <div className="text-red-500 text-sm mt-2 font-medium">
              Please fill out all required line items with valid products, quantities, and rates.
            </div>
          )}
        </Card>

      </Card>
    </div>
  );
}
