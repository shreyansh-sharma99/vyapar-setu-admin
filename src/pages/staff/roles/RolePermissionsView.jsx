import { Check, Minus } from 'lucide-react';
import { LINE_TD, LINE_TH, LineItemsTable, LineRow, SkeletonRows } from '@/components/ui';
import { cn } from '@/lib/utils';
import { MATRIX_LEVELS, LEVEL_LABELS, levelsFor, moduleHasLevel, moduleExtras } from './rolePermissions';

const TH_CENTER = cn(LINE_TH, 'w-20 text-center');
const TD_CENTER = cn(LINE_TD, 'py-2.5 text-center align-middle');

const Yes = ({ label }) => (
  <span className="inline-grid size-6 place-items-center rounded-full bg-success-soft text-success" role="img" aria-label={label}>
    <Check className="size-3.5 stroke-[3]" />
  </span>
);

const No = ({ label }) => (
  <span className="inline-grid size-6 place-items-center text-ink-subtle" role="img" aria-label={label}>
    <Minus className="size-3.5" />
  </span>
);

/**
 * Read-only grid of what a role allows: one row per module, View / Create / Edit / Delete ticks.
 * Modules the role has no access to are listed last and dimmed.
 */
export default function RolePermissionsView({ permissions = [], modules = [] }) {
  const rows = modules.map((m) => ({ module: m, granted: levelsFor(permissions, m.key) }));
  const sorted = [...rows.filter((r) => r.granted.size), ...rows.filter((r) => !r.granted.size)];
  const extras = modules.flatMap((m) => moduleExtras(m).map((x) => ({
    key: `${m.key}.${x.key}`,
    label: x.label,
    on: (permissions || []).includes(`${m.key}.${x.key}`),
  })));

  if (modules.length === 0) {
    return <SkeletonRows rows={4} cols={5} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <LineItemsTable
        minWidth={420}
        head={
          <tr>
            <th className={LINE_TH}>Module</th>
            {MATRIX_LEVELS.map((l) => (
              <th key={l} className={TH_CENTER}>{LEVEL_LABELS[l]}</th>
            ))}
          </tr>
        }
      >
        {sorted.map(({ module: m, granted }) => (
          <LineRow key={m.key} className={granted.size ? '' : 'opacity-50'}>
            <td className={cn(LINE_TD, 'py-2.5 align-middle font-medium')}>{m.label || m.key}</td>
            {MATRIX_LEVELS.map((l) => (
              <td key={l} className={TD_CENTER}>
                {!moduleHasLevel(m, l) ? (
                  <span className="text-ink-subtle" title="Not available for this module">—</span>
                ) : granted.has(l) ? (
                  <Yes label={`${LEVEL_LABELS[l]}: yes`} />
                ) : (
                  <No label={`${LEVEL_LABELS[l]}: no`} />
                )}
              </td>
            ))}
          </LineRow>
        ))}
      </LineItemsTable>
      {extras.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-xs font-semibold text-ink-subtle">Extra permissions</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {extras.map((x) => (
              <li
                key={x.key}
                className={cn('flex items-center gap-2.5 rounded-control border border-line px-3 py-2 text-sm', x.on ? 'text-ink' : 'text-ink-subtle opacity-60')}
              >
                {x.on ? <Yes label="yes" /> : <No label="no" />}
                {x.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
