'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = getMenuItemsByRole(user.role);

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Intake Counselor Dashboard"
      subtitle="Intake Processing"
      activeSection="dashboard"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Pending Intakes" value="15" />
        <MetricCard label="Scheduled Today" value="8" />
        <MetricCard label="Completed (Week)" value="32" />
        <MetricCard label="Overdue" value="2" />
      </div>

      {/* Performance Stats */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PerfBox label="Intakes Completed" value="32" trend="+8%" />
          <PerfBox label="Avg Completion Time" value="2.5 hours" trend="-0.3h" />
          <PerfBox label="Data Accuracy" value="98%" trend="+1%" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}

function ScheduleItem({ time, student, counselor, status }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 flex items-center justify-between bg-white dark:bg-gray-800">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{time} - {student}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">Counselor: {counselor}</p>
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{status.toUpperCase()}</span>
    </div>
  );
}

function PerfBox({ label, value, trend }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{trend}</p>
      </div>
    </div>
  );
}
