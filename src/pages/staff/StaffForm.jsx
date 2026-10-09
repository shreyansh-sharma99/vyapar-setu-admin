import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck, Store as StoreIcon, Info, ExternalLink } from 'lucide-react';
import { decryptData, encryptData } from '@/utility/crypto';
import Card from '@/components/breadCrumbs/Card';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import { Label } from '@/components/inputs/Label';
import Select from '@/components/inputs/Select';
import Switch from '@/components/inputs/Switch';
import Loader from '@/components/loader/Loader';
import { getStores } from '@/pages/storeManagement/stores/services/storeSlice';
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

function StaffFormBody({ isEditMode, staffId, initial, modules, roles, designations, optionsLoading, stores, saving, serverError }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleId, setRoleId] = useState(initial.roleId);
  const [designationId, setDesignationId] = useState(initial.designationId);
  const [storeIds, setStoreIds] = useState(initial.storeIds);
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

  const toggleStore = (id, checked) => {
    setStoreIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((s) => s !== id)));
  };

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
      storeIds,
      isActive,
    };
    if (password) payload.password = password;
    if (isEditMode) dispatch(updateStaff({ staffId, payload }));
    else dispatch(createStaff(payload));
  };

  const fieldError = (key) => (submitted && errors[key]
    ? <span className="text-xs text-red-500 mt-1 block">{errors[key]}</span>
    : null);

  const editRolePath = roleId ? `/staff/roles/edit/${encodeURIComponent(encryptData(roleId))}` : '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic details */}
      <Card title="Login Details" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="staff-name">Full Name<span className="text-red-500">*</span></Label>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" error={submitted && !!errors.name} />
            {fieldError('name')}
          </div>
          <div>
            <Label htmlFor="staff-email">Email (used to log in)<span className="text-red-500">*</span></Label>
            <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" error={submitted && !!errors.email} />
            {fieldError('email')}
          </div>
          <div>
            <Label htmlFor="staff-phone">Phone</Label>
            <Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="staff-password">
              Password{!isEditMode && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditMode ? 'Leave blank to keep the current password' : 'At least 8 characters'}
              autoComplete="new-password"
              error={submitted && !!errors.password}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            {fieldError('password')}
            {isEditMode && (
              <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">
                Setting a new password signs this person out of their current session.
              </span>
            )}
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)]">
            <div>
              <p className="text-sm font-semibold text-[var(--vs-text-primary)] m-0">Active</p>
              <p className="text-xs text-[var(--vs-text-secondary)] m-0">Inactive staff cannot log in.</p>
            </div>
            <Switch checked={isActive} onChange={(val) => setIsActive(val)} />
          </div>
        </div>
      </Card>

      {/* Designation & role */}
      <Card title="Designation & Role" bodyClassName="p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Designation</Label>
            <Select
              options={designationOptions}
              value={designationId}
              onChange={(val) => setDesignationId(val || '')}
              placeholder="Search designation"
              loading={optionsLoading}
            />
            <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">
              Job title only (e.g. Store Manager). <Link to="/staff/designations" className="text-indigo-600 dark:text-indigo-400 hover:underline">Manage designations</Link>
            </span>
          </div>
          <div>
            <Label>Role<span className="text-red-500">*</span></Label>
            <Select
              options={roleOptions}
              value={roleId}
              onChange={(val) => setRoleId(val || '')}
              placeholder="Search role"
              loading={optionsLoading}
              error={submitted && !!errors.roleId}
            />
            {fieldError('roleId')}
            {!optionsLoading && roleOptions.length === 0 && (
              <span className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 block">
                No roles yet. <Link to="/staff/roles/create" className="text-indigo-600 dark:text-indigo-400 hover:underline">Create a role</Link> first.
              </span>
            )}
          </div>
        </div>

        {selectedRole && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--vs-text-secondary)] m-0 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Permissions come from the role. Edit the role to change them.</span>
              </p>
              <Link
                to={editRolePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Edit role “{selectedRole.name}” <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <RolePermissionsView permissions={selectedRole.permissions || []} modules={modules} />
          </div>
        )}

        <p className="text-[11px] text-[var(--vs-text-secondary)] m-0 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Settings, invoice settings, payment accounts and staff management are always owner only.
        </p>
      </Card>

      {/* Store access */}
      <Card title="Store Access" bodyClassName="p-6 flex flex-col gap-3">
        <p className="text-xs text-[var(--vs-text-secondary)] m-0">
          Pick the stores / warehouses this person works in. Leave all unticked to allow <strong>all stores</strong>.
        </p>
        {stores.length === 0 ? (
          <p className="text-sm text-[var(--vs-text-secondary)] m-0">No stores found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stores.map((s) => {
              const checked = storeIds.includes(String(s._id));
              return (
                <label
                  key={s._id}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${checked
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/40'
                    : 'border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleStore(String(s._id), e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                  />
                  <StoreIcon className="w-4 h-4 text-[var(--vs-text-secondary)] shrink-0" />
                  <span className="text-sm text-[var(--vs-text-primary)] truncate">
                    {s.name}{s.code ? ` (${s.code})` : ''}
                  </span>
                  {s.isActive === false && (
                    <span className="ml-auto text-[10px] font-semibold text-rose-600 dark:text-rose-400">Inactive</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 m-0">
          {storeIds.length === 0 ? 'Access: all stores' : `Access: ${storeIds.length} store${storeIds.length > 1 ? 's' : ''}`}
        </p>
      </Card>

      {serverError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {typeof serverError === 'string' ? serverError : 'Something went wrong. Please try again.'}
        </div>
      )}
      {submitted && hasErrors && (
        <div className="text-sm text-red-500">Please fix the highlighted fields.</div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate('/staff')} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving} startIcon={saving && <Loader2 className="w-4 h-4 animate-spin" />}>
          {isEditMode ? 'Save Changes' : 'Create Staff'}
        </Button>
      </div>
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
  const { stores } = useSelector((state) => state.store);

  useEffect(() => {
    dispatch(resetStaffStatus());
    dispatch(getStaffPermissionCatalog());
    dispatch(getRoleOptions());
    dispatch(getDesignationOptions());
    dispatch(getStores());
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
        storeIds: (currentStaff.storeIds || []).map((s) => String(s?._id || s)),
        isActive: currentStaff.isActive !== false,
      };
    }
    return { name: '', email: '', phone: '', roleId: '', designationId: '', storeIds: [], isActive: true };
  }, [isEditMode, currentStaff]);

  const title = isEditMode ? 'Edit Staff Member' : 'Add Staff Member';
  const header = {
    h1: title,
    description: 'Staff log in on the same login page with their own email and password.',
    buttonName: 'Back',
    navigation: '/staff',
    buttonVariant: 'danger',
    buttonIcon: <ArrowLeft className="w-3.5 h-3.5" />,
  };

  if (isEditMode && !staffId) {
    return (
      <Card {...header} bodyClassName="p-6">
        <p className="text-sm text-red-500 m-0">This link is not valid. Please open the staff member again from the list.</p>
      </Card>
    );
  }

  const waiting = isEditMode && (loading || (!editReady && !error));
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
        <p className="text-sm text-red-500 m-0">{typeof error === 'string' ? error : 'Staff member not found.'}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 mx-auto">
      <Card {...header} bodyClassName="p-6">
        <StaffFormBody
          key={isEditMode ? `edit-${currentStaff?._id}` : 'create'}
          isEditMode={isEditMode}
          staffId={staffId}
          initial={initial}
          modules={modules}
          roles={roleOptions}
          designations={designationOptions}
          optionsLoading={roleOptionsLoading || designationOptionsLoading}
          stores={stores || []}
          saving={saving}
          serverError={error}
        />
      </Card>
    </div>
  );
}
