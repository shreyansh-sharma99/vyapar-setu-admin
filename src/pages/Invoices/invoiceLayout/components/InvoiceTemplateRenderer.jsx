import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, ZoomIn, ZoomOut, RotateCcw, FileText } from 'lucide-react';
import Button from '@/components/inputs/Button';

/**
 * Clean SVG QR Code generator for UPI
 */
function UpiQrCode({ upiId, accountName, amount = '2838.75', size = 76 }) {
  if (!upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(accountName || 'Merchant')}&am=${amount}&cu=INR`;
  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(upiUrl)}&margin=1`;

  return (
    <div className="flex flex-col items-center justify-center p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
      <img
        src={qrServerUrl}
        alt="UPI QR Code"
        width={size}
        height={size}
        className="block"
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <span className="text-[8px] font-medium text-gray-500 mt-1">Scan to Pay UPI</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLASSIC TEMPLATE (Traditional Bordered Grid — Accountant Standard)
// ─────────────────────────────────────────────────────────────────────────────
function ClassicTemplate({
  businessName,
  invoiceNumber,
  accentColor,
  logo,
  signature,
  showHsn,
  showDiscount,
  showTaxBreakup,
  showUpiQr,
  showSignature,
  bankDetails,
  terms,
  items,
}) {
  return (
    <div className="w-full bg-white text-gray-900 font-sans text-xs leading-normal select-none border-2 border-gray-400 p-4 sm:p-5 rounded-none shadow-sm">
      {/* Top Header: Flexible Row that never overflows */}
      <div className="flex flex-col sm:flex-row justify-between border border-gray-400">
        {/* Left: Seller Details */}
        <div className="p-3 sm:border-r border-gray-400 flex-1 min-w-0">
          {logo && (
            <img src={logo} alt="Logo" className="max-h-10 max-w-[120px] object-contain mb-1.5" />
          )}
          <h2 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-tight break-words">
            {businessName}
          </h2>
          <div className="text-[11px] text-gray-700 mt-0.5 leading-tight break-words">
            45, Shanti Nagar thakar vala Kua alwae, Rajasthan
          </div>
          <div className="text-[11px] font-semibold text-gray-900 mt-1">
            GSTIN: 29ABCDE1234F1Z5
          </div>
          <div className="text-[10px] text-gray-600">State: Rajasthan (Code: 08)</div>
        </div>

        {/* Right: Invoice Meta */}
        <div className="p-3 bg-gray-50/50 sm:w-52 shrink-0 border-t sm:border-t-0 border-gray-400 flex flex-col justify-between text-left sm:text-right">
          <div>
            <span
              className="inline-block px-2.5 py-0.5 text-xs font-black uppercase text-white tracking-wider mb-1.5"
              style={{ backgroundColor: accentColor }}
            >
              TAX INVOICE
            </span>
            <div className="text-[11px]">
              <span className="font-semibold text-gray-600">Invoice No:</span>{' '}
              <span className="font-bold text-gray-900 break-all">{invoiceNumber}</span>
            </div>
            <div className="text-[11px]">
              <span className="font-semibold text-gray-600">Date:</span>{' '}
              <span className="font-bold text-gray-900">19-Sep-2026</span>
            </div>
            <div className="text-[11px]">
              <span className="font-semibold text-gray-600">Place of Supply:</span>{' '}
              <span>Maharashtra (27)</span>
            </div>
            <div className="text-[11px]">
              <span className="font-semibold text-gray-600">Reverse Charge:</span> <span>No</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To Box */}
      <div className="border-x border-b border-gray-400 bg-gray-50/40 p-2.5">
        <div className="text-[10px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
          BILL TO (DETAILS OF RECEIVER)
        </div>
        <div className="font-bold text-sm text-gray-900">Rahul Sharma</div>
        <div className="text-[11px] text-gray-700">
          GSTIN: <span className="font-semibold">27ABCDE1234F1Z5</span> | State: Maharashtra (27)
        </div>
        <div className="text-[10px] text-gray-600">
          B-204, Willow Heights, Baner, Pune, Maharashtra 411045
        </div>
      </div>

      {/* Grid Table with Solid Borders on Every Cell */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-[11px]">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400 text-center">
              <th className="border-r border-gray-400 py-1.5 px-1.5 w-7">#</th>
              <th className="border-r border-gray-400 py-1.5 px-2 text-left">Item Description</th>
              {showHsn && <th className="border-r border-gray-400 py-1.5 px-2 w-16">HSN/SAC</th>}
              <th className="border-r border-gray-400 py-1.5 px-2 w-14 text-right">Qty</th>
              <th className="border-r border-gray-400 py-1.5 px-2 w-16 text-right">Rate</th>
              {showDiscount && (
                <th className="border-r border-gray-400 py-1.5 px-2 w-16 text-right">Discount</th>
              )}
              <th className="border-r border-gray-400 py-1.5 px-2 text-right">Taxable</th>
              <th className="border-r border-gray-400 py-1.5 px-2 w-12 text-right">Tax %</th>
              <th className="py-1.5 px-2 text-right">Tax Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-gray-300">
                <td className="border-r border-gray-300 py-2 px-1 text-center font-medium">
                  {idx + 1}
                </td>
                <td className="border-r border-gray-300 py-2 px-2 font-semibold text-gray-900">
                  {it.name}
                </td>
                {showHsn && (
                  <td className="border-r border-gray-300 py-2 px-2 text-center font-mono text-[10px]">
                    {it.hsn}
                  </td>
                )}
                <td className="border-r border-gray-300 py-2 px-2 text-right">
                  {it.qty} {it.unit}
                </td>
                <td className="border-r border-gray-300 py-2 px-2 text-right">
                  ₹{it.rate.toFixed(2)}
                </td>
                {showDiscount && (
                  <td className="border-r border-gray-300 py-2 px-2 text-right text-gray-700">
                    {it.discount ? `₹${it.discount.toFixed(2)}` : '—'}
                  </td>
                )}
                <td className="border-r border-gray-300 py-2 px-2 text-right font-medium">
                  ₹{it.taxable.toFixed(2)}
                </td>
                <td className="border-r border-gray-300 py-2 px-2 text-right">{it.taxPct}</td>
                <td className="py-2 px-2 text-right font-medium">₹{it.taxAmt.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax Breakup Table if active */}
      {showTaxBreakup && (
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
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 py-1 px-2 font-medium">GST 5%</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹1,805.00</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹45.13</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹45.13</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">—</td>
                <td className="py-1 px-2 text-right font-semibold">₹90.25</td>
              </tr>
              <tr>
                <td className="border-r border-gray-300 py-1 px-2 font-medium">GST 18%</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹800.00</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹72.00</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">₹72.00</td>
                <td className="border-r border-gray-300 py-1 px-2 text-right">—</td>
                <td className="py-1 px-2 text-right font-semibold">₹144.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Totals & Words Row */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 border border-gray-400">
        <div className="sm:col-span-7 p-2.5 sm:border-r border-b sm:border-b-0 border-gray-400 flex flex-col justify-between text-[11px]">
          <div>
            <span className="font-semibold text-gray-600">Amount in Words:</span>
            <div className="font-bold text-gray-900 mt-0.5">
              INR Two Thousand Eight Hundred Thirty-Eight and Seventy-Five Paise Only
            </div>
          </div>
          {terms && (
            <div className="mt-2 text-[10px] text-gray-600 border-t border-gray-200 pt-1">
              <span className="font-bold">Terms:</span> {terms}
            </div>
          )}
        </div>

        <div className="sm:col-span-5 p-2.5 text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">₹2,605.00</span>
          </div>
          {showDiscount && (
            <div className="flex justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium">₹50.00</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Total:</span>
            <span className="font-medium">₹233.75</span>
          </div>
          <div className="border-t-2 border-gray-800 pt-1 flex justify-between font-black text-sm border-b-4 border-double border-gray-900 pb-0.5">
            <span>GRAND TOTAL:</span>
            <span style={{ color: accentColor }}>₹2,838.75</span>
          </div>
        </div>
      </div>

      {/* Bank & Signatory Footer */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 border border-gray-400">
        {/* Left: Bank details & UPI QR */}
        <div className="p-3 sm:border-r border-b sm:border-b-0 border-gray-400 flex items-center justify-between gap-3 text-[10px]">
          <div>
            <div className="font-bold uppercase tracking-wider text-gray-800 mb-0.5">
              Bank Details
            </div>
            <div>
              <span className="font-semibold">Bank:</span>{' '}
              {bankDetails.bankName || 'State Bank of India'}
            </div>
            <div>
              <span className="font-semibold">A/C:</span>{' '}
              {bankDetails.accountNumber || '6784947474784'}
            </div>
            <div>
              <span className="font-semibold">IFSC:</span> {bankDetails.ifsc || 'SBIN0001234'}
            </div>
            {bankDetails.upiId && (
              <div>
                <span className="font-semibold">UPI:</span> {bankDetails.upiId}
              </div>
            )}
          </div>
          {showUpiQr && bankDetails.upiId && (
            <UpiQrCode
              upiId={bankDetails.upiId}
              accountName={bankDetails.accountName}
              size={64}
            />
          )}
        </div>

        {/* Right: Authorised Signatory */}
        <div className="p-3 flex flex-col justify-between text-left sm:text-right">
          <div className="text-[11px] font-bold uppercase text-gray-800">
            For {businessName}
          </div>
          <div className="my-2">
            {showSignature && signature ? (
              <img
                src={signature}
                alt="Signature"
                className="max-h-10 sm:ml-auto filter contrast-125"
              />
            ) : showSignature ? (
              <div className="h-8 flex items-end justify-start sm:justify-end font-serif italic text-sm text-gray-600">
                Metanoia
              </div>
            ) : null}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 border-t border-gray-400 pt-1">
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODERN TEMPLATE (Clean, Generous Whitespace, Sleek Badges, Contemporary)
// ─────────────────────────────────────────────────────────────────────────────
function ModernTemplate({
  businessName,
  invoiceNumber,
  accentColor = '#db2777',
  logo,
  signature,
  showHsn,
  showDiscount,
  showTaxBreakup,
  showUpiQr,
  showSignature,
  bankDetails = {},
  terms,
  items = [],
}) {
  return (
    <div className="w-full bg-white text-gray-800 font-sans text-xs leading-normal select-none rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Top Accent Bar: Dynamically styled with the chosen branding color */}
      <div className="w-full h-2.5" style={{ backgroundColor: accentColor || '#404087' }} />

      <div className="p-4 sm:p-5 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="max-h-11 max-w-[140px] object-contain mb-2"
              />
            ) : (
              <div className="mb-2">
                <svg viewBox="0 0 70 32" className="h-8 w-auto" fill="none">
                  <path d="M4 4L16 28L28 4H21L16 16L11 4H4Z" fill="#1e3a8a" />
                  <path d="M18 4L30 28L42 4H35L30 16L25 4H18Z" fill="#0f172a" />
                  <path
                    d="M36 17C36 12 39 9 46 9H56L53 14H46C42 14 41 15 41 18C41 20 43 22 47 23L51 24C57 25 59 28 59 32C59 37 55 39 48 39H37L40 34H48C52 34 54 32 54 30C54 28 52 26 48 25L44 24C38 22 36 20 36 17Z"
                    fill="#ea580c"
                    transform="scale(0.7) translate(12, -2)"
                  />
                </svg>
              </div>
            )}
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              {businessName}
            </h2>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">
              TAX INVOICE
            </div>
            <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
              45, Shanti Nagar, Rajasthan • GSTIN: 29ABCDE1234F1Z5
            </div>
          </div>

          <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              TAX INVOICE
            </span>
            <span className="font-black text-base tracking-tight text-gray-900 mt-0.5 break-all">
              {invoiceNumber}
            </span>
            <span className="text-gray-500 text-xs mt-0.5">Issued: 19 Sept 2026</span>
            <div className="mt-2">
              <span
                className="inline-block px-3.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: accentColor || '#db2777' }}
              >
                Issued
              </span>
            </div>
          </div>
        </div>

        {/* Invoiced To Floating Card */}
        <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 my-6 border border-slate-200/60 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              INVOICED TO
            </div>
            <div className="font-bold text-sm text-gray-900">Rahul Sharma</div>
            <div className="text-gray-600 text-xs mt-0.5">
              GSTIN: 27ABCDE1234F1Z5 • Place of Supply: Maharashtra (27)
            </div>
            <div className="text-gray-500 text-[11px] mt-0.5">
              B-204, Willow Heights, Baner, Pune, Maharashtra 411045
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-gray-600 shrink-0 space-y-1">
            <div>
              <span className="font-semibold text-gray-700">Due:</span> On Receipt
            </div>
            <div>
              <span className="font-semibold text-gray-700">Currency:</span> INR (₹)
            </div>
          </div>
        </div>

        {/* Modern Table with Gray Table Heading (ITEM DESCRIPTION, HSN, QTY, RATE...) */}
        <div className="overflow-x-auto my-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                <th className="py-3 px-2 text-left w-6">#</th>
                <th className="py-3 px-2 text-left">ITEM DESCRIPTION</th>
                {showHsn && <th className="py-3 px-2 text-left">HSN</th>}
                <th className="py-3 px-2 text-left">QTY</th>
                <th className="py-3 px-2 text-left">RATE</th>
                {showDiscount && <th className="py-3 px-2 text-center">DISCOUNT</th>}
                <th className="py-3 px-2 text-left">TAXABLE</th>
                {showTaxBreakup && <th className="py-3 px-2 text-center">TAX %</th>}
                <th className="py-3 px-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {items.map((it, idx) => {
                const itemTotal = it.taxable + it.taxAmt;
                return (
                  <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-slate-400 font-medium align-middle">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2 font-bold text-gray-900 align-middle">
                      {it.name}
                    </td>
                    {showHsn && (
                      <td className="py-3 px-2 text-slate-400 font-mono text-[11px] align-middle">
                        {it.hsn}
                      </td>
                    )}
                    <td className="py-3 px-2 text-left text-gray-900 font-bold align-middle">
                      {it.qty}{' '}
                      <span className="text-[10px] text-gray-400 font-normal uppercase">
                        {it.unit}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-left text-slate-700 font-medium align-middle">
                      ₹{it.rate.toFixed(2)}
                    </td>
                    {showDiscount && (
                      <td className="py-3 px-2 text-center font-semibold align-middle">
                        {it.discount ? (
                          <span className="text-emerald-500">-₹{it.discount.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-500 font-normal">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-2 text-left font-semibold text-slate-800 align-middle">
                      ₹{it.taxable.toFixed(2)}
                    </td>
                    {showTaxBreakup && (
                      <td className="py-3 px-2 text-center text-slate-400 align-middle">
                        {it.taxPct}
                      </td>
                    )}
                    <td className="py-3 px-2 text-right font-bold text-gray-900 align-middle">
                      ₹{itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tax Breakup Card if toggled */}
        {showTaxBreakup && (
          <div className="mt-6 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[11px]">
            <div className="font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tax Summary Breakup
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-gray-600">
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="font-semibold block text-gray-800">GST 5%</span>
                Taxable: ₹1,805.00 | Tax: ₹90.25
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="font-semibold block text-gray-800">GST 18%</span>
                Taxable: ₹800.00 | Tax: ₹144.00
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                <span className="font-semibold block text-gray-800">Total Tax</span>
                ₹233.75
              </div>
            </div>
          </div>
        )}

        {/* Totals Section with Pill Card */}
        <div className="flex justify-end mt-5">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-800">₹2,605.00</span>
            </div>
            {showDiscount && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied</span>
                <span className="font-semibold">-₹50.00</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Estimated Taxes</span>
              <span className="font-semibold text-gray-800">₹233.75</span>
            </div>

            {/* Total Highlight Pill */}
            <div
              className="p-3 rounded-xl flex items-center justify-between font-black text-sm mt-2"
              style={{
                backgroundColor: `${accentColor}15`,
                color: accentColor,
              }}
            >
              <span>Amount Due</span>
              <span className="text-base">₹2,838.75</span>
            </div>
          </div>
        </div>

        {/* Bank Details & QR & Signature */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-1 text-[10px] text-gray-500">
            <div className="font-bold uppercase tracking-wider text-gray-500 mb-1">
              Payment Information
            </div>
            <div>
              <span className="font-semibold text-gray-700">Bank:</span>{' '}
              {bankDetails.bankName || 'State Bank of India'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">A/C:</span>{' '}
              {bankDetails.accountNumber || '6784947474784'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">IFSC:</span>{' '}
              {bankDetails.ifsc || 'SBIN0001234'}
            </div>
            {bankDetails.upiId && (
              <div>
                <span className="font-semibold text-gray-700">UPI ID:</span> {bankDetails.upiId}
              </div>
            )}
            {terms && <div className="mt-2 text-[9px] text-gray-400 max-w-xs">{terms}</div>}
          </div>

          <div className="flex items-center gap-3 self-end">
            {showUpiQr && bankDetails.upiId && (
              <UpiQrCode
                upiId={bankDetails.upiId}
                accountName={bankDetails.accountName}
                size={66}
              />
            )}

            {showSignature && (
              <div className="text-center w-28">
                {signature ? (
                  <img
                    src={signature}
                    alt="Signature"
                    className="max-h-9 mx-auto filter contrast-125 mb-1"
                  />
                ) : (
                  <div className="h-7 flex items-end justify-center font-serif italic text-sm text-gray-500 mb-1">
                    Metanoia
                  </div>
                )}
                <div className="border-t border-gray-200 pt-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                  Authorized Sign
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MINIMAL TEMPLATE (Clean Layout with Border-Separated Table & Accent Line)
// ─────────────────────────────────────────────────────────────────────────────
function MinimalTemplate({
  businessName,
  invoiceNumber,
  accentColor = '#2563eb',
  logo,
  signature,
  showHsn,
  showDiscount,
  showTaxBreakup,
  showUpiQr,
  showSignature,
  bankDetails = {},
  terms,
  notes,
  items = [],
}) {
  return (
    <div className="w-full bg-white text-gray-900 font-sans text-xs leading-normal select-none rounded-xl border border-gray-200 p-3.5 sm:p-5 shadow-xs">
      {/* Top Header: Logo, Business Name, Tax Invoice & Invoice Number, Date, Issued Badge */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="max-h-9 max-w-[120px] object-contain mb-1"
            />
          ) : (
            <div className="w-7 h-7 mb-1 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
                <path
                  d="M12 8L28 14L38 6L26 24L38 32L24 28L14 40L18 24L8 18L12 8Z"
                  fill="url(#birdGradMin)"
                />
                <defs>
                  <linearGradient
                    id="birdGradMin"
                    x1="8"
                    y1="6"
                    x2="38"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#ec4899" />
                    <stop offset="0.5" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
            {businessName}
          </h2>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
            TAX INVOICE
          </div>
        </div>

        <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
          <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">
            {invoiceNumber}
          </span>
          <span className="text-[11px] text-gray-600 mt-0.5">Date: 19 Sept 2026</span>
          <div className="mt-1">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
              style={{ backgroundColor: accentColor || '#2563eb' }}
            >
              Issued
            </span>
          </div>
        </div>
      </div>

      {/* Vibrant Accent Divider Line */}
      <div
        className="w-full h-[2px] mt-3.5 mb-3.5"
        style={{ backgroundColor: accentColor || '#2563eb' }}
      />

      {/* Seller & Customer Details */}
      <div className="space-y-3 text-[11px]">
        {/* Seller Info */}
        <div className="text-gray-600 leading-tight">
          <div className="text-gray-800 font-medium">GSTIN: 29ABCDE1234F1Z5</div>
          <div>45, Shanti Nagar thakar vala Kua alwae</div>
          <div>Rajasthan</div>
        </div>

        {/* Bill To */}
        <div className="leading-tight">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
            BILL TO
          </div>
          <div className="font-bold text-sm text-gray-900">Rahul Sharma</div>
          <div className="text-gray-700 mt-0.5">GSTIN: 27ABCDE1234F1Z5</div>
          <div className="text-gray-600 mt-0.5">
            B-204, Willow Heights, Baner, Pune, Maharashtra 411045
          </div>
          <div className="text-gray-600 mt-0.5">Place of supply: Maharashtra</div>
        </div>
      </div>

      {/* Items Table: Separated Table Heading and Rows via Border */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-[10px] text-gray-500 font-semibold tracking-wider">
              <th className="py-2 px-1 text-left w-6">#</th>
              <th className="py-2 px-2 text-left">Item</th>
              {showHsn && <th className="py-2 px-2 text-left">HSN</th>}
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Rate</th>
              {showDiscount && <th className="py-2 px-2 text-right">Discount</th>}
              <th className="py-2 px-2 text-right">Taxable</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-2.5 px-1 text-gray-500 align-top">{idx + 1}</td>
                <td className="py-2.5 px-2 font-medium text-gray-900 align-top">
                  <div>{it.name}</div>
                </td>
                {showHsn && (
                  <td className="py-2.5 px-2 text-gray-600 font-mono text-[10px] align-top">
                    {it.hsn}
                  </td>
                )}
                <td className="py-2.5 px-2 text-right text-gray-800 font-medium align-top">
                  <div>{it.qty}</div>
                  <div className="text-[9px] text-gray-400 uppercase">{it.unit}</div>
                </td>
                <td className="py-2.5 px-2 text-right text-gray-800 align-top">
                  ₹{it.rate.toFixed(2)}
                </td>
                {showDiscount && (
                  <td className="py-2.5 px-2 text-right text-gray-600 align-top">
                    {it.discount ? `₹${it.discount.toFixed(2)}` : '—'}
                  </td>
                )}
                <td className="py-2.5 px-2 text-right font-medium text-gray-900 align-top">
                  ₹{it.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-gray-500 mt-2">
        Rates exclude tax — the tax shown is added on top of the rate.
      </div>

      {/* Tax Breakup (if toggled) */}
      {showTaxBreakup && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-gray-600 mb-1">
            Tax breakup
          </div>
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
              <tr>
                <td className="py-1.5 px-2 font-medium">5%</td>
                <td className="py-1.5 px-2 text-right">₹1,805.00</td>
                <td className="py-1.5 px-2 text-right">₹45.13</td>
                <td className="py-1.5 px-2 text-right">₹45.13</td>
                <td className="py-1.5 px-2 text-right">—</td>
                <td className="py-1.5 px-2 text-right">—</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">18%</td>
                <td className="py-1.5 px-2 text-right">₹800.00</td>
                <td className="py-1.5 px-2 text-right">₹72.00</td>
                <td className="py-1.5 px-2 text-right">₹72.00</td>
                <td className="py-1.5 px-2 text-right">—</td>
                <td className="py-1.5 px-2 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Totals Block */}
      <div className="flex justify-end mt-4">
        <div className="w-56 space-y-1 text-[11px]">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">₹2,605.00</span>
          </div>
          {showDiscount && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span className="font-semibold text-gray-900">₹50.00</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span className="font-semibold text-gray-900">₹233.75</span>
          </div>
          <div
            className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-100"
            style={{ color: accentColor || '#2563eb' }}
          >
            <span>Grand Total</span>
            <span>₹2,838.75</span>
          </div>
        </div>
      </div>

      {/* Bank details, Notes & Signature */}
      <div className="mt-6 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-[10px] text-gray-600">
        <div className="space-y-0.5">
          <div className="font-semibold text-gray-800 uppercase tracking-wider mb-1">
            Bank Details
          </div>
          <div>
            <span className="font-medium text-gray-700">Bank:</span>{' '}
            {bankDetails.bankName || 'State Bank of India'}
          </div>
          <div>
            <span className="font-medium text-gray-700">A/C:</span>{' '}
            {bankDetails.accountNumber || '6784947474784'} • IFSC:{' '}
            {bankDetails.ifsc || 'SBIN0001234'}
          </div>
          {bankDetails.upiId && (
            <div>
              <span className="font-medium text-gray-700">UPI ID:</span> {bankDetails.upiId}
            </div>
          )}
          {terms && <div className="mt-1.5 text-[9px] text-gray-400 max-w-xs">{terms}</div>}
          {notes && <div className="text-[9px] text-gray-400 max-w-xs">{notes}</div>}
        </div>

        <div className="flex items-center gap-3 self-start sm:self-end">
          {showUpiQr && bankDetails.upiId && (
            <UpiQrCode upiId={bankDetails.upiId} accountName={bankDetails.accountName} size={54} />
          )}
          {showSignature && signature ? (
            <div className="text-right">
              <img src={signature} alt="Sign" className="max-h-8 ml-auto filter contrast-125" />
              <div className="text-[8px] uppercase tracking-wider text-gray-400">
                Authorized Signatory
              </div>
            </div>
          ) : showSignature ? (
            <div className="text-right">
              <div className="font-serif italic text-sm text-gray-600">Patel Industries</div>
              <div className="text-[8px] uppercase tracking-wider text-gray-400">
                Authorized Signatory
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GST DETAILED TEMPLATE (Tally Statutory Audit Layout — Complete Split)
// ─────────────────────────────────────────────────────────────────────────────
function GstDetailedTemplate({
  businessName,
  invoiceNumber,
  signature,
  showSignature,
  bankDetails,
  items,
}) {
  return (
    <div className="w-full bg-white text-gray-950 font-sans text-xs leading-tight select-none border-2 border-black p-3.5 sm:p-4 rounded-none shadow-sm">
      {/* Statutory Header */}
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-wider">TAX INVOICE</h1>
        <div className="text-[9px] text-gray-600">
          (Issued under Section 31 of Central Goods and Services Tax Act, 2017)
        </div>
      </div>

      {/* 3-Column Info Grid */}
      <div className="grid grid-cols-12 border-b-2 border-black text-[10px]">
        {/* Seller Info */}
        <div className="col-span-12 sm:col-span-5 p-2 sm:border-r border-b sm:border-b-0 border-black">
          <div className="font-bold uppercase text-[11px] break-words">{businessName}</div>
          <div className="leading-tight">45, Shanti Nagar thakar vala Kua alwae, Rajasthan</div>
          <div className="font-bold mt-1">GSTIN: 29ABCDE1234F1Z5</div>
          <div>State: Rajasthan | State Code: 08</div>
        </div>

        {/* Invoice Info */}
        <div className="col-span-12 sm:col-span-4 p-2 sm:border-r border-b sm:border-b-0 border-black bg-gray-50/40">
          <div>
            <span className="font-semibold">Invoice No:</span>{' '}
            <span className="font-black break-all">{invoiceNumber}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span> 19-09-2026
          </div>
          <div>
            <span className="font-semibold">Reverse Charge:</span> NO
          </div>
          <div>
            <span className="font-semibold">Place of Supply:</span> 27 - Maharashtra
          </div>
        </div>

        {/* Transport Info */}
        <div className="col-span-12 sm:col-span-3 p-2 text-[9px] bg-gray-50/20">
          <div>
            <span className="font-semibold">Transporter:</span> Direct
          </div>
          <div>
            <span className="font-semibold">Vehicle No:</span> DL-01-AB-1234
          </div>
          <div>
            <span className="font-semibold">Date of Supply:</span> 19-09-2026
          </div>
        </div>
      </div>

      {/* Buyer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-black text-[10px] bg-gray-50/20">
        <div className="p-2 sm:border-r border-b sm:border-b-0 border-black">
          <div className="font-bold uppercase text-gray-600 text-[9px]">
            Details of Receiver (Billed To)
          </div>
          <div className="font-bold text-gray-900 text-[11px]">Rahul Sharma</div>
          <div>B-204, Willow Heights, Baner, Pune, Maharashtra 411045</div>
          <div className="font-bold mt-0.5">GSTIN/UIN: 27ABCDE1234F1Z5</div>
          <div>State: Maharashtra | State Code: 27</div>
        </div>

        <div className="p-2">
          <div className="font-bold uppercase text-gray-600 text-[9px]">
            Details of Consignee (Shipped To)
          </div>
          <div className="font-bold text-gray-900 text-[11px]">Rahul Sharma</div>
          <div>B-204, Willow Heights, Baner, Pune, Maharashtra 411045</div>
          <div className="font-bold mt-0.5">GSTIN/UIN: 27ABCDE1234F1Z5</div>
          <div>State: Maharashtra | State Code: 27</div>
        </div>
      </div>

      {/* Detailed Tally Multi-Column GST Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-center">
              <th className="border-r border-black py-1 px-1 w-6" rowSpan={2}>
                #
              </th>
              <th className="border-r border-black py-1 px-1.5 text-left" rowSpan={2}>
                Description
              </th>
              <th className="border-r border-black py-1 px-1 w-14" rowSpan={2}>
                HSN/SAC
              </th>
              <th className="border-r border-black py-1 px-1 w-12 text-right" rowSpan={2}>
                Qty
              </th>
              <th className="border-r border-black py-1 px-1 w-12 text-right" rowSpan={2}>
                Rate
              </th>
              <th className="border-r border-black py-1 px-1 w-14 text-right" rowSpan={2}>
                Taxable
              </th>
              <th className="border-r border-black py-0.5 px-1 text-center" colSpan={2}>
                CGST
              </th>
              <th className="border-r border-black py-0.5 px-1 text-center" colSpan={2}>
                SGST
              </th>
              <th className="py-1 px-1 text-right w-16" rowSpan={2}>
                Total
              </th>
            </tr>
            <tr className="bg-gray-100 font-bold border-b border-black text-center text-[9px]">
              <th className="border-r border-black py-0.5 px-1 w-8">Rate</th>
              <th className="border-r border-black py-0.5 px-1 w-11 text-right">Amt</th>
              <th className="border-r border-black py-0.5 px-1 w-8">Rate</th>
              <th className="border-r border-black py-0.5 px-1 w-11 text-right">Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {items.map((it, idx) => {
              const cgstRate = it.taxPct === '5%' ? '2.5%' : '9%';
              const cgstAmt = (it.taxAmt / 2).toFixed(2);
              const sgstRate = cgstRate;
              const sgstAmt = cgstAmt;
              const rowTotal = (it.taxable + it.taxAmt).toFixed(2);

              return (
                <tr key={it.id}>
                  <td className="border-r border-black py-1 px-1 text-center">{idx + 1}</td>
                  <td className="border-r border-black py-1 px-1.5 font-bold">{it.name}</td>
                  <td className="border-r border-black py-1 px-1 text-center font-mono">
                    {it.hsn}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-right">
                    {it.qty} {it.unit}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-right">
                    {it.rate.toFixed(2)}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-right font-semibold">
                    {it.taxable.toFixed(2)}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-center text-[9px]">
                    {cgstRate}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-right">{cgstAmt}</td>
                  <td className="border-r border-black py-1 px-1 text-center text-[9px]">
                    {sgstRate}
                  </td>
                  <td className="border-r border-black py-1 px-1 text-right">{sgstAmt}</td>
                  <td className="py-1 px-1 text-right font-black">{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formal HSN Summary Audit Table */}
      <div className="mt-2.5 border-t-2 border-black pt-1.5">
        <div className="text-[9px] font-black uppercase tracking-wider mb-1">
          HSN/SAC Tax Audit Summary
        </div>
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-center">
              <th className="border-r border-black py-1 px-1 text-left">HSN/SAC</th>
              <th className="border-r border-black py-1 px-1 text-right">Taxable Value</th>
              <th className="border-r border-black py-1 px-1 text-right">Central Tax</th>
              <th className="border-r border-black py-1 px-1 text-right">State Tax</th>
              <th className="py-1 px-1 text-right">Total Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="border-r border-black py-0.5 px-1 font-mono">1006 (Basmati)</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹1,805.00</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹45.13 (2.5%)</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹45.13 (2.5%)</td>
              <td className="py-0.5 px-1 text-right font-bold">₹90.25</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="border-r border-black py-0.5 px-1 font-mono">1512 (Oil & Serv)</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹800.00</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹72.00 (9%)</td>
              <td className="border-r border-black py-0.5 px-1 text-right">₹72.00 (9%)</td>
              <td className="py-0.5 px-1 text-right font-bold">₹144.00</td>
            </tr>
            <tr className="bg-gray-50 font-bold">
              <td className="border-r border-black py-1 px-1">TOTAL</td>
              <td className="border-r border-black py-1 px-1 text-right">₹2,605.00</td>
              <td className="border-r border-black py-1 px-1 text-right">₹117.13</td>
              <td className="border-r border-black py-1 px-1 text-right">₹117.13</td>
              <td className="py-1 px-1 text-right font-black">₹234.25</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Words and Grand Total */}
      <div className="mt-2 border-t-2 border-black pt-1.5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] gap-1">
        <div>
          <span className="font-bold">Total in Words:</span>{' '}
          <span className="font-semibold text-gray-800">
            INR Two Thousand Eight Hundred Thirty-Eight and Seventy-Five Paise Only
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-black">Invoice Total: </span>
          <span className="text-sm font-black">₹2,838.75</span>
        </div>
      </div>

      {/* Declaration & Signatory */}
      <div className="mt-2 border-t-2 border-black pt-2 grid grid-cols-12 text-[9px]">
        <div className="col-span-12 sm:col-span-8 pr-2 sm:border-r border-b sm:border-b-0 border-black pb-1 sm:pb-0">
          <div className="font-bold uppercase">Declaration:</div>
          <p className="text-gray-600 mt-0.5 leading-tight">
            We declare that this invoice shows the actual price of the goods and services
            described and that all particulars are true and correct.
          </p>
          <div className="mt-1 text-gray-700">
            <span className="font-bold">Bank:</span> {bankDetails.bankName || 'SBI'} • A/C:{' '}
            {bankDetails.accountNumber || '6784947474784'} • IFSC:{' '}
            {bankDetails.ifsc || 'SBIN0001234'}
          </div>
        </div>

        <div className="col-span-12 sm:col-span-4 pl-0 sm:pl-2 text-center flex flex-col justify-between pt-1 sm:pt-0">
          <div className="font-bold uppercase">For {businessName}</div>
          <div className="my-1">
            {showSignature && signature ? (
              <img
                src={signature}
                alt="Sign"
                className="max-h-8 mx-auto filter grayscale contrast-125"
              />
            ) : (
              <div className="h-5 font-serif italic text-xs">Metanoia</div>
            )}
          </div>
          <div className="font-bold uppercase border-t border-black pt-0.5">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. THERMAL TEMPLATE (58mm / 80mm Roll Format)
// ─────────────────────────────────────────────────────────────────────────────
function ThermalTemplate({
  businessName,
  invoiceNumber,
  logo,
  signature,
  showHsn,
  showDiscount,
  showTaxBreakup,
  showUpiQr,
  showSignature,
  bankDetails,
  items,
  is58,
}) {
  const widthClass = is58 ? 'max-w-[260px]' : 'max-w-[340px]';

  return (
    <div
      className={`${widthClass} w-full bg-white text-black p-4 rounded-none shadow-md font-mono text-[11px] leading-tight select-none border border-dashed border-gray-400 mx-auto`}
    >
      <div className="text-center pb-2">
        {logo && (
          <img
            src={logo}
            alt="Logo"
            className="max-h-9 mx-auto mb-1.5 object-contain filter grayscale"
          />
        )}
        <div className="font-bold text-sm uppercase break-words">{businessName}</div>
        <div className="text-[10px] text-gray-600">GSTIN: 29ABCDE1234F1Z5</div>
        <div className="text-[9px] text-gray-500">45, Shanti Nagar, Rajasthan</div>
        <div className="border-b border-dashed border-black my-2" />
        <div className="font-bold text-[11px]">TAX INVOICE</div>
        <div className="flex justify-between text-[10px] mt-1">
          <span>{invoiceNumber}</span>
          <span>19/09/2026</span>
        </div>
        <div className="text-left text-[10px] mt-1">
          <span className="font-semibold">Cust:</span> Rahul Sharma (27ABCDE1234F1Z5)
        </div>
      </div>

      <div className="border-b border-dashed border-black my-1.5" />

      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id}>
            <div className="font-semibold">{it.name}</div>
            <div className="flex justify-between text-[10px] text-gray-700">
              <span>
                {it.qty} {it.unit} x ₹{it.rate}
                {showHsn && it.hsn !== '—' && ` [HSN:${it.hsn}]`}
              </span>
              <span>₹{it.taxable.toFixed(2)}</span>
            </div>
            {showDiscount && it.discount && (
              <div className="text-[9px] text-gray-500">Discount: -₹{it.discount}</div>
            )}
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹2,605.00</span>
        </div>
        {showDiscount && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>₹50.00</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax Total:</span>
          <span>₹233.75</span>
        </div>
        <div className="border-t border-double border-black pt-1 flex justify-between font-bold text-[13px]">
          <span>GRAND TOTAL:</span>
          <span>₹2,838.75</span>
        </div>
      </div>

      {showTaxBreakup && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-[9px]">
          <div className="font-bold text-center mb-0.5">GST SUMMARY</div>
          <div className="flex justify-between">
            <span>5% (CGST 2.5% + SGST 2.5%):</span>
            <span>₹90.25</span>
          </div>
          <div className="flex justify-between">
            <span>18% (CGST 9% + SGST 9%):</span>
            <span>₹144.00</span>
          </div>
        </div>
      )}

      {showUpiQr && bankDetails.upiId && (
        <div className="my-2 text-center">
          <UpiQrCode
            upiId={bankDetails.upiId}
            accountName={bankDetails.accountName}
            size={70}
          />
          <div className="text-[9px] mt-1 text-gray-600">UPI: {bankDetails.upiId}</div>
        </div>
      )}

      {showSignature && signature && (
        <div className="mt-3 text-center">
          <img
            src={signature}
            alt="Signature"
            className="max-h-8 mx-auto filter grayscale contrast-125"
          />
          <div className="text-[9px] border-t border-gray-400 pt-0.5 inline-block px-2">
            Authorized Signatory
          </div>
        </div>
      )}

      <div className="text-center pt-3 text-[9px] text-gray-500 border-t border-dashed border-gray-400 mt-3">
        Thank you for your business!
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEMPLATE RENDERER CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceTemplateRenderer({ layout, businessName = 'Patel industries' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const modalRef = useRef(null);
  const mouseDownTargetRef = useRef(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFullscreen(false);
      setIsClosing(false);
      setZoom(100);
    }, 200);
  }, []);

  const handleOpen = () => {
    setIsFullscreen(true);
    setIsClosing(false);
    setZoom(100);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Handle Escape key to close fullscreen modal
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleClose]);

  const handleBackdropMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropClick = (e) => {
    // Only dismiss if both mousedown and click originated on backdrop itself (outside modal dialog)
    if (
      e.target === e.currentTarget &&
      mouseDownTargetRef.current === e.currentTarget
    ) {
      handleClose();
    }
  };

  const {
    theme = 'classic',
    branding = {},
    documentVisibility = {},
    numberingFormat = {},
    bankDetails = {},
    terms = '',
    notes = '',
  } = layout || {};

  const accentColor = branding.accentColor || '#404087';
  const logo = branding.logo;
  const signature = branding.signature;

  const showHsn = documentVisibility.showHsn ?? true;
  const showDiscount = documentVisibility.showDiscount ?? true;
  const showTaxBreakup = documentVisibility.showTaxBreakup ?? true;
  const showUpiQr = documentVisibility.showUpiQr ?? true;
  const showSignature = documentVisibility.showSignature ?? true;

  // Compute live invoice series number
  const prefix = numberingFormat.prefixPerSeries?.INV || 'INV';
  const zeroPadding = numberingFormat.zeroPadding || 5;
  const seqStr = String(42).padStart(zeroPadding, '0');
  const template = numberingFormat.template || '{PREFIX}/{FYSHORT}/{SEQ}';
  const invoiceNumber = template
    .replace('{PREFIX}', prefix)
    .replace('{FY}', '2026-2027')
    .replace('{FYSHORT}', '2026-27')
    .replace('{SEQ}', seqStr);

  const items = [
    {
      id: 1,
      name: 'Basmati Rice 5kg',
      hsn: '1006',
      qty: 2,
      unit: 'PKT',
      rate: 650.0,
      discount: null,
      taxable: 1300.0,
      taxPct: '5%',
      taxAmt: 65.0,
    },
    {
      id: 2,
      name: 'Sunflower Oil 1L',
      hsn: '1512',
      qty: 3,
      unit: 'BTL',
      rate: 185.0,
      discount: 50.0,
      taxable: 505.0,
      taxPct: '5%',
      taxAmt: 25.25,
    },
    {
      id: 3,
      name: 'Home visit — AC service',
      hsn: '—',
      qty: 1,
      unit: 'PCS',
      rate: 800.0,
      discount: null,
      taxable: 800.0,
      taxPct: '18%',
      taxAmt: 144.0,
    },
  ];

  const templateProps = {
    businessName,
    invoiceNumber,
    accentColor,
    logo,
    signature,
    showHsn,
    showDiscount,
    showTaxBreakup,
    showUpiQr,
    showSignature,
    bankDetails,
    terms,
    notes,
    items,
  };

  const renderActiveTheme = () => (
    <>
      {theme === 'classic' && <ClassicTemplate {...templateProps} />}
      {theme === 'modern' && <ModernTemplate {...templateProps} />}
      {theme === 'minimal' && <MinimalTemplate {...templateProps} />}
      {theme === 'gst_detailed' && <GstDetailedTemplate {...templateProps} />}
      {theme === 'thermal_58' && <ThermalTemplate {...templateProps} is58={true} />}
      {theme === 'thermal_80' && <ThermalTemplate {...templateProps} is58={false} />}
    </>
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Header with Theme Name and Eye (View) Button */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-white/10">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Template:{' '}
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
            {theme.replace('_', ' ')}
          </span>
        </span>

        {/* Eye View Button with hover text */}
        <div className="relative group">
          <Button
            variant="outline"
            size="xs"
            onClick={handleOpen}
            title="View in Full Page"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium">View</span>
          </Button>
        </div>
      </div>

      {/* RENDER THE ACTIVE THEME TEMPLATE (with min-width container to prevent collapse) */}
      <div className="w-full overflow-x-auto pb-1.5 scrollbar-thin">
        <div className="min-w-[460px]">
          {renderActiveTheme()}
        </div>
      </div>

      {/* FULL PAGE MODAL PREVIEW (with Portal, Click Outside to Close, Dedicated Y-Axis Scroll, and Smooth Transitions) */}
      {isFullscreen &&
        createPortal(
          <div
            className={`fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 ${
              isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
            }`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseDown={handleBackdropMouseDown}
            onClick={handleBackdropClick}
          >
            {/* Modal Dialog Box (Clicking inside will NEVER close) */}
            <div
              ref={modalRef}
              className={`relative w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden ${
                isClosing ? 'modal-content-exit' : 'modal-content-enter'
              }`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar (Sticky / flex-shrink-0) */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-none">
                        Invoice Full Page Preview
                      </span>
                      <span className="text-[11px] uppercase px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        {theme.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Live preview showing real-time formatting & calculations
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Zoom Controls */}
                  <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-white/10 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(prev - 10, 70))}
                      disabled={zoom <= 70}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 font-mono text-[11px] font-semibold text-gray-700 dark:text-gray-200 min-w-[36px] text-center select-none">
                      {zoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(prev + 10, 150))}
                      disabled={zoom >= 150}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 cursor-pointer transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {zoom !== 100 && (
                      <button
                        type="button"
                        onClick={() => setZoom(100)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                        title="Reset Zoom (100%)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Close Button using Project <Button> */}
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleClose}
                    className="flex items-center gap-1.5 text-xs cursor-pointer border-gray-300 dark:border-white/10 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    <X className="w-4 h-4 text-red-500" />
                    <span>Close</span>
                  </Button>
                </div>
              </div>

              {/* Modal Body: DEDICATED Y-AXIS SCROLL CONTAINER (Guaranteed smooth Y-axis scroll) */}
              <div
                className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/80 custom-scrollbar focus:outline-none"
                style={{ overscrollBehavior: 'contain' }}
                tabIndex={0}
              >
                <div
                  className="w-full flex flex-col items-center py-2"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-gray-200/90 p-5 sm:p-10 mb-10">
                    {renderActiveTheme()}
                  </div>
                </div>
              </div>

              {/* Modal Footer (Flex-shrink-0) */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-gray-200 dark:border-white/10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    Scroll vertically on the document to view all sections • Click outside or press Esc to close
                  </span>
                </span>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleClose}
                  className="text-xs cursor-pointer"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
