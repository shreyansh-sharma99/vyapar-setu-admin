import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Field, Modal, Select } from '@/components/ui';

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
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
            <QrCode className="size-4" />
          </span>
          Scan QR / Barcode
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} startIcon={<Check />}>
            Save Code
          </Button>
        </>
      }
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

      {/* Scanner Viewport */}
      <div className="flex flex-col gap-4" data-state={animating ? 'open' : 'opening'}>
        {/* Camera feed stays black in both themes so the code is easy to see. */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-control bg-black ring-1 ring-line">
          {/* Target reader div for html5-qrcode */}
          <div id="barcode-scanner-reader" className="h-full w-full" />

          {/* Glowing scanning laser animation and alignment guide overlay */}
          {scanningState === 'active' && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative flex h-[140px] w-[260px] max-w-[80%] items-center justify-center rounded-2xl border-2 border-highlight/40">
                {/* Corner brackets */}
                <div className="absolute -left-1.5 -top-1.5 h-5 w-5 rounded-tl border-l-4 border-t-4 border-highlight" />
                <div className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-tr border-r-4 border-t-4 border-highlight" />
                <div className="absolute -bottom-1.5 -left-1.5 h-5 w-5 rounded-bl border-b-4 border-l-4 border-highlight" />
                <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-br border-b-4 border-r-4 border-highlight" />

                {/* Laser line centered inside the box */}
                <div className="scanner-line pointer-events-none absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-highlight to-transparent shadow-[0_0_8px_var(--color-highlight)]" />
              </div>
            </div>
          )}

          {/* Overlay indicators for different states */}
          {scanningState === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-xs text-white">
              <RefreshCw className="h-8 w-8 animate-spin text-highlight" />
              <span>Accessing camera...</span>
            </div>
          )}

          {scanningState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
              <AlertCircle className="h-9 w-9 text-danger" />
              <span className="text-xs font-semibold">{errorMsg || "Unable to start camera"}</span>
            </div>
          )}
        </div>

        {/* Camera selector if multiple cameras are available */}
        {cameras.length > 1 && (
          <Field label="Select Camera" htmlFor="cameraSelect">
            <Select
              id="cameraSelect"
              searchable={false}
              value={selectedCameraId}
              onChange={(value) => setSelectedCameraId(value)}
              options={cameras.map((camera, idx) => ({
                value: camera.id,
                label: camera.label || `Camera ${idx + 1}`,
              }))}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
