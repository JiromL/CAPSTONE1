'use client';

import Link from 'next/link';
import { Users, AlertTriangle, TrendingUp, Calendar, BarChart3, Settings } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function DPODashboard({ user, onLogout }: DashboardProps) {
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
      title="DPO Dashboard"
      subtitle="Director of Psychological Operations"
      activeSection="dashboard"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Counselors" value="15" />
        <MetricCard label="Critical Cases" value="8" color="red" />
        <MetricCard label="Weekly Sessions" value="124" />
        <MetricCard label="High-Risk Reviews" value="8" color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <OperationLink href="/admin/analytics" label="View Analytics" />
          <OperationLink href="/high-risk" label="High-Risk Cases" badge={8} />
          <OperationLink href="/cases" label="Review Cases" />
          <OperationLink href="/documentation" label="Reports & Docs" />
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
  };

  return (
    <div className={`border ${colorStyles[color as keyof typeof colorStyles]} rounded p-4`}>
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
    </div>
  );
}

function OperationLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer flex justify-between items-center">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
        {badge && <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>}
      </div>
    </Link>
  );
}


