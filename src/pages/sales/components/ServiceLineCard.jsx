import { Trash2, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import ProductSearchPicker from './ProductSearchPicker';
import LinePriceNote from './LinePriceNote';

// The service and its products share these columns, so the figures line up like a bill.
const ROW = 'relative grid grid-cols-6 gap-2 px-3 py-3 sm:px-4 @xl:grid-cols-[minmax(0,1fr)_3.75rem_5.5rem_3.75rem_6rem_2rem]';
const NAME = 'col-span-6 min-w-0 pr-9 @xl:col-span-1 @xl:pr-0';
const REMOVE = 'absolute right-2 top-2.5 sm:right-3 @xl:static';
const LABEL = 'mb-1 block text-right text-[11px] font-semibold text-ink-muted @xl:hidden';
const HEAD = 'whitespace-nowrap text-right text-[11px] font-semibold text-brand-ink';
const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Qty, rate, discount and amount of one line: one cell per column. */
function Figures({ item, idx, qtyOn, qtyLabel, ctx }) {
  const { onChange, lockRate, submitted, totalOf, freePrice } = ctx;
  const locked = lockRate && !freePrice(item);
  const name = item.productName || 'service';
  const cell = `min-w-0 ${qtyOn ? 'col-span-2' : 'col-span-3'} @xl:col-span-1`;
  return (
    <>
      {qtyOn ? (
        <div className={cell}>
          <span className={LABEL}>{qtyLabel}</span>
          <Input
            size="sm"
            type="number"
            min="1"
            aria-label={`Quantity of ${name}`}
            value={item.qty}
            onChange={(e) => onChange(idx, 'qty', Number(e.target.value))}
            invalid={submitted && Number(item.qty) <= 0}
            className="text-right tabular-nums"
          />
          {submitted && Number(item.qty) <= 0 && <div className="mt-1 text-right text-xs text-danger">Invalid Qty</div>}
        </div>
      ) : (
        <div className="hidden @xl:block" />
      )}
      <div className={cell}>
        <span className={LABEL}>Rate (₹)</span>
        <Input
          size="sm"
          type="number"
          min="0"
          step="0.01"
          aria-label={`Rate of ${name}`}
          value={item.rate}
          onChange={(e) => onChange(idx, 'rate', Number(e.target.value))}
          readOnly={locked}
          title={locked ? 'Price comes from the Price master' : undefined}
          invalid={submitted && Number(item.rate) < 0}
          className="text-right tabular-nums"
        />
        {submitted && Number(item.rate) < 0 && <div className="mt-1 text-right text-xs text-danger">Invalid Rate</div>}
      </div>
      <div className={cell}>
        <span className={LABEL}>Disc (%)</span>
        <Input
          size="sm"
          type="number"
          min="0"
          max="100"
          aria-label={`Discount on ${name}`}
          value={item.discountPercent}
          onChange={(e) => onChange(idx, 'discountPercent', Number(e.target.value))}
          readOnly={lockRate}
          className="text-right tabular-nums"
        />
      </div>
      <div className="col-span-6 flex items-baseline justify-between @xl:col-span-1 @xl:block">
        <span className="text-[11px] font-semibold text-ink-muted @xl:hidden">Amount</span>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums text-ink @xl:leading-9">₹{money(totalOf(item))}</div>
          <div className="text-[11px] text-ink-muted">{item.isGstApplicable ? `GST ${item.taxPercent}%` : 'No GST'}</div>
        </div>
      </div>
    </>
  );
}

/** One service on a sales invoice, with the products billed along with it listed inside. */
export default function ServiceLineCard({ row, products, removable, ctx }) {
  const { item, idx } = row;
  const { dated, stock, stockOf, isShort, noItems, onChange, onRemove, totalOf, chargedByQty, freePrice, submitted } = ctx;
  const note = (line, i) => (
    <LinePriceNote
      line={line}
      showBatch={line.itemType !== 'service'}
      compact
      freePrice={freePrice(line)}
      onChangeBatch={() => dated.changeBatch(i)}
      onReason={(r) => dated.setReason(i, r)}
      onReset={() => dated.resetPrice(i)}
      submitted={submitted}
    />
  );
  const shortNote = (line) => {
    const info = stockOf(line);
    if (!info || Number(line.qty || 0) <= info.available) return null;
    return <div className="mt-1 text-[11px] font-semibold text-danger">{info.available <= 0 ? 'Out of stock' : `Only ${info.available} ${line.unit || 'units'} in stock`}</div>;
  };
  const qtyOn = chargedByQty(item);
  const hasProducts = products.length > 0;
  const productsTotal = products.reduce((sum, p) => sum + totalOf(p.item), 0);

  return (
    <div className="@container rounded-control bg-surface ring-1 ring-line">
      <div className={`bg-brand-soft ${hasProducts ? 'rounded-t-control' : 'rounded-control'}`}>
        {item.productId && (
          <div className="hidden grid-cols-[minmax(0,1fr)_3.75rem_5.5rem_3.75rem_6rem_2rem] gap-x-2 px-4 pt-2.5 @xl:grid">
            <span className="text-[11px] font-semibold text-brand-ink">Service</span>
            <span className={HEAD}>{qtyOn ? `Qty (${item.unit})` : hasProducts ? 'Qty' : ''}</span>
            <span className={HEAD}>Rate (₹)</span>
            <span className={HEAD}>Disc (%)</span>
            <span className={HEAD}>Amount</span>
          </div>
        )}
        <div className={`${ROW} ${item.productId ? '@xl:pt-1.5' : ''}`}>
          <div className={NAME}>
            <ProductSearchPicker
              value={item.productId}
              selectedLabel={item.productName}
              onSelect={(product) => onChange(idx, 'productId', product)}
              error={noItems}
              itemType="service"
              placeholder="Search service name or SKU"
            />
            {note(item, idx)}
            {stock(item)}
          </div>
          {item.productId && <Figures item={item} idx={idx} qtyOn={qtyOn} qtyLabel={`Qty (${item.unit})`} ctx={ctx} />}
          <div className={`${REMOVE} ${item.productId ? '' : '@xl:col-start-6'}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove service ${item.productName || idx + 1}`}
              title="Remove service"
              onClick={() => onRemove(idx)}
              disabled={!removable}
              className="hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      {hasProducts && (
        <>
          <div className="px-3 pt-3 sm:px-4">
            <p className="m-0 text-sm font-semibold text-ink">Products used ({products.length})</p>
            <p className="m-0 text-xs text-ink-muted">Billed at the batch price and taken from stock. Remove any you did not use.</p>
          </div>
          <ul className="m-0 list-none divide-y divide-line p-0">
            {products.map(({ item: line, idx: i }) => (
              <li key={i} className={`${ROW} ${isShort(line) ? 'bg-highlight-soft' : ''}`}>
                <div className={NAME}>
                  <div className="text-sm font-semibold text-ink @xl:leading-9">{line.productName}</div>
                  <div className="-mt-1 @xl:-mt-1.5">{note(line, i)}</div>
                  {shortNote(line)}
                </div>
                <Figures item={line} idx={i} qtyOn qtyLabel="Qty" ctx={ctx} />
                <div className={REMOVE}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${line.productName} from this service`}
                    title="Remove from this bill"
                    onClick={() => onRemove(i)}
                    className="hover:bg-danger-soft hover:text-danger"
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line px-3 py-2.5 sm:px-4">
            <span className="text-xs tabular-nums text-ink-muted">Service ₹{money(totalOf(item))} + Products ₹{money(productsTotal)}</span>
            <span className="text-sm font-semibold text-ink">
              Total <span className="font-bold tabular-nums text-brand-ink">₹{money(totalOf(item) + productsTotal)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
