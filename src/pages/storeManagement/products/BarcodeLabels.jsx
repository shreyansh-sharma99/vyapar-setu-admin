import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Printer, Trash2, ScanBarcode, Tags } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Input,
  LINE_TD,
  LINE_TH,
  LineItemsTable,
  LineRow,
  NumberInput,
  PageHeader,
  Section,
  Select,
  Spinner,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { generateBarcodesApi, getProductByIdApi, lookupProductsApi } from './services/productService';
import { getStockInPricingApi } from '@/pages/purchase/components/stockInPricing';
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
    sublabel: [p.sku && `SKU ${p.sku}`, p.barcode ? `Barcode ${p.barcode}` : 'No barcode yet', formatINR(sellingPrice(p))]
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
  // "Print for a batch": that batch's SP (what the customer pays) and MRP
  const batch = item.batchId ? (item.batches || []).find((b) => String(b._id) === String(item.batchId)) : null;
  const price = batch ? batchCustomerPrice(batch, item.gstRate) : sellingPrice(p);
  const mrp = batch && toNumberOr(batch.mrp, 0) > 0 ? toNumberOr(batch.mrp, 0) : toNumberOr(p.mrp, 0);
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

/** Customer price of a batch (incl. GST); 0 when the batch has no SP. */
const batchCustomerPrice = (b, gstRate) => {
  const sp = toNumberOr(b.sellingPrice, 0);
  if (!(sp > 0)) return 0;
  return b.priceIncludesGst !== false ? sp : Math.round(sp * (1 + toNumberOr(gstRate, 0) / 100) * 100) / 100;
};

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
  const navigate = useNavigate();
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
          return [...prev, ...loaded.filter((p) => !have.has(p._id)).map((p) => ({ product: p, qty: 1, batchId: '', batches: [], gstRate: 0 }))];
        });
        // their open batches, for "Print for a batch"
        if (loaded.length) {
          getStockInPricingApi(loaded.map((p) => p._id))
            .then((res) => {
              const prices = res?.data?.prices || {};
              if (!cancelled) setItems((prev) => prev.map((i) => (prices[i.product._id] ? { ...i, batches: prices[i.product._id].batches || [], gstRate: prices[i.product._id].gstRate } : i)));
            })
            .catch(() => {});
        }
      })
      .finally(() => {
        if (!cancelled) setPreloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preselectIds]);

  /** Open batches with their own SP / MRP, for "Print for a batch". */
  const loadBatches = (pid) => {
    getStockInPricingApi([pid])
      .then((res) => {
        const info = res?.data?.prices?.[pid];
        if (!info) return;
        setItems((prev) => prev.map((i) => (String(i.product._id) === String(pid) ? { ...i, batches: info.batches || [], gstRate: info.gstRate } : i)));
      })
      .catch(() => {});
  };

  const addProduct = (opt) => {
    if (!opt?.raw) return;
    const p = opt.raw;
    const isNew = !items.some((i) => i.product._id === p._id);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product._id === p._id);
      if (idx >= 0) return prev.map((i, k) => (k === idx ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { product: p, qty: 1, batchId: '', batches: [], gstRate: 0 }];
    });
    if (isNew) loadBatches(p._id);
  };
  const setBatch = (id, batchId) => setItems((prev) => prev.map((i) => (i.product._id === id ? { ...i, batchId } : i)));

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
    <div className="flex flex-col gap-5">
      <style>{printCss}</style>

      <PageHeader
        title="Print Barcode Labels"
        description="Choose products, set how many labels you need, pick a label size and print."
        actions={
          <Button variant="secondary" size="sm" startIcon={<ArrowLeft />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Products */}
        <Section title="Products" bodyClassName="flex min-w-0 flex-col gap-4">
          <Field label="Add products">
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
          </Field>

          {preloading && <Spinner label="Loading selected products..." />}

          {withoutBarcode.length > 0 && (
            <Alert tone="warning">
              <div className="flex flex-col items-start gap-2">
                <span>
                  {withoutBarcode.length} product{withoutBarcode.length === 1 ? ' has' : 's have'} no barcode and will not be printed:{' '}
                  <strong className="text-ink">{withoutBarcode.map((i) => i.product.name).join(', ')}</strong>
                </span>
                <Button size="sm" onClick={handleGenerate} loading={generating} startIcon={<ScanBarcode />}>
                  Generate barcodes
                </Button>
              </div>
            </Alert>
          )}

          {items.length === 0 ? (
            <EmptyState icon={Tags} title="No products added yet" text="Search above to add products." className="py-8" />
          ) : (
            <LineItemsTable
              minWidth={680}
              head={
                <tr>
                  <th className={LINE_TH}>Product</th>
                  <th className={LINE_TH}>Barcode</th>
                  <th className={cn(LINE_TH, 'text-right')}>Price</th>
                  <th className={cn(LINE_TH, 'w-40 text-center')}>Labels</th>
                  <th className={cn(LINE_TH, 'w-12')} aria-label="Remove" />
                </tr>
              }
            >
              {items.map(({ product: p, qty, batches = [], batchId = '', gstRate = 0 }) => (
                <LineRow key={p._id}>
                  <td className={cn(LINE_TD, 'min-w-[170px]')}>
                    <div className="font-semibold">{p.name}</div>
                    {p.sku && <div className="font-mono text-xs text-ink-muted">{p.sku}</div>}
                  </td>
                  <td className={cn(LINE_TD, 'font-mono')}>{p.barcode || <Badge tone="warning">No barcode</Badge>}</td>
                  <td className={cn(LINE_TD, 'text-right tabular-nums')}>
                    {(() => {
                      const b = batchId ? batches.find((x) => String(x._id) === String(batchId)) : null;
                      const price = b ? batchCustomerPrice(b, gstRate) : sellingPrice(p);
                      const mrp = b && toNumberOr(b.mrp, 0) > 0 ? b.mrp : p.mrp;
                      return (
                        <>
                          {formatINR(price)}
                          {toNumberOr(mrp, 0) > 0 && <div className="text-xs text-ink-muted">MRP {formatINR(mrp)}</div>}
                        </>
                      );
                    })()}
                    {batches.length > 0 && (
                      <div className="ml-auto mt-1 w-[200px] max-w-full text-left" title="Print for a batch: the label shows that batch's price and MRP">
                        <Select
                          size="sm"
                          searchable={false}
                          aria-label="Print for a batch"
                          value={batchId}
                          onChange={(v) => setBatch(p._id, v)}
                          options={[
                            { value: '', label: 'Default price' },
                            ...batches.map((b) => ({
                              value: b._id,
                              label: [b.batchNo || 'Batch', toNumberOr(b.sellingPrice, 0) > 0 ? `SP ₹${batchCustomerPrice(b, gstRate)}` : '', toNumberOr(b.mrp, 0) > 0 ? `MRP ₹${toNumberOr(b.mrp, 0)}` : '']
                                .filter(Boolean)
                                .join(' · '),
                            })),
                          ]}
                        />
                      </div>
                    )}
                  </td>
                  <td className={LINE_TD}>
                    <div className="w-32">
                      <NumberInput
                        size="sm"
                        stepper
                        min={0}
                        max={999}
                        aria-label={`Labels for ${p.name}`}
                        value={qty}
                        onChange={(v) => setQty(p._id, v)}
                      />
                    </div>
                  </td>
                  <td className={LINE_TD}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(p._id)}
                      title="Remove"
                      aria-label="Remove"
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </LineRow>
              ))}
            </LineItemsTable>
          )}
          {items.length > 0 && (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setItems([])}>
                Remove all
              </Button>
            </div>
          )}
        </Section>

        {/* Settings */}
        <Section title="Label settings" bodyClassName="flex min-w-0 flex-col gap-4">
          <Field label="Label size">
            <Select
              searchable={false}
              options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              value={settings.templateId}
              onChange={(v) => v && setSettings((s) => ({ ...s, templateId: v }))}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink">Show on label</span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
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
            <Field label="Shop name" htmlFor="label-shop-name">
              <Input id="label-shop-name" value={shopName} maxLength={40} onChange={(e) => setShopName(e.target.value)} placeholder="Your shop name" />
            </Field>
          )}

          {template.kind === 'sheet' && (
            <Field label="Skip labels at the start" htmlFor="label-skip" hint="Use this to print on a partly used sheet.">
              <Input id="label-skip" type="number" min="0" value={skip} onChange={(e) => setSkip(e.target.value)} />
            </Field>
          )}

          <div className="flex flex-col gap-1 rounded-control bg-fill-2 p-3 text-sm text-ink-muted">
            <span>
              Labels: <strong className="tabular-nums text-ink">{totalLabels}</strong>
              {' · '}
              {template.kind === 'sheet' ? 'Sheets' : 'Pages'}: <strong className="tabular-nums text-ink">{pageCount}</strong>
            </span>
            <span className="text-xs">In the print dialog, set scale to 100% (“Actual size”) and margins to “None”.</span>
          </div>
          {tooMany && <Alert tone="danger">Too many labels. Print up to {MAX_LABELS} at a time.</Alert>}

          <Button size="lg" fullWidth onClick={handlePrint} disabled={!labels.length || tooMany} startIcon={<Printer />}>
            Print {totalLabels} label{totalLabels === 1 ? '' : 's'}
          </Button>
        </Section>
      </div>

      {/* Preview */}
      <Section title="Preview" description={template.kind === 'sheet' ? 'First sheet at actual size.' : 'First labels at actual size.'}>
        {labels.length === 0 ? (
          <p className="m-0 rounded-control border border-dashed border-line p-3 text-sm text-ink-muted">
            Add products with a barcode to see a preview.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto rounded-control bg-fill p-4">
            <div className={template.kind === 'sheet' ? 'mx-auto w-max shadow-lg' : 'flex flex-wrap gap-3'}>
              <LabelPages labels={labels} template={template} fields={fields} shopName={shopName} maxPages={template.kind === 'sheet' ? 1 : 12} />
            </div>
          </div>
        )}
      </Section>


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
