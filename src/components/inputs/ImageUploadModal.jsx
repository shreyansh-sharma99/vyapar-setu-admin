import { useState, useEffect, useCallback } from 'react';
import { Upload, CheckCircle, Loader2, ImageIcon } from 'lucide-react';
import { Alert, Button, Modal } from '@/components/ui';
import apiClient from '@/utility/Http';

const getUploadPath = (type = 'single') => {
  const baseURL = apiClient.defaults.baseURL || 'http://localhost:5000/api/v1';
  // Strip '/admin' from the end of the base URL if it exists
  const base = baseURL.replace(/\/admin\/?$/, '');
  return `${base}/upload/${type}`;
};

const UPLOAD_SINGLE_PATH = getUploadPath('single');
const UPLOAD_MULTIPLE_PATH = getUploadPath('multiple');

// ── helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ImageUploadModal({
  isOpen,
  file, // can be File or Array of Files
  previewUrl, // can be string or Array of strings
  onClose,
  onSuccess,
  fieldName = 'file',
  multiple = false,
}) {
  const [uploadState, setUploadState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUploadState('idle');
      setProgress(0);
      setErrorMsg('');
      setAnimating(false);
      requestAnimationFrame(() => setAnimating(true));
    }
  }, [isOpen, file]);

  const handleClose = useCallback(() => {
    if (uploadState === 'uploading') return;
    onClose();
  }, [uploadState, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // Ensure files and previews are arrays internally
  const files = multiple ? (Array.isArray(file) ? file : (file ? [file] : [])) : (file ? [file] : []);
  const previews = multiple ? (Array.isArray(previewUrl) ? previewUrl : (previewUrl ? [previewUrl] : [])) : (previewUrl ? [previewUrl] : []);

  const handleProceed = async () => {
    if (files.length === 0) return;
    setUploadState('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const formData = new FormData();
      if (multiple) {
        files.forEach((f) => {
          formData.append('files', f); // backend expects 'files' array for multiple upload
        });
      } else {
        formData.append(fieldName, files[0]);
      }

      const uploadUrl = multiple ? UPLOAD_MULTIPLE_PATH : UPLOAD_SINGLE_PATH;

      const { data } = await apiClient.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      setUploadState('success');
      if (onSuccess) onSuccess(data, multiple ? files : files[0]);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Upload failed. Please try again.';
      setErrorMsg(msg);
      setUploadState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      hideClose={uploadState === 'uploading'}
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
            <ImageIcon className="size-4" />
          </span>
          {multiple ? 'Images Preview' : 'Image Preview'}
        </span>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={uploadState === 'uploading'}
          >
            Cancel
          </Button>

          {uploadState === 'success' ? (
            <Button
              variant="success"
              onClick={handleClose}
              startIcon={<CheckCircle />}
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={handleProceed}
              disabled={uploadState === 'uploading' || files.length === 0}
              loading={uploadState === 'uploading'}
              startIcon={uploadState === 'uploading' ? undefined : <Upload />}
            >
              {uploadState === 'uploading' ? 'Uploading…' : uploadState === 'error' ? 'Retry' : 'Proceed'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3" data-state={animating ? 'open' : 'opening'}>
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-control border border-line bg-fill">
          {previews.length > 0 ? (
            multiple ? (
              <div className="grid h-full w-full grid-cols-3 gap-2 overflow-y-auto p-3">
                {previews.map((url, idx) => (
                  <div key={idx} className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-line bg-fill-2">
                    {url ? (
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-[10px] text-ink-subtle">Non-image</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <img
                src={previews[0]}
                alt="Preview"
                className="h-full w-full object-contain"
              />
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-ink-subtle">
              <ImageIcon className="h-10 w-10 opacity-40" />
              <span className="text-xs">No preview available</span>
            </div>
          )}

          {uploadState === 'uploading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[3px]">
              <Loader2 className="h-9 w-9 animate-spin text-white" />
              <span className="text-sm font-semibold text-white">{progress}%</span>
            </div>
          )}

          {uploadState === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-[3px]">
              <CheckCircle className="h-9 w-9 text-success" />
              <span className="text-sm font-semibold text-white">Uploaded!</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-fill-2 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <ImageIcon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span
                className="max-w-[200px] truncate text-xs font-semibold text-ink"
                title={multiple ? `${files.length} files selected` : files[0]?.name}
              >
                {multiple ? `${files.length} files selected` : (files[0]?.name || 'Unknown file')}
              </span>
              <span className="text-[10px] text-ink-subtle">
                {multiple ? 'images' : (files[0]?.type || 'image')} &middot; {multiple ? formatBytes(files.reduce((acc, f) => acc + f.size, 0)) : formatBytes(files[0]?.size)}
              </span>
            </div>
          </div>

          {uploadState === 'uploading' && (
            <div className="w-20 shrink-0">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="m-0 mt-0.5 text-right text-[10px] text-ink-subtle">
                {progress}%
              </p>
            </div>
          )}
        </div>

        {uploadState === 'error' && (
          <Alert tone="danger" title={errorMsg} />
        )}

        {uploadState === 'success' && (
          <Alert
            tone="success"
            title={multiple ? 'Images uploaded successfully!' : 'Image uploaded successfully!'}
          />
        )}
      </div>
    </Modal>
  );
}
