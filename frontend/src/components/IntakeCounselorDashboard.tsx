'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'Assessments', href: '/assessments', id: 'assessments', badge: 8 },
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Calendar', href: '/availability', id: 'availability' },
    { label: 'Counselors', href: '/counselor/emergency', id: 'counselor-emergency' },
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Referrals', href: '/referrals', id: 'referrals' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

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

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <IntakeLink href="/ic/intake/pending" label="Pending Intakes" />
          <IntakeLink href="/ic/intake/new" label="New Intake" />
          <IntakeLink href="/ic/forms/verify" label="Verify Forms" />
          <IntakeLink href="/ic/schedule/assign" label="Assign Slots" />
        </div>
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

function IntakeLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">{label}</span>
      </div>
    </Link>
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
