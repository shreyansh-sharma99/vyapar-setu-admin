import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Printer, Trash2, AlertTriangle, ScanBarcode, Loader2, Minus, Plus, Tags } from 'lucide-react';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import Select from '@/components/inputs/Select';
import Checkbox from '@/components/inputs/Checkbox';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import { generateBarcodesApi, getProductByIdApi, lookupProductsApi } from './services/productService';
import AsyncSearchSelect from './components/AsyncSearchSelect';
import BarcodeSvg from './components/BarcodeSvg';
import ToastStack from './components/ToastStack';
import { computeCustomerPrice, formatINR, getApiErrorMessage, toNumberOr, useToasts } from './utils/productUtils';

const A4 = { w: 210, h: 297 };
const MAX_LABELS = 3000;
const SETTINGS_KEY = 'vs.barcodeLabels.settings';

const TEMPLATES = [
  { id: 'a4-65', label: 'A4 sheet · 65 labels (38 × 21 mm)', kind: 'sheet', cols: 5, rows: 13, w: 38, h: 21, gapX: 2.5, gapY: 0 },
  { id: 'a4-40', label: 'A4 sheet · 40 labels (48 × 25 mm)', kind: 'sheet', cols: 4, rows: 10, w: 48, h: 25, gapX: 2, gapY: 0 },
  { id: 'a4-24', label: 'A4 sheet · 24 labels (64 × 34 mm)', kind: 'sheet', cols: 3, rows: 8, w: 64, h: 34, gapX: 2.5, gapY: 0 },
  { id: 'roll-50x25', label: 'Thermal roll · 50 × 25 mm', kind: 'roll', w: 50, h: 25 },
  { id: 'roll-38x25', label: 'Thermal roll · 38 × 25 mm', kind: 'roll', w: 38, h: 25 },
];

const FIELD_OPTIONS = [
  { key: 'shop', label: 'Shop name' },
  { key: 'name', label: 'Product name' },
  { key: 'price', label: 'Price' },
  { key: 'mrp', label: 'MRP' },
  { key: 'sku', label: 'SKU' },
];

const DEFAULT_SETTINGS = {
  templateId: 'a4-40',
  fields: { shop: true, name: true, price: true, mrp: true, sku: false },
};

