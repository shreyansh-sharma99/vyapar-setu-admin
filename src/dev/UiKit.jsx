import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { STATUS_TONE, TONE_CLASSES, labelForStatus } from '@/components/ui';
import UiKitComponents from './UiKitComponents';

/**
 * Dev-only gallery of the Soft UI tokens and components (route /ui-kit, never in builds).
 * QA takes its light / dark screenshots here. Every new ui/* component and variant gets a row.
 */

const COLOR_TOKENS = [
  ['Surfaces', [['--ui-page', 'bg-page'], ['--ui-surface', 'bg-surface'], ['--ui-fill', 'bg-fill'], ['--ui-fill-2', 'bg-fill-2'], ['--ui-nav', 'bg-nav']]],
  ['Lines', [['--ui-line', 'border-line'], ['--ui-line-strong', 'border-line-strong']]],
  ['Text', [['--ui-ink', 'text-ink'], ['--ui-ink-muted', 'text-ink-muted'], ['--ui-ink-subtle', 'text-ink-subtle'], ['--ui-nav-ink', 'text-nav-ink']]],
  ['Brand', [['--ui-primary', 'bg-brand'], ['--ui-primary-hover', 'bg-brand-hover'], ['--ui-primary-soft', 'bg-brand-soft'], ['--ui-primary-ink', 'text-brand-ink'], ['--ui-accent', 'bg-highlight'], ['--ui-accent-soft', 'bg-highlight-soft']]],
  ['Status', [['--ui-success', 'text-success'], ['--ui-warning', 'text-warning'], ['--ui-danger', 'text-danger'], ['--ui-info', 'text-info'], ['--ui-neutral', 'text-neutral']]],
];

const UPCOMING = [
  ['U2', 'DocumentLayout, LineItemsTable, TotalsPanel, PaymentPicker, PartyCard'],
  ['U3', 'DataTable'],
];

function Section({ title, note, children }) {
  return (
    <section className="bg-surface rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="!text-base !font-extrabold text-ink m-0">{title}</h2>
        {note && <p className="text-sm text-ink-subtle m-0 mt-1">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, cls, value }) {
  const isText = cls.startsWith('text-');
  const isLine = cls.startsWith('border-');
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        className={`h-10 w-10 shrink-0 rounded-control border border-line grid place-items-center font-bold ${isText ? `bg-fill ${cls}` : isLine ? `bg-surface border-2 ${cls}` : cls}`}
      >
        {isText ? 'Aa' : null}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink truncate">{cls}</div>
        <div className="text-xs text-ink-subtle font-mono truncate">{name} · {value}</div>
      </div>
    </div>
  );
}

