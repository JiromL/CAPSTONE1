'use client';

import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface DashboardProps { user: any; onLogout: () => void; }

export function AdminDashboard({ user, onLogout }: DashboardProps) {
  const menuItems  = getMenuItemsByRole(user.role);
  const firstName  = user.first_name || user.name?.split(' ')[0] || 'Admin';
  const todayStr   = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Admin Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      <div className="flex items-center gap-8 flex-wrap">
        <div>
          <p className="text-2xl font-bold text-gray-900">156</p>
          <p className="text-xs text-gray-500 mt-0.5">Total users</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-gray-900">342</p>
          <p className="text-xs text-gray-500 mt-0.5">Active cases</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-gray-900">99.8%</p>
          <p className="text-xs text-gray-500 mt-0.5">System health</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-orange-500">2</p>
          <p className="text-xs text-gray-500 mt-0.5">Alerts</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
