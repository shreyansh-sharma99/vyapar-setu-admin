import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, Wand2, ShieldAlert, Info } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import TagInput from '@/components/inputs/TagInputs';
import Loader from '@/components/loader/Loader';
import { decryptData } from '@/utility/crypto';
import { getProductByIdApi } from './services/productService';
import { getProductVariants, createProductVariants, clearProductToast } from './services/productSlice';
import ToastStack from './components/ToastStack';
import { computeCustomerPrice, encodeId, formatINR, formatQty, toNumberOr, useToasts } from './utils/productUtils';

const MAX_ATTRIBUTES = 5;
const MAX_ROWS = 100;

const attrKey = (attrs = []) =>
  attrs
    .map((a) => `${String(a.name).trim().toLowerCase()}=${String(a.value).trim().toLowerCase()}`)
    .sort()
    .join('|');

const skuPart = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10);

const cellCls =
  'w-full min-w-[90px] h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-indigo-500';

export default function ProductVariants() {
  const { id: encryptedId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toasts, showToast } = useToasts(5000);
  const id = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;

  const { variants, variantsLoading, variantsSaving, toast: reduxToast } = useSelector((state) => state.product);

  const [parent, setParent] = useState({ id: null, data: null, error: null });
  const [attributes, setAttributes] = useState([
    { name: 'Size', values: [] },
    { name: 'Colour', values: [] },
  ]);
  const [rows, setRows] = useState([]);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    getProductByIdApi(id)
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
        setParent({ id, data: data || null, error: data ? null : 'Product not found' });
      })
      .catch((err) => {
        if (!cancelled) setParent({ id, data: null, error: err?.response?.data?.message || 'Product not found' });
      });
    dispatch(getProductVariants(id));
    return () => {
      cancelled = true;
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (reduxToast) {
      showToast(reduxToast.message, reduxToast.color);
      dispatch(clearProductToast());
    }
  }, [reduxToast, dispatch, showToast]);

  const product = parent.id === id ? parent.data : null;
  const loadingParent = !!id && parent.id !== id;

  const existingKeys = useMemo(
    () => new Set((variants || []).filter((v) => v.variantAttributes?.length).map((v) => attrKey(v.variantAttributes))),
    [variants]
  );

  // Attribute names already used in this group (suggested to keep the group consistent).
  const groupAttributeNames = useMemo(() => {
    const names = new Set();
    (variants || []).forEach((v) => (v.variantAttributes || []).forEach((a) => names.add(a.name)));
    return [...names];
  }, [variants]);

  const updateAttribute = (idx, key, value) =>
    setAttributes((prev) => prev.map((a, i) => (i === idx ? { ...a, [key]: value } : a)));
  const addAttribute = () =>
    setAttributes((prev) => (prev.length >= MAX_ATTRIBUTES ? prev : [...prev, { name: '', values: [] }]));
  const removeAttribute = (idx) => setAttributes((prev) => prev.filter((_, i) => i !== idx));

  const usableAttributes = attributes
    .map((a) => ({
      name: String(a.name || '').trim(),
      values: [...new Set((Array.isArray(a.values) ? a.values : [a.values || '']).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean))],
    }))
    .filter((a) => a.name && a.values.length);

  const comboCount = usableAttributes.length ? usableAttributes.reduce((n, a) => n * a.values.length, 1) : 0;

  const generateRows = () => {
    setFormError(null);
    if (!product) return;
    const names = usableAttributes.map((a) => a.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      setFormError('Each attribute name must be different.');
      return;
    }
    if (!usableAttributes.length) {
      setFormError('Add at least one attribute with values, e.g. Size: S, M, L.');
      return;
    }
    if (comboCount > MAX_ROWS) {
      setFormError(`That makes ${comboCount} variants. You can add up to ${MAX_ROWS} at a time.`);
      return;
    }

    let combos = [[]];
    usableAttributes.forEach((attr) => {
      combos = combos.flatMap((combo) => attr.values.map((value) => [...combo, { name: attr.name, value }]));
    });

    const prevByKey = new Map(rows.map((r) => [r.key, r]));
    const next = combos.map((attrs) => {
      const key = attrKey(attrs);
      if (prevByKey.has(key)) return prevByKey.get(key);
      const values = attrs.map((a) => a.value);
      const exists = existingKeys.has(key);
      return {
        key,
        attributes: attrs,
        exists,
        include: !exists,
        name: `${product.name} - ${values.join(' / ')}`,
        sku: product.sku ? `${product.sku}-${values.map(skuPart).join('-')}`.slice(0, 40) : '',
        barcode: '',
        basePrice: String(product.basePrice ?? ''),
        discountedPrice: toNumberOr(product.discountedPrice, 0) > 0 ? String(product.discountedPrice) : '',
        mrp: toNumberOr(product.mrp, 0) > 0 ? String(product.mrp) : '',
        costPrice: toNumberOr(product.costPrice, 0) > 0 ? String(product.costPrice) : '',
      };
    });
    setRows(next);
  };

  const updateRow = (key, field, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const rowIssue = (r) => {
    if (!r.include || r.exists) return null;
    if (!String(r.name).trim()) return 'Name is required';
    if (r.sku && !/^[A-Za-z0-9._\-/]*$/.test(r.sku)) return 'SKU may contain only letters, numbers, . _ - /';
    const base = toNumberOr(r.basePrice, NaN);
    if (!(base >= 0)) return 'Enter a base price';
    const disc = toNumberOr(r.discountedPrice, 0);
    if (disc > 0 && disc > base) return 'Discount price is above base price';
    const mrp = toNumberOr(r.mrp, 0);
    if (mrp > 0) {
      const customer = computeCustomerPrice({ ...product, basePrice: base, discountedPrice: disc });
      if (customer > mrp + 0.005) return `Selling price ${formatINR(customer)} is above MRP`;
    }
    return null;
  };

  const selectedRows = rows.filter((r) => r.include && !r.exists);
  const issues = rows.map(rowIssue).filter(Boolean);

  const handleSave = async () => {
    setFormError(null);
    if (!selectedRows.length) {
      setFormError('Select at least one new variant to create.');
      return;
    }
    if (issues.length) {
      setFormError('Fix the highlighted rows before saving.');
      return;
    }
    const skus = selectedRows.map((r) => r.sku.trim().toUpperCase()).filter(Boolean);
    if (new Set(skus).size !== skus.length) {
      setFormError('Two variants have the same SKU.');
      return;
    }
    const codes = selectedRows.map((r) => r.barcode.trim()).filter(Boolean);
    if (new Set(codes).size !== codes.length) {
      setFormError('Two variants have the same barcode.');
      return;
    }

    const payload = selectedRows.map((r) => {
      const v = {
        name: r.name.trim(),
        attributes: r.attributes,
        sku: r.sku.trim().toUpperCase(),
        barcode: r.barcode.trim(),
        basePrice: toNumberOr(r.basePrice, 0),
        discountedPrice: toNumberOr(r.discountedPrice, 0),
      };
      if (r.mrp !== '') v.mrp = toNumberOr(r.mrp, 0);
      if (r.costPrice !== '') v.costPrice = toNumberOr(r.costPrice, 0);
      return v;
    });

    const result = await dispatch(createProductVariants({ productId: id, variants: payload }));
    if (createProductVariants.fulfilled.match(result)) {
      setRows([]);
      dispatch(getProductVariants(id));
    } else {
      setFormError(result.payload || 'Failed to create variants.');
    }
  };

  if (loadingParent) {
    return (
      <Card h1="Product Variants" bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--vs-bg-primary)] rounded-2xl border border-[var(--vs-border)] max-w-md mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--vs-text-primary)]">Product Not Found</h2>
        <p className="text-sm text-[var(--vs-text-secondary)] mt-2">{parent.error || 'Invalid product link.'}</p>
        <Button onClick={() => navigate('/products')} className="mt-6">
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        h1="Product Variants"
        description={`Create size, colour or pack versions of “${product.name}”. Other details (category, GST, unit, images) are copied from this product.`}
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6 flex flex-col gap-5"
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)]">
          <span>Base product: <Link to={`/products/view/${encodeId(product._id)}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{product.name}</Link></span>
          <span>SKU: <span className="font-mono text-[var(--vs-text-primary)]">{product.sku || '—'}</span></span>
          <span>Price: <span className="text-[var(--vs-text-primary)]">{formatINR(product.basePrice)}</span></span>
          <span>MRP: <span className="text-[var(--vs-text-primary)]">{toNumberOr(product.mrp, 0) > 0 ? formatINR(product.mrp) : '—'}</span></span>
          <span>Unit: <span className="text-[var(--vs-text-primary)]">{product.unit || 'pcs'}</span></span>
        </div>

        {/* Attribute builder */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[var(--vs-text-primary)] m-0">1. Attributes</h3>
              <p className="text-xs text-[var(--vs-text-secondary)] m-0">
                Type a value and press Enter. Every combination becomes a variant.
                {groupAttributeNames.length > 0 && ` This group already uses: ${groupAttributeNames.join(', ')}.`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={addAttribute}
              disabled={attributes.length >= MAX_ATTRIBUTES}
            >
              Add attribute
            </Button>
          </div>

          {attributes.map((attr, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-3 items-start p-3 rounded-xl border border-[var(--vs-border)]">
              <div>
                <Label className="!mb-1 text-xs">Attribute name</Label>
                <Input value={attr.name} placeholder="e.g. Size" onChange={(e) => updateAttribute(idx, 'name', e.target.value)} />
              </div>
              <div>
                <Label className="!mb-1 text-xs">Values</Label>
                <TagInput value={attr.values} onChange={(vals) => updateAttribute(idx, 'values', vals)} placeholder="Type a value and press Enter (S, M, L)" />
              </div>
              <button
                type="button"
                onClick={() => removeAttribute(idx)}
                className="md:mt-6 h-10 w-10 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                title="Remove attribute"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 flex-wrap">
            <Button startIcon={<Wand2 className="w-4 h-4" />} onClick={generateRows} disabled={!comboCount}>
              Build {comboCount || ''} variant{comboCount === 1 ? '' : 's'}
            </Button>
            {comboCount > 0 && (
              <span className="text-xs text-[var(--vs-text-secondary)]">
                {usableAttributes.map((a) => `${a.values.length} ${a.name}`).join(' × ')} = {comboCount}
              </span>
            )}
          </div>
        </div>

        {/* Rows */}
        {rows.length > 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--vs-text-primary)] m-0">2. Review variants</h3>
              <p className="text-xs text-[var(--vs-text-secondary)] m-0 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Stock starts at 0. Add stock later from Inventory or a purchase.
              </p>
            </div>
            <div className="overflow-x-auto border border-[var(--vs-border)] rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] text-[var(--vs-text-secondary)] font-bold">
                    <th className="py-2.5 px-3 w-10">Add</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Base Price (₹)</th>
                    <th className="py-2.5 px-3">Discount (₹)</th>
                    <th className="py-2.5 px-3">MRP (₹)</th>
                    <th className="py-2.5 px-3">Cost (₹)</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vs-border)]">
                  {rows.map((r) => {
                    const issue = rowIssue(r);
                    return (
                      <tr key={r.key} className={r.exists ? 'opacity-60' : issue ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer"
                            checked={r.include && !r.exists}
                            disabled={r.exists}
                            onChange={(e) => updateRow(r.key, 'include', e.target.checked)}
                          />
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {r.attributes.map((a) => (
                              <span key={a.name} className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 font-semibold">
                                {a.value}
                              </span>
                            ))}
                          </div>
                          {r.exists && <span className="text-[10px] text-[var(--vs-text-secondary)]">Already exists</span>}
                          {issue && <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400">{issue}</span>}
                        </td>
                        <td className="py-2 px-3">
                          <input className={cellCls} value={r.name} disabled={r.exists} onChange={(e) => updateRow(r.key, 'name', e.target.value)} />
                        </td>
                        <td className="py-2 px-3">
                          <input className={`${cellCls} font-mono uppercase`} value={r.sku} disabled={r.exists} onChange={(e) => updateRow(r.key, 'sku', e.target.value)} />
                        </td>
                        <td className="py-2 px-3">
                          <input className={`${cellCls} font-mono`} value={r.barcode} placeholder="Optional" disabled={r.exists} onChange={(e) => updateRow(r.key, 'barcode', e.target.value)} />
                        </td>
                        {['basePrice', 'discountedPrice', 'mrp', 'costPrice'].map((f) => (
                          <td key={f} className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={cellCls}
                              value={r[f]}
                              placeholder={f === 'basePrice' ? '0' : '—'}
                              disabled={r.exists}
                              onChange={(e) => updateRow(r.key, f, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="py-2 px-3">
                          <button type="button" onClick={() => removeRow(r.key)} className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer" title="Remove row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {formError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
            {formError}
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex justify-end gap-3 border-t border-[var(--vs-border)] pt-4">
            <Button variant="outline" onClick={() => setRows([])} disabled={variantsSaving}>
              Clear
            </Button>
            <Button
              onClick={handleSave}
              disabled={variantsSaving || !selectedRows.length}
              startIcon={variantsSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            >
              Create {selectedRows.length} variant{selectedRows.length === 1 ? '' : 's'}
            </Button>
          </div>
        )}
      </Card>

      {/* Existing group */}
      <Card h1="Variants in this group" bodyClassName="p-4 sm:p-5">
        {variantsLoading ? (
          <Loader />
        ) : !variants?.length ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
            This product has no variants yet. When you create the first ones, this product is grouped with them.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--vs-border)] rounded-xl">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] text-[var(--vs-text-secondary)] font-bold">
                  <th className="py-2.5 px-3.5">Product</th>
                  <th className="py-2.5 px-3.5">Attributes</th>
                  <th className="py-2.5 px-3.5">SKU</th>
                  <th className="py-2.5 px-3.5">Barcode</th>
                  <th className="py-2.5 px-3.5 text-right">Price</th>
                  <th className="py-2.5 px-3.5 text-right">MRP</th>
                  <th className="py-2.5 px-3.5 text-right">Stock</th>
                  <th className="py-2.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vs-border)] text-[var(--vs-text-secondary)]">
                {variants.map((v) => (
                  <tr key={v._id} className={String(v._id) === String(product._id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                    <td className="py-2.5 px-3.5">
                      <Link to={`/products/view/${encodeId(v._id)}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        {v.name}
                      </Link>
                      {String(v._id) === String(product._id) && <span className="ml-1.5 text-[10px] font-semibold">(this product)</span>}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {(v.variantAttributes || []).length
                        ? v.variantAttributes.map((a) => `${a.name}: ${a.value}`).join(' · ')
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono">{v.sku || '—'}</td>
                    <td className="py-2.5 px-3.5 font-mono">{v.barcode || '—'}</td>
                    <td className="py-2.5 px-3.5 text-right">
                      {formatINR(toNumberOr(v.discountedPrice, 0) > 0 ? v.discountedPrice : v.basePrice)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">{toNumberOr(v.mrp, 0) > 0 ? formatINR(v.mrp) : '—'}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">{formatQty(v.currentStock)}</td>
                    <td className="py-2.5 px-3.5 capitalize">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} />
    </div>
  );
}
