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

/** Extra (non-CRUD) permissions of a module, e.g. sales → [{ key: 'change_price', label }]. */
export const moduleExtras = (module) => (Array.isArray(module?.extras) ? module.extras : []);

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

/** Keep only keys the catalog knows (CRUD levels and extras), always with view when anything else is ticked. */
export const cleanRolePermissions = (perms, modules) => {
  const list = Array.isArray(perms) ? perms : [];
  const out = [];
  (modules || []).forEach((m) => {
    const granted = levelsFor(list, m.key);
    const extras = moduleExtras(m).filter((e) => list.includes(`${m.key}.${e.key}`));
    if (extras.length) granted.add('view');
    MATRIX_LEVELS.forEach((l) => {
      if (granted.has(l) && moduleHasLevel(m, l)) out.push(`${m.key}.${l}`);
    });
    extras.forEach((e) => out.push(`${m.key}.${e.key}`));
  });
  return out;
};
