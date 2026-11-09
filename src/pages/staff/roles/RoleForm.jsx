import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, ShieldCheck, Users } from 'lucide-react';
import { decryptData } from '@/utility/crypto';
import { cn } from '@/lib/utils';
import {
  Button, Card, Checkbox, Field, FormActions, FormGrid, Input, LINE_TD, LINE_TH, LineItemsTable, LineRow,
  PageHeader, Section, SkeletonRows, Switch, Textarea,
} from '@/components/ui';
import {
  getStaffPermissionCatalog,
  getRoleById,
  createRole,
  updateRole,
  clearCurrentRole,
} from '../services/staffSlice';
import { MATRIX_LEVELS, LEVEL_LABELS, moduleHasLevel, moduleExtras, cleanRolePermissions } from './rolePermissions';

const TH_CENTER = cn(LINE_TH, 'text-center');
const TD_CENTER = cn(LINE_TD, 'text-center align-middle');

/** Checkbox that can show a "some selected" (indeterminate) state. */
function TriCheckbox({ checked, indeterminate, onChange, label, disabled }) {
  return (
    <Checkbox
      aria-label={label}
      title={label}
      checked={checked}
      indeterminate={!!indeterminate && !checked}
      disabled={disabled}
      onChange={(on) => onChange(on)}
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
      else {
        MATRIX_LEVELS.forEach((l) => draft.delete(`${module.key}.${l}`));
        moduleExtras(module).forEach((x) => draft.delete(`${module.key}.${x.key}`));
      }
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

  /** Extra permission (e.g. sales.change_price) — brings view along. */
  const toggleExtra = (module, extraKey, on) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(`${module.key}.${extraKey}`);
        if (moduleHasLevel(module, 'view')) next.add(`${module.key}.view`);
      } else {
        next.delete(`${module.key}.${extraKey}`);
      }
      return next;
    });
  };

  const extraModules = modules.filter((m) => moduleExtras(m).length > 0);

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

  const fieldError = (key) => (submitted && errors[key] ? errors[key] : undefined);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Section title="Role Details" description="Name and status of this role">
        <FormGrid cols={2}>
          <Field label="Role Name" required error={fieldError('name')}>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cashier"
              maxLength={60}
            />
          </Field>
          <div className="flex items-center justify-between gap-4 self-end rounded-control bg-fill-2 p-3">
            <div>
              <p className="m-0 text-sm font-semibold text-ink">Active</p>
              <p className="m-0 text-xs text-ink-subtle">Inactive roles cannot be given to staff.</p>
            </div>
            <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
          </div>
          <Field label="Description" className="col-span-full">
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for (optional)"
              maxLength={300}
              rows={2}
            />
          </Field>
          {isEditMode && staffCount > 0 && (
            <p className="col-span-full m-0 flex items-center gap-1.5 text-xs font-medium text-warning">
              <Users className="size-3.5 shrink-0" />
              {staffCount} staff member{staffCount > 1 ? 's use' : ' uses'} this role. Changes apply to them immediately.
            </p>
          )}
        </FormGrid>
      </Section>

      <Section
        title="Permissions"
        actions={
          <>
            <Button size="xs" variant="secondary" onClick={() => setAll(true)}>Select all</Button>
            <Button size="xs" variant="secondary" onClick={() => setAll(false)}>Clear</Button>
          </>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <p className="m-0 flex items-start gap-1.5 text-xs text-ink-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <strong>View</strong> opens the screens. <strong>Create</strong>, <strong>Edit</strong> (includes approve / status changes)
            and <strong>Delete</strong> each include View.
          </span>
        </p>

        <LineItemsTable
          minWidth={560}
          head={
            <tr>
              <th className={LINE_TH}>Module</th>
              {MATRIX_LEVELS.map((l) => {
                const st = columnState(l);
                return (
                  <th key={l} className={cn(TH_CENTER, 'w-24')}>
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
              <th className={cn(TH_CENTER, 'w-20 align-top')}>All</th>
            </tr>
          }
        >
          {modules.map((m) => {
            const rs = rowState(m);
            return (
              <LineRow key={m.key}>
                <td className={cn(LINE_TD, 'align-middle font-medium')}>{m.label || m.key}</td>
                {MATRIX_LEVELS.map((l) => (
                  <td key={l} className={TD_CENTER}>
                    {moduleHasLevel(m, l) ? (
                      <Checkbox
                        aria-label={`${m.label || m.key}: ${LEVEL_LABELS[l]}`}
                        checked={has(m.key, l)}
                        onChange={(on) => toggleCell(m, l, on)}
                      />
                    ) : (
                      <span className="text-ink-subtle" title="Not available for this module">—</span>
                    )}
                  </td>
                ))}
                <td className={cn(TD_CENTER, 'bg-fill-2/50')}>
                  <TriCheckbox
                    label={`Select all: ${m.label || m.key}`}
                    checked={rs.all}
                    indeterminate={rs.some}
                    onChange={(on) => toggleRow(m, on)}
                  />
                </td>
              </LineRow>
            );
          })}
        </LineItemsTable>

        {extraModules.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs font-semibold text-ink-subtle">Extra permissions</p>
            {extraModules.map((m) => moduleExtras(m).map((x) => (
              <Checkbox
                key={`${m.key}.${x.key}`}
                checked={has(m.key, x.key)}
                onChange={(on) => toggleExtra(m, x.key, on)}
                wrapperClassName="flex w-full items-center rounded-control border border-line p-3 hover:bg-fill-2"
                label={
                  <>
                    {x.label}
                    <span className="text-xs font-normal text-ink-subtle"> · {m.label || m.key} (also gives View)</span>
                  </>
                }
              />
            )))}
          </div>
        )}
        {fieldError('permissions') && (
          <p role="alert" className="m-0 text-xs font-medium text-danger">{fieldError('permissions')}</p>
        )}
        <p className="m-0 flex items-center gap-1.5 text-xs text-ink-subtle">
          <ShieldCheck className="size-3.5" />
          Settings, invoice settings, payment accounts and staff management are always owner only.
        </p>
      </Section>

      {serverError && (
        <div className="rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {serverError}
        </div>
      )}
      {submitted && hasErrors && (
        <p className="m-0 text-sm font-medium text-danger">Please fix the highlighted fields.</p>
      )}

      <FormActions>
        <Button variant="secondary" onClick={() => navigate('/staff/roles')} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEditMode ? 'Save Changes' : 'Create Role'}
        </Button>
      </FormActions>
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

  const title = isEditMode ? 'Edit Role' : 'Add Role';
  const header = (
    <PageHeader
      title={title}
      description="A role is a set of permissions. Every staff member with this role gets exactly this access."
      actions={
        <Button as={Link} to="/staff/roles" variant="secondary" startIcon={<ArrowLeft />}>
          Back
        </Button>
      }
    />
  );

  const notice = (text) => (
    <div className="flex flex-col gap-5">
      {header}
      <Card>
        <p className="m-0 text-sm font-medium text-danger">{text}</p>
      </Card>
    </div>
  );

  if (isEditMode && !roleId) {
    return notice('This link is not valid. Please open the role again from the list.');
  }

  if (!catalogLoading && modules.length === 0 && catalogError) {
    return notice(typeof catalogError === 'string' ? catalogError : 'Could not load permissions.');
  }

  const waiting = catalogLoading || modules.length === 0 || (isEditMode && (roleLoading || (!editReady && !roleError)));
  if (waiting) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <SkeletonRows rows={6} cols={5} />
        </Card>
      </div>
    );
  }

  if (isEditMode && !editReady) {
    return notice(typeof roleError === 'string' ? roleError : 'Role not found.');
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      <RoleFormBody
        key={isEditMode ? `edit-${currentRole?._id}` : 'create'}
        isEditMode={isEditMode}
        roleId={roleId}
        initial={initial}
        modules={modules}
        staffCount={currentRole?.staffCount || 0}
      />
    </div>
  );
}
