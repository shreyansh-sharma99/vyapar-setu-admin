import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
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
      <div className={`w-full ${className}`}>
        {/* ── Dropzone Box ── */}
        <div
          onClick={handleContainerClick}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`group relative flex flex-col items-center justify-center rounded-xl border border-dashed text-center cursor-pointer transition-all duration-200 select-none
            ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20"
                : "border-gray-200 hover:border-indigo-500 bg-gray-50/50 hover:bg-gray-100/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] dark:hover:border-indigo-500/80"
            }
            ${error ? "border-red-500 bg-red-50/10 dark:bg-red-500/5" : ""}
            ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            ${compact ? "py-4 px-4" : "py-6 px-5"}
          `}
        >
          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            disabled={disabled}
            accept={accept}
            onChange={handleInputChange}
            multiple={multiple}
          />

          {/* Icon Container */}
          <div className="mb-2.5 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-2.5 transition-transform duration-200 group-hover:scale-105">
            <Upload className="w-5 h-5" />
          </div>

          {/* Text Content */}
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {isDragActive ? (
              "Drop files here"
            ) : (
              <>
                {title} or{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                  {browseText}
                </span>
              </>
            )}
          </p>

          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* ── Uploaded File Preview — Rendered underneath ── */}
        {!multiple && (imagePreview || fileName) && (
          <div className="mt-3 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] flex items-center justify-between gap-3 shadow-sm dark:shadow-none transition-all duration-300">
            <div className="flex items-center gap-3 overflow-hidden">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 flex items-center justify-center text-lg">
                  📄
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span
                  title={fileName}
                  className="text-xs font-semibold text-gray-800 dark:text-white truncate"
                >
                  {fileName ? truncateFileName(fileName, 30) : "Uploaded Image"}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  Ready to save
                </span>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemove) onRemove();
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="p-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Remove File"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
