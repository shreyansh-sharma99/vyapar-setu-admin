/**
 * Helpers for role permission keys (`<module>.<level>`, levels view | create | update | delete).
 * create / update / delete each bring view along. A legacy `<module>.manage` key is read as
 * create + update + delete.
 */

export const MATRIX_LEVELS = ['view', 'create', 'update', 'delete'];

export const LEVEL_LABELS = {
  view: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
};

export const moduleLevels = (module) => (Array.isArray(module?.levels) ? module.levels : ['view']);

export const moduleHasLevel = (module, level) => moduleLevels(module).includes(level);

/** Levels a permission list grants on one module (legacy manage expanded, view implied). */
export const levelsFor = (perms, moduleKey) => {
  const list = Array.isArray(perms) ? perms : [];
  const out = new Set();
  MATRIX_LEVELS.forEach((l) => {
    if (list.includes(`${moduleKey}.${l}`)) out.add(l);
  });
  if (list.includes(`${moduleKey}.manage`)) {
    out.add('create');
    out.add('update');
    out.add('delete');
  }
  if (out.size) out.add('view');
  return out;
};

/** Keep only keys the catalog knows, always with view when anything else is ticked. */
export const cleanRolePermissions = (perms, modules) => {
  const out = [];
  (modules || []).forEach((m) => {
    const granted = levelsFor(perms, m.key);
    MATRIX_LEVELS.forEach((l) => {
      if (granted.has(l) && moduleHasLevel(m, l)) out.push(`${m.key}.${l}`);
    });
  });
  return out;
};