export default function UiKit({ setDarkMode }) {
  const isDark = useDarkMode();


  // Read on every render: useDarkMode re-renders this page when the theme flips.
  const css = getComputedStyle(document.documentElement);
  const values = Object.fromEntries(COLOR_TOKENS.flatMap(([, list]) => list).map(([name]) => [name, css.getPropertyValue(name).trim()]));

  return (
    <div className="min-h-screen bg-page text-ink transition-colors">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 flex flex-col gap-6">

        <header className="flex flex-wrap items-center gap-4">
          <img src={isDark ? '/image/logos/ecnbiz-logo-dark.svg' : '/image/logos/ecnbiz-logo.svg'} alt="ecnbiz" className="h-10" />
          <div className="max-sm:order-9 max-sm:w-full sm:flex-1 min-w-0">
            <h1 className="!text-2xl !font-extrabold tracking-tight m-0 text-ink">UI kit</h1>
            <p className="text-sm text-ink-muted m-0">Soft cards tokens and components · {isDark ? 'Dark' : 'Light'} mode</p>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode?.(!isDark)}
            className="ml-auto sm:ml-0 inline-flex items-center gap-2 h-10 px-4 rounded-control bg-surface shadow-card text-ink-muted font-semibold hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ui-ring)]"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </header>

        <Section title="Colour tokens" note="Defined once in src/index.css (:root and .dark). Use the class, never the hex.">
          <div className="flex flex-col gap-5">
            {COLOR_TOKENS.map(([group, list]) => (
              <div key={group} className="flex flex-col gap-3">
                <h3 className="!text-xs !font-bold uppercase tracking-wider text-ink-subtle m-0">{group}</h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                  {list.map(([name, cls]) => <Swatch key={name} name={name} cls={cls} value={values[name]} />)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Status tones" note="components/ui/statusTones.js — one tone per status for every document type.">
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_TONE).map(([status, tone]) => (
              <span key={status} className={`inline-flex items-center rounded-chip px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}>
                {labelForStatus(status)}
              </span>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Radius and shadow">
            <div className="flex flex-wrap items-end gap-4">
              <div className="h-20 w-28 rounded-card bg-surface shadow-card border border-line grid place-items-center text-xs text-ink-muted">rounded-card</div>
              <div className="h-12 w-28 rounded-control bg-fill grid place-items-center text-xs text-ink-muted">rounded-control</div>
              <div className="h-8 px-4 rounded-chip bg-brand-soft text-brand-ink grid place-items-center text-xs font-bold">rounded-chip</div>
            </div>
          </Section>

          <Section title="Type">
            <div className="flex flex-col gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-ink">New sales invoice</span>
              <span className="text-base font-extrabold text-ink">Section title</span>
              <span className="text-sm text-ink">Body text in Outfit</span>
              <span className="text-sm text-ink-muted">Muted label</span>
              <span className="text-xs text-ink-subtle">Subtle hint text</span>
              <span className="font-mono text-sm text-brand-ink">INV-2026-0413 · 27AABCS1429B1Z5</span>
              <span className="text-2xl font-extrabold tabular-nums text-highlight">₹ 1,05,600.00</span>
            </div>
          </Section>
        </div>

        <Section title="Surfaces in use" note="Page → card → fill, and the dark nav panel (sidebar, totals). Same look in both modes.">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="rounded-card bg-fill-2 p-4 flex flex-col gap-3">
              <div className="rounded-control bg-fill px-3 py-2.5 text-sm text-ink-subtle">Input fill · Search customer</div>
              <div className="rounded-control bg-surface border-2 border-brand px-3 py-2.5 text-sm text-ink shadow-[0_0_0_4px_var(--ui-ring)]">Focused input</div>
              <div className="rounded-control bg-danger-soft border border-danger px-3 py-2.5 text-sm text-danger">Invalid input</div>
              <div className="rounded-control bg-highlight-soft px-3 py-2.5 text-sm text-warning">Warning row · Only 5 left in stock</div>
            </div>
            <div className="rounded-card bg-nav text-nav-ink p-5 flex flex-col gap-2 text-sm">
              <span className="font-extrabold text-white">Bill summary</span>
              <span className="flex justify-between"><span>Taxable value</span><span className="text-white tabular-nums">7,932.80</span></span>
              <span className="flex justify-between"><span>CGST + SGST</span><span className="text-white tabular-nums">908.00</span></span>
              <span className="flex justify-between border-t border-dashed border-white/20 pt-2 mt-1"><span>Total</span><span className="text-highlight text-xl font-extrabold tabular-nums">₹ 8,841</span></span>
            </div>
          </div>
        </Section>

        <UiKitComponents />

        <Section title="Coming next" note="Added batch by batch. Each component gets a row here with every variant and state.">
          <ul className="m-0 pl-0 list-none flex flex-col gap-2">
            {UPCOMING.map(([batch, list]) => (
              <li key={batch} className="flex gap-3 text-sm">
                <span className="shrink-0 h-6 px-2 rounded-chip bg-neutral-soft text-neutral text-xs font-bold grid place-items-center">{batch}</span>
                <span className="text-ink-muted">{list}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
