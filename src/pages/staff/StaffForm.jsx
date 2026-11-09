import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Info, ExternalLink } from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import {
  Button, Card, Field, FormActions, FormGrid, Input, PageHeader, Section, Select, SkeletonRows, Switch,
} from '@/components/ui';
import {
  getStaffPermissionCatalog,
  getRoleOptions,
  getDesignationOptions,
  getStaffById,
  createStaff,
  updateStaff,
  resetStaffStatus,
  clearCurrentStaff,
} from './services/staffSlice';
import RolePermissionsView from './roles/RolePermissionsView';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const refId = (v) => (v ? String(v?._id || v) : '');

/** Active rows as {value,label}; the currently picked row is kept even if inactive. */
const toOptions = (rows, currentId) => (rows || [])
  .filter((r) => r.isActive !== false || String(r._id) === currentId)
  .map((r) => ({
    value: String(r._id),
    label: r.isActive === false ? `${r.name} (inactive)` : r.name,
  }));

/* ─── Form body (receives initial values once loaded) ───────────────────────── */

function StaffFormBody({ isEditMode, staffId, initial, modules, roles, designations, optionsLoading, saving, serverError }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState(initial.roleId);
  const [designationId, setDesignationId] = useState(initial.designationId);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [submitted, setSubmitted] = useState(false);

  const roleOptions = useMemo(() => toOptions(roles, roleId), [roles, roleId]);
  const designationOptions = useMemo(
    () => [{ value: '', label: 'No designation' }, ...toOptions(designations, designationId)],
    [designations, designationId]
  );
  const selectedRole = useMemo(
    () => (roles || []).find((r) => String(r._id) === roleId) || null,
    [roles, roleId]
  );

  const errors = {
    name: !name.trim() ? 'Name is required' : '',
    email: !email.trim() ? 'Email is required' : (!EMAIL_RE.test(email.trim()) ? 'Enter a valid email address' : ''),
    password: !isEditMode && !password
      ? 'Password is required'
      : (password && password.length < 8 ? 'Password must be at least 8 characters' : ''),
    roleId: !roleId ? 'Select a role' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);


  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      roleId,
      designationId: designationId || null,
      isActive,
    };
    if (password) payload.password = password;
    if (isEditMode) dispatch(updateStaff({ staffId, payload }));
    else dispatch(createStaff(payload));
  };

  const fieldError = (key) => (submitted && errors[key] ? errors[key] : undefined);

  const editRolePath = roleId ? `/staff/roles/edit/${encodeURIComponent(encryptData(roleId))}` : '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Basic details */}
      <Section title="Login Details" description="How this person signs in">
        <FormGrid cols={2}>
          <Field label="Full Name" required error={fieldError('name')}>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
          </Field>
          <Field label="Email (used to log in)" required error={fieldError('email')}>
            <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
          </Field>
          <Field label="Phone">
            <Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </Field>
          <div className="flex min-w-0 flex-col">
            <Field label="Password" required={!isEditMode} error={fieldError('password')}>
              <Input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditMode ? 'Leave blank to keep the current password' : 'At least 8 characters'}
                autoComplete="new-password"
                endIcon={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                }
              />
            </Field>
            {isEditMode && (
              <p className="m-0 mt-1.5 text-xs text-ink-subtle">
                Setting a new password signs this person out of their current session.
              </p>
            )}
          </div>
          <div className="col-span-full flex items-center justify-between gap-4 rounded-control bg-fill-2 p-3">
            <div>
              <p className="m-0 text-sm font-semibold text-ink">Active</p>
              <p className="m-0 text-xs text-ink-subtle">Inactive staff cannot log in.</p>
            </div>
            <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
          </div>
        </FormGrid>
      </Section>

      {/* Designation & role */}
      <Section title="Designation & Role" description="Job title and what they can access" bodyClassName="flex flex-col gap-4">
        <FormGrid cols={2}>
          <Field
            label="Designation"
            hint={
              <>
                Job title only (e.g. Store Manager). <Link to="/staff/designations" className="font-semibold text-brand-ink hover:underline">Manage designations</Link>
              </>
            }
          >
            <Select
              options={designationOptions}
              value={designationId}
              onChange={(val) => setDesignationId(val || '')}
              placeholder="Search designation"
              loading={optionsLoading}
            />
          </Field>
          <div className="flex min-w-0 flex-col">
            <Field label="Role" required error={fieldError('roleId')}>
              <Select
                options={roleOptions}
                value={roleId}
                onChange={(val) => setRoleId(val || '')}
                placeholder="Search role"
                loading={optionsLoading}
              />
            </Field>
            {!optionsLoading && roleOptions.length === 0 && (
              <p className="m-0 mt-1.5 text-xs font-medium text-warning">
                No roles yet. <Link to="/staff/roles/create" className="font-semibold text-brand-ink hover:underline">Create a role</Link> first.
              </p>
            )}
          </div>
        </FormGrid>

        {selectedRole && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 flex items-start gap-1.5 text-xs text-ink-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>Permissions come from the role. Edit the role to change them.</span>
              </p>
              <Link
                to={editRolePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
              >
                Edit role “{selectedRole.name}” <ExternalLink className="size-3" />
              </Link>
            </div>
            <RolePermissionsView permissions={selectedRole.permissions || []} modules={modules} />
          </div>
        )}

        <p className="m-0 flex items-center gap-1.5 text-xs text-ink-subtle">
          <ShieldCheck className="size-3.5" />
          Settings, invoice settings, payment accounts and staff management are always owner only.
        </p>
      </Section>

      {serverError && (
        <div className="rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {typeof serverError === 'string' ? serverError : 'Something went wrong. Please try again.'}
        </div>
      )}
      {submitted && hasErrors && (
        <p className="m-0 text-sm font-medium text-danger">Please fix the highlighted fields.</p>
      )}

      <FormActions>
        <Button variant="secondary" onClick={() => navigate('/staff')} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEditMode ? 'Save Changes' : 'Create Staff'}
        </Button>
      </FormActions>
    </form>
  );
}

