import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, Check, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onSave,
  initialValue = ''
}) {
  const [barcodeValue, setBarcodeValue] = useState(initialValue);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningState, setScanningState] = useState('idle'); // 'idle' | 'initializing' | 'active' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [animating, setAnimating] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isClosingRef = useRef(false);

  const onSaveRef = useRef(onSave);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSaveRef.current = onSave;
    onCloseRef.current = onClose;
  }, [onSave, onClose]);

  // Sync initial value when modal opens
  useEffect(() => {
    if (isOpen) {
      setBarcodeValue(initialValue);
      setErrorMsg('');
      setScanningState('idle');
      setAnimating(false);
      isClosingRef.current = false;
      requestAnimationFrame(() => setAnimating(true));
    }
  }, [isOpen, initialValue]);

  // Handle modal closing
  const handleClose = useCallback(async () => {
    isClosingRef.current = true;
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner on close:", err);
      }
    }
    setIsScanning(false);
    setScanningState('idle');
    onCloseRef.current();
  }, []);

  // Esc key closure
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // 1. Fetch camera devices once on open
  useEffect(() => {
    if (!isOpen) {
      setCameras([]);
      setSelectedCameraId('');
      setLoadingCameras(true);
      return;
    }

    setLoadingCameras(true);
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not query cameras:", err);
      })
      .finally(() => {
        setLoadingCameras(false);
      });
  }, [isOpen]);

  // 2. Start/stop scanner when selectedCameraId changes and loading completes
  useEffect(() => {
    if (!isOpen || loadingCameras) return;

    const qrCodeId = "barcode-scanner-reader";
    const html5QrCode = new Html5Qrcode(qrCodeId);
    html5QrCodeRef.current = html5QrCode;

    let isComponentActive = true;

    const startScanning = async () => {
      setErrorMsg('');
      setScanningState('initializing');
      try {
        await html5QrCode.start(
          selectedCameraId || { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              // Perfectly matches the w-[260px] h-[140px] overlay dimensions
              const w = Math.min(width * 0.8, 260);
              const h = Math.min(height * 0.75, 140);
              return { width: w, height: h };
            },
            aspectRatio: 1.777778
          },
          (decodedText) => {
            const val = decodedText.trim();
            if (val) {
              setBarcodeValue(val);
              if (navigator.vibrate) navigator.vibrate(100);
              onSaveRef.current(val);
              handleClose();
            }
          },
          () => { } // verbose log, ignore
        );
        if (isComponentActive) {
          setIsScanning(true);
          setScanningState('active');
        }
      } catch (err) {
        console.error("Scanner start error:", err);
        if (isComponentActive) {
          setErrorMsg("Could not access the selected camera. Please check permissions, and ensure you are using HTTPS or localhost.");
          setScanningState('error');
        }
      }
    };

    // Small delay to let modal expand and element render in DOM
    const timer = setTimeout(() => {
      startScanning();
    }, 250);

    return () => {
      isComponentActive = false;
      clearTimeout(timer);
      const cleanup = async () => {
        if (html5QrCode.isScanning) {
          try {
            await html5QrCode.stop();
          } catch (e) {
            console.error("Error stopping scanner on cleanup:", e);
          }
        }
      };
      cleanup();
    };
  }, [isOpen, selectedCameraId, loadingCameras]);

  // Handle Save
  const handleSave = () => {
    onSaveRef.current(barcodeValue.trim());
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${animating ? 'modal-backdrop-enter' : ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <style>{`
        @keyframes scanAnimation {
          0% { transform: translateY(-65px); }
          50% { transform: translateY(65px); }
          100% { transform: translateY(-65px); }
        }
        .scanner-line {
          animation: scanAnimation 2.2s ease-in-out infinite;
        }
      `}</style>

      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${animating ? 'modal-content-enter' : ''}`}
        style={{
          background: 'var(--vs-bg-primary)',
          border: '1px solid var(--vs-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--vs-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8  rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold leading-tight" style={{ color: 'var(--vs-active-text)' }}>
                Scan QR / Barcode
              </span>
              {/* <p className="text-[11px] leading-normal" style={{ color: 'var(--vs-text-secondary)' }}>
                Align the code inside the frame to scan automatically
              </p> */}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-white/[0.06]"
            title="Close"
          >
            <X className="w-4 h-4" style={{ color: 'var(--vs-logout-text)' }} />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="px-5 pt-4 flex flex-col gap-4">
          <div
            className="relative w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-gray-800"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Target reader div for html5-qrcode */}
            <div id="barcode-scanner-reader" className="w-full h-full" />

            {/* Glowing scanning laser animation and alignment guide overlay */}
            {scanningState === 'active' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[260px] h-[140px] border-2 border-indigo-500/40 rounded-2xl relative flex items-center justify-center">
                  {/* Corner brackets */}
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-indigo-500 rounded-tl" />
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-indigo-500 rounded-tr" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-indigo-500 rounded-bl" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-indigo-500 rounded-br" />

                  {/* Laser line centered inside the box */}
                  <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_8px_#6366f1] scanner-line pointer-events-none" />
                </div>
              </div>
            )}

            {/* Overlay indicators for different states */}
            {scanningState === 'initializing' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 text-white text-xs">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span>Accessing camera...</span>
              </div>
            )}

            {scanningState === 'error' && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-3 text-red-400">
                <AlertCircle className="w-9 h-9" />
                <span className="text-xs font-semibold">{errorMsg || "Unable to start camera"}</span>
              </div>
            )}
          </div>

          {/* Camera selector if multiple cameras are available */}
          {cameras.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cameraSelect">Select Camera</Label>
              <select
                id="cameraSelect"
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full rounded-xl border border-[var(--vs-input-border)] bg-[var(--vs-input-bg)] px-3 py-2 text-xs text-[var(--vs-text-primary)] transition-all duration-200 outline-none focus:border-indigo-500/60"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanned/Edited Value Form */}
          {/* <div className="flex flex-col gap-1.5">
            <Label htmlFor="scannedBarcode">Scanned Code Value</Label>
            <Input
              id="scannedBarcode"
              type="text"
              placeholder="Waiting for scan or type manually..."
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
            />
          </div> */}
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 mt-4"
          style={{ borderTop: '1px solid var(--vs-border)' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            startIcon={<Check className="w-4 h-4" />}
          >
            Save Code
          </Button>
        </div>
      </div>
    </div>
  );
}