const loadSettings = () => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      templateId: TEMPLATES.some((t) => t.id === parsed.templateId) ? parsed.templateId : DEFAULT_SETTINGS.templateId,
      fields: { ...DEFAULT_SETTINGS.fields, ...(parsed.fields || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const sellingPrice = (p) => (toNumberOr(p.finalPrice, 0) > 0 ? toNumberOr(p.finalPrice, 0) : computeCustomerPrice(p));

const fetchProductOptions = async (query) => {
  const res = await lookupProductsApi(query, 20);
  return (res?.data || []).map((p) => ({
    value: p._id,
    label: p.name,
    sublabel: [p.sku && `SKU ${p.sku}`, p.barcode ? `Barcode ${p.barcode}` : 'No barcode', formatINR(sellingPrice(p))]
      .filter(Boolean)
      .join(' · '),
    raw: p,
  }));
};

const sheetMargins = (t) => ({
  left: (A4.w - (t.cols * t.w + (t.cols - 1) * t.gapX)) / 2,
  top: (A4.h - (t.rows * t.h + (t.rows - 1) * t.gapY)) / 2,
});

const PT_TO_MM = 0.3528;
const LINE_HEIGHT = 1.2;
/** Height in mm of one text line at the given point size. */
const lineMm = (pt) => pt * PT_TO_MM * LINE_HEIGHT;

/**
 * One printed label. Inline styles only, so it prints the same in light and dark mode.
 *
 * Every row gets an explicit height in mm and the barcode takes only what is left.
 * (A flex-grow barcode with height:100% is not resolved by print engines: the SVG
 * kept its natural height and pushed the price / MRP / SKU row out of the label.)
 */
function LabelBox({ item, template, fields, shopName }) {
  const small = template.h <= 21;
  const fontPt = small ? 5.5 : template.h <= 25 ? 6.5 : 8;
  const padV = small ? 0.8 : 1.2;
  const padH = small ? 1.2 : 1.8;
  const box = {
    width: `${template.w}mm`,
    height: `${template.h}mm`,
    boxSizing: 'border-box',
    padding: `${padV}mm ${padH}mm`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#ffffff',
    color: '#000000',
    fontFamily: 'Arial, Helvetica, sans-serif',
    lineHeight: LINE_HEIGHT,
  };
  if (!item) return <div style={box} />;

  const p = item.product;
  const price = sellingPrice(p);
  const mrp = toNumberOr(p.mrp, 0);
  const showPrice = fields.price && price > 0;
  const showMrp = fields.mrp && mrp > 0;
  const showSku = fields.sku && p.sku;
  const showShop = fields.shop && shopName;
  const showBottom = showPrice || showMrp || showSku;

  // Rough fit: average glyph ≈ 0.5 em wide. Long names get a second line on bigger labels.
  const innerW = template.w - 2 * padH;
  const nameLines = fields.name ? (!small && String(p.name || '').length * fontPt * PT_TO_MM * 0.5 > innerW ? 2 : 1) : 0;
  const shopH = showShop ? lineMm(fontPt) : 0;
  const nameH = nameLines * lineMm(fontPt);
  const bottomH = showBottom ? lineMm(fontPt + 1.5) : 0;
  const barcodeGap = 0.6;
  const barcodeH = Math.max(4, template.h - 2 * padV - shopH - nameH - bottomH - barcodeGap);

  const textRow = { flex: 'none', width: '100%', overflow: 'hidden', fontSize: `${fontPt}pt` };

  return (
    <div style={box}>
      {showShop && (
        <div style={{ ...textRow, height: `${shopH}mm`, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {shopName}
        </div>
      )}
      {nameLines > 0 && (
        <div
          style={{
            ...textRow,
            height: `${nameH}mm`,
            textAlign: 'center',
            display: '-webkit-box',
            WebkitLineClamp: nameLines,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {p.name}
        </div>
      )}
      <div style={{ flex: 'none', width: '100%', height: `${barcodeH}mm`, marginTop: `${barcodeGap / 2}mm`, marginBottom: `${barcodeGap / 2}mm` }}>
        <BarcodeSvg value={p.barcode} fontSize={small ? 18 : 16} />
      </div>
      {showBottom && (
        <div
          style={{
            ...textRow,
            height: `${bottomH}mm`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1mm',
          }}
        >
          {showSku ? <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{p.sku}</span> : <span />}
          <span style={{ whiteSpace: 'nowrap', flex: 'none' }}>
            {showMrp && <span style={{ marginRight: showPrice ? '1mm' : 0 }}>MRP {formatINR(mrp)}</span>}
            {showPrice && <strong style={{ fontSize: `${fontPt + 1.5}pt` }}>{formatINR(price)}</strong>}
          </span>
        </div>
      )}
    </div>
  );
}

/** Pages of labels at exact mm sizes. */
function LabelPages({ labels, template, fields, shopName, maxPages }) {
  if (template.kind === 'roll') {
    const list = maxPages ? labels.slice(0, maxPages) : labels;
    return list.map((item, i) => (
      <div key={i} className="bl-page" style={{ width: `${template.w}mm`, height: `${template.h}mm`, overflow: 'hidden', background: '#fff' }}>
        <LabelBox item={item} template={template} fields={fields} shopName={shopName} />
      </div>
    ));
  }
  const perPage = template.cols * template.rows;
  const pages = [];
  for (let i = 0; i < labels.length; i += perPage) pages.push(labels.slice(i, i + perPage));
  const { left, top } = sheetMargins(template);
  const shown = maxPages ? pages.slice(0, maxPages) : pages;
  return shown.map((page, pi) => (
    <div
      key={pi}
      className="bl-page"
      style={{
        width: `${A4.w}mm`,
        height: `${A4.h}mm`,
        boxSizing: 'border-box',
        paddingLeft: `${left}mm`,
        paddingTop: `${top}mm`,
        background: '#fff',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${template.cols}, ${template.w}mm)`,
        gridAutoRows: `${template.h}mm`,
        columnGap: `${template.gapX}mm`,
        rowGap: `${template.gapY}mm`,
        alignContent: 'start',
      }}
    >
      {page.map((item, i) => (
        <LabelBox key={i} item={item} template={template} fields={fields} shopName={shopName} />
      ))}
    </div>
  ));
}

export default function BarcodeLabels() {
  const location = useLocation();
  const { toasts, showToast } = useToasts(5000);
  const authUser = useSelector((state) => state.auth?.user);
  const preselectIds = location.state?.productIds;

  const [items, setItems] = useState([]); // [{ product, qty }]
  const [preloading, setPreloading] = useState(() => Array.isArray(preselectIds) && preselectIds.length > 0);
  const [settings, setSettings] = useState(loadSettings);
  const [shopName, setShopName] = useState(() => authUser?.businessName || authUser?.business?.businessName || authUser?.name || '');
  const [skip, setSkip] = useState('0');
  const [generating, setGenerating] = useState(false);

  const template = TEMPLATES.find((t) => t.id === settings.templateId) || TEMPLATES[1];
  const fields = settings.fields;

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable: settings just won't be remembered
    }
  }, [settings]);

  // Products passed from another page (e.g. Product details → Print label).
  useEffect(() => {
    if (!Array.isArray(preselectIds) || !preselectIds.length) return undefined;
    let cancelled = false;
    Promise.allSettled(preselectIds.slice(0, 200).map((pid) => getProductByIdApi(pid)))
      .then((results) => {
        if (cancelled) return;
        const loaded = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (Array.isArray(r.value?.data) ? r.value.data[0] : r.value?.data))
          .filter(Boolean);
        setItems((prev) => {
          const have = new Set(prev.map((i) => i.product._id));
          return [...prev, ...loaded.filter((p) => !have.has(p._id)).map((p) => ({ product: p, qty: 1 }))];
        });
      })
      .finally(() => {
        if (!cancelled) setPreloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preselectIds]);

  const addProduct = (opt) => {
    if (!opt?.raw) return;
    const p = opt.raw;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product._id === p._id);
      if (idx >= 0) return prev.map((i, k) => (k === idx ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const setQty = (id, qty) =>
    setItems((prev) => prev.map((i) => (i.product._id === id ? { ...i, qty: Math.max(0, Math.min(999, Math.floor(toNumberOr(qty, 0)))) } : i)));
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.product._id !== id));

  const withBarcode = useMemo(() => items.filter((i) => i.product.barcode), [items]);
  const withoutBarcode = items.filter((i) => !i.product.barcode);
  const totalLabels = withBarcode.reduce((s, i) => s + i.qty, 0);
  const skipCount = template.kind === 'sheet' ? Math.max(0, Math.min(template.cols * template.rows - 1, Math.floor(toNumberOr(skip, 0)))) : 0;
  const tooMany = totalLabels > MAX_LABELS;

  const labels = useMemo(() => {
    if (tooMany) return [];
    const list = Array.from({ length: skipCount }, () => null);
    withBarcode.forEach((i) => {
      for (let k = 0; k < i.qty; k += 1) list.push(i);
    });
    return list;
  }, [withBarcode, skipCount, tooMany]);

  const pageCount = template.kind === 'sheet'
    ? Math.ceil(labels.length / (template.cols * template.rows)) || 0
    : labels.length;

  const handleGenerate = async () => {
    const ids = withoutBarcode.map((i) => i.product._id);
    if (!ids.length) return;
    setGenerating(true);
    try {
      const res = await generateBarcodesApi(ids);
      const assigned = res?.data || [];
      const map = new Map(assigned.map((a) => [String(a.productId), a.barcode]));
      setItems((prev) => prev.map((i) => (map.has(String(i.product._id)) ? { ...i, product: { ...i.product, barcode: map.get(String(i.product._id)) } } : i)));
      showToast(`${assigned.length} barcode${assigned.length === 1 ? '' : 's'} generated.`, 'success');
    } catch (err) {
      showToast(await getApiErrorMessage(err, 'Failed to generate barcodes.'), 'danger');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!labels.length) {
      showToast('Add at least one product with a barcode.', 'danger');
      return;
    }
    window.print();
  };

  const pageSize = template.kind === 'sheet' ? 'A4 portrait' : `${template.w}mm ${template.h}mm`;
  const printCss = `
    @media screen { .bl-print-root { display: none !important; } }
    @media print {
      @page { size: ${pageSize}; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
      body > *:not(.bl-print-root) { display: none !important; }
      .bl-print-root { display: block !important; }
      .bl-page { break-after: page; page-break-after: always; }
      .bl-page:last-child { break-after: auto; page-break-after: auto; }
      .bl-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  return (
    <div className="flex flex-col gap-6">
      <style>{printCss}</style>

      <Card
        h1="Print Barcode Labels"
        description="Choose products, set how many labels you need, pick a label size and print."
        buttonName="Back"
        navigation="-1"
        buttonVariant="danger"
        buttonIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        bodyClassName="p-4 sm:p-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          {/* Products */}
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <Label className="!mb-1">Add products</Label>
              <AsyncSearchSelect
                value=""
                selectedLabel=""
                fetchOptions={fetchProductOptions}
                onChange={addProduct}
                placeholder="Search by name, SKU or barcode"
                emptyText="No products found"
                clearable={false}
                keepOpenOnSelect
              />
            </div>

            {preloading && (
              <div className="flex items-center gap-2 text-xs text-[var(--vs-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading selected products...
              </div>
            )}

            {withoutBarcode.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 flex flex-col gap-2">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {withoutBarcode.length} product{withoutBarcode.length === 1 ? ' has' : 's have'} no barcode and will not be printed:{' '}
                    <strong>{withoutBarcode.map((i) => i.product.name).join(', ')}</strong>
                  </span>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    startIcon={generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanBarcode className="w-4 h-4" />}
                  >
                    Generate barcodes
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-[var(--vs-border)] rounded-xl">
              <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                <thead>
                  <tr className="bg-[var(--vs-bg-secondary)] border-b border-[var(--vs-border)] text-[var(--vs-text-secondary)] font-bold">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 w-36 text-center">Labels</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vs-border)] text-[var(--vs-text-primary)]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--vs-text-secondary)]">
                        <Tags className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        No products added yet. Search above to add products.
                      </td>
                    </tr>
                  ) : (
                    items.map(({ product: p, qty }) => (
                      <tr key={p._id}>
                        <td className="py-2 px-3">
                          <div className="font-semibold">{p.name}</div>
                          {p.sku && <div className="text-[10px] font-mono text-[var(--vs-text-secondary)]">{p.sku}</div>}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {p.barcode || (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-sans font-semibold">
                              No barcode
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatINR(sellingPrice(p))}
                          {toNumberOr(p.mrp, 0) > 0 && <div className="text-[10px] text-[var(--vs-text-secondary)]">MRP {formatINR(p.mrp)}</div>}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(p._id, qty - 1)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)] cursor-pointer"
                              title="Fewer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={qty}
                              onChange={(e) => setQty(p._id, e.target.value)}
                              className="w-14 h-8 text-center rounded-lg border border-[var(--vs-border)] bg-[var(--vs-bg-primary)] text-[var(--vs-text-primary)] text-xs outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(p._id, qty + 1)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)] cursor-pointer"
                              title="More"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => removeItem(p._id)}
                            className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setItems([])}>
                  Remove all
                </Button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <Label className="!mb-1">Label size</Label>
              <Select
                options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
                value={settings.templateId}
                onChange={(v) => v && setSettings((s) => ({ ...s, templateId: v }))}
              />
            </div>

            <div>
              <Label className="!mb-1">Show on label</Label>
              <div className="grid grid-cols-2 gap-x-3">
                {FIELD_OPTIONS.map((f) => (
                  <Checkbox
                    key={f.key}
                    id={`label-field-${f.key}`}
                    label={f.label}
                    checked={!!fields[f.key]}
                    onChange={(val) => setSettings((s) => ({ ...s, fields: { ...s.fields, [f.key]: val } }))}
                  />
                ))}
              </div>
            </div>

            {fields.shop && (
              <div>
                <Label htmlFor="label-shop-name" className="!mb-1">Shop name</Label>
                <Input id="label-shop-name" value={shopName} maxLength={40} onChange={(e) => setShopName(e.target.value)} placeholder="Your shop name" />
              </div>
            )}

            {template.kind === 'sheet' && (
              <div>
                <Label htmlFor="label-skip" className="!mb-1">Skip labels at the start</Label>
                <Input id="label-skip" type="number" min="0" value={skip} onChange={(e) => setSkip(e.target.value)} />
                <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">Use this to print on a partly used sheet.</span>
              </div>
            )}

            <div className="p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] text-xs text-[var(--vs-text-secondary)] flex flex-col gap-1">
              <span>
                Labels: <strong className="text-[var(--vs-text-primary)]">{totalLabels}</strong>
                {' · '}
                {template.kind === 'sheet' ? 'Sheets' : 'Pages'}: <strong className="text-[var(--vs-text-primary)]">{pageCount}</strong>
              </span>
              <span>In the print dialog, set scale to 100% (“Actual size”) and margins to “None”.</span>
              {tooMany && <span className="text-rose-600 dark:text-rose-400 font-semibold">Too many labels. Print up to {MAX_LABELS} at a time.</span>}
            </div>

            <Button onClick={handlePrint} disabled={!labels.length || tooMany} startIcon={<Printer className="w-4 h-4" />} className="!h-11">
              Print {totalLabels} label{totalLabels === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card h1="Preview" description={template.kind === 'sheet' ? 'First sheet at actual size.' : 'First labels at actual size.'} bodyClassName="p-4 sm:p-6">
        {labels.length === 0 ? (
          <div className="text-xs text-[var(--vs-text-secondary)] p-3 rounded-xl border border-dashed border-[var(--vs-border)]">
            Add products with a barcode to see a preview.
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh] rounded-xl bg-gray-200 dark:bg-gray-700 p-4">
            <div className={template.kind === 'sheet' ? 'w-max shadow-lg mx-auto' : 'flex flex-wrap gap-3'}>
              <LabelPages labels={labels} template={template} fields={fields} shopName={shopName} maxPages={template.kind === 'sheet' ? 1 : 12} />
            </div>
          </div>
        )}
      </Card>

      {/* Print-only copy, placed directly under <body> so the app layout can be hidden while printing */}
      {labels.length > 0 &&
        createPortal(
          <div className="bl-print-root">
            <LabelPages labels={labels} template={template} fields={fields} shopName={shopName} />
          </div>,
          document.body
        )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
