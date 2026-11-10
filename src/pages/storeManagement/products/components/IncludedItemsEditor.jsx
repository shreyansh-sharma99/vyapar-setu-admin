import { Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import AsyncSearchSelect from './AsyncSearchSelect';
import { lookupProductsApi } from '../services/productService';

const fetchGoods = async (query) => {
  const res = await lookupProductsApi(query, 20, { itemType: 'goods' });
  return (res?.data || []).map((p) => ({
    value: p._id,
    label: p.name,
    sublabel: [p.sku && `SKU ${p.sku}`, `${p.currentStock ?? 0} ${p.unit || ''} in stock`].filter(Boolean).join(' · '),
    raw: p,
  }));
};

/** Goods used up inside a service: rows of { productId, productName, qty, unit }. */
export default function IncludedItemsEditor({ items = [], onChange }) {
  const add = (option) => {
    if (!option) return;
    if (items.some((i) => i.productId === option.value)) return;
    onChange([...items, { productId: option.value, productName: option.label, qty: '1', unit: option.raw?.unit || '' }]);
  };
  const setQty = (index, qty) => onChange(items.map((row, i) => (i === index ? { ...row, qty } : row)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-3">
      <AsyncSearchSelect value="" selectedLabel="" fetchOptions={fetchGoods} onChange={add} placeholder="Search goods, e.g. gloves, engine oil" keepOpenOnSelect />
      {items.map((row, index) => (
        <div key={row.productId} className="flex items-center gap-3 rounded-control bg-fill p-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.productName}</span>
          <div className="w-28">
            <Input type="number" min="0" step="any" aria-label={`Quantity of ${row.productName}`} value={row.qty} onChange={(e) => setQty(index, e.target.value)} />
          </div>
          <span className="w-12 text-xs text-ink-muted">{row.unit}</span>
          <Button variant="danger-soft" size="icon" onClick={() => remove(index)} title="Remove" aria-label={`Remove ${row.productName}`}>
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