/* ─── Page: create (/staff/create) and edit (/staff/edit/:id) ───────────────── */

export default function StaffForm() {
  const { id: encryptedId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const staffId = encryptedId ? decryptData(decodeURIComponent(encryptedId)) : null;
  const isEditMode = !!encryptedId;

  const {
    currentStaff, catalog, loading, saving, error, success,
    roleOptions, roleOptionsLoading, designationOptions, designationOptionsLoading,
  } = useSelector((state) => state.staff);

  useEffect(() => {
    dispatch(resetStaffStatus());
    dispatch(getStaffPermissionCatalog());
    dispatch(getRoleOptions());
    dispatch(getDesignationOptions());
    if (staffId) dispatch(getStaffById(staffId));
    return () => {
      dispatch(clearCurrentStaff());
      dispatch(resetStaffStatus());
    };
  }, [dispatch, staffId]);

  // A role edited in another tab shows its new permissions when the owner comes back.
  useEffect(() => {
    const onFocus = () => dispatch(getRoleOptions());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      dispatch(resetStaffStatus());
      navigate('/staff', {
        state: { message: isEditMode ? 'Staff member updated.' : 'Staff member created. They can now log in with their email and password.' },
      });
    }
  }, [success, dispatch, navigate, isEditMode]);

  const modules = catalog?.modules || [];
  const editReady = !isEditMode || (currentStaff && String(currentStaff._id) === String(staffId));

  const initial = useMemo(() => {
    if (isEditMode && currentStaff) {
      return {
        name: currentStaff.name || '',
        email: currentStaff.email || '',
        phone: currentStaff.phone || '',
        roleId: refId(currentStaff.roleId),
        designationId: refId(currentStaff.designationId),
        isActive: currentStaff.isActive !== false,
      };
    }
    return { name: '', email: '', phone: '', roleId: '', designationId: '', isActive: true };
  }, [isEditMode, currentStaff]);

  const title = isEditMode ? 'Edit Staff Member' : 'Add Staff Member';
  const header = (
    <PageHeader
      title={title}
      description="Staff log in on the same login page with their own email and password."
      actions={
        <Button as={Link} to="/staff" variant="secondary" startIcon={<ArrowLeft />}>
          Back
        </Button>
      }
    />
  );

  if (isEditMode && !staffId) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <p className="m-0 text-sm font-medium text-danger">This link is not valid. Please open the staff member again from the list.</p>
        </Card>
      </div>
    );
  }

  const waiting = isEditMode && (loading || (!editReady && !error));
  if (waiting) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <SkeletonRows rows={6} cols={2} />
        </Card>
      </div>
    );
  }

  if (isEditMode && !editReady) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <p className="m-0 text-sm font-medium text-danger">{typeof error === 'string' ? error : 'Staff member not found.'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      <StaffFormBody
        key={isEditMode ? `edit-${currentStaff?._id}` : 'create'}
        isEditMode={isEditMode}
        staffId={staffId}
        initial={initial}
        modules={modules}
        roles={roleOptions}
        designations={designationOptions}
        optionsLoading={roleOptionsLoading || designationOptionsLoading}
        saving={saving}
        serverError={error}
      />
    </div>
  );
}
