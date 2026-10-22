/**
 * The six invoice designs of Invoice Layout (Classic, Modern, Minimal, GST Detailed,
 * Thermal 58 / 80 mm). Each one draws a `d` object from invoiceDoc.js — the sample
 * invoice in the layout preview, or a real invoice on the invoice page and in its PDF.
 */
import { amt, inr, pct } from './invoiceDoc';

/** UPI QR for the amount due (image from api.qrserver.com, CORS-enabled so the PDF can capture it). */
function UpiQrCode({ upiId, accountName, amount = 0, size = 76 }) {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(accountName || 'Merchant')}&am=${(Number(amount) || 0).toFixed(2)}&cu=INR`;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(upiUrl)}&margin=1`;
  return (
    <div className="flex flex-col items-center justify-center p-1.5 bg-white border border-gray-200 rounded-lg">
      <img
        src={src}
        alt="UPI QR Code"
        width={size}
        height={size}
        crossOrigin="anonymous"
        className="block"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <span className="text-[8px] font-medium text-gray-500 mt-1">Scan to Pay UPI</span>
    </div>
  );
}

const hasBank = (b = {}) => !!(b.bankName || b.accountNumber || b.ifsc || b.upiId);
const dueAmount = (d) => (d.totals.balance > 0 ? d.totals.balance : d.totals.total);

/** Bank rows (only the filled ones). */
function BankLines({ b = {}, labelClass = 'font-semibold' }) {
  return (
    <>
      {b.accountName && <div><span className={labelClass}>A/C Name:</span> {b.accountName}</div>}
      {b.bankName && <div><span className={labelClass}>Bank:</span> {b.bankName}</div>}
      {b.accountNumber && <div><span className={labelClass}>A/C:</span> {b.accountNumber}</div>}
      {b.ifsc && <div><span className={labelClass}>IFSC:</span> {b.ifsc}</div>}
      {b.upiId && <div><span className={labelClass}>UPI:</span> {b.upiId}</div>}
    </>
  );
}

/** Terms & notes block (from Invoice Layout). */
function TermsNotes({ terms, notes, className = 'text-[10px] text-gray-600', titleClass = 'font-bold text-gray-800' }) {
  if (!terms && !notes) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {terms && (
        <div>
          <div className={titleClass}>Terms &amp; Conditions</div>
          <div className="whitespace-pre-line leading-snug">{terms}</div>
        </div>
      )}
      {notes && (
        <div>
          <div className={titleClass}>Notes</div>
          <div className="whitespace-pre-line leading-snug">{notes}</div>
        </div>
      )}
    </div>
  );
}

/** "Dispatch from: Mansarovar Warehouse (JP-RJ-MNS-001), Jaipur …" */
const dispatchText = (dp) => (dp ? `${dp.name}${dp.code ? ` (${dp.code})` : ''}${dp.address ? `, ${dp.address}` : ''}` : '');

