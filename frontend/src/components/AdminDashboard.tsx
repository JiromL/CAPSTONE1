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
    { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'User Management', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'Role Management', href: '/admin/roles', icon: <Shield size={20} /> },
    { label: 'Audit Log', href: '/admin/audit-log', icon: <Activity size={20} /> },
    { label: 'System Settings', href: '/admin/settings', icon: <Settings size={20} /> },
    { label: 'Security', href: '/admin/security', icon: <Lock size={20} /> },
    { label: 'Database', href: '/admin/database', icon: <Database size={20} /> },
    { label: 'Alerts', href: '/admin/alerts', icon: <AlertCircle size={20} /> },
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StatusCard label="Total Users" value="156" />
        <StatusCard label="Active Cases" value="342" />
        <StatusCard label="System Health" value="99.8%" />
        <StatusCard label="Alerts" value="2" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Calendar Sidebar */}
        <div>
          <DashboardCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            title="System Events Calendar"
            showAppointments={true}
            appointments={[
              {
                date: new Date(2026, 2, 10),
                title: 'System Maintenance',
                time: '2:00 AM - 4:00 AM',
              },
              {
                date: new Date(2026, 2, 15),
                title: 'Monthly Backup',
                time: '11:00 PM',
              },
            ]}
          />
        </div>

        {/* System Status Cards */}
        {/* User Management */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">User Management</h2>
          <div className="space-y-1">
            <AdminLink href="/admin/users" label="View All Users" />
            <AdminLink href="/admin/users/create" label="Add New User" />
            <AdminLink href="/admin/roles" label="Manage Roles & Permissions" />
            <AdminLink href="/admin/permissions" label="Permission Overrides" />
          </div>
        </div>

        {/* System Administration */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">System Administration</h2>
          <div className="space-y-1">
            <AdminLink href="/admin/settings" label="System Settings" />
            <AdminLink href="/admin/database" label="Database Management" />
            <AdminLink href="/admin/backup" label="Backup & Recovery" />
            <AdminLink href="/admin/health" label="System Health Check" />
          </div>
        </div>

        {/* Reports & Analytics */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Reports & Analytics</h2>
          <div className="space-y-1">
            <AdminLink href="/admin/reports/cases" label="Case Statistics" />
            <AdminLink href="/admin/reports/users" label="User Activity" />
            <AdminLink href="/admin/reports/compliance" label="Compliance Report" />
            <AdminLink href="/admin/reports/export" label="Export Data" />
          </div>
        </div>

        {/* Security & Monitoring */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Security & Monitoring</h2>
          <div className="space-y-1">
            <AdminLink href="/admin/audit-log" label="View Audit Log" />
            <AdminLink href="/admin/alerts" label="System Alerts" />
            <AdminLink href="/admin/security" label="Security Settings" />
            <AdminLink href="/admin/logs" label="System Logs" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Recent System Activity</h2>
        <div className="space-y-2">
          <ActivityLog timestamp="2:45 PM" action="User Created" actor="Admin" details="New counselor account created" />
          <ActivityLog timestamp="2:30 PM" action="Permission Changed" actor="Admin" details="Updated DPO role permissions" />
          <ActivityLog timestamp="1:15 PM" action="Backup Completed" actor="System" details="Daily backup completed successfully" />
          <ActivityLog timestamp="11:00 AM" action="Alert Dismissed" actor="Admin" details="Resolved high-risk client alert" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-900">
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
    </div>
  );
}

function AdminLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-xs">{label}</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
      </div>
    </Link>
  );
}

function ActivityLog({ timestamp, action, actor, details }: any) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full mt-1.5"></div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-gray-50 text-xs">{action}</p>
          <p className="text-gray-600 dark:text-gray-400 text-xs">{timestamp}</p>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">By: {actor}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs">{details}</p>
      </div>
    </div>
  );
}
