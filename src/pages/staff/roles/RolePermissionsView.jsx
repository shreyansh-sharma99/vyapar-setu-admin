import { Check, Minus } from 'lucide-react';
import { MATRIX_LEVELS, LEVEL_LABELS, levelsFor, moduleHasLevel } from './rolePermissions';

/**
 * Read-only grid of what a role allows: one row per module, View / Create / Edit / Delete ticks.
 * Modules the role has no access to are listed last and dimmed.
 */
export default function RolePermissionsView({ permissions = [], modules = [] }) {
  const rows = modules.map((m) => ({ module: m, granted: levelsFor(permissions, m.key) }));
  const sorted = [...rows.filter((r) => r.granted.size), ...rows.filter((r) => !r.granted.size)];

  if (modules.length === 0) {
    return <p className="text-sm text-[var(--vs-text-secondary)] m-0">Loading permissions…</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
      <table className="w-full text-sm border-collapse min-w-[420px]">
        <thead className="bg-[var(--vs-bg-secondary)]">
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
            <th className="py-2 px-3 border-b border-[var(--vs-border)]">Module</th>
            {MATRIX_LEVELS.map((l) => (
              <th key={l} className="py-2 px-3 border-b border-[var(--vs-border)] text-center w-20">{LEVEL_LABELS[l]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ module: m, granted }) => (
            <tr
              key={m.key}
              className={`border-b last:border-b-0 border-[var(--vs-border)] ${granted.size ? '' : 'opacity-50'}`}
            >
              <td className="py-1.5 px-3 text-[var(--vs-text-primary)] font-medium">{m.label || m.key}</td>
              {MATRIX_LEVELS.map((l) => (
                <td key={l} className="py-1.5 px-3 text-center">
                  {!moduleHasLevel(m, l) ? (
                    <span className="text-[var(--vs-text-secondary)]">—</span>
                  ) : granted.has(l) ? (
                    <Check className="w-4 h-4 inline-block text-emerald-600 dark:text-emerald-400" aria-label={`${LEVEL_LABELS[l]}: yes`} />
                  ) : (
                    <Minus className="w-4 h-4 inline-block text-[var(--vs-text-secondary)] opacity-60" aria-label={`${LEVEL_LABELS[l]}: no`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
