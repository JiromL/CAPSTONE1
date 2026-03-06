"use client";

import React, { useState } from 'react';
import { Plus, ArrowLeft, Search, Edit2, Trash2, Shield, Eye } from 'lucide-react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export default function UserManagementPage() {
  const [users] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      role: 'COUNSELOR',
      status: 'active',
      department: 'Counseling Services',
      joinDate: '2022-08-01',
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      email: 'michael.chen@university.edu',
      role: 'PSYCHOLOGIST',
      status: 'active',
      department: 'Clinical Psychology',
      joinDate: '2021-06-15',
    },
    {
      id: 3,
      name: 'Jennifer Martinez',
      email: 'jennifer.martinez@university.edu',
      role: 'INTAKE_COORDINATOR',
      status: 'active',
      department: 'Counseling Services',
      joinDate: '2023-01-10',
    },
    {
      id: 4,
      name: 'Admin Panel',
      email: 'admin@university.edu',
      role: 'ADMIN',
      status: 'active',
      department: 'Administration',
      joinDate: '2020-01-01',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.includes(searchTerm) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      ADMIN: 'bg-red-100 text-red-800',
      PSYCHOLOGIST: 'bg-blue-100 text-blue-800',
      COUNSELOR: 'bg-green-100 text-green-800',
      DPO: 'bg-purple-100 text-purple-800',
      CASE_MANAGER: 'bg-orange-100 text-orange-800',
      INTAKE_COORDINATOR: 'bg-yellow-100 text-yellow-800',
      SUPPORT_STAFF: 'bg-gray-100 text-gray-800',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PageShell title="User Management" subtitle="Manage staff and user accounts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage staff and user accounts</p>
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">{user.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>{user.role.replace(/_/g, ' ')}</span></td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.department}</td>
                    <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
                    <td className="px-6 py-4 flex gap-3"><button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"><Eye size={18} /></button><button className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition"><Edit2 size={18} /></button><button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"><Trash2 size={18} /></button></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">User Roles & Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[{ role: 'Admin', desc: 'Full system access and management', perms: ['User management', 'System settings', 'Reports & analytics', 'Audit logs'] }, { role: 'DPO (Director)', desc: 'Department oversight and supervision', perms: ['Team management', 'Case supervision', 'Staff performance', 'Strategic planning'] }, { role: 'Psychologist', desc: 'Clinical review and case oversight', perms: ['Case reviews', 'Risk assessment', 'Clinical supervision', 'Document access'] }, { role: 'Counselor', desc: 'Client counseling and session management', perms: ['Client sessions', 'Case notes', 'Assessments', 'Treatment planning'] }].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border-t-4 border-blue-600 border-gray-200 dark:border-gray-700"><div className="flex items-start gap-3"><Shield className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={24} /><div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-gray-50 mb-1">{item.role}</h3><p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.desc}</p><ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">{item.perms.map((perm, pidx) => (<li key={pidx}>• {perm}</li>))}</ul></div></div></div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
