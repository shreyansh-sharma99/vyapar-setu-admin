import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, ArrowLeft, Loader2, Trash2, Save, Send, Search, UserPlus, UserCheck } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import {
  AddLineBar, Badge, Button, DocumentLayout, Field, FormGrid, Input, Label, LINE_TD, LINE_TH, LineItemsTable, LineRow,
  Section, Segmented, Select, Spinner, Switch, ToastStack, TotalsInput, TotalsPanel, TotalsRow, TotalsToggle, useShortcuts,
} from '@/components/ui';
import ProductSearchPicker, { BarcodeScanInput } from '../components/ProductSearchPicker';
import { getProductForLineApi, lookupCustomersApi, createCustomerQuickApi } from '../services/productLookupService';
import BatchPickerModal from '../components/BatchPickerModal';
import { lookupBillFieldsApi } from '@/pages/Invoices/billFields/services/billFieldService';
import LinePriceNote from '../components/LinePriceNote';
import ServiceLineCard from '../components/ServiceLineCard';
import { NO_BATCH, datedFieldsFromSaved, useDatedSalesLines } from '../components/datedPricing';
import { canChangePrice } from '@/utility/shopPermissions';
import {
  createSalesInvoice,
  updateSalesInvoice,
  getSalesInvoiceById,
  clearCurrentSalesInvoice,
  resetSalesInvoiceStatus,
} from './services/salesInvoiceSlice';

const emptySnapshot = (phone = '') => ({
  name: '',
  phone,
  email: '',
  gstin: '',
  stateCode: '',
  billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
  shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
});

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const digits10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// A product that came with a service sits under that service on the bill.
const isLinkedGoods = (item) => !!item.groupKey && item.itemType !== 'service';
const lineKind = (item) => (item.itemType === 'service' || isLinkedGoods(item) ? 'service' : 'goods');
const newGroupKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blankLine = (itemType) => ({
  itemType,
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
});

