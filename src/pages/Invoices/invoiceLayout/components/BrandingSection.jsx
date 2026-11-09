import { useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Logo / signature drop box: click to pick an image, × to remove it. */
function ImageBox({ label, value, alt, inputRef, onPick, onRemove, emptyTitle, emptyHint, removeTitle, imgClassName }) {
  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => !value && inputRef.current?.click()}
        className={cn(
          'relative flex h-28 items-center justify-center overflow-hidden rounded-control border-[1.5px] bg-fill-2 transition-colors',
          value ? 'border-line' : 'cursor-pointer border-dashed border-line-strong hover:border-brand hover:bg-brand-soft'
        )}
      >
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          wrapperClassName="hidden"
          onChange={onPick}
        />

        {value ? (
          <div className="relative flex h-full w-full items-center justify-center bg-surface p-3">
            <img src={value} alt={alt} className={cn('max-h-full max-w-full object-contain', imgClassName)} />
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute right-2 top-2"
              aria-label={removeTitle}
              title={removeTitle}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="grid size-8 place-items-center rounded-full bg-surface text-ink-muted shadow-card">
              <Upload className="size-4" />
            </span>
            <span className="text-xs font-semibold text-ink">{emptyTitle}</span>
            <span className="text-[11px] text-ink-subtle">{emptyHint}</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="flex flex-col gap-5">
      {/* ── Accent colour ── */}
      <div>
        <Label>Accent colour</Label>
        <div className="flex items-center gap-2.5">
          {/* Visual swatch + invisible native color picker on click */}
          <label
            className="relative h-11 w-14 shrink-0 cursor-pointer overflow-hidden rounded-control shadow-card ring-1 ring-line transition-transform hover:scale-105"
            style={{ backgroundColor: accentColor || '#404087' }}
            title="Click to choose accent color"
          >
            <Input
              type="color"
              value={accentColor || '#404087'}
              onChange={(e) => onChangeAccentColor(e.target.value)}
              aria-label="Accent colour picker"
              wrapperClassName="absolute inset-0"
              className="absolute inset-0 h-full w-full cursor-pointer p-0 opacity-0"
            />
          </label>

          {/* Hex code input */}
          <Input
            value={accentColor || ''}
            onChange={(e) => onChangeAccentColor(e.target.value)}
            placeholder="#404087"
            maxLength={7}
            aria-label="Accent colour hex code"
            wrapperClassName="w-32"
            className="font-mono"
          />
        </div>
      </div>

      {/* ── Logo & Signature Uploader Boxes ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageBox
          label="Logo"
          value={logo}
          alt="Invoice Logo"
          inputRef={logoInputRef}
          onPick={(e) => handleFileChange(e, onChangeLogo)}
          onRemove={() => onChangeLogo(null)}
          emptyTitle="Upload Logo"
          emptyHint="PNG, JPG, SVG"
          removeTitle="Remove logo"
        />
        <ImageBox
          label="Signature"
          value={signature}
          alt="Invoice Signature"
          inputRef={signatureInputRef}
          onPick={(e) => handleFileChange(e, onChangeSignature)}
          onRemove={() => onChangeSignature(null)}
          emptyTitle="Upload Signature"
          emptyHint="PNG with transparency"
          removeTitle="Remove signature"
          imgClassName="contrast-125"
        />
      </div>
    </div>
  );
}
