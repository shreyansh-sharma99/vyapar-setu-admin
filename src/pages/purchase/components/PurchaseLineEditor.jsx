import { useState } from 'react';
import { QrCode, Trash2 } from 'lucide-react';
import { AddLineBar, Button, Input, LINE_TF, LineItemsTable, LineRow, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import BarcodeScannerModal from '@/components/modal/BarcodeScannerModal';
import { runBarcodeCheck } from './barcodeCheck';
import AsyncSelect from './AsyncSelect';
import { productOptionsLoader } from './lookupService';
import { applyProduct, emptyLine, formatINR, num, round2 } from './helpers';
import { barcodeProblems, shownMrp, shownSp, spChanged, stockInFields } from './stockInPricing';
import { TD, TH, lineValue, priceInclGst, profitPerPiece, sumRows } from './itemTable';
import { AmountCell, AmountHead, DefaultPriceTick, GstCell, ProfitCell, TotalAmountCell, TotalProfitCell } from './ItemTableBits';

const req = <span className="text-danger">*</span>;
/** Compact field inside a line cell. */
const CELL = 'rounded-lg px-2.5 tabular-nums';

/**
 * Editable priced lines for purchase bills and returns, laid out like the purchase order:
 * qty, cost price (before GST), GST from the product (read-only), price incl. GST and an
 * Amount column that shows amounts with or without GST, with totals in the footer.
 *
 * options:
 *  - bucket:       show the reason column (returns; good / damaged stock is picked by the server)
 *  - lockProducts: lines come from another document; products can't be changed / added
 *  - stockIn:      { prices, canUpdatePrices } — lines bring goods into stock (direct bill):
 *                  SP, MRP (required), barcode, expiry, low-stock alert, profit (batch no is automatic)
 *                  (`onChange` must accept an updater function, like a useState setter)
 */
export default function PurchaseLineEditor({ lines, onChange, options = {}, submitted = false }) {
  const { bucket = false, lockProducts = false, stockIn = null, gstRates = null, addShortcut = null } = options;
  /** gstRates (direct bill): today's GST master rate per product; else the line's own GST (from the GRN / bill). */
  const taxOf = (line) => {
    const info = gstRates ? gstRates[String(line.productId)] : null;
    return info && info.gstRate !== undefined ? num(info.gstRate) : num(line.taxPercent);
  };
  const [mode, setMode] = useState('incl');
  const [scanKey, setScanKey] = useState(null); // line whose barcode is being scanned
  const factorOf = (l) => l.units.find((u) => u.unit === l.unit)?.factor || 1;
  const loader = productOptionsLoader();

  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changeUnit = (line, unit) => {
    const to = line.units.find((u) => u.unit === unit)?.factor || 1;
    update(line.key, { unit, rate: round2((num(line.rate) / factorOf(line)) * to) });
  };

  const pickProduct = (line, opt) => {
    if (!opt) {
      update(line.key, { ...emptyLine(), key: line.key });
      return;
    }
    const exists = lines.find((l) => l.key !== line.key && l.productId === opt.value && !bucket);
    if (exists) {
      onChange(lines.filter((l) => l.key !== line.key).map((l) => (l.key === exists.key ? { ...l, qty: num(l.qty) + 1 } : l)));
      return;
    }
    update(line.key, { ...applyProduct(line, opt.data), ...stockInFields(opt.data) });
  };

  // Live check of a line's barcode; the result is kept on the line (only while the code is unchanged).
  const checkBarcode = async (line, value) => {
    const res = await runBarcodeCheck(value, line.productId);
    onChange((prev) => prev.map((l) => (l.key === line.key && String(l.barcode || '').trim() === res.code ? { ...l, barcodeCheck: res } : l)));
  };
  const codeProblems = stockIn ? barcodeProblems(lines) : {};

  const remove = (key) => {
    const next = lines.filter((l) => l.key !== key);
    onChange(next.length ? next : [emptyLine()]);
  };

  const rows = lines.map((line) => {
    const has = !!line.productId;
    const tax = taxOf(line);
    const costIncl = priceInclGst(line.rate, tax, line.discountPercent);
    const value = lineValue(line.qty, line.rate, tax, line.discountPercent);
    const info = stockIn ? stockIn.prices[String(line.productId)] : null;
    const sp = stockIn ? shownSp(line, info) : '';
    const mrp = stockIn ? shownMrp(line, info) : '';
    const pieces = num(line.qty) * factorOf(line);
    const profit = stockIn && has ? profitPerPiece(sp, mrp, costIncl / factorOf(line)) : null;
    return { line, has, tax, costIncl, value, info, sp, mrp, pieces, profit };
  });
  const totals = sumRows(rows.filter((r) => r.has).map((r) => ({ qty: r.line.qty, ...r.value, profit: r.profit ? r.profit.perUnit * r.pieces : null })));
  const middleCols = 3 + (stockIn ? 5 : 0) + (bucket ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <LineItemsTable
        minWidth={stockIn ? 1700 : 1000}
        head={
            <tr>
              <th className={`${TH} w-8`}>#</th>
              <th className={`${TH} min-w-[220px]`}>Product {!lockProducts && req}</th>
              <th className={`${TH} min-w-[90px]`}>Qty {req}</th>
              <th className={`${TH} min-w-[120px]`}>Cost price (₹) {req}</th>
              <th className={`${TH} w-20 text-center`}>GST</th>
              <th className={`${TH} w-28 text-right`}>Price incl. GST</th>
              {stockIn && (
                <>
                  <th className={`${TH} min-w-[130px]`}>SP for this batch (₹)</th>
                  <th className={`${TH} min-w-[120px]`}>MRP (₹) {req}</th>
                  <th className={`${TH} min-w-[180px]`}>Barcode</th>
                  <th className={`${TH} min-w-[150px]`}>Expiry date</th>
                  <th className={`${TH} min-w-[110px]`}>Low stock alert</th>
                </>
              )}
              {bucket && <th className={`${TH} w-44`}>Reason</th>}
              {stockIn && <th className={`${TH} w-32 text-right`}>Profit</th>}
              <AmountHead className={`${TH} w-40`} mode={mode} onModeChange={setMode} />
              {!lockProducts && <th className={`${TH} w-10`} />}
            </tr>
        }
        foot={
            <tr>
              <td className={`${LINE_TF} text-xs font-bold uppercase tracking-wider text-ink-subtle`} colSpan={2}>
                Total
              </td>
              <td className={`${LINE_TF} text-sm`}>{totals.qty}</td>
              <td className={LINE_TF} colSpan={middleCols} />
              {stockIn && <TotalProfitCell totals={totals} />}
              <TotalAmountCell totals={totals} mode={mode} />
              {!lockProducts && <td className={LINE_TF} />}
            </tr>
        }
      >
            {rows.map(({ line, has, tax, costIncl, value, info, sp, mrp, pieces, profit }, idx) => {
              const missingProduct = submitted && !has && lines.length > 1;
              const badQty = submitted && has && num(line.qty) <= 0;
              const badRate = submitted && has && !(num(line.rate) > 0);
              const changed = stockIn && spChanged(line, info);
              const spAboveMrp = num(sp) > 0 && num(mrp) > 0 && num(sp) > num(mrp);
              const mrpMissing = !!stockIn && submitted && has && !(num(mrp) > 0);
              const noPriceYet = info && !(num(info.sellingPrice) > 0) && !line.spTouched;
              return (
                <LineRow key={line.key} tone={spAboveMrp || codeProblems[line.key] ? 'warning' : undefined}>
                  <td className={`${TD} pt-4 text-xs text-ink-subtle`}>{idx + 1}</td>
                  <td className={TD}>
                    {lockProducts ? (
                      <div className="pt-1.5 font-medium">{line.productName}</div>
                    ) : (
                      <AsyncSelect
                        size="sm"
                        value={has ? { value: line.productId, label: line.productName } : null}
                        onChange={(opt) => pickProduct(line, opt)}
                        loadOptions={loader}
                        placeholder="Search name, SKU or barcode"
                        error={missingProduct}
                      />
                    )}
                    {has && (
                      <div className="mt-1 text-[11px] text-ink-subtle flex flex-wrap items-center gap-x-2">
                        {line.sku && <span>SKU {line.sku}</span>}
                        {line.hsnCode && <span>HSN {line.hsnCode}</span>}
                        {line.units.length > 1 ? (
                          <Select
                            size="sm"
                            searchable={false}
                            aria-label="Unit"
                            value={line.unit}
                            onChange={(unit) => changeUnit(line, unit)}
                            options={line.units.map((u) => ({ value: u.unit, label: `per ${u.unit}${u.factor !== 1 ? ` (${u.factor} pcs)` : ''}` }))}
                            wrapperClassName="w-auto min-w-28"
                            className="!h-6 !rounded-md !pl-1.5 !pr-6 !text-[11px]"
                          />
                        ) : (
                          <span>
                            per {line.unit || 'pc'}
                            {factorOf(line) !== 1 ? ` (${factorOf(line)} pcs)` : ''}
                          </span>
                        )}
                        {num(line.discountPercent) > 0 && <span>Disc {num(line.discountPercent)}%</span>}
                      </div>
                    )}
                  </td>
                  <td className={TD}>
                    <Input size="sm" type="number" min="0" step="any" value={line.qty} onChange={(e) => update(line.key, { qty: e.target.value })} invalid={badQty} className={CELL} />
                  </td>
                  <td className={TD}>
                    <Input size="sm" type="number" min="0" step="0.01" value={line.rate} onChange={(e) => update(line.key, { rate: e.target.value })} invalid={badRate} className={CELL} />
                    <div className="text-[10px] text-ink-subtle mt-0.5">before GST</div>
                  </td>
                  <GstCell taxPercent={tax} has={has} />
                  <td className={`${TD} pt-4 text-right font-mono text-xs whitespace-nowrap`}>{has ? formatINR(costIncl) : '—'}</td>
                  {stockIn && (
                    <>
                      <td className={TD}>
                        <Input
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={noPriceYet ? '' : sp}
                          disabled={!has || !stockIn.canUpdatePrices}
                          placeholder={noPriceYet ? 'Not set yet' : 'Optional'}
                          title={stockIn.canUpdatePrices ? 'Change it to set a new selling price' : 'Only users who can edit products may change the selling price'}
                          onChange={(e) => update(line.key, { sellingPrice: e.target.value, spTouched: true })}
                          invalid={spAboveMrp}
                          className={cn(CELL, changed && !spAboveMrp && '!border-brand font-semibold')}
                        />
                        {changed && <div className="text-[10px] text-brand-ink mt-0.5">This batch only</div>}
                        <DefaultPriceTick line={line} changed={changed} canUpdate={stockIn.canUpdatePrices} onChange={(patch) => update(line.key, patch)} />
                        {spAboveMrp && <div className="text-[10px] text-danger mt-0.5">Above MRP</div>}
                      </td>
                      <td className={TD}>
                        <Input
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={mrp}
                          disabled={!has}
                          placeholder="Required"
                          onChange={(e) => update(line.key, { mrp: e.target.value, mrpTouched: true })}
                          invalid={mrpMissing}
                          className={CELL}
                        />
                      </td>
                      <td className={TD}>
                        <div className="flex gap-1">
                          <Input
                            size="sm"
                            value={line.barcode ?? ''}
                            maxLength={64}
                            disabled={!has}
                            readOnly={line.barcodeLocked}
                            placeholder="Optional"
                            title={line.barcodeLocked ? 'Same barcode as the stock on hand' : 'Barcode of these goods'}
                            onChange={(e) => update(line.key, { barcode: e.target.value })}
                            onBlur={(e) => !line.barcodeLocked && checkBarcode(line, e.target.value)}
                            invalid={!!codeProblems[line.key]}
                            className={cn(CELL, line.barcodeLocked && 'opacity-70')}
                          />
                          {has && !line.barcodeLocked && (
                            <Button variant="ghost" size="icon-sm" title="Scan barcode" aria-label="Scan barcode" onClick={() => setScanKey(line.key)} className="!size-9 shrink-0 !rounded-lg bg-fill hover:!bg-brand-soft hover:!text-brand-ink">
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {line.barcodeLocked && <div className="text-[10px] text-ink-subtle mt-0.5">Same barcode as the stock on hand</div>}
                        {codeProblems[line.key] ? (
                          <div className="text-[10px] text-danger mt-0.5">{codeProblems[line.key]}</div>
                        ) : (
                          line.barcodeCheck?.tone === 'info' && line.barcodeCheck.code === String(line.barcode || '').trim() && (
                            <div className="text-[10px] text-brand-ink mt-0.5">{line.barcodeCheck.text}</div>
                          )
                        )}
                      </td>
                      <td className={TD}>
                        <Input size="sm" type="date" value={line.expiryDate ?? ''} disabled={!has} onChange={(e) => update(line.key, { expiryDate: e.target.value })} className={CELL} />
                      </td>
                      <td className={TD}>
                        <Input
                          size="sm"
                          type="number"
                          min="0"
                          step="any"
                          value={line.lowStockAlert ?? ''}
                          disabled={!has}
                          placeholder="e.g. 5"
                          title="Alert when this product's stock falls to this number"
                          onChange={(e) => update(line.key, { lowStockAlert: e.target.value })}
                          className={CELL}
                        />
                      </td>
                    </>
                  )}
                  {bucket && (
                    <td className={TD}>
                      <Input size="sm" value={line.reason} placeholder="e.g. Expired, defective" onChange={(e) => update(line.key, { reason: e.target.value })} className={CELL} />
                    </td>
                  )}
                  {stockIn && <ProfitCell profit={profit} pieces={pieces} />}
                  <AmountCell value={value} mode={mode} has={has} />
                  {!lockProducts && (
                    <td className={`${TD} pt-3`}>
                      <Button variant="ghost" size="icon-sm" title="Remove line" aria-label="Remove line" onClick={() => remove(line.key)} className="text-ink-subtle hover:!bg-danger-soft hover:!text-danger">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </LineRow>
              );
            })}
      </LineItemsTable>
      {!lockProducts && (
        <AddLineBar onAdd={() => onChange([...lines, emptyLine()])} shortcut={addShortcut}>
          <span className="text-sm text-ink-subtle">Search a product in the new row by name, SKU or barcode.</span>
        </AddLineBar>
      )}
      <p className="text-[11px] text-ink-subtle">
        Cost price is per unit before GST; GST comes from the product. Amounts here are a preview — the summary (with discount, freight and round off)
        and the saved document show the final figures.
        {stockIn && ' SP and MRP are per piece — change the SP only when the selling price should change. Profit = SP (or MRP when no SP) − price incl. GST.'}
        {stockIn && ' Barcode: one per product while it has stock; empty = the product\'s current barcode. Each line gets a batch number automatically.'}
      </p>
      {stockIn && (
        <BarcodeScannerModal
          isOpen={!!scanKey}
          onClose={() => setScanKey(null)}
          onSave={(val) => {
            const line = lines.find((l) => l.key === scanKey);
            if (!line) return;
            update(line.key, { barcode: val });
            checkBarcode(line, val);
          }}
          initialValue={lines.find((l) => l.key === scanKey)?.barcode || ''}
        />
      )}
    </div>
  );
}
