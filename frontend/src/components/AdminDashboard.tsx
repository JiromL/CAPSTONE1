import Link from 'next/link';
import { Users, Settings, BarChart3, AlertCircle, Lock, Shield, Database, Activity } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: DashboardProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatusCard label="Total Users" value="156" color="bg-blue-50 text-blue-600" />
        <StatusCard label="Active Cases" value="342" color="bg-green-50 text-green-600" />
        <StatusCard label="System Health" value="99.8%" color="bg-green-50 text-green-600" />
        <StatusCard label="Alerts" value="2" color="bg-red-50 text-red-600" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">User Management</h2>
          <div className="space-y-2">
            <AdminLink href="/admin/users" label="View All Users" />
            <AdminLink href="/admin/users/create" label="Add New User" />
            <AdminLink href="/admin/roles" label="Manage Roles & Permissions" />
            <AdminLink href="/admin/permissions" label="Permission Overrides" />
          </div>
        </div>

        {/* System Administration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">System Administration</h2>
          <div className="space-y-2">
            <AdminLink href="/admin/settings" label="System Settings" />
            <AdminLink href="/admin/database" label="Database Management" />
            <AdminLink href="/admin/backup" label="Backup & Recovery" />
            <AdminLink href="/admin/health" label="System Health Check" />
          </div>
        </div>

        {/* Reports & Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reports & Analytics</h2>
          <div className="space-y-2">
            <AdminLink href="/admin/reports/cases" label="Case Statistics" />
            <AdminLink href="/admin/reports/users" label="User Activity" />
            <AdminLink href="/admin/reports/compliance" label="Compliance Report" />
            <AdminLink href="/admin/reports/export" label="Export Data" />
          </div>
        </div>

        {/* Security & Monitoring */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Security & Monitoring</h2>
          <div className="space-y-2">
            <AdminLink href="/admin/audit-log" label="View Audit Log" />
            <AdminLink href="/admin/alerts" label="System Alerts" />
            <AdminLink href="/admin/security" label="Security Settings" />
            <AdminLink href="/admin/logs" label="System Logs" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent System Activity</h2>
        <div className="space-y-3">
          <ActivityLog timestamp="2:45 PM" action="User Created" actor="Admin" details="New counselor account created" />
          <ActivityLog timestamp="2:30 PM" action="Permission Changed" actor="Admin" details="Updated DPO role permissions" />
          <ActivityLog timestamp="1:15 PM" action="Backup Completed" actor="System" details="Daily backup completed successfully" />
          <ActivityLog timestamp="11:00 AM" action="Alert Dismissed" actor="Admin" details="Resolved high-risk client alert" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function AdminLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        <span className="text-gray-400">→</span>
      </div>
    </Link>
  );
}

function ActivityLog({ timestamp, action, actor, details }: any) {
  return (
    <div className="flex items-start gap-4 pb-3 border-b border-gray-200 last:border-b-0">
      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">{action}</p>
          <p className="text-gray-600 text-xs">{timestamp}</p>
        </div>
        <p className="text-gray-600 text-xs mt-1">By: {actor}</p>
        <p className="text-gray-600 text-xs">{details}</p>
      </div>
    </div>
  );
}
