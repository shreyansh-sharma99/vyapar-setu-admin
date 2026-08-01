import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus, Trash2, Save, Send, Calendar, Truck } from 'lucide-react';
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
  createDeliveryChallan,
  updateDeliveryChallan,
  getDeliveryChallanById,
  clearCurrentChallan,
  resetChallanStatus,
} from './services/deliveryChallanSlice';

export default function CreateDeliveryChallan() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!id;

  const { currentChallan, loading: challanLoading, success, error } = useSelector((s) => s.deliveryChallan);
  const { customers, loading: customersLoading } = useSelector((s) => s.customer);
  const { products } = useSelector((s) => s.product);

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSnapshot, setCustomerSnapshot] = useState({
    name: '', phone: '', email: '', gstin: '', stateCode: '',
    billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' }
  });

  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transportMode, setTransportMode] = useState('Road');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [lineItems, setLineItems] = useState([
    { productId: '', productName: '', hsnCode: '', qty: 1 },
  ]);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getCustomers({ page: 1, limit: 1000 }));
    dispatch(getProducts());
    dispatch(resetChallanStatus());
    if (isEditMode) dispatch(getDeliveryChallanById(id));
    return () => { dispatch(clearCurrentChallan()); dispatch(resetChallanStatus()); };
  }, [dispatch, id, isEditMode]);

  useEffect(() => {
    if (isEditMode && currentChallan) {
      if (currentChallan.status !== 'draft') {
        navigate('/sales/delivery-challan', {
          state: { message: 'Only draft delivery challans can be edited.', color: 'warning' }
        });
        return;
      }
      setSelectedCustomerId(currentChallan.customerId?._id || currentChallan.customerId || '');
      setCustomerSnapshot(currentChallan.customerSnapshot || {
        name: '', phone: '', email: '', gstin: '', stateCode: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' }
      });
      setChallanDate(currentChallan.challanDate ? new Date(currentChallan.challanDate).toISOString().split('T')[0] : '');
      setVehicleNumber(currentChallan.vehicleNumber || '');
      setTransportMode(currentChallan.transportMode || 'Road');
      if (currentChallan.lineItems?.length > 0) {
        setLineItems(currentChallan.lineItems.map((item) => ({
          productId: item.productId?._id || item.productId || '',
          productName: item.productName || '',
          hsnCode: item.hsnCode || '',
          qty: item.qty || 1,
        })));
      }
    }
  }, [currentChallan, isEditMode, navigate]);

  useEffect(() => {
    if (success) {
      dispatch(resetChallanStatus());
      navigate('/sales/delivery-challan');
    }
  }, [success, dispatch, navigate]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerSnapshot({
        name: '', phone: '', email: '', gstin: '', stateCode: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' }
      });
      return;
    }
    const customer = customers.find((c) => c._id === customerId);
    if (customer) {
      const addresses = customer.addresses || [];
      const addr = addresses.find((a) => a.isDefault) || addresses[0] || {};
      const snap = {
        name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        phone: customer.phone || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        stateCode: customer.stateCode || '',
        billingAddress: {
          street: addr.street || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          country: addr.country || 'India'
        }
      };
      setCustomerSnapshot(snap);
    }
  };

  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCustomerSnapshot((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, pincode: val }
    }));
    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await res.json();
        if (data?.[0]?.Status === 'Success') {
          const po = data[0].PostOffice[0];
          setCustomerSnapshot((prev) => ({
            ...prev,
            billingAddress: {
              ...prev.billingAddress,
              city: po.District,
              state: po.State
            }
          }));
        }
      } catch { /* silent */ } finally { setPincodeLoading(false); }
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
          hsnCode: product.hsnCode || '8471',
        };
      } else {
        updated[index] = { ...updated[index], productId: '', productName: '', hsnCode: '' };
      }
    } else {
      updated[index][field] = value;
    }
    setLineItems(updated);
  };

  const addLineItem = () => setLineItems([...lineItems, { productId: '', productName: '', hsnCode: '', qty: 1 }]);
  const removeLineItem = (index) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index)); };

  const handleSave = (status = 'draft') => {
    setIsSubmitted(true);
    const hasInvalidCustomer = !customerSnapshot.name || !customerSnapshot.phone;
    const invalidItem = lineItems.find((item) => !item.productId || Number(item.qty) <= 0);
    const gstin = customerSnapshot.gstin;
    const invalidGstin = gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(gstin);

    if (hasInvalidCustomer || invalidItem || invalidGstin) return;

    const payload = {
      customerId: selectedCustomerId || null,
      customerSnapshot,
      challanDate,
      vehicleNumber,
      transportMode,
      status,
      lineItems: lineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        hsnCode: item.hsnCode,
        qty: Number(item.qty),
      })),
    };

    if (isEditMode) {
      dispatch(updateDeliveryChallan({ id, payload }));
    } else {
      dispatch(createDeliveryChallan(payload));
    }
  };

  const customerOptions = [
    { value: '', label: 'Walk-in Customer' },
    ...customers.map((c) => ({ value: c._id, label: `${c.firstName} ${c.lastName || ''} (${c.phone || 'No Phone'})` })),
  ];

  if (isEditMode && challanLoading) {
    return (
      <Card h1="Delivery Challan" buttonName="Back" navigation="-1" buttonVariant="danger" buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 mx-auto text-[var(--vs-text-primary)]">
      <Card
        h1={isEditMode ? 'Edit Delivery Challan' : 'Create Delivery Challan'}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-6 flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left / Main ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
                <div className="font-semibold text-sm">{typeof error === 'string' ? error : 'Validation failed'}</div>
              </div>
            )}

            {/* Customer Information */}
            <Card title="Customer Information" >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Select Customer (or Walk-in)</Label>
                  <Select options={customerOptions} value={selectedCustomerId} onChange={handleCustomerChange} placeholder="Search / Select Customer..." />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Name <span className="text-red-500">*</span></Label>
                  <Input type="text" value={customerSnapshot.name} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, name: e.target.value })} className={isSubmitted && !customerSnapshot.name ? '!border-red-500' : ''} />
                  {isSubmitted && !customerSnapshot.name && <div className="text-red-500 text-xs mt-0.5">Customer Name is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Phone <span className="text-red-500">*</span></Label>
                  <Input type="text" value={customerSnapshot.phone} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, phone: e.target.value })} className={isSubmitted && !customerSnapshot.phone ? '!border-red-500' : ''} />
                  {isSubmitted && !customerSnapshot.phone && <div className="text-red-500 text-xs mt-0.5">Phone is required</div>}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer Email</Label>
                  <Input type="email" value={customerSnapshot.email} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, email: e.target.value })} />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Customer GSTIN</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 29AAPFU0939F1ZV"
                    value={customerSnapshot.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomerSnapshot({ ...customerSnapshot, gstin: val });
                    }}
                    className={isSubmitted && customerSnapshot.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(customerSnapshot.gstin) ? '!border-red-500' : ''}
                  />
                  {isSubmitted && customerSnapshot.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(customerSnapshot.gstin) && (
                    <div className="text-red-500 text-xs mt-0.5">Please enter a valid 15-character GSTIN.</div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Label>State Code</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 29"
                    maxLength={2}
                    value={customerSnapshot.stateCode}
                    onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, stateCode: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Billing Pincode</Label>
                  <div className="relative">
                    <Input type="text" maxLength={6} value={customerSnapshot.billingAddress.pincode} onChange={handlePincodeChange} />
                    {pincodeLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" /></div>}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>City</Label>
                  <Input type="text" value={customerSnapshot.billingAddress.city || ''} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, billingAddress: { ...customerSnapshot.billingAddress, city: e.target.value } })} />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>State</Label>
                  <Input type="text" value={customerSnapshot.billingAddress.state || ''} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, billingAddress: { ...customerSnapshot.billingAddress, state: e.target.value } })} />
                </div>

                <div className="flex flex-col gap-1 ">
                  <Label>Billing Address (Street)</Label>
                  <Input type="text" placeholder="Street details..." value={customerSnapshot.billingAddress.street} onChange={(e) => setCustomerSnapshot({ ...customerSnapshot, billingAddress: { ...customerSnapshot.billingAddress, street: e.target.value } })} />
                </div>
              </div>
            </Card>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="flex flex-col gap-6">
            <Card title="Challan Details" bodyClassName="p-3 flex flex-col gap-4">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <Label>Challan Date</Label>
                  <Input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Vehicle Number</Label>
                  <Input type="text" placeholder="e.g. KA01AB1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Transport Mode</Label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none text-[var(--vs-text-primary)] focus:border-indigo-500/60"
                  >
                    <option value="Road">Road</option>
                    <option value="Air">Air</option>
                    <option value="Rail">Rail</option>
                    <option value="Ship">Ship</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-white/10 pt-4">
                <Button type="button" variant="primary" className="w-full flex items-center justify-center gap-2" onClick={() => handleSave('issued')} disabled={challanLoading}>
                  {challanLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {challanLoading ? 'Saving...' : 'Save & Issue'}
                </Button>
                <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed" onClick={() => handleSave('draft')} disabled={challanLoading}>
                  {challanLoading ? <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {challanLoading ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Line Items ── */}
        <Card title="Line Items" bodyClassName="p-2 flex flex-col gap-4 mt-6" rightNode={
          <Button type="button" onClick={addLineItem} variant="primary" className="!h-8 px-2.5 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
          </Button>
        }>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-300 dark:border-white/20">
            <table className="w-full text-sm border-collapse min-w-[600px]">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 min-w-[350px]">Product <span className="text-red-500">*</span></th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[20%] text-center">HSN Code</th>
                  <th className="py-3 px-3 border-r border-b border-gray-300 dark:border-white/20 w-[20%] text-center">Qty <span className="text-red-500">*</span></th>
                  <th className="py-3 px-3 border-b border-gray-300 dark:border-white/20 w-[10%] text-center"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const isLast = idx === lineItems.length - 1;
                  return (
                    <tr key={idx} className={`${!isLast ? 'border-b border-gray-300 dark:border-white/20' : ''} align-middle hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <select value={item.productId} onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                          className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none text-[var(--vs-text-primary)] focus:ring-2 ${isSubmitted && !item.productId ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-white/10 focus:border-indigo-500/60 focus:ring-indigo-500/20'}`}>
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (<option key={p._id} value={p._id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</option>))}
                        </select>
                        {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-1">Product is required</div>}
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <Input type="text" value={item.hsnCode} onChange={(e) => handleLineItemChange(idx, 'hsnCode', e.target.value)} className="text-center !h-9 !rounded-lg" />
                      </td>
                      <td className="py-2.5 px-3 border-r border-gray-300 dark:border-white/20 align-top">
                        <Input type="number" min="1" value={item.qty} onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))} className={`text-center !h-9 !rounded-lg ${isSubmitted && Number(item.qty) <= 0 ? '!border-red-500' : ''}`} />
                      </td>
                      <td className="py-2.5 px-3 text-center align-top pt-3.5">
                        <button type="button" onClick={() => removeLineItem(idx)} disabled={lineItems.length <= 1}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors mx-auto flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-4 md:hidden">
            {lineItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">Item #{idx + 1}</span>
                  <button type="button" onClick={() => removeLineItem(idx)} disabled={lineItems.length <= 1} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded disabled:opacity-30 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Product <span className="text-red-500">*</span></Label>
                  <select value={item.productId} onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)} className={`w-full rounded-xl border bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none text-[var(--vs-text-primary)] ${isSubmitted && !item.productId ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}>
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
                  </select>
                  {isSubmitted && !item.productId && <div className="text-red-500 text-xs mt-0.5">Product is required</div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1"><Label>HSN Code</Label><Input type="text" value={item.hsnCode} onChange={(e) => handleLineItemChange(idx, 'hsnCode', e.target.value)} /></div>
                  <div className="flex flex-col gap-1"><Label>Qty *</Label><Input type="number" min="1" value={item.qty} onChange={(e) => handleLineItemChange(idx, 'qty', Number(e.target.value))} /></div>
                </div>
              </div>
            ))}
          </div>

          {isSubmitted && lineItems.some((item) => !item.productId || Number(item.qty) <= 0) && (
            <div className="text-red-500 text-sm mt-2 font-medium">Please select a product and enter a valid quantity for all items.</div>
          )}
        </Card>
      </Card>
    </div>
  );
}