function Signature({ signature, businessName, align = 'right', imgClass = 'max-h-10' }) {
  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start'}`}>
      <div className="text-[10px] font-bold uppercase text-gray-800">For {businessName}</div>
      <div className="h-10 flex items-end my-1">
        {signature ? <img src={signature} alt="Signature" crossOrigin="anonymous" className={`${imgClass} object-contain`} /> : null}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 border-t border-gray-400 pt-0.5 px-2">Authorised Signatory</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLASSIC (bordered grid — accountant standard)
// ─────────────────────────────────────────────────────────────────────────────
function ClassicTemplate({ d, accentColor, logo, signature, showHsn, showDiscount, showTaxBreakup, showUpiQr, showSignature, bankDetails, terms, notes }) {
  const t = d.totals;
  return (
    <div className="w-full bg-white text-gray-900 font-sans text-xs leading-normal border-2 border-gray-400 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row justify-between border border-gray-400">
        <div className="p-3 sm:border-r border-gray-400 flex-1 min-w-0">
          {logo && <img src={logo} alt="Logo" crossOrigin="anonymous" className="max-h-10 max-w-[120px] object-contain mb-1.5" />}
          <h2 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-tight break-words">{d.seller.name}</h2>
          {d.seller.address && <div className="text-[11px] text-gray-700 mt-0.5 leading-tight break-words">{d.seller.address}</div>}
          {d.seller.gstin && <div className="text-[11px] font-semibold text-gray-900 mt-1">GSTIN: {d.seller.gstin}</div>}
          {d.seller.state && <div className="text-[10px] text-gray-600">State: {d.seller.state}{d.seller.stateCode ? ` (Code: ${d.seller.stateCode})` : ''}</div>}
          {d.seller.phone && <div className="text-[10px] text-gray-600">Ph: {d.seller.phone}</div>}
        </div>
        <div className="p-3 bg-gray-50/50 sm:w-56 shrink-0 border-t sm:border-t-0 border-gray-400 text-left sm:text-right">
          <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase text-white tracking-wider mb-1.5" style={{ backgroundColor: accentColor }}>
            {d.title}
          </span>
          <div className="text-[11px]"><span className="font-semibold text-gray-600">Invoice No:</span> <span className="font-bold text-gray-900 break-all">{d.number}</span></div>
          <div className="text-[11px]"><span className="font-semibold text-gray-600">Date:</span> <span className="font-bold text-gray-900">{d.date}</span></div>
          {d.placeOfSupply && <div className="text-[11px]"><span className="font-semibold text-gray-600">Place of Supply:</span> {d.placeOfSupply}</div>}
          <div className="text-[11px]"><span className="font-semibold text-gray-600">Reverse Charge:</span> {d.reverseCharge ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 border-x border-b border-gray-400">
        <div className="p-2.5 sm:border-r border-gray-400 bg-gray-50/40">
          <div className="text-[10px] font-black uppercase text-gray-700 tracking-wider mb-0.5">Bill To (Details of Receiver)</div>
          <div className="font-bold text-sm text-gray-900">{d.buyer.name}</div>
          {(d.buyer.gstin || d.buyer.state) && (
            <div className="text-[11px] text-gray-700">
              {d.buyer.gstin && <>GSTIN: <span className="font-semibold">{d.buyer.gstin}</span></>}
              {d.buyer.gstin && d.buyer.state && ' | '}
              {d.buyer.state && <>State: {d.buyer.state}{d.buyer.stateCode ? ` (${d.buyer.stateCode})` : ''}</>}
            </div>
          )}
          {d.buyer.address && <div className="text-[10px] text-gray-600">{d.buyer.address}</div>}
          {d.buyer.phone && <div className="text-[10px] text-gray-600">Ph: {d.buyer.phone}</div>}
        </div>
        <div className="p-2.5 border-t sm:border-t-0 border-gray-400">
          <div className="text-[10px] font-black uppercase text-gray-700 tracking-wider mb-0.5">Dispatch From (Store / Warehouse)</div>
          {d.dispatch ? (
            <>
              <div className="font-bold text-sm text-gray-900">{d.dispatch.name}{d.dispatch.code && <span className="ml-1 font-mono text-[10px] text-gray-600">({d.dispatch.code})</span>}</div>
              {d.dispatch.address && <div className="text-[10px] text-gray-600">{d.dispatch.address}</div>}
            </>
          ) : <div className="text-[10px] text-gray-500">—</div>}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-[11px]">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400 text-center">
              <th className="border-r border-gray-400 py-1.5 px-1.5 w-7">#</th>
              <th className="border-r border-gray-400 py-1.5 px-2 text-left">Item Description</th>
              {showHsn && <th className="border-r border-gray-400 py-1.5 px-2 w-16">HSN/SAC</th>}
              <th className="border-r border-gray-400 py-1.5 px-2 w-16 text-right">Qty</th>
              <th className="border-r border-gray-400 py-1.5 px-2 w-16 text-right">Rate</th>
              {showDiscount && <th className="border-r border-gray-400 py-1.5 px-2 w-16 text-right">Discount</th>}
              <th className="border-r border-gray-400 py-1.5 px-2 text-right">Taxable</th>
              <th className="border-r border-gray-400 py-1.5 px-2 w-12 text-right">Tax %</th>
              <th className="py-1.5 px-2 text-right">Tax Amt</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, idx) => (
              <tr key={it.id} className="border-b border-gray-300">
                <td className="border-r border-gray-300 py-2 px-1 text-center font-medium">{idx + 1}</td>
                <td className="border-r border-gray-300 py-2 px-2 font-semibold text-gray-900">{it.name}</td>
                {showHsn && <td className="border-r border-gray-300 py-2 px-2 text-center font-mono text-[10px]">{it.hsn || '—'}</td>}
                <td className="border-r border-gray-300 py-2 px-2 text-right">{it.qty} {it.unit}</td>
                <td className="border-r border-gray-300 py-2 px-2 text-right">{inr(it.rate)}</td>
                {showDiscount && <td className="border-r border-gray-300 py-2 px-2 text-right text-gray-700">{it.discount ? inr(it.discount) : '—'}</td>}
                <td className="border-r border-gray-300 py-2 px-2 text-right font-medium">{inr(it.taxable)}</td>
                <td className="border-r border-gray-300 py-2 px-2 text-right">{pct(it.taxRate)}</td>
                <td className="py-2 px-2 text-right font-medium">{inr(it.taxAmt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showTaxBreakup && d.taxRows.length > 0 && (
        <div className="mt-3">
          <table className="w-full border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-400 text-center">
                <th className="border-r border-gray-400 py-1 px-2 text-left">Tax Rate</th>
                <th className="border-r border-gray-400 py-1 px-2 text-right">Taxable Value</th>
                <th className="border-r border-gray-400 py-1 px-2 text-right">CGST</th>
                <th className="border-r border-gray-400 py-1 px-2 text-right">SGST</th>
                <th className="border-r border-gray-400 py-1 px-2 text-right">IGST</th>
                <th className="py-1 px-2 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {d.taxRows.map((r) => (
                <tr key={r.key} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 py-1 px-2 font-medium">GST {pct(r.rate)}</td>
                  <td className="border-r border-gray-300 py-1 px-2 text-right">{inr(r.taxable)}</td>
                  <td className="border-r border-gray-300 py-1 px-2 text-right">{r.cgst ? inr(r.cgst) : '—'}</td>
                  <td className="border-r border-gray-300 py-1 px-2 text-right">{r.sgst ? inr(r.sgst) : '—'}</td>
                  <td className="border-r border-gray-300 py-1 px-2 text-right">{r.igst ? inr(r.igst) : '—'}</td>
                  <td className="py-1 px-2 text-right font-semibold">{inr(r.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 border border-gray-400">
        <div className="sm:col-span-7 p-2.5 sm:border-r border-b sm:border-b-0 border-gray-400 text-[11px] space-y-2">
          <div>
            <span className="font-semibold text-gray-600">Amount in Words:</span>
            <div className="font-bold text-gray-900 mt-0.5">{d.words}</div>
          </div>
          <TermsNotes terms={terms} notes={notes} className="text-[10px] text-gray-600 border-t border-gray-200 pt-1.5" />
        </div>
        <div className="sm:col-span-5 p-2.5 text-[11px] space-y-1">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{inr(t.subtotal)}</span></div>
          {showDiscount && t.discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount:</span><span className="font-medium">- {inr(t.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-600">Tax Total:</span><span className="font-medium">{inr(t.tax)}</span></div>
          {t.roundOff !== 0 && <div className="flex justify-between"><span className="text-gray-600">Round Off:</span><span className="font-medium">{inr(t.roundOff)}</span></div>}
          <div className="border-t-2 border-gray-800 pt-1 flex justify-between font-black text-sm border-b-4 border-double border-gray-900 pb-0.5">
            <span>GRAND TOTAL:</span>
            <span style={{ color: accentColor }}>{inr(t.total)}</span>
          </div>
          {t.paid > 0 && (
            <>
              <div className="flex justify-between"><span className="text-gray-600">Paid:</span><span className="font-medium">{inr(t.paid)}</span></div>
              <div className="flex justify-between font-bold"><span>Balance Due:</span><span>{inr(t.balance)}</span></div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 border border-gray-400">
        <div className="p-3 sm:border-r border-b sm:border-b-0 border-gray-400 flex items-center justify-between gap-3 text-[10px]">
          {hasBank(bankDetails) ? (
            <div>
              <div className="font-bold uppercase tracking-wider text-gray-800 mb-0.5">Bank Details</div>
              <BankLines b={bankDetails} />
            </div>
          ) : <div />}
          {showUpiQr && bankDetails.upiId && <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} amount={dueAmount(d)} size={64} />}
        </div>
        <div className="p-3">
          {showSignature && <Signature signature={signature} businessName={d.seller.name} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODERN (clean, whitespace, accent bar)
// ─────────────────────────────────────────────────────────────────────────────
function ModernTemplate({ d, accentColor, logo, signature, showHsn, showDiscount, showTaxBreakup, showUpiQr, showSignature, bankDetails, terms, notes }) {
  const t = d.totals;
  return (
    <div className="w-full bg-white text-gray-800 font-sans text-xs leading-normal rounded-3xl border border-slate-200/80 overflow-hidden">
      <div className="w-full h-2.5" style={{ backgroundColor: accentColor }} />
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            {logo && <img src={logo} alt="Logo" crossOrigin="anonymous" className="max-h-11 max-w-[140px] object-contain mb-2" />}
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{d.seller.name}</h2>
            <div className="text-gray-500 text-[11px] mt-1 leading-relaxed">
              {[d.seller.address, d.seller.gstin && `GSTIN: ${d.seller.gstin}`, d.seller.phone && `Ph: ${d.seller.phone}`].filter(Boolean).join(' • ')}
            </div>
          </div>
          <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{d.title}</span>
            <span className="font-black text-base tracking-tight text-gray-900 mt-0.5 break-all">{d.number}</span>
            <span className="text-gray-500 text-xs mt-0.5">Issued: {d.date}</span>
            {d.status && (
              <span className="mt-2 inline-block px-3.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: accentColor }}>
                {d.status}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Invoiced To</div>
            <div className="font-bold text-sm text-gray-900">{d.buyer.name}</div>
            <div className="text-gray-600 text-xs mt-0.5">
              {[d.buyer.gstin && `GSTIN: ${d.buyer.gstin}`, d.placeOfSupply && `Place of Supply: ${d.placeOfSupply}`].filter(Boolean).join(' • ')}
            </div>
            {d.buyer.address && <div className="text-gray-500 text-[11px] mt-0.5">{d.buyer.address}</div>}
            {d.buyer.phone && <div className="text-gray-500 text-[11px]">Ph: {d.buyer.phone}</div>}
          </div>
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Dispatch From</div>
            {d.dispatch ? (
              <>
                <div className="font-bold text-sm text-gray-900">{d.dispatch.name}</div>
                {d.dispatch.code && <div className="text-gray-500 text-[11px] font-mono">{d.dispatch.code}</div>}
                {d.dispatch.address && <div className="text-gray-500 text-[11px] mt-0.5">{d.dispatch.address}</div>}
              </>
            ) : <div className="text-gray-400">—</div>}
            <div className="text-xs text-gray-600 mt-2"><span className="font-semibold text-gray-700">Due:</span> {d.dueDate}</div>
          </div>
        </div>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="text-[11px] uppercase font-bold tracking-wider text-slate-500 bg-slate-50">
                <th className="py-2.5 px-2 border border-slate-200 w-6">#</th>
                <th className="py-2.5 px-2 border border-slate-200">Item Description</th>
                {showHsn && <th className="py-2.5 px-2 border border-slate-200">HSN</th>}
                <th className="py-2.5 px-2 border border-slate-200">Qty</th>
                <th className="py-2.5 px-2 border border-slate-200">Rate</th>
                {showDiscount && <th className="py-2.5 px-2 border border-slate-200 text-center">Discount</th>}
                <th className="py-2.5 px-2 border border-slate-200">Taxable</th>
                {showTaxBreakup && <th className="py-2.5 px-2 border border-slate-200 text-center">Tax %</th>}
                <th className="py-2.5 px-2 border border-slate-200 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {d.items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="py-2.5 px-2 border border-slate-200 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-2 border border-slate-200 font-bold text-gray-900">{it.name}</td>
                  {showHsn && <td className="py-2.5 px-2 border border-slate-200 text-slate-400 font-mono text-[11px]">{it.hsn || '—'}</td>}
                  <td className="py-2.5 px-2 border border-slate-200 text-gray-900 font-bold">{it.qty} <span className="text-[10px] text-gray-400 font-normal uppercase">{it.unit}</span></td>
                  <td className="py-2.5 px-2 border border-slate-200 text-slate-700 font-medium">{inr(it.rate)}</td>
                  {showDiscount && <td className="py-2.5 px-2 border border-slate-200 text-center font-semibold text-emerald-500">{it.discount ? `-${inr(it.discount)}` : '—'}</td>}
                  <td className="py-2.5 px-2 border border-slate-200 font-semibold text-slate-800">{inr(it.taxable)}</td>
                  {showTaxBreakup && <td className="py-2.5 px-2 border border-slate-200 text-center text-slate-400">{pct(it.taxRate)}</td>}
                  <td className="py-2.5 px-2 border border-slate-200 text-right font-bold text-gray-900">{inr(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showTaxBreakup && d.taxRows.length > 0 && (
          <div className="mt-5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[11px]">
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-2">Tax Summary Breakup</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-gray-600">
              {d.taxRows.map((r) => (
                <div key={r.key} className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold block text-gray-800">GST {pct(r.rate)}</span>
                  Taxable: {inr(r.taxable)} | Tax: {inr(r.tax)}
                </div>
              ))}
              <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold block text-gray-800">Total Tax</span>
                {inr(t.tax)}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-5">
          <div className="text-[10px] text-gray-500 max-w-sm">
            <div className="text-[10px] text-gray-500 italic mb-2">{d.words}</div>
            <TermsNotes terms={terms} notes={notes} className="text-[10px] text-gray-500" titleClass="font-bold uppercase tracking-wider text-gray-600" />
          </div>
          <div className="w-full sm:w-64 space-y-1.5 text-[11px] shrink-0">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-800">{inr(t.subtotal)}</span></div>
            {showDiscount && t.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount Applied</span><span className="font-semibold">-{inr(t.discount)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>Taxes</span><span className="font-semibold text-gray-800">{inr(t.tax)}</span></div>
            {t.roundOff !== 0 && <div className="flex justify-between text-gray-500"><span>Round Off</span><span className="font-semibold text-gray-800">{inr(t.roundOff)}</span></div>}
            <div className="p-3 rounded-xl flex items-center justify-between font-black text-sm mt-2" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
              <span>{t.paid > 0 ? 'Total' : 'Amount Due'}</span>
              <span className="text-base">{inr(t.total)}</span>
            </div>
            {t.paid > 0 && (
              <>
                <div className="flex justify-between text-gray-500"><span>Paid</span><span className="font-semibold text-gray-800">{inr(t.paid)}</span></div>
                <div className="flex justify-between font-bold text-gray-900"><span>Balance Due</span><span>{inr(t.balance)}</span></div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          {hasBank(bankDetails) ? (
            <div className="space-y-0.5 text-[10px] text-gray-500">
              <div className="font-bold uppercase tracking-wider text-gray-500 mb-1">Payment Information</div>
              <BankLines b={bankDetails} labelClass="font-semibold text-gray-700" />
            </div>
          ) : <div />}
          <div className="flex items-center gap-3 self-end">
            {showUpiQr && bankDetails.upiId && <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} amount={dueAmount(d)} size={66} />}
            {showSignature && <Signature signature={signature} businessName={d.seller.name} align="center" imgClass="max-h-9" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MINIMAL (light lines, accent divider)
// ─────────────────────────────────────────────────────────────────────────────
function MinimalTemplate({ d, accentColor, logo, signature, showHsn, showDiscount, showTaxBreakup, showUpiQr, showSignature, bankDetails, terms, notes }) {
  const t = d.totals;
  return (
    <div className="w-full bg-white text-gray-900 font-sans text-xs leading-normal rounded-xl border border-gray-200 p-3.5 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          {logo && <img src={logo} alt="Logo" crossOrigin="anonymous" className="max-h-9 max-w-[120px] object-contain mb-1" />}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">{d.seller.name}</h2>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{d.title}</div>
        </div>
        <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
          <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">{d.number}</span>
          <span className="text-[11px] text-gray-600 mt-0.5">Date: {d.date}</span>
          {d.status && (
            <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: accentColor }}>
              {d.status}
            </span>
          )}
        </div>
      </div>

      <div className="w-full h-[2px] my-3.5" style={{ backgroundColor: accentColor }} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
        <div className="text-gray-600 leading-tight">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">From</div>
          {d.seller.gstin && <div className="text-gray-800 font-medium">GSTIN: {d.seller.gstin}</div>}
          {d.seller.address && <div>{d.seller.address}</div>}
          {d.seller.phone && <div>Ph: {d.seller.phone}</div>}
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Bill To</div>
          <div className="font-bold text-sm text-gray-900">{d.buyer.name}</div>
          {d.buyer.gstin && <div className="text-gray-700 mt-0.5">GSTIN: {d.buyer.gstin}</div>}
          {d.buyer.address && <div className="text-gray-600 mt-0.5">{d.buyer.address}</div>}
          {d.placeOfSupply && <div className="text-gray-600 mt-0.5">Place of supply: {d.placeOfSupply}</div>}
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Dispatch From</div>
          {d.dispatch ? (
            <>
              <div className="font-semibold text-gray-900">{d.dispatch.name}</div>
              {d.dispatch.code && <div className="text-gray-500 font-mono text-[10px]">{d.dispatch.code}</div>}
              {d.dispatch.address && <div className="text-gray-600 mt-0.5">{d.dispatch.address}</div>}
            </>
          ) : <div className="text-gray-400">—</div>}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-[10px] text-gray-500 font-semibold tracking-wider">
              <th className="py-2 px-1 w-6">#</th>
              <th className="py-2 px-2">Item</th>
              {showHsn && <th className="py-2 px-2">HSN</th>}
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Rate</th>
              {showDiscount && <th className="py-2 px-2 text-right">Discount</th>}
              <th className="py-2 px-2 text-right">Taxable</th>
              <th className="py-2 px-2 text-right">Tax</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {d.items.map((it, idx) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-2.5 px-1 text-gray-500 align-top">{idx + 1}</td>
                <td className="py-2.5 px-2 font-medium text-gray-900 align-top">{it.name}</td>
                {showHsn && <td className="py-2.5 px-2 text-gray-600 font-mono text-[10px] align-top">{it.hsn || '—'}</td>}
                <td className="py-2.5 px-2 text-right text-gray-800 font-medium align-top">
                  <div>{it.qty}</div>
                  <div className="text-[9px] text-gray-400 uppercase">{it.unit}</div>
                </td>
                <td className="py-2.5 px-2 text-right text-gray-800 align-top">{inr(it.rate)}</td>
                {showDiscount && <td className="py-2.5 px-2 text-right text-gray-600 align-top">{it.discount ? inr(it.discount) : '—'}</td>}
                <td className="py-2.5 px-2 text-right font-medium text-gray-900 align-top">{inr(it.taxable)}</td>
                <td className="py-2.5 px-2 text-right text-gray-700 align-top">{inr(it.taxAmt)} <span className="text-[9px] text-gray-400">({pct(it.taxRate)})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showTaxBreakup && d.taxRows.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-gray-600 mb-1">Tax breakup</div>
          <table className="w-full text-[10px] text-left">
            <thead className="border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="py-1.5 px-2">Rate</th>
                <th className="py-1.5 px-2 text-right">Taxable</th>
                <th className="py-1.5 px-2 text-right">CGST</th>
                <th className="py-1.5 px-2 text-right">SGST</th>
                <th className="py-1.5 px-2 text-right">IGST</th>
                <th className="py-1.5 px-2 text-right">Cess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {d.taxRows.map((r) => (
                <tr key={r.key}>
                  <td className="py-1.5 px-2 font-medium">{pct(r.rate)}</td>
                  <td className="py-1.5 px-2 text-right">{inr(r.taxable)}</td>
                  <td className="py-1.5 px-2 text-right">{r.cgst ? inr(r.cgst) : '—'}</td>
                  <td className="py-1.5 px-2 text-right">{r.sgst ? inr(r.sgst) : '—'}</td>
                  <td className="py-1.5 px-2 text-right">{r.igst ? inr(r.igst) : '—'}</td>
                  <td className="py-1.5 px-2 text-right">{r.cess ? inr(r.cess) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
        <div className="text-[10px] text-gray-500 italic max-w-sm">{d.words}</div>
        <div className="w-full sm:w-56 space-y-1 text-[11px] shrink-0">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-semibold text-gray-900">{inr(t.subtotal)}</span></div>
          {showDiscount && t.discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span className="font-semibold text-gray-900">- {inr(t.discount)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>Tax</span><span className="font-semibold text-gray-900">{inr(t.tax)}</span></div>
          {t.roundOff !== 0 && <div className="flex justify-between text-gray-600"><span>Round Off</span><span className="font-semibold text-gray-900">{inr(t.roundOff)}</span></div>}
          <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-100" style={{ color: accentColor }}>
            <span>Grand Total</span><span>{inr(t.total)}</span>
          </div>
          {t.paid > 0 && (
            <>
              <div className="flex justify-between text-gray-600"><span>Paid</span><span className="font-semibold text-gray-900">{inr(t.paid)}</span></div>
              <div className="flex justify-between font-bold text-gray-900"><span>Balance Due</span><span>{inr(t.balance)}</span></div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-[10px] text-gray-600">
        <div className="space-y-2 max-w-sm">
          {hasBank(bankDetails) && (
            <div className="space-y-0.5">
              <div className="font-semibold text-gray-800 uppercase tracking-wider mb-1">Bank Details</div>
              <BankLines b={bankDetails} labelClass="font-medium text-gray-700" />
            </div>
          )}
          <TermsNotes terms={terms} notes={notes} className="text-[9px] text-gray-500" titleClass="font-semibold text-gray-700 uppercase tracking-wider" />
        </div>
        <div className="flex items-center gap-3 self-start sm:self-end">
          {showUpiQr && bankDetails.upiId && <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} amount={dueAmount(d)} size={54} />}
          {showSignature && <Signature signature={signature} businessName={d.seller.name} imgClass="max-h-8" />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GST DETAILED (statutory, full CGST/SGST/IGST split + HSN summary)
// ─────────────────────────────────────────────────────────────────────────────
function GstDetailedTemplate({ d, logo, signature, showSignature, showUpiQr, bankDetails, terms, notes }) {
  const t = d.totals;
  const inter = d.isInter;
  return (
    <div className="w-full bg-white text-gray-950 font-sans text-xs leading-tight border-2 border-black p-3.5 sm:p-4">
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-wider">{d.title}</h1>
        <div className="text-[9px] text-gray-600">(Issued under Section 31 of Central Goods and Services Tax Act, 2017)</div>
      </div>

      <div className="grid grid-cols-12 border-b-2 border-black text-[10px]">
        <div className="col-span-12 sm:col-span-5 p-2 sm:border-r border-b sm:border-b-0 border-black">
          {logo && <img src={logo} alt="Logo" crossOrigin="anonymous" className="max-h-8 max-w-[100px] object-contain mb-1" />}
          <div className="font-bold uppercase text-[11px] break-words">{d.seller.name}</div>
          {d.seller.address && <div className="leading-tight">{d.seller.address}</div>}
          {d.seller.gstin && <div className="font-bold mt-1">GSTIN: {d.seller.gstin}</div>}
          {d.seller.state && <div>State: {d.seller.state}{d.seller.stateCode ? ` | State Code: ${d.seller.stateCode}` : ''}</div>}
        </div>
        <div className="col-span-12 sm:col-span-4 p-2 sm:border-r border-b sm:border-b-0 border-black bg-gray-50/40">
          <div><span className="font-semibold">Invoice No:</span> <span className="font-black break-all">{d.number}</span></div>
          <div><span className="font-semibold">Date:</span> {d.date}</div>
          <div><span className="font-semibold">Reverse Charge:</span> {d.reverseCharge ? 'YES' : 'NO'}</div>
          {d.placeOfSupply && <div><span className="font-semibold">Place of Supply:</span> {d.placeOfSupply}</div>}
        </div>
        <div className="col-span-12 sm:col-span-3 p-2 text-[9px] bg-gray-50/20">
          <div className="font-semibold uppercase">Dispatch From:</div>
          {d.dispatch ? (
            <>
              <div className="font-bold">{d.dispatch.name}</div>
              {d.dispatch.code && <div className="font-mono">{d.dispatch.code}</div>}
              {d.dispatch.address && <div>{d.dispatch.address}</div>}
            </>
          ) : <div>—</div>}
          <div className="mt-1"><span className="font-semibold">Date of Supply:</span> {d.date}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-black text-[10px] bg-gray-50/20">
        <div className="p-2 sm:border-r border-b sm:border-b-0 border-black">
          <div className="font-bold uppercase text-gray-600 text-[9px]">Details of Receiver (Billed To)</div>
          <div className="font-bold text-gray-900 text-[11px]">{d.buyer.name}</div>
          {d.buyer.address && <div>{d.buyer.address}</div>}
          {d.buyer.gstin && <div className="font-bold mt-0.5">GSTIN/UIN: {d.buyer.gstin}</div>}
          {d.buyer.state && <div>State: {d.buyer.state}{d.buyer.stateCode ? ` | State Code: ${d.buyer.stateCode}` : ''}</div>}
        </div>
        <div className="p-2">
          <div className="font-bold uppercase text-gray-600 text-[9px]">Details of Consignee (Shipped To)</div>
          <div className="font-bold text-gray-900 text-[11px]">{d.buyer.name}</div>
          {d.buyer.shipAddress && <div>{d.buyer.shipAddress}</div>}
          {d.buyer.gstin && <div className="font-bold mt-0.5">GSTIN/UIN: {d.buyer.gstin}</div>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-center">
              <th className="border-r border-black py-1 px-1 w-6" rowSpan={2}>#</th>
              <th className="border-r border-black py-1 px-1.5 text-left" rowSpan={2}>Description</th>
              <th className="border-r border-black py-1 px-1 w-14" rowSpan={2}>HSN/SAC</th>
              <th className="border-r border-black py-1 px-1 w-12 text-right" rowSpan={2}>Qty</th>
              <th className="border-r border-black py-1 px-1 w-14 text-right" rowSpan={2}>Rate</th>
              <th className="border-r border-black py-1 px-1 w-16 text-right" rowSpan={2}>Taxable</th>
              {inter ? (
                <th className="border-r border-black py-0.5 px-1 text-center" colSpan={2}>IGST</th>
              ) : (
                <>
                  <th className="border-r border-black py-0.5 px-1 text-center" colSpan={2}>CGST</th>
                  <th className="border-r border-black py-0.5 px-1 text-center" colSpan={2}>SGST</th>
                </>
              )}
              <th className="py-1 px-1 text-right w-16" rowSpan={2}>Total</th>
            </tr>
            <tr className="bg-gray-100 font-bold border-b border-black text-center text-[9px]">
              <th className="border-r border-black py-0.5 px-1 w-9">Rate</th>
              <th className="border-r border-black py-0.5 px-1 w-12 text-right">Amt</th>
              {!inter && (
                <>
                  <th className="border-r border-black py-0.5 px-1 w-9">Rate</th>
                  <th className="border-r border-black py-0.5 px-1 w-12 text-right">Amt</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, idx) => (
              <tr key={it.id} className="border-b border-gray-300">
                <td className="border-r border-black py-1 px-1 text-center">{idx + 1}</td>
                <td className="border-r border-black py-1 px-1.5 font-bold">{it.name}</td>
                <td className="border-r border-black py-1 px-1 text-center font-mono">{it.hsn || '—'}</td>
                <td className="border-r border-black py-1 px-1 text-right">{it.qty} {it.unit}</td>
                <td className="border-r border-black py-1 px-1 text-right">{amt(it.rate)}</td>
                <td className="border-r border-black py-1 px-1 text-right font-semibold">{amt(it.taxable)}</td>
                {inter ? (
                  <>
                    <td className="border-r border-black py-1 px-1 text-center text-[9px]">{pct(it.igstRate)}</td>
                    <td className="border-r border-black py-1 px-1 text-right">{amt(it.igst)}</td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-black py-1 px-1 text-center text-[9px]">{pct(it.cgstRate)}</td>
                    <td className="border-r border-black py-1 px-1 text-right">{amt(it.cgst)}</td>
                    <td className="border-r border-black py-1 px-1 text-center text-[9px]">{pct(it.sgstRate)}</td>
                    <td className="border-r border-black py-1 px-1 text-right">{amt(it.sgst)}</td>
                  </>
                )}
                <td className="py-1 px-1 text-right font-black">{amt(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 border-t-2 border-black pt-1.5">
        <div className="text-[9px] font-black uppercase tracking-wider mb-1">HSN/SAC Tax Summary</div>
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-center">
              <th className="border-r border-black py-1 px-1 text-left">HSN/SAC</th>
              <th className="border-r border-black py-1 px-1 text-right">Taxable Value</th>
              {inter ? (
                <th className="border-r border-black py-1 px-1 text-right">Integrated Tax</th>
              ) : (
                <>
                  <th className="border-r border-black py-1 px-1 text-right">Central Tax</th>
                  <th className="border-r border-black py-1 px-1 text-right">State Tax</th>
                </>
              )}
              <th className="py-1 px-1 text-right">Total Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.hsnRows.map((r) => (
              <tr key={r.key} className="border-b border-gray-300">
                <td className="border-r border-black py-0.5 px-1 font-mono">{r.key}</td>
                <td className="border-r border-black py-0.5 px-1 text-right">{inr(r.taxable)}</td>
                {inter ? (
                  <td className="border-r border-black py-0.5 px-1 text-right">{inr(r.igst)}</td>
                ) : (
                  <>
                    <td className="border-r border-black py-0.5 px-1 text-right">{inr(r.cgst)}</td>
                    <td className="border-r border-black py-0.5 px-1 text-right">{inr(r.sgst)}</td>
                  </>
                )}
                <td className="py-0.5 px-1 text-right font-bold">{inr(r.tax)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td className="border-r border-black py-1 px-1">TOTAL</td>
              <td className="border-r border-black py-1 px-1 text-right">{inr(t.taxable)}</td>
              {inter ? (
                <td className="border-r border-black py-1 px-1 text-right">{inr(t.igst)}</td>
              ) : (
                <>
                  <td className="border-r border-black py-1 px-1 text-right">{inr(t.cgst)}</td>
                  <td className="border-r border-black py-1 px-1 text-right">{inr(t.sgst)}</td>
                </>
              )}
              <td className="py-1 px-1 text-right font-black">{inr(t.tax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 border-t-2 border-black pt-1.5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] gap-1">
        <div><span className="font-bold">Total in Words:</span> <span className="font-semibold text-gray-800">{d.words}</span></div>
        <div className="text-right shrink-0">
          {t.roundOff !== 0 && <div className="text-[9px]">Round Off: {inr(t.roundOff)}</div>}
          <span className="text-xs font-black">Invoice Total: </span>
          <span className="text-sm font-black">{inr(t.total)}</span>
        </div>
      </div>

      <div className="mt-2 border-t-2 border-black pt-2 grid grid-cols-12 text-[9px]">
        <div className="col-span-12 sm:col-span-8 pr-2 sm:border-r border-b sm:border-b-0 border-black pb-1 sm:pb-0 space-y-1.5">
          <div>
            <div className="font-bold uppercase">Declaration:</div>
            <p className="text-gray-600 mt-0.5 leading-tight">
              We declare that this invoice shows the actual price of the goods and services described and that all particulars are true and correct.
            </p>
          </div>
          {hasBank(bankDetails) && (
            <div className="text-gray-700 flex flex-wrap gap-x-2">
              <span className="font-bold">Bank:</span>
              {[bankDetails.bankName, bankDetails.accountNumber && `A/C: ${bankDetails.accountNumber}`, bankDetails.ifsc && `IFSC: ${bankDetails.ifsc}`, bankDetails.upiId && `UPI: ${bankDetails.upiId}`]
                .filter(Boolean).join(' • ')}
            </div>
          )}
          <TermsNotes terms={terms} notes={notes} className="text-[9px] text-gray-700" titleClass="font-bold uppercase" />
        </div>
        <div className="col-span-12 sm:col-span-4 pl-0 sm:pl-2 flex flex-col items-center justify-between gap-1 pt-1 sm:pt-0">
          {showUpiQr && bankDetails.upiId && <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} amount={dueAmount(d)} size={54} />}
          {showSignature && <Signature signature={signature} businessName={d.seller.name} align="center" imgClass="max-h-8" />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. THERMAL (58 mm / 80 mm roll)
// ─────────────────────────────────────────────────────────────────────────────
function ThermalTemplate({ d, logo, signature, showHsn, showDiscount, showTaxBreakup, showUpiQr, showSignature, bankDetails, terms, notes, is58 }) {
  const t = d.totals;
  return (
    <div className={`${is58 ? 'max-w-[260px]' : 'max-w-[340px]'} w-full bg-white text-black p-4 font-mono text-[11px] leading-tight border border-dashed border-gray-400 mx-auto`}>
      <div className="text-center pb-2">
        {logo && <img src={logo} alt="Logo" crossOrigin="anonymous" className="max-h-9 mx-auto mb-1.5 object-contain" />}
        <div className="font-bold text-sm uppercase break-words">{d.seller.name}</div>
        {d.seller.gstin && <div className="text-[10px] text-gray-600">GSTIN: {d.seller.gstin}</div>}
        {d.seller.address && <div className="text-[9px] text-gray-500">{d.seller.address}</div>}
        {d.seller.phone && <div className="text-[9px] text-gray-500">Ph: {d.seller.phone}</div>}
        <div className="border-b border-dashed border-black my-2" />
        <div className="font-bold text-[11px]">{d.title}</div>
        <div className="flex justify-between text-[10px] mt-1"><span>{d.number}</span><span>{d.date}</span></div>
        <div className="text-left text-[10px] mt-1">
          <span className="font-semibold">Cust:</span> {d.buyer.name}{d.buyer.gstin ? ` (${d.buyer.gstin})` : ''}
        </div>
        {d.dispatch && <div className="text-left text-[10px]"><span className="font-semibold">From:</span> {dispatchText(d.dispatch)}</div>}
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      <div className="space-y-1.5">
        {d.items.map((it) => (
          <div key={it.id}>
            <div className="font-semibold">{it.name}</div>
            <div className="flex justify-between text-[10px] text-gray-700">
              <span>{it.qty} {it.unit} x {amt(it.rate)}{showHsn && it.hsn ? ` [HSN:${it.hsn}]` : ''}</span>
              <span>{amt(it.taxable)}</span>
            </div>
            {showDiscount && it.discount > 0 && <div className="text-[9px] text-gray-500">Discount: -{amt(it.discount)}</div>}
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between"><span>Subtotal:</span><span>{amt(t.subtotal)}</span></div>
        {showDiscount && t.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{amt(t.discount)}</span></div>}
        <div className="flex justify-between"><span>Tax Total:</span><span>{amt(t.tax)}</span></div>
        {t.roundOff !== 0 && <div className="flex justify-between"><span>Round Off:</span><span>{amt(t.roundOff)}</span></div>}
        <div className="border-t border-double border-black pt-1 flex justify-between font-bold text-[13px]"><span>GRAND TOTAL:</span><span>{inr(t.total)}</span></div>
        {t.paid > 0 && <div className="flex justify-between"><span>Balance Due:</span><span>{amt(t.balance)}</span></div>}
      </div>

      {showTaxBreakup && d.taxRows.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-[9px]">
          <div className="font-bold text-center mb-0.5">GST SUMMARY</div>
          {d.taxRows.map((r) => (
            <div key={r.key} className="flex justify-between">
              <span>{pct(r.rate)} {d.isInter ? `(IGST ${pct(r.rate)})` : `(CGST ${pct(r.rate / 2)} + SGST ${pct(r.rate / 2)})`}:</span>
              <span>{amt(r.tax)}</span>
            </div>
          ))}
        </div>
      )}

      {showUpiQr && bankDetails.upiId && (
        <div className="my-2 flex flex-col items-center">
          <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} amount={dueAmount(d)} size={70} />
          <div className="text-[9px] mt-1 text-gray-600">UPI: {bankDetails.upiId}</div>
        </div>
      )}

      {(terms || notes) && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
          <TermsNotes terms={terms} notes={notes} className="text-[9px] text-gray-700" titleClass="font-bold" />
        </div>
      )}

      {showSignature && signature && (
        <div className="mt-3 text-center">
          <img src={signature} alt="Signature" crossOrigin="anonymous" className="max-h-8 mx-auto" />
          <div className="text-[9px] border-t border-gray-400 pt-0.5 inline-block px-2">Authorized Signatory</div>
        </div>
      )}

      <div className="text-center pt-3 text-[9px] text-gray-500 border-t border-dashed border-gray-400 mt-3">Thank you for your business!</div>
    </div>
  );
}

/**
 * One invoice in the owner's chosen layout.
 * @param {Object} props.layout - Invoice Layout (theme, branding, documentVisibility, bankDetails, terms, notes)
 * @param {Object} props.doc    - from invoiceDoc.js (sampleDoc / docFromInvoice)
 */
export function InvoiceDocument({ layout = {}, doc }) {
  const { theme = 'classic', branding = {}, documentVisibility: v = {}, bankDetails = {}, terms = '', notes = '' } = layout;
  const props = {
    d: doc,
    accentColor: branding.accentColor || '#404087',
    logo: branding.logo || null,
    signature: branding.signature || null,
    showHsn: v.showHsn ?? true,
    showDiscount: v.showDiscount ?? true,
    showTaxBreakup: v.showTaxBreakup ?? true,
    showUpiQr: v.showUpiQr ?? true,
    showSignature: v.showSignature ?? true,
    bankDetails: bankDetails || {},
    terms,
    notes,
  };
  if (theme === 'modern') return <ModernTemplate {...props} />;
  if (theme === 'minimal') return <MinimalTemplate {...props} />;
  if (theme === 'gst_detailed') return <GstDetailedTemplate {...props} />;
  if (theme === 'thermal_58') return <ThermalTemplate {...props} is58 />;
  if (theme === 'thermal_80') return <ThermalTemplate {...props} is58={false} />;
  return <ClassicTemplate {...props} />;
}

