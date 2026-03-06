'use client';

import Link from 'next/link';
import { Users, Settings, BarChart3, AlertCircle, Lock, Shield, Database, Activity } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'User Management', href: '/dashboard/admin/users', icon: <Users size={20} /> },
    { label: 'Cases', href: '/dashboard/cases', icon: <Shield size={20} /> },
    { label: 'Documentation', href: '/dashboard/documentation', icon: <Settings size={20} /> },
    { label: 'Profile', href: '/dashboard/profile', icon: <AlertCircle size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Admin Dashboard"
      subtitle="System Management & Oversight"
    >
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <StatusCard label="Total Users" value="156" />
        <StatusCard label="Active Cases" value="342" />
        <StatusCard label="System Health" value="99.8%" color="green" />
        <StatusCard label="Alerts" value="2" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AdminLink href="/dashboard/admin/users" label="Manage Users" />
          <AdminLink href="/dashboard/admin/alerts" label="View Alerts" />
          <AdminLink href="/dashboard/admin/reports" label="Generate Reports" />
          <AdminLink href="/dashboard/admin/audit-log" label="Audit Log" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({ label, value, color = "blue" }: any) {
  const colorStyles = {
    blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
    green: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700",
    red: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
  };

  return (
    <div className={`border ${colorStyles[color as keyof typeof colorStyles]} rounded p-4`}>
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
    </div>
  );
}

function AdminLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}
