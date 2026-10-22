import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { InvoiceDocument } from '@/pages/Invoices/invoiceLayout/components/InvoiceTemplates';
import { docFromInvoice, isThermal } from '@/pages/Invoices/invoiceLayout/components/invoiceDoc';
import { downloadNodeAsPdf } from '@/pages/Invoices/invoiceLayout/components/invoicePdf';
import { getSalesInvoiceByIdApi } from './services/salesInvoiceService';

/** Width the invoice is drawn at for A4 (≈ 210 mm at 96 dpi), same as on the invoice page. */
export const A4_PX = 794;

/** Page width in px for a theme (thermal rolls are narrow). */
export const printWidth = (theme) => (theme === 'thermal_58' ? 260 : theme === 'thermal_80' ? 340 : A4_PX);

const waitForImages = (root, timeoutMs = 6000) => Promise.race([
  Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete
    ? Promise.resolve()
    : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })))),
  new Promise((resolve) => setTimeout(resolve, timeoutMs)),
]);

/**
 * Download a sales invoice as a PDF in the owner's Invoice Layout design.
 * Pass the invoice as GET /sales-invoices/:id returns it (with `print`), or just its id.
 */
export const downloadInvoiceLayoutPdf = async ({ invoice, id }) => {
  let inv = invoice;
  if (!inv?.print) {
    const res = await getSalesInvoiceByIdApi(id || inv?._id);
    inv = res?.data || res;
  }
  const layout = inv.print?.layout || {};
  const thermal = isThermal(layout.theme);

  // draw the invoice off-screen at print width, capture it, then clean up
  const host = document.createElement('div');
  host.className = 'vs-invoice-print';
  host.style.cssText = `position:fixed;left:-10000px;top:0;background:#fff;width:${printWidth(layout.theme)}px;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<InvoiceDocument layout={layout} doc={docFromInvoice(inv)} />));
    await waitForImages(host);
    const node = host.firstElementChild || host;
    await downloadNodeAsPdf(node, `Invoice-${(inv.invoiceNumber || 'INV').replace(/[^\w.-]/g, '_')}.pdf`, {
      thermalWidthMm: thermal ? (layout.theme === 'thermal_58' ? 58 : 80) : undefined,
    });
  } finally {
    root.unmount();
    host.remove();
  }
};
