import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Info, ShieldCheck, Users } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import {
  getStaffPermissionCatalog,
  getRoleById,
  createRole,
  updateRole,
  clearCurrentRole,
} from '../services/staffSlice';
import { MATRIX_LEVELS, LEVEL_LABELS, moduleHasLevel, cleanRolePermissions } from './rolePermissions';

const checkboxCls = 'h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

/** Checkbox that can show a "some selected" (indeterminate) state. */
function TriCheckbox({ checked, indeterminate, onChange, label, disabled }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      disabled={disabled}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
      onChange={(e) => onChange(e.target.checked)}
      className={checkboxCls}
    />
  );
}

/* ─── Form body ─────────────────────────────────────────────────────────────── */

function RoleFormBody({ isEditMode, roleId, initial, modules, staffCount }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { saving } = useSelector((state) => state.staff);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isActive, setIsActive] = useState(initial.isActive);
  // Set of `${module}.${level}` keys, always kept consistent (create/update/delete ⇒ view).
  const [perms, setPerms] = useState(() => new Set(cleanRolePermissions(initial.permissions, modules)));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const has = (moduleKey, level) => perms.has(`${moduleKey}.${level}`);

  /** Apply one cell change to a draft set, keeping the view rule. */
  const applyCell = (draft, module, level, on) => {
    if (!moduleHasLevel(module, level)) return;
    if (level === 'view') {
      if (on) draft.add(`${module.key}.view`);
      else MATRIX_LEVELS.forEach((l) => draft.delete(`${module.key}.${l}`));
      return;
    }
    if (on) {
      draft.add(`${module.key}.${level}`);
      if (moduleHasLevel(module, 'view')) draft.add(`${module.key}.view`);
    } else {
      draft.delete(`${module.key}.${level}`);
    }
  };

  const toggleCell = (module, level, on) => {
    setPerms((prev) => {
      const next = new Set(prev);
      applyCell(next, module, level, on);
      return next;
    });
  };

  const toggleRow = (module, on) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (on) MATRIX_LEVELS.forEach((l) => applyCell(next, module, l, true));
      else applyCell(next, module, 'view', false);
      return next;
    });
  };

  const toggleColumn = (level, on) => {
    setPerms((prev) => {
      const next = new Set(prev);
      modules.forEach((m) => applyCell(next, m, level, on));
      return next;
    });
  };

  const setAll = (on) => {
    if (!on) { setPerms(new Set()); return; }
    const next = new Set();
    modules.forEach((m) => MATRIX_LEVELS.forEach((l) => applyCell(next, m, l, true)));
    setPerms(next);
  };

  const columnState = (level) => {
    const eligible = modules.filter((m) => moduleHasLevel(m, level));
    const on = eligible.filter((m) => has(m.key, level)).length;
    return { all: eligible.length > 0 && on === eligible.length, some: on > 0, none: eligible.length === 0 };
  };

  const rowState = (module) => {
    const eligible = MATRIX_LEVELS.filter((l) => moduleHasLevel(module, l));
    const on = eligible.filter((l) => has(module.key, l)).length;
    return { all: eligible.length > 0 && on === eligible.length, some: on > 0 };
  };

  const permissionList = useMemo(() => cleanRolePermissions([...perms], modules), [perms, modules]);

  const errors = {
    name: !name.trim() ? 'Role name is required' : '',
    permissions: permissionList.length === 0 ? 'Give the role at least one permission.' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (hasErrors) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      permissions: permissionList,
      isActive,
    };
    const result = isEditMode
      ? await dispatch(updateRole({ roleId, payload }))
      : await dispatch(createRole(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/staff/roles', {
        state: {
          message: isEditMode
            ? `Role "${payload.name}" updated. Staff with this role get the new access right away.`
            : `Role "${payload.name}" created.`,
        },
      });
    } else {
      setServerError(typeof result.payload === 'string' ? result.payload : 'Something went wrong. Please try again.');
    }
  };

  const fieldError = (key) => (submitted && errors[key]
    ? <span className="text-xs text-red-500 mt-1 block">{errors[key]}</span>
    : null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card title="Role Details" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role-name">Role Name<span className="text-red-500">*</span></Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cashier"
              maxLength={60}
              error={submitted && !!errors.name}
            />
            {fieldError('name')}
          </div>
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] self-end">
            <div>
              <p className="text-sm font-semibold text-[var(--vs-text-primary)] m-0">Active</p>
              <p className="text-xs text-[var(--vs-text-secondary)] m-0">Inactive roles cannot be given to staff.</p>
            </div>
            <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="role-description">Description</Label>
            <textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for (optional)"
              maxLength={300}
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:!text-white placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-indigo-500/60 resize-y"
            />
          </div>
          {isEditMode && staffCount > 0 && (
            <p className="md:col-span-2 text-xs text-amber-700 dark:text-amber-300 m-0 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              {staffCount} staff member{staffCount > 1 ? 's use' : ' uses'} this role. Changes apply to them immediately.
            </p>
          )}
        </div>
      </Card>

      <Card title="Permissions" bodyClassName="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--vs-text-secondary)] m-0 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>View</strong> opens the screens. <strong>Create</strong>, <strong>Edit</strong> (includes approve / status changes)
              and <strong>Delete</strong> each include View.
            </span>
          </p>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" onClick={() => setAll(true)}>Select all</Button>
            <Button size="xs" variant="outline" onClick={() => setAll(false)}>Clear</Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead className="bg-[var(--vs-bg-secondary)]">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                <th className="py-3 px-4 border-b border-[var(--vs-border)]">Module</th>
                {MATRIX_LEVELS.map((l) => {
                  const st = columnState(l);
                  return (
                    <th key={l} className="py-3 px-3 border-b border-[var(--vs-border)] text-center w-24">
                      <div className="flex flex-col items-center gap-1.5">
                        <span>{LEVEL_LABELS[l]}</span>
                        <TriCheckbox
                          label={`Select all: ${LEVEL_LABELS[l]}`}
                          checked={st.all}
                          indeterminate={st.some}
                          disabled={st.none}
                          onChange={(on) => toggleColumn(l, on)}
                        />
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 border-b border-[var(--vs-border)] text-center w-20">All</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const rs = rowState(m);
                return (
                  <tr key={m.key} className="border-b last:border-b-0 border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]/60">
                    <td className="py-2.5 px-4 text-[var(--vs-text-primary)] font-medium">{m.label || m.key}</td>
                    {MATRIX_LEVELS.map((l) => (
                      <td key={l} className="py-2.5 px-3 text-center">
                        {moduleHasLevel(m, l) ? (
                          <input
                            type="checkbox"
                            aria-label={`${m.label || m.key}: ${LEVEL_LABELS[l]}`}
                            checked={has(m.key, l)}
                            onChange={(e) => toggleCell(m, l, e.target.checked)}
                            className={checkboxCls}
                          />
                        ) : (
                          <span className="text-[var(--vs-text-secondary)]" title="Not available for this module">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center bg-[var(--vs-bg-secondary)]/40">
                      <TriCheckbox
                        label={`Select all: ${m.label || m.key}`}
                        checked={rs.all}
                        indeterminate={rs.some}
                        onChange={(on) => toggleRow(m, on)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fieldError('permissions')}
        <p className="text-[11px] text-[var(--vs-text-secondary)] m-0 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Settings, invoice settings, payment accounts and staff management are always owner only.
        </p>
      </Card>

      {serverError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}
      {submitted && hasErrors && (
        <div className="text-sm text-red-500">Please fix the highlighted fields.</div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate('/staff/roles')} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving} startIcon={saving && <Loader2 className="w-4 h-4 animate-spin" />}>
          {isEditMode ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
}

/* ─── Page: /staff/roles/create and /staff/roles/edit/:id ───────────────────── */

export default function RoleForm() {
  const { id: encryptedId } = useParams();
  const dispatch = useDispatch();

  const roleId = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!encryptedId;

  const { catalog, catalogLoading, catalogError, currentRole, roleLoading, roleError } = useSelector((state) => state.staff);
  const modules = useMemo(() => catalog?.modules || [], [catalog]);

  useEffect(() => {
    dispatch(getStaffPermissionCatalog());
    if (roleId) dispatch(getRoleById(roleId));
    return () => { dispatch(clearCurrentRole()); };
  }, [dispatch, roleId]);

  const editReady = !isEditMode || (currentRole && String(currentRole._id) === String(roleId));

  const initial = useMemo(() => {
    if (isEditMode && currentRole) {
      return {
        name: currentRole.name || '',
        description: currentRole.description || '',
        permissions: Array.isArray(currentRole.permissions) ? currentRole.permissions : [],
        isActive: currentRole.isActive !== false,
      };
    }
    return { name: '', description: '', permissions: [], isActive: true };
  }, [isEditMode, currentRole]);

  const header = {
    h1: isEditMode ? 'Edit Role' : 'Add Role',
    description: 'A role is a set of permissions. Every staff member with this role gets exactly this access.',
    buttonName: 'Back',
    navigation: '/staff/roles',
    buttonVariant: 'danger',
    buttonIcon: <ArrowLeft className="w-3.5 h-3.5" />,
  };

  if (isEditMode && !roleId) {
    return (
      <Card {...header} bodyClassName="p-6">
        <p className="text-sm text-red-500 m-0">This link is not valid. Please open the role again from the list.</p>
      </Card>
    );
  }

  if (!catalogLoading && modules.length === 0 && catalogError) {
    return (
      <Card {...header} bodyClassName="p-6">
        <p className="text-sm text-red-500 m-0">{typeof catalogError === 'string' ? catalogError : 'Could not load permissions.'}</p>
      </Card>
    );
  }

  const waiting = catalogLoading || modules.length === 0 || (isEditMode && (roleLoading || (!editReady && !roleError)));
  if (waiting) {
    return (
      <Card {...header} bodyClassName="p-6">
        <Loader />
      </Card>
    );
  }

  if (isEditMode && !editReady) {
    return (
      <Card {...header} bodyClassName="p-6">
        <p className="text-sm text-red-500 m-0">{typeof roleError === 'string' ? roleError : 'Role not found.'}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card {...header} bodyClassName="p-6">
        <RoleFormBody
          key={isEditMode ? `edit-${currentRole?._id}` : 'create'}
          isEditMode={isEditMode}
          roleId={roleId}
          initial={initial}
          modules={modules}
          staffCount={currentRole?.staffCount || 0}
        />
      </Card>
    </div>
  );
}
