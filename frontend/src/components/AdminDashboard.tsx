'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'My Tasks', href: '/tasks', id: 'tasks' },
    { label: 'Intake Form', href: '/intake', id: 'intake' },
    { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
    { label: 'Wellness Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Admin Dashboard"
      subtitle="System Management"
      activeSection="dashboard"
    >
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <StatusCard label="Total Users" value="156" />
        <StatusCard label="Active Cases" value="342" />
        <StatusCard label="System Health" value="99.8%" />
        <StatusCard label="Alerts" value="2" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AdminLink href="/admin/users" label="Manage Users" />
          <AdminLink href="/admin/alerts" label="View Alerts" />
          <AdminLink href="/admin/security" label="Reports" />
          <AdminLink href="/admin/audit-log" label="Audit Log" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}

function AdminLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}
