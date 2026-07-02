import { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Toggle Switch
 *
 * Props:
 *  - checked      {boolean}   controlled value
 *  - onChange     {function}  called with new boolean value
 *  - loading      {boolean}   show spinner instead of toggle
 *  - disabled     {boolean}
 *  - activeLabel  {string}    label when on  (default "Active")
 *  - inactiveLabel{string}    label when off (default "Inactive")
 *  - size         {'sm'|'md'} (default 'md')
 *  - className    {string}    extra wrapper classes
 */
export default function Toggle({
  checked = false,
  onChange,
  loading = false,
  disabled = false,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  size = 'md',
  className = '',
}) {
  const [localChecked, setLocalChecked] = useState(false);
  const isControlled = onChange !== undefined;
  const value = isControlled ? checked : localChecked;

  const handleToggle = () => {
    if (disabled || loading) return;
    const next = !value;
    if (isControlled) {
      onChange(next);
    } else {
      setLocalChecked(next);
    }
  };

  const sm = size === 'sm';
  const trackW = sm ? 'w-8' : 'w-11';
  const trackH = sm ? 'h-4' : 'h-6';
  const thumbSz = sm ? 'w-3 h-3' : 'w-4 h-4';
  const thumbTranslate = sm
    ? (value ? 'translate-x-4' : 'translate-x-0.5')
    : (value ? 'translate-x-5' : 'translate-x-1');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled || loading}
        onClick={handleToggle}
        className={`
          relative inline-flex shrink-0 items-center ${trackH} ${trackW}
          rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
          ${value
            ? 'bg-indigo-600'
            : 'bg-[var(--vs-border,#d1d5db)]'
          }
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-flex items-center justify-center
            ${thumbSz} rounded-full bg-white shadow-md
            transform transition-transform duration-200 ease-in-out
            ${thumbTranslate}
          `}
        >
          {loading && (
            <Loader2 className={`${sm ? 'w-2 h-2' : 'w-2.5 h-2.5'} animate-spin text-indigo-600`} />
          )}
        </span>
      </button>

      <span
        className={`text-xs font-semibold select-none ${
          value
            ? 'text-indigo-600'
            : 'text-[var(--vs-text-secondary,#6b7280)]'
        }`}
      >
        {value ? activeLabel : inactiveLabel}
      </span>
    </div>
  );
}
