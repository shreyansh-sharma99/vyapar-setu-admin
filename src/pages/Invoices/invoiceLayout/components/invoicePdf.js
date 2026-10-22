import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/**
 * Save an on-screen invoice (a DOM node) as a PDF that looks exactly like it.
 * A4 pages (8 mm margin, long invoices continue on the next page), or one
 * receipt-width page for thermal themes.
 *
 * @param {HTMLElement} node
 * @param {string} fileName
 * @param {{ thermalWidthMm?: number }} [opts] - set for 58 / 80 mm receipts
 */
export const downloadNodeAsPdf = async (node, fileName, { thermalWidthMm } = {}) => {
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
  const img = await loadImage(dataUrl);

  if (thermalWidthMm) {
    const w = thermalWidthMm;
    const h = (img.height * w) / img.width;
    const pdf = new jsPDF({ unit: 'mm', format: [w, h], orientation: 'portrait' });
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
    pdf.save(fileName);
    return;
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 8;
  const pageW = 210 - margin * 2;
  const pageH = 297 - margin * 2;
  const mmPerPx = pageW / img.width;
  const sliceHeightPx = Math.floor(pageH / mmPerPx);

  if (img.height <= sliceHeightPx) {
    pdf.addImage(dataUrl, 'PNG', margin, margin, pageW, img.height * mmPerPx);
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
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, pageW, h * mmPerPx);
    }
  }
  pdf.save(fileName);
};
