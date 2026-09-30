"use client";

import { useState } from 'react';
import { UserPlus, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const ROLES = ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'ADMIN', 'DPO'];

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  id_number: string;
  department: string;
  password: string;
  confirm_password: string;
}

const INITIAL: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  role: '',
  id_number: '',
  department: '',
  password: '',
  confirm_password: '',
};

const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const ICS_ERR: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-text-primary)' };
const IC = 'input';

export default function AddUserPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.role) errs.role = 'Role is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const payload: Record<string, string> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        password: form.password,
      };
      if (form.id_number.trim()) payload.id_number = form.id_number.trim();
      if (form.department.trim()) payload.department = form.department.trim();

      const res = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || `Failed to create user (${res.status})`);
        return;
      }
      setCreatedUserId(data.user_id || 'created');
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdUserId) {
    return (
      <DashboardPageWrapper title="Add User" subtitle="Create a new CPS system account">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <CheckCircle size={56} className="mx-auto" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>User Created Successfully</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            The account for <strong>{form.first_name} {form.last_name}</strong> ({form.email}) has been created.
            A verification email will be sent to them.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/admin/users"
              className="px-5 py-2 text-sm font-medium text-white rounded-lg transition"
              style={{ background: 'var(--color-primary)' }}
            >
              Back to User List
            </Link>
            <button
              onClick={() => { setForm(INITIAL); setCreatedUserId(null); setErrors({}); }}
              className="px-5 py-2 text-sm font-medium rounded-lg transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Create Another
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Add User" subtitle="Create a new CPS system account">
      <div className="max-w-2xl">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <ArrowLeft size={14} /> Back to Users
        </Link>

        {serverError && (
          <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  First Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  placeholder="e.g. Juan"
                  className={IC}
                  style={errors.first_name ? ICS_ERR : ICS}
                />
                {errors.first_name && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.first_name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Last Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  placeholder="e.g. dela Cruz"
                  className={IC}
                  style={errors.last_name ? ICS_ERR : ICS}
                />
                {errors.last_name && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.last_name}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="user@dlsu.edu.ph"
                className={IC}
                style={errors.email ? ICS_ERR : ICS}
              />
              {errors.email && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.email}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>ID / Employee Number</label>
                <input
                  value={form.id_number}
                  onChange={(e) => set('id_number', e.target.value)}
                  placeholder="e.g. 12345678"
                  className={IC}
                  style={ICS}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Department / College</label>
                <input
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  placeholder="e.g. College of Computer Studies"
                  className={IC}
                  style={ICS}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              Role &amp; Access
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Role <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className={IC}
                style={errors.role ? ICS_ERR : ICS}
              >
                <option value="">Select a role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.role}</p>}
            </div>
          </div>

          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold pb-2" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              Password
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Password <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${IC} pr-10`}
                  style={errors.password ? ICS_ERR : ICS}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.password}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm Password <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showCPw ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => set('confirm_password', e.target.value)}
                  placeholder="Repeat password"
                  className={`${IC} pr-10`}
                  style={errors.confirm_password ? ICS_ERR : ICS}
                />
                <button
                  type="button"
                  onClick={() => setShowCPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showCPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.confirm_password}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}
            >
              <UserPlus size={15} />
              {submitting ? 'Creating User…' : 'Create User'}
            </button>
            <Link
              href="/admin/users"
              className="px-6 py-2.5 text-sm font-medium rounded-lg transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
