"use client";

import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Search, Edit2, Trash2, Shield, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function UserManagementPage() {
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

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'IC', 'STAFF', 'STUDENT'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(api('/api/users/all'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setError(null);
      } else if (response.status === 401) {
        console.error('Unauthorized - redirecting to login');
        window.location.href = '/login';
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', response.status, errorData);
        setError(errorData.error || `Failed to fetch users (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const data = await response.json();
        setUpdateMessage({ type: 'success', message: `Role updated to ${newRole}` });
        
        // Update local users list
        setUsers(users.map(u => 
          u._id === selectedUser._id ? { ...u, role: newRole } : u
        ));

        // Close modal after 2 seconds
        setTimeout(() => {
          setShowRoleModal(false);
          setUpdateMessage(null);
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUpdateMessage({ type: 'error', message: errorData.error || 'Failed to update role' });
      }
    } catch (err) {
      console.error('Error updating role:', err);
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (response.ok) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, is_active: newStatus } : u));
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

  const filteredUsers = users.filter(
    (u) =>
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (u.email?.includes(searchTerm) || false) ||
      (u.role?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      ADMIN: 'bg-red-100 text-red-800',
      PSYCHOLOGIST: 'bg-blue-100 text-blue-800',
      COUNSELOR: 'bg-green-100 text-green-800',
      DPO: 'bg-purple-100 text-purple-800',
      IC: 'bg-yellow-100 text-yellow-800',
      CASE_MANAGER: 'bg-teal-100 text-teal-800',
      STAFF: 'bg-gray-100 text-gray-800',
      STUDENT: 'bg-sky-100 text-sky-800',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  if (error) {
    return (
      <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Users</h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="User Management" subtitle="Manage staff and user accounts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Managing {users.length} staff and user accounts</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition"><Plus size={20} /> Add User</button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
          <input type="text" placeholder="Search by name, email, or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">{user.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>{user.role?.replace(/_/g, ' ') || 'STUDENT'}</span></td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${user.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"><Eye size={18} /></button>
                        <button onClick={() => handleChangeRole(user)} className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-blue-900/30 transition" title="Change Role"><Edit2 size={18} /></button>
                        <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"><Trash2 size={18} /></button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user._id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                            user.is_active
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                              : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-blue-900/20 dark:text-green-400 dark:hover:bg-blue-900/40'
                          }`}
                          title={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {togglingId === user._id ? '…' : user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Change User Role</h2>
              <button onClick={() => { setShowRoleModal(false); setUpdateMessage(null); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>User:</strong> {selectedUser.name} ({selectedUser.email})
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>Current Role:</strong> <span className={`px-2 py-1 rounded text-sm font-medium ${getRoleColor(selectedUser.role)}`}>{selectedUser.role}</span>
              </p>
            </div>

            {updateMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                updateMessage.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
              }`}>
                {updateMessage.message}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={updating}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a role...</option>
                {VALID_ROLES.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRoleModal(false); setUpdateMessage(null); }}
                disabled={updating}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={submitRoleChange}
                disabled={!newRole || newRole === selectedUser.role || updating}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">User Roles & Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[{ role: 'Admin', desc: 'Full system access and management', perms: ['User management', 'System settings', 'Reports & analytics', 'Audit logs'] }, { role: 'DPO (Director)', desc: 'Department oversight and supervision', perms: ['Team management', 'Case supervision', 'Staff performance', 'Strategic planning'] }, { role: 'Psychologist', desc: 'Clinical review and case oversight', perms: ['Case reviews', 'Risk assessment', 'Clinical supervision', 'Document access'] }, { role: 'Counselor', desc: 'Client counseling and session management', perms: ['Client sessions', 'Case notes', 'Assessments', 'Treatment planning'] }].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-t-4 border-blue-600 border-gray-200 dark:border-gray-700"><div className="flex items-start gap-3"><Shield className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={24} /><div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-gray-50 mb-1">{item.role}</h3><p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.desc}</p><ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">{item.perms.map((perm, pidx) => (<li key={pidx}>• {perm}</li>))}</ul></div></div></div>
          ))}
        </div>
      </section>
    </DashboardPageWrapper>
  );
}
