import Link from 'next/link';
import { BarChart3, Users, AlertCircle, Settings, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System Management & Oversight</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Administrator</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value="0"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Active Cases"
            value="0"
            icon={BarChart3}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="System Alerts"
            value="0"
            icon={AlertCircle}
            color="bg-red-50 text-red-600"
          />
          <StatCard
            label="Pending Tasks"
            value="0"
            icon={Settings}
            color="bg-green-50 text-green-600"
          />
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
            <div className="space-y-3">
              <AdminLink href="/admin/users" label="View All Users" />
              <AdminLink href="/admin/users/create" label="Add New User" />
              <AdminLink href="/admin/roles" label="Manage Roles" />
              <AdminLink href="/admin/permissions" label="Manage Permissions" />
            </div>
          </div>

          {/* System Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Management</h2>
            <div className="space-y-3">
              <AdminLink href="/admin/audit-log" label="View Audit Log" />
              <AdminLink href="/admin/settings" label="System Settings" />
              <AdminLink href="/admin/backup" label="Backup & Recovery" />
              <AdminLink href="/admin/health" label="System Health" />
            </div>
          </div>

          {/* Reporting & Analytics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reporting & Analytics</h2>
            <div className="space-y-3">
              <AdminLink href="/admin/reports/cases" label="Case Statistics" />
              <AdminLink href="/admin/reports/users" label="User Activity" />
              <AdminLink href="/admin/reports/assessments" label="Assessment Data" />
              <AdminLink href="/admin/reports/compliance" label="Compliance Report" />
            </div>
          </div>

          {/* Crisis Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crisis Management</h2>
            <div className="space-y-3">
              <AdminLink href="/admin/high-risk" label="High-Risk Cases" />
              <AdminLink href="/admin/alerts" label="System Alerts" />
              <AdminLink href="/admin/escalations" label="Escalation History" />
              <AdminLink href="/admin/crisis-log" label="Crisis Log" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ActionButton label="Reset Password" variant="secondary" />
            <ActionButton label="Export Data" variant="secondary" />
            <ActionButton label="View Logs" variant="secondary" />
            <ActionButton label="System Status" variant="secondary" />
            <ActionButton label="Config" variant="secondary" />
            <ActionButton label="Help" variant="secondary" />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function AdminLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium">{label}</span>
        <span className="text-gray-400">→</span>
      </div>
    </Link>
  );
}

function ActionButton({ label, variant }: any) {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition text-center";
  const variantClasses = variant === "secondary" 
    ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
    : "bg-blue-600 text-white hover:bg-blue-700";
  
  return (
    <button className={`${baseClasses} ${variantClasses}`}>
      {label}
    </button>
  );
}
