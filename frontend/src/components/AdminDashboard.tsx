'use client';

import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = getMenuItemsByRole(user.role);

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
