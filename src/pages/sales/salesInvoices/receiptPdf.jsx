import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { downloadNodeAsPdf } from '@/pages/Invoices/invoiceLayout/components/invoicePdf';
import { ReceiptDocument, RECEIPT_PX } from './ReceiptPrint';

/** Draws the receipt off-screen and downloads it as a PDF. */
export const downloadReceiptPdf = async ({ invoice, receipt }) => {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;background:#fff;width:${RECEIPT_PX}px;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ReceiptDocument invoice={invoice} receipt={receipt} />));
    const node = host.firstElementChild || host;
    await downloadNodeAsPdf(node, `Receipt-${(receipt.receiptNumber || 'RCP').replace(/[^\w.-]/g, '_')}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
};
