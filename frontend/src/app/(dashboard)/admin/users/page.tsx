"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  department: string;
}

const PAGE_SIZE = 10;
const VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'IC', 'STAFF', 'STUDENT'];

const IS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ADMIN:        { background: 'var(--color-danger-surface)',   color: 'var(--color-danger)'   },
    DPO:          { background: '#F5F3FF',                       color: '#7C3AED'               },
    PSYCHOLOGIST: { background: 'var(--color-info-surface)',     color: 'var(--color-info)'     },
    COUNSELOR:    { background: 'var(--color-success-surface)',  color: 'var(--color-success)'  },
    IC:           { background: '#FFF7ED',                       color: '#EA580C'               },
    CASE_MANAGER: { background: 'var(--color-primary-surface)',  color: 'var(--color-primary)'  },
    STAFF:        { background: 'var(--color-bg)',               color: 'var(--color-text-secondary)' },
    STUDENT:      { background: 'var(--color-info-surface)',     color: 'var(--color-info)'     },
  };
  return map[role] ?? { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [roleFilter]);

  useEffect(() => { setPageInput(String(page)); }, [page]);

  const goToPage = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    else setPageInput(String(page));
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);

      const response = await fetch(api(`/api/users/all?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotal(data.total ?? data.count ?? 0);
        setTotalPages(data.total_pages ?? 1);
        setError(null);
      } else if (response.status === 401) {
        window.location.href = '/login';
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch users (${response.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
    setUpdateMessage(null);
  };

  const submitRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/users/${selectedUser._id}/role`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        setUpdateMessage({ type: 'success', message: `Role updated to ${newRole}` });
        setUsers(users.map(u => u._id === selectedUser._id ? { ...u, role: newRole } : u));
        setTimeout(() => { setShowRoleModal(false); setUpdateMessage(null); }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUpdateMessage({ type: 'error', message: errorData.error || 'Failed to update role' });
      }
    } catch (err) {
      setUpdateMessage({ type: 'error', message: err instanceof Error ? err.message : 'Error updating role' });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.is_active;
    if (user.is_active) {
      if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    }
    setTogglingId(user._id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/users/${user._id}/status`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u._id === user._id ? { ...u, is_active: newStatus } : u));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Failed to update user status');
      }
    } catch {
      alert('Error updating user status');
    } finally {
      setTogglingId(null);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  if (loading && users.length === 0) {
    return (
      <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10"
            style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error && users.length === 0) {
    return (
      <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
        <div className="w-full max-w-2xl mx-auto">
          <div className="rounded-lg p-6" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-danger)' }}>Error Loading Users</h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button onClick={() => fetchUsers()} className="px-4 py-2 rounded-lg font-medium text-sm text-white transition"
              style={{ background: 'var(--color-danger)' }}>Retry</button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>User Management</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {total} total account{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/users/create"
          className="flex items-center gap-2 text-white px-6 py-2 rounded-lg font-medium transition text-sm"
          style={{ background: 'var(--color-primary)' }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
          onMouseOut={e  => (e.currentTarget.style.background = 'var(--color-primary)')}>
          <Plus size={20} /> Add User
        </Link>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5" size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or role…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
            style={IS}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg outline-none"
          style={{ ...IS, minWidth: 140 }}
        >
          <option value="">All roles</option>
          {VALID_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</td></tr>
              ) : users.length > 0 ? (
                users.map(user => (
                  <tr key={user._id || user.id}
                    className="transition"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>{user.name || 'N/A'}</td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={roleBadgeStyle(user.role)}>
                        {user.role?.replace(/_/g, ' ') || 'STUDENT'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium"
                        style={user.is_active
                          ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                          : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="p-2 rounded-lg transition"
                          style={{ color: 'var(--color-success)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-success-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleChangeRole(user)}
                          className="p-2 rounded-lg transition"
                          style={{ color: 'var(--color-primary)' }}
                          title="Change Role"
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 rounded-lg transition"
                          style={{ color: 'var(--color-danger)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-danger-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user._id}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50"
                          style={user.is_active
                            ? { background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }
                            : { background: 'var(--color-success-surface)', color: 'var(--color-success)' }}
                          title={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {togglingId === user._id ? '…' : user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No users found{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-3"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg transition disabled:opacity-40"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="number" min={1} max={totalPages}
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onBlur={() => goToPage(pageInput)}
                  onKeyDown={e => { if (e.key === 'Enter') goToPage(pageInput); }}
                  className="text-center rounded-lg outline-none tabular-nums"
                  style={{ width: '2.5rem', padding: '2px 4px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.75rem' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>/ {totalPages}</span>
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg transition disabled:opacity-40"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-lg p-8 max-w-md w-full mx-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Change User Role</h2>
              <button onClick={() => { setShowRoleModal(false); setUpdateMessage(null); }}
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>User:</strong> {selectedUser.name} ({selectedUser.email})
              </p>
              <p className="mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Current Role:</strong>{' '}
                <span className="px-2 py-0.5 rounded text-xs font-medium ml-1" style={roleBadgeStyle(selectedUser.role)}>{selectedUser.role}</span>
              </p>
            </div>

            {updateMessage && (
              <div className="mb-4 p-3 rounded-lg text-sm font-medium"
                style={updateMessage.type === 'success'
                  ? { background: 'var(--color-success-surface)', color: 'var(--color-success)' }
                  : { background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
                {updateMessage.message}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>New Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} disabled={updating}
                className="w-full px-4 py-2 text-sm rounded-lg outline-none disabled:opacity-50"
                style={IS}>
                <option value="">Select a role…</option>
                {VALID_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowRoleModal(false); setUpdateMessage(null); }} disabled={updating}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition disabled:opacity-50"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Cancel
              </button>
              <button onClick={submitRoleChange} disabled={!newRole || newRole === selectedUser.role || updating}
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
                onMouseEnter={e => { if (!updating) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}>
                {updating ? 'Updating…' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>User Roles &amp; Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { role: 'Admin', desc: 'Full system access and management', perms: ['User management', 'System settings', 'Reports & analytics', 'Audit logs'] },
            { role: 'DPO (Director)', desc: 'Department oversight and supervision', perms: ['Team management', 'Case supervision', 'Staff performance', 'Strategic planning'] },
            { role: 'Psychologist', desc: 'Clinical review and case oversight', perms: ['Case reviews', 'Risk assessment', 'Clinical supervision', 'Document access'] },
            { role: 'Counselor', desc: 'Client counseling and session management', perms: ['Client sessions', 'Case notes', 'Assessments', 'Treatment planning'] },
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg p-6"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '4px solid var(--color-primary)' }}>
              <div className="flex items-start gap-3">
                <Shield size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div className="flex-1">
                  <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{item.role}</h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                  <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.perms.map((perm, pidx) => <li key={pidx}>• {perm}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardPageWrapper>
  );
}
