import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { isValidEan13 } from '../utils/productUtils';

/**
 * Barcode drawn into an SVG with JsBarcode.
 * EAN-13 when the code is a valid 13-digit EAN, otherwise CODE128.
 * The SVG scales to its box (width/height 100%).
 */
export default function BarcodeSvg({ value, displayValue = true, fontSize = 16, style }) {
  const ref = useRef(null);
  const code = String(value || '').trim();
  const format = isValidEan13(code) ? 'EAN13' : 'CODE128';

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!code) return;
    try {
      JsBarcode(svg, code, {
        format,
        width: 2,
        height: 60,
        margin: 0,
        displayValue,
        fontSize,
        textMargin: 1,
        font: 'Arial',
        background: '#ffffff',
        lineColor: '#000000',
      });
      // JsBarcode writes fixed px width/height and REPLACES the style attribute,
      // which drops our 100% sizing — the barcode then overflowed the label and
      // pushed the price / MRP / SKU row out. Make it scale to its box again.
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      Object.assign(svg.style, { width: '100%', height: '100%', display: 'block' });
    } catch {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 200 40');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '100');
      text.setAttribute('y', '25');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14');
      text.textContent = code;
      svg.appendChild(text);
    }
  }, [code, format, displayValue, fontSize]);

  return (
    <svg
      ref={ref}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      aria-label={`Barcode ${code}`}
    />
  );
}
