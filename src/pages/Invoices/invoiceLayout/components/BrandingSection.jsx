import React, { useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { Label } from '@/components/inputs/Label';

export default function BrandingSection({
  accentColor,
  onChangeAccentColor,
  logo,
  onChangeLogo,
  signature,
  onChangeSignature,
}) {
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const handleFileChange = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read as Base64 Data URL so it is stored directly and previews instantly
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* ── Accent colour ── */}
      <div>
        <Label>Accent colour</Label>
        <div className="flex items-center gap-2.5">
          {/* Visual swatch + invisible native color picker on click */}
          <label
            className="relative w-14 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: accentColor || '#404087' }}
            title="Click to choose accent color"
          >
            <input
              type="color"
              value={accentColor || '#404087'}
              onChange={(e) => onChangeAccentColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Hex code input */}
          <div className="relative w-28">
            <input
              type="text"
              value={accentColor || ''}
              onChange={(e) => onChangeAccentColor(e.target.value)}
              placeholder="#404087"
              maxLength={7}
              className="w-full text-xs font-mono font-medium px-2.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ── Logo & Signature Uploader Boxes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Logo Box */}
        <div>
          <Label>Logo</Label>
          <div
            onClick={() => !logo && logoInputRef.current?.click()}
            className={`relative h-28 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/40 flex items-center justify-center overflow-hidden transition-all ${
              !logo ? 'cursor-pointer hover:border-indigo-400 hover:bg-gray-50/60 dark:hover:bg-gray-800/70' : ''
            }`}
          >
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, onChangeLogo)}
            />

            {logo ? (
              <div className="relative w-full h-full flex items-center justify-center p-3">
                <img
                  src={logo}
                  alt="Invoice Logo"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeLogo(null);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-900 text-white flex items-center justify-center transition-colors shadow"
                  title="Remove logo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                  <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Upload Logo
                </span>
                <span className="text-[9px] text-gray-400">PNG, JPG, SVG</span>
              </div>
            )}
          </div>
        </div>

        {/* Signature Box */}
        <div>
          <Label>Signature</Label>
          <div
            onClick={() => !signature && signatureInputRef.current?.click()}
            className={`relative h-28 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/40 flex items-center justify-center overflow-hidden transition-all ${
              !signature ? 'cursor-pointer hover:border-indigo-400 hover:bg-gray-50/60 dark:hover:bg-gray-800/70' : ''
            }`}
          >
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, onChangeSignature)}
            />

            {signature ? (
              <div className="relative w-full h-full flex items-center justify-center p-3">
                <img
                  src={signature}
                  alt="Invoice Signature"
                  className="max-h-full max-w-full object-contain filter contrast-125"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeSignature(null);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-900 text-white flex items-center justify-center transition-colors shadow"
                  title="Remove signature"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700/50">
                  <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Upload Signature
                </span>
                <span className="text-[9px] text-gray-400">PNG with transparency</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
