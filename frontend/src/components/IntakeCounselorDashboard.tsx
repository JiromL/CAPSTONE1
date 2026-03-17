'use client';

import Link from 'next/link';
import { Users, FileText, CheckCircle, Clock, Calendar, AlertCircle, Phone } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <CheckCircle size={20} /> },
    { label: 'Assessments', href: '/assessments', icon: <FileText size={20} />, badge: 8 },
    { label: 'Cases', href: '/cases', icon: <CheckCircle size={20} /> },
    { label: 'Schedule Calendar', href: '/ic/schedule/calendar', icon: <Calendar size={20} /> },
    { label: 'Counselor Availability', href: '/ic/schedule/counselors', icon: <Users size={20} /> },
    { label: 'Documentation', href: '/documentation', icon: <Clock size={20} /> },
    { label: 'Referrals', href: '/referrals', icon: <Phone size={20} /> },
    { label: 'Profile', href: '/profile', icon: <Users size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Intake Counselor Dashboard"
      subtitle="Intake Processing & Scheduling"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Pending Intakes" value="15" color="orange" />
        <MetricCard label="Scheduled Today" value="8" />
        <MetricCard label="Completed (Week)" value="32" color="green" />
        <MetricCard label="Overdue" value="2" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <IntakeLink href="/tasks" label="Pending Intakes" />
          <IntakeLink href="/assessments" label="Start New Intake" />
          <IntakeLink href="/assessments" label="Verify Forms" />
          <IntakeLink href="/appointments" label="Assign Time Slots" />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PerfBox label="Intakes Completed" value="32" trend="+8%" />
          <PerfBox label="Avg Completion Time" value="2.5 hours" trend="-0.3h" />
          <PerfBox label="Data Accuracy" value="98%" trend="+1%" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, color = "blue" }: any) {
  const colorStyles = {
    blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
    red: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
    orange: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
    green: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700",
  };

  return (
    <div className={`border ${colorStyles[color as keyof typeof colorStyles]} rounded p-4`}>
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
    </div>
  );
}

function IntakeLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}

function ScheduleItem({ time, student, counselor, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900 text-xs">{time} - {student}</p>
        <p className="text-gray-600 text-xs mt-0.5">Counselor: {counselor}</p>
      </div>
      <span className="text-xs font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}

function PerfBox({ label, value, trend }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-gray-600 text-xs font-medium">{trend}</p>
      </div>
    </div>
  );
}
