import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus, Trash2, Save, Send, Store as StoreIcon, AlertTriangle } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import Button from '@/components/inputs/Button';
import Card from '../../../components/breadCrumbs/Card';
import Loader from '@/components/loader/Loader';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Select from '@/components/inputs/Select';
import { CToaster, CToast, CToastBody } from '@coreui/react';
import { getCustomers } from '../../customer/services/customerSlice';
import ProductSearchPicker, { BarcodeScanInput } from '../components/ProductSearchPicker';
import { getProductForLineApi } from '../services/productLookupService';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
import {
  createSalesInvoice,
  updateSalesInvoice,
  getSalesInvoiceById,
  clearCurrentSalesInvoice,
  resetSalesInvoiceStatus,
} from './services/salesInvoiceSlice';

export default function CreateSalesInvoice() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;

  const { currentInvoice, loading: invoiceLoading, success, error } = useSelector((state) => state.salesInvoice);
  const { customers } = useSelector((state) => state.customer);
  const { stores } = useSelector((state) => state.store);

  // Products picked on this invoice (from the async lookup, or loaded for an edited draft),
  // keyed by id. Holds storeStocks so stock per store can be shown without loading the catalogue.
  const [productCache, setProductCache] = useState({});
  const products = Object.values(productCache);
  const cacheProduct = (product) => {
    if (product?._id) setProductCache((prev) => ({ ...prev, [product._id]: product }));
  };

  // Form State
  const [selectedStoreId, setSelectedStoreId] = useState('');
  // Store saved on an edited draft — used to warn when it has since been deactivated.
  const [draftStoreId, setDraftStoreId] = useState('');
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

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [invoiceType, setInvoiceType] = useState('B2C');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [overallDiscountType, setOverallDiscountType] = useState('before_tax');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('none');
  const [notes, setNotes] = useState('Thank you for your business.');
  const [terms, setTerms] = useState('');

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const showToast = (message, color = 'danger') => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  };

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
    dispatch(getStores());
    dispatch(resetSalesInvoiceStatus());

    if (isEditMode) {
      dispatch(getSalesInvoiceById(id));
    }

    return () => {
      dispatch(clearCurrentSalesInvoice());
      dispatch(resetSalesInvoiceStatus());
    };
  }, [dispatch, id, isEditMode]);

  // Selected products across line items
  const selectedProductIds = lineItems
    .map((item) => item.productId)
    .filter(Boolean);

  // Available stores: if product(s) chosen, only show stores where ALL chosen products have stock > 0
  const availableStores = (stores || []).filter((store) => {
    // Inactive stores can never be used for a sale.
    if (store.isActive === false) return false;
    if (selectedProductIds.length === 0) return true;
    return selectedProductIds.every((pId) => {
      const prod = products?.find((p) => p._id === pId);
      // Product details still loading (edited draft) — don't hide stores yet.
      if (!prod) return true;
      if (!prod.storeStocks) return false;
      const entry = prod.storeStocks.find(
        (s) => (s.storeId?._id || s.storeId)?.toString() === store._id.toString()
      );
      return entry && Number(entry.stock) > 0;
    });
  });

  const selectedStore = stores?.find((s) => s._id?.toString() === selectedStoreId?.toString());

  // Draft saved against a store that is now inactive: warn the user (saving is blocked below).
  const inactiveDraftStore = draftStoreId
    ? (stores || []).find((s) => s._id?.toString() === draftStoreId.toString() && s.isActive === false) || null
    : null;
  const showInactiveDraftWarning = !!inactiveDraftStore
    && (!selectedStoreId || selectedStoreId.toString() === draftStoreId.toString());

  // Load product details (incl. stock per store) for lines of an edited invoice.
  const lineProductKey = selectedProductIds.join(',');
  useEffect(() => {
    const missing = [...new Set(lineProductKey.split(',').filter(Boolean))].filter((pid) => !productCache[pid]);
    if (missing.length === 0) return undefined;
    let cancelled = false;
    Promise.all(missing.map((pid) => getProductForLineApi(pid).catch(() => null))).then((rows) => {
      if (cancelled) return;
      setProductCache((prev) => {
        const next = { ...prev };
        rows.filter(Boolean).forEach((p) => { next[p._id] = p; });
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineProductKey]);

  // Automatically deselect store if the chosen product(s) are not available in it
  useEffect(() => {
    if (selectedStoreId && selectedProductIds.length > 0) {
      const isCurrentStoreValid = availableStores.some(
        (s) => s._id.toString() === selectedStoreId.toString()
      );
      if (!isCurrentStoreValid) {
        setSelectedStoreId('');
      }
    }
  }, [selectedProductIds.join(','), stores]);

  // Options for Store <Select />
  const storeOptions = availableStores.map((s) => {
    let stockDetail = '';
    if (selectedProductIds.length === 1) {
      const prod = products?.find((p) => p._id === selectedProductIds[0]);
      const entry = prod?.storeStocks?.find(
        (st) => (st.storeId?._id || st.storeId)?.toString() === s._id.toString()
      );
      if (entry) {
        stockDetail = ` (Stock: ${entry.stock})`;
      }
    }
    return {
      value: s._id,
      label: `${s.name}${s.code ? ` [${s.code}]` : ''}${stockDetail}${s.isDefault ? ' ⭐ Default' : ''}`,
    };
  });

  // Helper to get stock in currently selected store
  const getProductStoreStock = (productId) => {
    if (!productId || !products) return null;
    const prod = products.find((p) => p._id === productId);
    if (!prod) return null;

    if (selectedStoreId && prod.storeStocks && prod.storeStocks.length > 0) {
      const storeEntry = prod.storeStocks.find(
        (s) => (s.storeId?._id || s.storeId)?.toString() === selectedStoreId.toString()
      );
      return {
        available: storeEntry ? Number(storeEntry.stock || 0) : 0,
        storeSpecific: true,
        storeCode: selectedStore?.code || selectedStore?.name || '',
        storeName: selectedStore?.name || '',
        total: prod.currentStock || 0,
      };
    }
    return {
      available: prod.currentStock || 0,
      storeSpecific: false,
      storeCode: '',
      storeName: '',
      total: prod.currentStock || 0,
    };
  };

  // Populate form if in edit mode
  useEffect(() => {
    if (isEditMode && currentInvoice) {
      setSelectedStoreId(currentInvoice.storeId?._id || currentInvoice.storeId || '');
      setDraftStoreId(currentInvoice.storeId?._id || currentInvoice.storeId || '');
      setSelectedCustomerId(currentInvoice.customerId?._id || '');
      setCustomerSnapshot(currentInvoice.customerSnapshot || {
        name: '',
        phone: '',
        email: '',
        gstin: '',
        stateCode: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
      });
      setInvoiceDate(currentInvoice.invoiceDate ? new Date(currentInvoice.invoiceDate).toISOString().split('T')[0] : '');
      setDueDate(currentInvoice.dueDate ? new Date(currentInvoice.dueDate).toISOString().split('T')[0] : '');
      setPlaceOfSupply(currentInvoice.placeOfSupply || '');
      setInvoiceType(currentInvoice.invoiceType || 'B2C');
      setReverseCharge(!!currentInvoice.reverseCharge);
      setOverallDiscountType(currentInvoice.overallDiscountType || 'before_tax');
      setOverallDiscountPercent(currentInvoice.overallDiscountPercent || 0);
      setRoundOff(!!currentInvoice.roundOff);
      setPaymentMethod(currentInvoice.paymentMethod || 'none');
      setNotes(currentInvoice.notes || '');
      setTerms(currentInvoice.terms || '');
      if (currentInvoice.lineItems && currentInvoice.lineItems.length > 0) {
        setLineItems(
          currentInvoice.lineItems.map((item) => ({
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
  }, [currentInvoice, isEditMode]);

  // Redirect on success
  useEffect(() => {
    if (success) {
      dispatch(resetSalesInvoiceStatus());
      navigate('/sales/invoices');
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

  // Line fields taken from a chosen product.
  const productLineFields = (product) => ({
    productId: product._id,
    productName: product.name,
    sku: product.sku || '',
    hsnCode: product.hsnCode || '8471',
    unit: product.unit || 'pcs',
    rate: product.discountedPrice || product.basePrice || 0,
    isGstApplicable: !!product.isGstApplicable,
    taxPercent: product.isGstApplicable ? (product.gstRateOverride || 0) : 0,
    cessPercent: product.cessPercent || 0,
  });

  // Scanned product: fill the first empty row, otherwise add a new row.
  const handleScannedProduct = (product) => {
    cacheProduct(product);
    setLineItems((prev) => {
      const emptyIndex = prev.findIndex((item) => !item.productId);
      if (emptyIndex !== -1) {
        return prev.map((item, i) => (i === emptyIndex ? { ...item, ...productLineFields(product) } : item));
      }
      return [...prev, { qty: 1, discountPercent: 0, ...productLineFields(product) }];
    });
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];

    if (field === 'productId') {
      // `value` is the product object chosen in the picker (or '' to clear the line).
      const product = value && typeof value === 'object' ? value : null;
      if (product) {
        cacheProduct(product);
        updated[index] = {
          ...updated[index],
          ...productLineFields(product),
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

  const handleSaveInvoice = (status = 'draft') => {
    setIsSubmitted(true);
    const hasInvalidCustomerFields = !customerSnapshot.name || !customerSnapshot.phone || !customerSnapshot.billingAddress.pincode;
    const invalidItem = lineItems.find((item) => !item.productId || Number(item.qty) <= 0 || Number(item.rate) < 0);
    const gstin = customerSnapshot.gstin;
    const invalidGstin = gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(gstin);

    if (!selectedStoreId) {
      showToast('Dispatch Store / Warehouse is required. Please select a warehouse.', 'danger');
      return;
    }

    if (selectedStore && selectedStore.isActive === false) {
      showToast(`"${selectedStore.name}" is inactive. Please choose an active store.`, 'danger');
      return;
    }

    if (invalidItem || hasInvalidCustomerFields || invalidGstin) {
      if (invalidItem) {
        showToast('Please select valid products with positive quantity and rate.', 'danger');
      } else if (hasInvalidCustomerFields) {
        showToast('Please fill in required customer details (Name, Phone, Pin Code).', 'danger');
      } else if (invalidGstin) {
        showToast('Please enter a valid 15-character GSTIN.', 'danger');
      }
      return;
    }

    if (status !== 'draft') {
      const outOfStockItem = lineItems.find((item) => {
        if (!item.productId) return false;
        const stockInfo = getProductStoreStock(item.productId);
        return stockInfo && stockInfo.available < Number(item.qty);
      });
      if (outOfStockItem) {
        showToast(
          `Insufficient stock in selected store for "${outOfStockItem.productName}". Available: ${getProductStoreStock(outOfStockItem.productId)?.available || 0}, Required: ${outOfStockItem.qty}`,
          'danger'
        );
        return;
      }
    }

    const payload = {
      storeId: selectedStoreId,
      customerId: selectedCustomerId || null,
      customerSnapshot,
      invoiceDate,
      dueDate: dueDate || null,
      placeOfSupply,
      invoiceType,
      reverseCharge,
      overallDiscountType,
      overallDiscountPercent: Number(overallDiscountPercent),
      roundOff,
      paymentMethod,
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
      dispatch(updateSalesInvoice({ id, payload }));
    } else {
      dispatch(createSalesInvoice(payload));
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

  if (isEditMode && invoiceLoading) {
    return (
      <Card
        h1="Sales Invoice"
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
    <div className="flex flex-col gap-6  mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={isEditMode ? 'Edit Sales Invoice' : 'Create Sales Invoice'}
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
            <Card title="Customer Information" >

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
            <Card title="Terms & Notes" className="flex flex-1 flex-col" >
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
            {/* Invoice Configuration section */}
            <Card title="Details & Summary" >

              <div className="flex flex-col gap-3.5">
                {/* Dispatch Store */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    <StoreIcon className="w-4 h-4" />
                    <span>Dispatch Store / Warehouse <span className="text-red-500">*</span></span>
                  </div>
                  <Select
                    options={storeOptions}
                    value={selectedStoreId}
                    onChange={(val) => setSelectedStoreId(val)}
                    placeholder={
                      selectedProductIds.length > 0
                        ? "Select Warehouse with Stock *"
                        : "Select Store / Warehouse *"
                    }
                    error={isSubmitted && !selectedStoreId}
                  />
                  {isSubmitted && !selectedStoreId && (
                    <div className="text-red-500 text-xs font-medium mt-0.5">
                      Dispatch Store / Warehouse is required.
                    </div>
                  )}
                  {showInactiveDraftWarning && (
                    <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-medium mt-0.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg px-2 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        This draft was saved for &quot;{inactiveDraftStore.name}&quot;, which is now inactive.
                        Please choose an active store before saving.
                      </span>
                    </div>
                  )}
                  {selectedProductIds.length > 0 && availableStores.length === 0 && (
                    <div className="text-amber-600 dark:text-amber-400 text-xs mt-0.5 font-medium">
                      ⚠️ No warehouse currently has all selected product(s) in stock.
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Stock will be deducted from this store upon sale.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
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
                  onClick={() => handleSaveInvoice('unpaid')}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {invoiceLoading ? 'Saving...' : 'Save & Confirm'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-dashed"
                  onClick={() => handleSaveInvoice('draft')}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? (
                    <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {invoiceLoading ? 'Saving...' : 'Save Draft'}
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
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 w-full sm:w-auto">
              <BarcodeScanInput storeId={selectedStoreId} onProduct={handleScannedProduct} />
              <Button type="button" onClick={addLineItem} variant="primary" className="!h-8 px-2.5 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>
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
                        <ProductSearchPicker
                          value={item.productId}
                          selectedLabel={item.productName}
                          storeId={selectedStoreId}
                          onSelect={(product) => handleLineItemChange(idx, 'productId', product)}
                          error={isSubmitted && !item.productId}
                        />
                        {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-1">Product is required</div>}
                        {item.productId && (() => {
                          const stockInfo = getProductStoreStock(item.productId);
                          if (!stockInfo) return null;
                          const isLow = stockInfo.available <= 0;
                          const isInsufficient = Number(item.qty || 0) > stockInfo.available;

                          if (!selectedStoreId) {
                            return (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                                <span>⚠️ Select Warehouse in Details & Summary to view store stock (Total: {stockInfo.total})</span>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span className={`px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 border ${
                                isLow 
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                              }`}>
                                <span className="font-semibold">[{stockInfo.storeCode || 'STORE'}]</span>
                                <span>Remaining Stock: {stockInfo.available} {item.unit || 'units'}</span>
                              </span>
                              {isInsufficient && (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold text-[10px] bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                                  ⚠️ Insufficient Stock
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
                    <ProductSearchPicker
                      value={item.productId}
                      selectedLabel={item.productName}
                      storeId={selectedStoreId}
                      onSelect={(product) => handleLineItemChange(idx, 'productId', product)}
                      error={isSubmitted && !item.productId}
                    />
                    {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-0.5">Product is required</div>}
                    {item.productId && (() => {
                      const stockInfo = getProductStoreStock(item.productId);
                      if (!stockInfo) return null;
                      const isLow = stockInfo.available <= 0;
                      const isInsufficient = Number(item.qty || 0) > stockInfo.available;

                      if (!selectedStoreId) {
                        return (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                            <span>⚠️ Select Warehouse in Details & Summary to view store stock (Total: {stockInfo.total})</span>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 border ${
                            isLow 
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                          }`}>
                            <span className="font-semibold">[{stockInfo.storeCode || 'STORE'}]</span>
                            <span>Remaining Stock: {stockInfo.available} {item.unit || 'units'}</span>
                          </span>
                          {isInsufficient && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold text-[10px] bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                              ⚠️ Insufficient Stock
                            </span>
                          )}
                        </div>
                      );
                    })()}
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

      {/* Toast Notifications */}
      <CToaster className="p-3" style={{ zIndex: 99999, position: 'fixed', bottom: '20px', right: '20px' }}>
        {toasts.map((t) => (
          <CToast key={t.id} visible={true} color={t.color} className="text-white align-items-center mb-2 shadow-lg">
            <div className="d-flex">
              <CToastBody className="flex items-center gap-2 font-semibold">
                {t.message}
              </CToastBody>
            </div>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
