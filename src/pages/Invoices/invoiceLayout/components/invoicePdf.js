import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/**
 * Turn an on-screen invoice (a DOM node) into a PDF that looks exactly like it.
 * A4 pages (8 mm margin, long invoices continue on the next page), or one
 * receipt-width page for thermal themes.
 *
 * @param {HTMLElement} node
 * @param {{ thermalWidthMm?: number, jpeg?: boolean }} [opts] - thermalWidthMm for 58 / 80 mm receipts;
 *        jpeg: store the page picture as a high-quality JPEG (same look, far smaller — for email)
 * @returns {Promise<jsPDF>}
 */
export const nodeToPdf = async (node, { thermalWidthMm, jpeg = false } = {}) => {
  const shot = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true };
  const dataUrl = jpeg ? await toJpeg(node, { ...shot, quality: 0.92 }) : await toPng(node, shot);
  const fmt = jpeg ? 'JPEG' : 'PNG';
  const img = await loadImage(dataUrl);

  if (thermalWidthMm) {
    const w = thermalWidthMm;
    const h = (img.height * w) / img.width;
    const pdf = new jsPDF({ compress: true, unit: 'mm', format: [w, h], orientation: 'portrait' });
    pdf.addImage(dataUrl, fmt, 0, 0, w, h);
    return pdf;
  }

  const pdf = new jsPDF({ compress: true, unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 8;
  const pageW = 210 - margin * 2;
  const pageH = 297 - margin * 2;
  const mmPerPx = pageW / img.width;
  const sliceHeightPx = Math.floor(pageH / mmPerPx);

  if (img.height <= sliceHeightPx) {
    pdf.addImage(dataUrl, fmt, margin, margin, pageW, img.height * mmPerPx);
  } else {
    // long invoice: cut the picture into page-high slices
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    for (let y = 0, page = 0; y < img.height; y += sliceHeightPx, page += 1) {
      const h = Math.min(sliceHeightPx, img.height - y);
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, h);
      ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(jpeg ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png'), fmt, margin, margin, pageW, h * mmPerPx);
    }
  }
  return pdf;
};

/** Save an on-screen invoice (a DOM node) as a PDF file. */
export const downloadNodeAsPdf = async (node, fileName, opts = {}) => {
  (await nodeToPdf(node, opts)).save(fileName);
};

/**
 * Print an on-screen invoice (a DOM node) through the browser's print dialog — the same
 * pages as the PDF: A4 with an 8 mm margin (long invoices continue on the next page), or one
 * receipt-width page for thermal themes. The page pictures go into an off-screen frame that
 * is printed (a PDF in a hidden frame often prints blank in Chrome).
 */
export const printNode = async (node, { thermalWidthMm } = {}) => {
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
  const img = await loadImage(dataUrl);
  const pages = [];
  let pageCss;
  if (thermalWidthMm) {
    pages.push(dataUrl);
    pageCss = `@page { size: ${thermalWidthMm}mm auto; margin: 0; } img { width: ${thermalWidthMm}mm; }`;
  } else {
    const margin = 8;
    const pageW = 210 - margin * 2;
    const sliceHeightPx = Math.floor((297 - margin * 2) / (pageW / img.width));
    if (img.height <= sliceHeightPx) {
      pages.push(dataUrl);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      for (let y = 0; y < img.height; y += sliceHeightPx) {
        const h = Math.min(sliceHeightPx, img.height - y);
        canvas.height = h;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, h);
        ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
        pages.push(canvas.toDataURL('image/png'));
      }
    }
    pageCss = `@page { size: A4; margin: ${margin}mm; } img { width: ${pageW}mm; }`;
  }

  const frame = document.createElement('iframe');
  // off-screen but full size: a 0×0 or hidden frame can print an empty page
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><title>Invoice</title><style>
    html, body { margin: 0; padding: 0; background: #fff; }
    img { display: block; page-break-after: always; break-after: page; }
    img:last-child { page-break-after: auto; break-after: auto; }
    ${pageCss}
  </style></head><body>${pages.map((src) => `<img src="${src}" alt="">`).join('')}</body></html>`);
  doc.close();
  await Promise.all([...doc.images].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }))));
  const win = frame.contentWindow;
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  // browsers without afterprint: remove later
  setTimeout(() => frame.isConnected && frame.remove(), 120000);
};