export default function CreateSalesInvoice() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;
  const [billFields, setBillFields] = useState([]);
  const [billEdits, setBillEdits] = useState({});

  useEffect(() => {
    let cancelled = false;
    lookupBillFieldsApi().then((rows) => { if (!cancelled) setBillFields(rows); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { currentInvoice, loading: invoiceLoading, success, error } = useSelector((state) => state.salesInvoice);
  const billValue = (key) => billEdits[key] ?? (isEditMode ? (currentInvoice?.customFields || []).find((f) => f.key === key)?.value : '') ?? '';

  // Products picked on this invoice (from the async lookup, or loaded for an edited draft),
  // keyed by id. Holds currentStock so stock can be shown without loading the catalogue.
  const [productCache, setProductCache] = useState({});
  const products = Object.values(productCache);
  const cacheProduct = (product) => {
    if (product?._id) setProductCache((prev) => ({ ...prev, [product._id]: product }));
  };

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSnapshot, setCustomerSnapshot] = useState(() => emptySnapshot());
  // Mobile number first: 'ask' → 'found' (autofilled) | 'notFound' → 'new' (Add customer form)
  const [mobile, setMobile] = useState('');
  const [customerMode, setCustomerMode] = useState('ask');
  const [mobileLoading, setMobileLoading] = useState(false);
  const latestMobile = useRef('');

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [invoiceType, setInvoiceType] = useState('B2C');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [overallDiscountType, setOverallDiscountType] = useState('before_tax');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('none');

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

  const [lineItems, setLineItems] = useState([blankLine('goods'), blankLine('service')]);

  // The server sets price / offer / GST for the invoice date; the rate can be
  // typed only with "Change price while billing" (+ a reason). Products with more than one MRP
  // on the shelf ask "Which MRP?".
  const authUser = useSelector((state) => state.auth.user);
  const mayChangePrice = canChangePrice(authUser);
  const dated = useDatedSalesLines({ lineItems, setLineItems, date: invoiceDate, productCache });
  const viewLines = dated.viewLines;
  const lockRate = !mayChangePrice;

  // Load dependency data
  useEffect(() => {
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

  // Load product details (incl. stock) for lines of an edited invoice.
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

  // Stock of a line's product (single location: the product's stock).
  const getProductStock = (productId) => {
    if (!productId || !products) return null;
    const prod = products.find((p) => p._id === productId);
    if (!prod || prod.itemType === 'service') return null;
    return { available: Number(prod.currentStock || 0), total: Number(prod.currentStock || 0) };
  };

  // Populate form if in edit mode
  useEffect(() => {
    if (isEditMode && currentInvoice) {
      setSelectedCustomerId(currentInvoice.customerId?._id || '');
      setCustomerSnapshot(currentInvoice.customerSnapshot || emptySnapshot());
      setMobile(digits10(currentInvoice.customerSnapshot?.phone));
      latestMobile.current = digits10(currentInvoice.customerSnapshot?.phone);
      setCustomerMode('found');
      setInvoiceDate(currentInvoice.invoiceDate ? new Date(currentInvoice.invoiceDate).toISOString().split('T')[0] : '');
      setDueDate(currentInvoice.dueDate ? new Date(currentInvoice.dueDate).toISOString().split('T')[0] : '');
      setPlaceOfSupply(currentInvoice.placeOfSupply || '');
      setInvoiceType(currentInvoice.invoiceType || 'B2C');
      setReverseCharge(!!currentInvoice.reverseCharge);
      setOverallDiscountType(currentInvoice.overallDiscountType || 'before_tax');
      setOverallDiscountPercent(currentInvoice.overallDiscountPercent || 0);
      setRoundOff(!!currentInvoice.roundOff);
      setPaymentMethod(currentInvoice.paymentMethod || 'none');
      if (currentInvoice.lineItems && currentInvoice.lineItems.length > 0) {
        setLineItems(
          currentInvoice.lineItems.map((item) => ({
            productId: item.productId?._id || item.productId || '',
            productName: item.productName || '',
            itemType: item.itemType || 'goods',
            groupKey: item.groupKey || '',
            includedOnBill: !!item.includedOnBill,
            baseQty: item.groupKey && item.itemType !== 'service'
              ? (item.qty || 1) / (currentInvoice.lineItems.find((l) => l.groupKey === item.groupKey && l.itemType === 'service')?.qty || 1)
              : undefined,
            hsnCode: item.hsnCode || '',
            sku: item.sku || '',
            qty: item.qty || 1,
            unit: item.unit || 'pcs',
            rate: item.rate || 0,
            discountPercent: item.discountPercent || 0,
            isGstApplicable: item.isGstApplicable !== false,
            taxPercent: item.taxPercent || 0,
            cessPercent: item.cessPercent || 0,
            ...datedFieldsFromSaved(item),
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

  // Fills the customer details from a saved customer.
  const applyCustomer = (customer) => {
    setSelectedCustomerId(customer._id);
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

  // Mobile number typed: at 10 digits look it up in the customer list.
  const findCustomer = async (phone) => {
    if (phone.length !== 10) {
      showToast('Enter a 10-digit mobile number.', 'danger');
      return;
    }
    setMobileLoading(true);
    try {
      const rows = await lookupCustomersApi(phone);
      if (latestMobile.current !== phone) return; // the number changed meanwhile
      const match = rows.find((c) => digits10(c.phone) === phone);
      if (match) {
        applyCustomer(match);
        setCustomerMode('found');
      } else {
        setSelectedCustomerId('');
        setCustomerSnapshot(emptySnapshot(phone));
        setInvoiceType('B2C');
        setCustomerMode('notFound');
      }
    } catch {
      showToast('Could not check the mobile number. Please try again.', 'danger');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    latestMobile.current = val;
    if (customerMode !== 'ask') {
      // another number: start again
      setSelectedCustomerId('');
      setCustomerSnapshot(emptySnapshot(val));
      setInvoiceType('B2C');
      setCustomerMode('ask');
    }
    if (val.length === 10) findCustomer(val);
  };

  const startAddCustomer = () => {
    setCustomerSnapshot(emptySnapshot(mobile));
    setCustomerMode('new');
  };

  // New customer (Add customer): saved to the customer list before the invoice.
  const saveNewCustomer = async () => {
    const [firstName, ...rest] = customerSnapshot.name.trim().split(/\s+/);
    const addr = customerSnapshot.billingAddress;
    const gstin = customerSnapshot.gstin;
    const created = await createCustomerQuickApi({
      firstName,
      lastName: rest.join(' '),
      email: customerSnapshot.email.trim(),
      phone: mobile,
      ...(gstin ? { gstin, stateCode: gstin.slice(0, 2) } : {}),
      addresses: [{ type: 'home', street: addr.street || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '', country: addr.country || 'India', isDefault: true }],
    });
    setSelectedCustomerId(created?._id || '');
    setCustomerMode('found');
    return created?._id || null;
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
    itemType: product.itemType || 'goods',
    chargeBy: product.chargeBy || 'fixed',
    priceAtBilling: !!product.priceAtBilling,
    ...(product.itemType === 'service' ? { qty: 1 } : {}),
    sku: product.sku || '',
    hsnCode: product.hsnSacCode || product.hsnCode || '',
    unit: product.unit || 'pcs',
    rate: product.discountedPrice || product.basePrice || 0,
    isGstApplicable: !!product.isGstApplicable,
    taxPercent: product.isGstApplicable ? (product.gstRateOverride || 0) : 0,
    cessPercent: product.cessPercent || 0,
    // a new product: no picked batch, no typed price
    ...NO_BATCH,
    priceOverride: false,
    priceOverrideReason: '',
  });

  // Scanned product: fill the first empty product row, otherwise add a new row.
  const handleScannedProduct = (product) => {
    cacheProduct(product);
    const isEmptyGoods = (item) => !item.productId && lineKind(item) === 'goods';
    const emptyAt = lineItems.findIndex(isEmptyGoods);
    dated.afterProductPicked(emptyAt !== -1 ? emptyAt : lineItems.length, product);
    setLineItems((prev) => {
      const emptyIndex = prev.findIndex(isEmptyGoods);
      if (emptyIndex !== -1) {
        return prev.map((item, i) => (i === emptyIndex ? { ...item, ...productLineFields(product) } : item));
      }
      return [...prev, { qty: 1, discountPercent: 0, ...productLineFields(product) }];
    });
  };

  // The products that come with a service, as their own lines (batch price, removable).
  const addIncludedLines = async (service, groupKey) => {
    const rows = await Promise.all((service.includedItems || []).map(async (inc) => {
      const goods = await getProductForLineApi(inc.productId?._id || inc.productId).catch(() => null);
      if (!goods) return null;
      cacheProduct(goods);
      return { ...blankLine('goods'), ...productLineFields(goods), groupKey, baseQty: inc.qty, qty: inc.qty, unit: inc.unit || goods.unit || 'pcs' };
    }));
    setLineItems((prev) => {
      const at = prev.findIndex((item) => item.groupKey === groupKey && item.itemType === 'service');
      if (at === -1) return prev;
      const next = [...prev];
      next.splice(at + 1, 0, ...rows.filter(Boolean));
      return next;
    });
  };

  const handleLineItemChange = (index, field, value) => {
    // Dated pricing: a typed rate / discount is a manual price (needs a reason).
    if (field === 'rate' || field === 'discountPercent') {
      dated.editPrice(index, field, value);
      return;
    }
    const updated = [...lineItems];

    if (field === 'productId') {
      // `value` is the product object chosen in the picker (or '' to clear the line).
      const product = value && typeof value === 'object' ? value : null;
      const oldKey = updated[index].groupKey;
      if (oldKey) {
        const kept = updated.filter((item) => !(isLinkedGoods(item) && item.groupKey === oldKey));
        updated.length = 0;
        updated.push(...kept);
      }
      if (product) {
        cacheProduct(product);
        const groupKey = product.itemType === 'service' && product.includedItems?.length ? newGroupKey() : '';
        updated[index] = {
          ...updated[index],
          ...productLineFields(product),
          groupKey,
          includedOnBill: !!groupKey,
        };
        dated.afterProductPicked(index, product);
        if (groupKey) addIncludedLines(product, groupKey);
      } else {
        updated[index] = {
          ...updated[index],
          productId: '',
          productName: '',
          sku: '',
          hsnCode: '',
          rate: 0,
          groupKey: '',
          includedOnBill: false,
        };
      }
    } else {
      updated[index][field] = value;
      const { groupKey, itemType } = updated[index];
      if (field === 'qty' && groupKey && itemType === 'service') {
        updated.forEach((item, i) => {
          if (isLinkedGoods(item) && item.groupKey === groupKey) updated[i] = { ...item, qty: item.baseQty * value };
        });
      }
    }
    setLineItems(updated);
  };

  const addLineItem = (kind) => {
    setLineItems([...lineItems, blankLine(kind)]);
  };

  // The last row of a section is emptied, not removed, so the section stays ready to use.
  const removeLineItem = (index) => {
    const target = lineItems[index];
    if (isLinkedGoods(target)) {
      setLineItems(lineItems.filter((_, i) => i !== index));
      return;
    }
    const kind = lineKind(target);
    const siblings = lineItems.filter((item) => lineKind(item) === kind && !isLinkedGoods(item));
    const rest = siblings.length > 1
      ? lineItems.filter((_, i) => i !== index)
      : lineItems.map((item, i) => (i === index ? blankLine(kind) : item));
    setLineItems(target.groupKey ? rest.filter((item) => !(isLinkedGoods(item) && item.groupKey === target.groupKey)) : rest);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    viewLines.forEach((item) => {
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

  const handleSaveInvoice = async (status = 'draft') => {
    setIsSubmitted(true);
    if (customerMode === 'ask' || customerMode === 'notFound') {
      showToast(customerMode === 'ask' ? 'Enter the customer\'s mobile number first.' : 'No customer with this number — click "Add customer".', 'danger');
      return;
    }
    if (customerMode === 'new' && !EMAIL_RE.test(customerSnapshot.email.trim())) {
      showToast('Enter a valid email for the new customer.', 'danger');
      return;
    }
    const hasInvalidCustomerFields = !customerSnapshot.name || !customerSnapshot.phone || !customerSnapshot.billingAddress.pincode;
    // Empty rows are ignored: a bill can be only products, only services, or both.
    const filledLines = viewLines.filter((item) => item.productId);
    const invalidItem = filledLines.find((item) => Number(item.qty) <= 0 || Number(item.rate) < 0);
    const gstin = customerSnapshot.gstin;
    const invalidGstin = gstin && !GSTIN_RE.test(gstin);

    if (filledLines.length === 0 || invalidItem || hasInvalidCustomerFields || invalidGstin) {
      if (filledLines.length === 0) {
        showToast('Add at least one product or service.', 'danger');
      } else if (invalidItem) {
        showToast('Please select valid products with positive quantity and rate.', 'danger');
      } else if (hasInvalidCustomerFields) {
        showToast('Please fill in required customer details (Name, Phone, Pin Code).', 'danger');
      } else if (invalidGstin) {
        showToast('Please enter a valid 15-character GSTIN.', 'danger');
      }
      return;
    }

    const priceProblem = dated.priceProblem();
    if (priceProblem) {
      showToast(priceProblem, 'danger');
      return;
    }

    if (status !== 'draft') {
      const missingField = billFields.find((f) => f.required && !String(billValue(f.key)).trim());
      if (missingField) {
        showToast(`Enter ${missingField.label}`, 'danger');
        return;
      }
      const outOfStockItem = lineItems.find((item) => {
        if (!item.productId) return false;
        const stockInfo = getProductStock(item.productId);
        return stockInfo && stockInfo.available < Number(item.qty);
      });
      if (outOfStockItem) {
        showToast(
          `Insufficient stock for "${outOfStockItem.productName}". Available: ${getProductStock(outOfStockItem.productId)?.available || 0}, Required: ${outOfStockItem.qty}`,
          'danger'
        );
        return;
      }
    }

    let customerId = selectedCustomerId || null;
    if (customerMode === 'new') {
      try {
        customerId = await saveNewCustomer();
      } catch (err) {
        showToast(err?.response?.data?.message || 'Could not save the new customer.', 'danger');
        return;
      }
    }

    const payload = {
      customerId,
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
      customFields: billFields.map((f) => ({ key: f.key, value: billValue(f.key) })),
      lineItems: filledLines.map((item) => ({
        ...dated.payloadExtras(item),
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
        ...(item.groupKey ? { groupKey: item.groupKey } : {}),
        ...(item.includedOnBill ? { includedOnBill: true } : {}),
      })),
    };

    if (isEditMode) {
      dispatch(updateSalesInvoice({ id, payload }));
    } else {
      dispatch(createSalesInvoice(payload));
    }
  };

  const showCustomerForm = customerMode === 'found' || customerMode === 'new';

  useShortcuts({
    F2: () => addLineItem('goods'),
    'mod+s': () => !invoiceLoading && handleSaveInvoice('draft'),
  });

  const header = {
    title: isEditMode ? 'Edit sales invoice' : 'New sales invoice',
    docNo: isEditMode ? currentInvoice?.invoiceNumber || currentInvoice?.invoiceNo : undefined,
  };

  if (isEditMode && invoiceLoading) {
    return (
      <DocumentLayout
        header={{ ...header, actions: <Button variant="secondary" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button> }}
      >
        <Section>
          <div className="flex justify-center py-10"><Spinner label="Loading invoice…" /></div>
        </Section>
      </DocumentLayout>
    );
  }

  const confirmButton = (className) => (
    <Button onClick={() => handleSaveInvoice('unpaid')} loading={invoiceLoading} startIcon={<Send />} className={className}>
      {invoiceLoading ? 'Saving...' : 'Save & Confirm'}
    </Button>
  );

  const stockBadges = (item) => {
    if (!item.productId) return null;
    if (item.itemType === 'service') {
      const included = products?.find((p) => p._id === item.productId)?.includedItems || [];
      if (included.length === 0 || item.includedOnBill) return null;
      return (
        <div className="mt-1.5 text-[11px] text-ink-muted">
          Includes: {included.map((i) => `${i.productId?.name || 'item'} ${i.qty}`).join(', ')}
        </div>
      );
    }
    const stockInfo = getProductStock(item.productId);
    if (!stockInfo) return null;
    const isInsufficient = Number(item.qty || 0) > stockInfo.available;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={stockInfo.available <= 0 ? 'danger' : 'success'}>
          Remaining stock: {stockInfo.available} {item.unit || 'units'}
        </Badge>
        {isInsufficient && <Badge tone="danger" icon={AlertTriangle}>Insufficient stock</Badge>}
      </div>
    );
  };

  const isShort = (item) => {
    const stockInfo = item.productId ? getProductStock(item.productId) : null;
    return !!stockInfo && Number(item.qty || 0) > stockInfo.available;
  };

  const lineTotalOf = (item) => {
    const taxable = Number(item.qty || 0) * Number(item.rate || 0) * (1 - Number(item.discountPercent || 0) / 100);
    return taxable * (1 + Number(item.taxPercent || 0) / 100);
  };

  // Empty rows don't count, so a red mark appears only when the whole bill has no items.
  const noItems = isSubmitted && !viewLines.some((item) => item.productId);
  const hasBadLine = viewLines.some((item) => item.productId && (Number(item.qty) <= 0 || Number(item.rate) < 0));

  // idx stays the line's place in lineItems, so totals and pricing see one list.
  const indexedLines = viewLines.map((item, idx) => ({ item, idx }));
  const serviceKeys = new Set(viewLines.filter((l) => l.itemType === 'service' && l.groupKey).map((l) => l.groupKey));

  const goodsSection = () => {
    const rows = indexedLines.filter(({ item }) => lineKind(item) === 'goods' || (isLinkedGoods(item) && !serviceKeys.has(item.groupKey)));
    return (
      <div className="flex flex-col gap-3">
        {/* Desktop table */}
        {rows.length > 0 && <LineItemsTable
          className="hidden md:block"
          minWidth={760}
          head={
          <tr>
            <th className={`${LINE_TH} w-auto min-w-[260px]`}>Product</th>
            <th className={`${LINE_TH} w-[10%] min-w-[90px] text-right`}>Qty <span className="text-danger">*</span></th>
            <th className={`${LINE_TH} w-[14%] min-w-[110px] text-right`}>Rate (₹) <span className="text-danger">*</span></th>
            <th className={`${LINE_TH} w-[11%] min-w-[90px] text-right`}>Disc (%)</th>
            <th className={`${LINE_TH} w-[8%] min-w-[70px] text-right`}>GST</th>
            <th className={`${LINE_TH} w-[14%] min-w-[110px] text-right`}>Amount (₹)</th>
            <th className={`${LINE_TH} w-[5%] min-w-[44px]`}><span className="sr-only">Remove</span></th>
          </tr>
          }
        >
          {rows.map(({ item, idx }) => (
            <LineRow key={idx} tone={isShort(item) ? 'warning' : undefined}>
              <td className={LINE_TD}>
                <ProductSearchPicker
                  value={item.productId}
                  selectedLabel={item.productName}
                  onSelect={(product) => handleLineItemChange(idx, 'productId', product)}
                  error={noItems}
                  itemType="goods"
                />
                <LinePriceNote
                  line={item}
                  showBatch
                  onChangeBatch={() => dated.changeBatch(idx)}
                  onReason={(r) => dated.setReason(idx, r)}
                  onReset={() => dated.resetPrice(idx)}
                  submitted={isSubmitted}
                />
                {stockBadges(item)}
              </td>
              <td className={LINE_TD}>
                <Input
                  size="sm"
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))}
                  invalid={isSubmitted && Number(item.qty) <= 0}
                  className="text-right tabular-nums"
                />
                {isSubmitted && Number(item.qty) <= 0 && <div className="mt-1 text-right text-xs text-danger">Invalid Qty</div>}
              </td>
              <td className={LINE_TD}>
                <Input
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => handleLineItemChange(idx, 'rate', Number(e.target.value))}
                  readOnly={lockRate}
                  title={lockRate ? 'Price comes from the Price master' : undefined}
                  invalid={isSubmitted && Number(item.rate) < 0}
                  className="text-right tabular-nums"
                />
                {isSubmitted && Number(item.rate) < 0 && <div className="mt-1 text-right text-xs text-danger">Invalid Rate</div>}
              </td>
              <td className={LINE_TD}>
                <Input
                  size="sm"
                  type="number"
                  min="0"
                  max="100"
                  value={item.discountPercent}
                  onChange={(e) => handleLineItemChange(idx, 'discountPercent', Number(e.target.value))}
                  readOnly={lockRate}
                  className="text-right tabular-nums"
                />
              </td>
              <td className={`${LINE_TD} pt-5 text-right font-medium tabular-nums`}>
                {item.isGstApplicable ? `${item.taxPercent}%` : '—'}
              </td>
              <td className={`${LINE_TD} pt-5 text-right font-bold tabular-nums`}>
                {lineTotalOf(item).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className={`${LINE_TD} pt-3.5 text-center`}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove row ${idx + 1}`}
                  onClick={() => removeLineItem(idx)}
                  disabled={rows.length <= 1 && !item.productId}
                  className="hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 />
                </Button>
              </td>
            </LineRow>
          ))}
        </LineItemsTable>}

        {/* Phone: one card per line */}
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map(({ item, idx }) => (
            <div key={idx} className={`flex flex-col gap-3 rounded-control p-4 ${isShort(item) ? 'bg-highlight-soft' : 'bg-surface ring-1 ring-line'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Item #{idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove item ${idx + 1}`}
                  onClick={() => removeLineItem(idx)}
                  disabled={rows.length <= 1 && !item.productId}
                  className="hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="flex flex-col">
                <Label>Product</Label>
                <ProductSearchPicker
                  value={item.productId}
                  selectedLabel={item.productName}
                  onSelect={(product) => handleLineItemChange(idx, 'productId', product)}
                  error={noItems}
                  itemType="goods"
                />
                <LinePriceNote
                  line={item}
                  showBatch
                  onChangeBatch={() => dated.changeBatch(idx)}
                  onReason={(r) => dated.setReason(idx, r)}
                  onReset={() => dated.resetPrice(idx)}
                  submitted={isSubmitted}
                />
                {stockBadges(item)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Qty" required error={isSubmitted && Number(item.qty) <= 0 ? 'Invalid Qty' : undefined}>
                  <Input type="number" min="1" value={item.qty} onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))} />
                </Field>
                <Field label="Rate (₹)" required error={isSubmitted && Number(item.rate) < 0 ? 'Invalid Rate' : undefined}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => handleLineItemChange(idx, 'rate', Number(e.target.value))}
                    readOnly={lockRate}
                    title={lockRate ? 'Price comes from the Price master' : undefined}
                  />
                </Field>
                <Field label="Discount (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discountPercent}
                    onChange={(e) => handleLineItemChange(idx, 'discountPercent', Number(e.target.value))}
                    readOnly={lockRate}
                  />
                </Field>
                <div className="flex flex-col">
                  <Label>GST</Label>
                  <div className="flex h-11 items-center justify-center rounded-control bg-surface text-sm font-medium text-ink">
                    {item.isGstApplicable ? `${item.taxPercent}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
                <span className="text-ink-muted">Line total</span>
                <span className="tabular-nums text-ink">{inr(lineTotalOf(item))}</span>
              </div>
            </div>
          ))}
        </div>

        <AddLineBar onAdd={() => addLineItem('goods')} addLabel="Add product" shortcut="F2">
          <BarcodeScanInput onProduct={handleScannedProduct} itemType="goods" />
        </AddLineBar>
      </div>
    );
  };

  const serviceSection = () => {
    const services = indexedLines.filter(({ item }) => item.itemType === 'service');
    const ctx = {
      dated,
      noItems,
      lockRate,
      submitted: isSubmitted,
      stock: stockBadges,
      stockOf: (item) => getProductStock(item.productId),
      isShort,
      totalOf: lineTotalOf,
      onChange: handleLineItemChange,
      onRemove: removeLineItem,
      chargedByQty: (item) => (item.chargeBy ?? productCache[item.productId]?.chargeBy) === 'quantity',
      freePrice: (item) => (item.priceAtBilling ?? productCache[item.productId]?.priceAtBilling) === true,
    };
    return (
      <div className="flex flex-col gap-3">
        {services.map((row) => (
          <ServiceLineCard
            key={row.idx}
            row={row}
            products={indexedLines.filter(({ item }) => isLinkedGoods(item) && item.groupKey === row.item.groupKey)}
            removable={services.length > 1 || !!row.item.productId}
            ctx={ctx}
          />
        ))}
        <AddLineBar onAdd={() => addLineItem('service')} addLabel="Add service" shortcut="" />
      </div>
    );
  };

  return (
    <DocumentLayout
      header={{
        ...header,
        actions: (
          <>
            <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:inline-flex">
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleSaveInvoice('draft')} loading={invoiceLoading} startIcon={<Save />}>
              {invoiceLoading ? 'Saving...' : 'Save Draft'}
            </Button>
            {confirmButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel
          title="Bill summary"
          total={inr(totals.totalAmount)}
          totalLabel="Grand total"
          note={
            <>
              Terms &amp; notes, design and bank details on the invoice come from{' '}
              <Link to="/sales/invoice-layout" className="font-semibold text-white underline-offset-2 hover:underline">Invoice Layout</Link>.
              {' '}F2 adds a row · Ctrl S saves a draft.
            </>
          }
        >
          <TotalsRow label="Subtotal" value={inr(totals.subtotal)} />
          <TotalsRow label="GST total" value={inr(totals.taxAmount)} />
          <TotalsRow label="Overall discount (%)">
            <TotalsInput
              min="0"
              max="100"
              placeholder="%"
              aria-label="Overall discount percent"
              value={overallDiscountPercent}
              onChange={(e) => setOverallDiscountPercent(Number(e.target.value))}
            />
          </TotalsRow>
          {totals.overallDiscount > 0 && <TotalsRow label="Discount amount" value={`- ${inr(totals.overallDiscount)}`} tone="danger" />}
          <TotalsToggle label="Round off total" checked={roundOff} onChange={setRoundOff} />
        </TotalsPanel>
      }
      mobileBar={{ label: 'Grand total', value: inr(totals.totalAmount), action: confirmButton() }}
    >
      {error && (
        <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-danger">
          <div className="text-sm font-semibold">{error.message || 'Validation failed'}</div>
          {error.errors && error.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {error.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Customer */}
      <Section title="Customer" description="Find the customer by mobile number, or bill a new one.">
        <div className="flex flex-col gap-4">
          <FormGrid cols={2}>
            <div className="flex min-w-0 flex-col">
              <Label htmlFor="si-mobile" required>Customer mobile no.</Label>
              <div className="flex gap-2">
                <Input
                  id="si-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={handleMobileChange}
                  invalid={isSubmitted && mobile.length !== 10}
                  endIcon={mobileLoading ? <Loader2 className="animate-spin text-brand" /> : undefined}
                />
                <Button variant="secondary" onClick={() => findCustomer(mobile)} disabled={mobileLoading} startIcon={<Search />} className="h-11">
                  Find
                </Button>
              </div>
              {customerMode === 'found' && selectedCustomerId && (
                <Badge tone="success" icon={UserCheck} className="mt-2 w-fit">Customer found — details filled in.</Badge>
              )}
              {customerMode === 'new' && (
                <Badge tone="primary" icon={UserPlus} className="mt-2 w-fit">New customer — saved to your customer list with the invoice.</Badge>
              )}
            </div>

            {customerMode === 'notFound' && (
              <div className="flex flex-col justify-end gap-2">
                <div className="text-xs text-ink-muted">No customer with this mobile number.</div>
                <Button onClick={startAddCustomer} startIcon={<UserPlus />} className="w-fit">
                  Add customer
                </Button>
              </div>
            )}
          </FormGrid>

          {showCustomerForm && (
            <FormGrid cols={3}>
              <Field label="Customer name" required error={isSubmitted && !customerSnapshot.name ? 'Customer Name is required' : undefined}>
                <Input
                  value={customerSnapshot.name}
                  onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, name: e.target.value })}
                />
              </Field>
              <Field
                label="Customer email"
                required={customerMode === 'new'}
                error={isSubmitted && customerMode === 'new' && !EMAIL_RE.test(customerSnapshot.email.trim()) ? 'A valid email is required for a new customer' : undefined}
              >
                <Input
                  type="email"
                  value={customerSnapshot.email}
                  onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, email: e.target.value })}
                />
              </Field>
              <Field
                label="Customer GSTIN"
                error={isSubmitted && customerSnapshot.gstin && !GSTIN_RE.test(customerSnapshot.gstin) ? 'Please enter a valid 15-character GSTIN.' : undefined}
              >
                <Input
                  placeholder="e.g. 27AAQCP3629R1ZF"
                  value={customerSnapshot.gstin}
                  className="font-mono uppercase"
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCustomerSnapshot({ ...customerSnapshot, gstin: val });
                    setInvoiceType(val ? 'B2B' : 'B2C');
                  }}
                />
              </Field>
              <Field label="Billing pin code" required error={isSubmitted && !customerSnapshot.billingAddress.pincode ? 'Billing Pin Code is required' : undefined}>
                <Input
                  maxLength={6}
                  inputMode="numeric"
                  value={customerSnapshot.billingAddress.pincode}
                  onChange={handlePincodeChange}
                  endIcon={pincodeLoading ? <Loader2 className="animate-spin text-brand" /> : undefined}
                />
              </Field>
              <Field label="City">
                <Input
                  value={customerSnapshot.billingAddress.city || ''}
                  onChange={(e) =>
                    setCustomerSnapshot({
                      ...customerSnapshot,
                      billingAddress: { ...customerSnapshot.billingAddress, city: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="State">
                <Input
                  value={customerSnapshot.billingAddress.state || ''}
                  onChange={(e) =>
                    setCustomerSnapshot({
                      ...customerSnapshot,
                      billingAddress: { ...customerSnapshot.billingAddress, state: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Billing address (street)" className="col-span-full">
                <Input
                  placeholder="Street details..."
                  value={customerSnapshot.billingAddress.street}
                  onChange={(e) =>
                    setCustomerSnapshot({
                      ...customerSnapshot,
                      billingAddress: { ...customerSnapshot.billingAddress, street: e.target.value },
                    })
                  }
                />
              </Field>
            </FormGrid>
          )}
        </div>
      </Section>

      {/* Invoice details */}
      <Section title="Invoice details">
        <FormGrid cols={3}>
          <Field label="Invoice date" required>
            <Input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Place of supply (state)">
            <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
          </Field>
          <div className="flex min-w-0 flex-col">
            <Label>Invoice type</Label>
            <Segmented
              aria-label="Invoice type"
              value={invoiceType}
              onChange={setInvoiceType}
              options={[{ value: 'B2C', label: 'B2C (Retail)' }, { value: 'B2B', label: 'B2B (Business)' }]}
              className="w-fit"
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <Label>Reverse charge</Label>
            <div className="flex h-11 items-center">
              <Switch checked={reverseCharge} onChange={setReverseCharge} label={reverseCharge ? 'Yes — buyer pays the GST' : 'No'} />
            </div>
          </div>
        </FormGrid>
      </Section>

      {/* Line items */}
      {billFields.length > 0 && (
        <Section title="Bill details">
          <FormGrid cols={3}>
            {billFields.map((f) => (
              <Field key={f.key} label={f.label} required={f.required}>
                {f.type === 'dropdown' ? (
                  <Select options={f.options.map((o) => ({ value: o, label: o }))} value={billValue(f.key)} onChange={(v) => setBillEdits((prev) => ({ ...prev, [f.key]: v || '' }))} placeholder="Select" />
                ) : (
                  <Input
                    type={f.type === 'number' || f.type === 'date' ? f.type : 'text'}
                    value={billValue(f.key)}
                    onChange={(e) => setBillEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </FormGrid>
        </Section>
      )}

      <Section title="Products" description={lockRate ? 'Rates come from the Price master.' : 'Rates are before GST.'} bodyClassName="px-3 sm:px-4">
        {goodsSection()}
      </Section>

      <Section title="Services" description="Fixed-price services are billed once. Products used with a service appear below it at their batch price, and can be removed." bodyClassName="px-3 sm:px-4">
        {serviceSection()}
      </Section>

      {(noItems || (isSubmitted && hasBadLine)) && (
        <div role="alert" className="text-sm font-medium text-danger">
          {noItems ? 'Add at least one product or service.' : 'Please enter valid quantities and rates.'}
        </div>
      )}

      <BatchPickerModal picker={dated.picker} onPick={dated.pickBatch} onClose={dated.closePicker} />

      {/* Toast notifications */}
      <ToastStack toasts={toasts} />
    </DocumentLayout>
  );
}
