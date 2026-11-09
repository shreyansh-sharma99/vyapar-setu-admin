import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export const THEMES = [
  {
    id: 'classic',
    title: 'Classic',
    description: 'A traditional bordered layout — the one most accountants expect.',
  },
  {
    id: 'modern',
    title: 'Modern',
    description: 'Clean, generous whitespace, colour used sparingly.',
  },
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Just the numbers. No borders, minimal ink.',
  },
  {
    id: 'gst_detailed',
    title: 'GST Detailed',
    description: 'Every tax field broken out, Tally-style — for a GST auditor.',
  },
  {
    id: 'thermal_58',
    title: 'Thermal 58mm',
    description: 'Counter-printer width. Short lines, no wasted paper.',
  },
  {
    id: 'thermal_80',
    title: 'Thermal 80mm',
    description: 'Wider counter-printer roll — fits a few more characters per line.',
  },
];

export default function ThemeCard({ theme, isSelected, onClick }) {
  return (
    <Card
      as="button"
      type="button"
      padding="none"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        'relative flex cursor-pointer select-none flex-col gap-1 p-3.5 text-left shadow-none transition-shadow',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ui-ring)]',
        isSelected
          ? 'bg-brand-soft ring-2 ring-brand'
          : 'ring-1 ring-line hover:ring-line-strong'
      )}
    >
      {isSelected && <CheckCircle2 className="absolute right-3 top-3 size-4 text-brand" aria-hidden="true" />}
      <span className={cn('pr-5 text-[15px] font-bold tracking-tight', isSelected ? 'text-brand-ink' : 'text-ink')}>
        {theme.title}
      </span>
      <span className="text-xs leading-snug text-ink-muted">
        {theme.description}
      </span>
    </Card>
  );
}
