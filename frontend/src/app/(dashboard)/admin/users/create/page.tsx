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

  const inp = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:border-transparent";
  const inpErr = "w-full px-3 py-2 text-sm border border-red-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300";

  if (createdUserId) {
    return (
      <DashboardPageWrapper title="Add User" subtitle="Create a new CPS system account">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <CheckCircle size={56} className="mx-auto" style={{ color: '#1a5228' }} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">User Created Successfully</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The account for <strong>{form.first_name} {form.last_name}</strong> ({form.email}) has been created.
            A verification email will be sent to them.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/admin/users"
              className="px-5 py-2 text-sm font-medium text-white rounded-lg transition"
              style={{ backgroundColor: '#1a5228' }}
            >
              Back to User List
            </Link>
            <button
              onClick={() => { setForm(INITIAL); setCreatedUserId(null); setErrors({}); }}
              className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 dark:text-gray-300"
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition">
          <ArrowLeft size={14} /> Back to Users
        </Link>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-gray-700 pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">First Name <span className="text-red-500">*</span></label>
                <input
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  placeholder="e.g. Juan"
                  className={errors.first_name ? inpErr : inp}
                  style={!errors.first_name ? { '--tw-ring-color': '#1a5228' } as React.CSSProperties : undefined}
                />
                {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Last Name <span className="text-red-500">*</span></label>
                <input
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  placeholder="e.g. dela Cruz"
                  className={errors.last_name ? inpErr : inp}
                />
                {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="user@dlsu.edu.ph"
                className={errors.email ? inpErr : inp}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">ID / Employee Number</label>
                <input
                  value={form.id_number}
                  onChange={(e) => set('id_number', e.target.value)}
                  placeholder="e.g. 12345678"
                  className={inp}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Department / College</label>
                <input
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  placeholder="e.g. College of Computer Studies"
                  className={inp}
                />
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-gray-700 pb-2">
              Role &amp; Access
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Role <span className="text-red-500">*</span></label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className={errors.role ? inpErr : inp}
              >
                <option value="">Select a role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-gray-700 pb-2">
              Password
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${errors.password ? inpErr : inp} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showCPw ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => set('confirm_password', e.target.value)}
                  placeholder="Repeat password"
                  className={`${errors.confirm_password ? inpErr : inp} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowCPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition disabled:opacity-60"
              style={{ backgroundColor: '#1a5228' }}
            >
              <UserPlus size={15} />
              {submitting ? 'Creating User…' : 'Create User'}
            </button>
            <Link
              href="/admin/users"
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
