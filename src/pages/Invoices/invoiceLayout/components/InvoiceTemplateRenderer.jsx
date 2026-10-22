import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, ZoomIn, ZoomOut, RotateCcw, FileText } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { InvoiceDocument } from './InvoiceTemplates';
import { sampleDoc } from './invoiceDoc';

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

  const theme = layout?.theme || 'classic';
  const numberingFormat = layout?.numberingFormat || {};

  // Live invoice number from the numbering format being edited
  const prefix = numberingFormat.prefixPerSeries?.INV || 'INV';
  const zeroPadding = numberingFormat.zeroPadding || 5;
  const invoiceNumber = (numberingFormat.template || '{PREFIX}/{FYSHORT}/{SEQ}')
    .replace('{PREFIX}', prefix)
    .replace('{FY}', '2026-2027')
    .replace('{FYSHORT}', '2026-27')
    .replace('{SEQ}', String(42).padStart(zeroPadding, '0'));

  const doc = sampleDoc({ businessName, invoiceNumber });
  const renderActiveTheme = () => <InvoiceDocument layout={layout || {}} doc={doc} />;

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
