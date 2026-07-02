import { useState, useEffect, useCallback } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Loader2, ImageIcon } from 'lucide-react';
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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${animating ? 'modal-backdrop-enter' : ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${animating ? 'modal-content-enter' : ''}`}
        style={{
          background: 'var(--vs-bg-primary)',
          border: '1px solid var(--vs-border)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--vs-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold leading-tight" style={{ color: 'var(--vs-active-text)' }}>
                {multiple ? 'Images Preview' : 'Image Preview'}
              </span>

            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={uploadState === 'uploading'}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Close"
          >
            <X className="w-4 h-4" style={{ color: 'var(--vs-logout-text)' }} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div
            className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '16/9',
              background: 'var(--vs-bg-secondary)',
              border: '1px solid var(--vs-border)',
            }}
          >
            {previews.length > 0 ? (
              multiple ? (
                <div className="grid grid-cols-3 gap-2 p-3 w-full h-full overflow-y-auto">
                  {previews.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-black/5 flex items-center justify-center">
                      {url ? (
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-[10px] text-gray-400">Non-image</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <img
                  src={previews[0]}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2" style={{ color: 'var(--vs-text-secondary)' }}>
                <ImageIcon className="w-10 h-10 opacity-30" />
                <span className="text-xs opacity-60">No preview available</span>
              </div>
            )}

            {uploadState === 'uploading' && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
              >
                <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
                <span className="text-white text-sm font-semibold">{progress}%</span>
              </div>
            )}

            {uploadState === 'success' && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
              >
                <CheckCircle className="w-9 h-9 text-emerald-400" />
                <span className="text-white text-sm font-semibold">Uploaded!</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pt-3 pb-1">
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 gap-3"
            style={{
              background: 'var(--vs-bg-secondary)',
              border: '1px solid var(--vs-border)',
            }}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-xs font-semibold truncate max-w-[200px]"
                  title={multiple ? `${files.length} files selected` : files[0]?.name}
                  style={{ color: 'var(--vs-text-primary)' }}
                >
                  {multiple ? `${files.length} files selected` : (files[0]?.name || 'Unknown file')}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--vs-text-secondary)' }}>
                  {multiple ? 'images' : (files[0]?.type || 'image')} &middot; {multiple ? formatBytes(files.reduce((acc, f) => acc + f.size, 0)) : formatBytes(files[0]?.size)}
                </span>
              </div>
            </div>

            {uploadState === 'uploading' && (
              <div className="flex-shrink-0 w-20">
                <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-right mt-0.5" style={{ color: 'var(--vs-text-secondary)' }}>
                  {progress}%
                </p>
              </div>
            )}
          </div>
        </div>

        {uploadState === 'error' && (
          <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-px" />
            <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-px" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {multiple ? 'Images uploaded successfully!' : 'Image uploaded successfully!'}
            </p>
          </div>
        )}

        <div
          className="flex items-center justify-end gap-3 px-5 py-4 mt-4"
          style={{ borderTop: '1px solid var(--vs-border)' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadState === 'uploading'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl border transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
              border-gray-300 dark:border-white/10
              hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            style={{ color: 'var(--vs-text-primary)' }}
          >
            Cancel
          </button>

          {uploadState === 'success' ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl font-medium text-white transition-all active:scale-[0.98]
                bg-emerald-500 hover:bg-emerald-600 shadow-[0_2px_12px_rgba(16,185,129,0.35)]"
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProceed}
              disabled={uploadState === 'uploading' || files.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl font-medium text-white transition-all active:scale-[0.98]
                bg-indigo-600 hover:bg-indigo-700 shadow-[0_2px_12px_rgba(99,102,241,0.4)]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </>
              ) : uploadState === 'error' ? (
                <>
                  <Upload className="w-4 h-4" />
                  Retry
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Proceed
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
