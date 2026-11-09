import { useState, useRef } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import ImageUploadModal from './ImageUploadModal';

const truncateFileName = (name, maxLength = 25) => {
  if (!name) return "";
  if (name.length <= maxLength) return name;

  const extIndex = name.lastIndexOf(".");
  const extension = extIndex !== -1 ? name.substring(extIndex) : "";
  const baseName = extIndex !== -1 ? name.substring(0, extIndex) : name;

  return `${baseName.substring(0, 12)}...${baseName.substring(
    baseName.length - 5
  )}${extension}`;
};

export default function FileInput({
  className = "",
  onChange,
  disabled,
  fileName,
  error,
  accept = "image/*",
  imagePreview,
  onRemove,
  multiple = false,
  title = "Drag & drop files here",
  description = "PNG, JPG, WebP, SVG up to 5MB",
  browseText = "browse",
  compact = false,
  // ── Upload modal props ───────────────────────────────────────────────────────
  enableUploadModal = true,     // set false to skip the preview modal
  fieldName = "file",          // multipart field name sent to api/v1/upload/single
  onUploadSuccess,              // (responseData, file) => void  called after successful upload
}) {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);

  // multiple files states
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // ── core file-selection logic ─────────────────────────────────────────────
  const processFile = (file) => {
    if (!file) return;

    if (enableUploadModal && file.type.startsWith('image/')) {
      // Show preview modal first — don't call onChange yet
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingFile(file);
        setPendingPreview(reader.result);
        setModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Non-image or modal disabled → pass straight through
      if (onChange) {
        const syntheticEvent = { target: { files: [file] } };
        onChange(syntheticEvent);
      }
    }
  };

  const processFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    if (enableUploadModal) {
      const readPromises = filesList.map(file => {
        return new Promise((resolve) => {
          if (!file.type.startsWith('image/')) {
            resolve({ file, preview: null });
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ file, preview: reader.result });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readPromises).then((results) => {
        const validFiles = results.map(r => r.file);
        const validPreviews = results.map(r => r.preview);
        setPendingFiles(validFiles);
        setPendingPreviews(validPreviews);
        setModalOpen(true);
      });
    } else {
      if (onChange) {
        const syntheticEvent = { target: { files: filesList } };
        onChange(syntheticEvent);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      if (multiple) {
        const filesList = Array.from(e.dataTransfer.files);
        if (filesList.length > 0) {
          processFiles(filesList);
        }
      } else if (e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleInputChange = (e) => {
    if (multiple) {
      const filesList = e.target.files ? Array.from(e.target.files) : [];
      if (filesList.length > 0) {
        processFiles(filesList);
      }
    } else {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processFile(file);
      }
    }
    // reset input value so the same file can be re-selected after removal
    if (inputRef.current) inputRef.current.value = "";
  };

  // Called by the modal after the user clicks "Proceed" and upload succeeds
  const handleUploadSuccess = (responseData, fileOrFiles) => {
    // Notify parent with a synthetic event so it can store the returned URL / data
    if (onChange) {
      const filesArr = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      const syntheticEvent = { target: { files: filesArr } };
      onChange(syntheticEvent);
    }
    if (onUploadSuccess) onUploadSuccess(responseData, fileOrFiles);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingFile(null);
    setPendingPreview(null);
    setPendingFiles([]);
    setPendingPreviews([]);
  };

  return (
    <>
      <div className={cn('w-full', className)}>
        {/* ── Dropzone Box ── */}
        <div
          onClick={handleContainerClick}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'group relative flex cursor-pointer select-none flex-col items-center justify-center rounded-card border border-dashed text-center transition-colors duration-200',
            isDragActive
              ? 'border-brand bg-brand-soft'
              : 'border-line-strong bg-fill-2 hover:border-brand hover:bg-fill',
            error && 'border-danger bg-danger-soft',
            disabled && 'cursor-not-allowed opacity-60',
            compact ? 'px-4 py-4' : 'px-5 py-6'
          )}
        >
          {/* Hidden Input */}
          <Input
            ref={inputRef}
            type="file"
            wrapperClassName="hidden"
            disabled={disabled}
            accept={accept}
            onChange={handleInputChange}
            multiple={multiple}
          />

          {/* Icon Container */}
          <div className="mb-2.5 flex items-center justify-center rounded-full bg-brand-soft p-2.5 text-brand-ink transition-transform duration-200 group-hover:scale-105">
            <Upload className="h-5 w-5" />
          </div>

          {/* Text Content */}
          <p className="m-0 text-sm font-medium text-ink">
            {isDragActive ? (
              "Drop files here"
            ) : (
              <>
                {title} or{" "}
                <span className="font-semibold text-brand-ink group-hover:underline">
                  {browseText}
                </span>
              </>
            )}
          </p>

          {description && (
            <p className="m-0 mt-1 text-xs text-ink-subtle">
              {description}
            </p>
          )}
        </div>

        {/* ── Uploaded File Preview — Rendered underneath ── */}
        {!multiple && (imagePreview || fileName) && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-line bg-fill-2 p-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-10 w-10 shrink-0 rounded-lg border border-line bg-surface object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-subtle">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <span
                  title={fileName}
                  className="truncate text-xs font-semibold text-ink"
                >
                  {fileName ? truncateFileName(fileName, 30) : "Uploaded Image"}
                </span>
                <span className="text-[10px] font-medium text-ink-subtle">
                  Ready to save
                </span>
              </div>
            </div>

            {!disabled && (
              <Button
                variant="danger-soft"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemove) onRemove();
                  if (inputRef.current) inputRef.current.value = "";
                }}
                title="Remove File"
                aria-label="Remove file"
              >
                <X />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Image Upload Modal (portal-like, rendered at end of component tree) ── */}
      <ImageUploadModal
        isOpen={modalOpen}
        file={multiple ? pendingFiles : pendingFile}
        previewUrl={multiple ? pendingPreviews : pendingPreview}
        onClose={handleModalClose}
        onSuccess={handleUploadSuccess}
        fieldName={multiple ? "files" : fieldName}
        multiple={multiple}
      />
    </>
  );
}
