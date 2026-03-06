'use client';

import Link from 'next/link';
import { Users, AlertTriangle, TrendingUp, Calendar, BarChart3, Settings, Shield } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function DPODashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Team Management', href: '/dpo/counselors', icon: <Users size={20} /> },
    { label: 'Case Supervision', href: '/dpo/cases', icon: <Shield size={20} /> },
    { label: 'High-Risk Review', href: '/dpo/high-risk', icon: <AlertTriangle size={20} />, badge: 8 },
    { label: 'Weekly Reviews', href: '/dpo/reviews', icon: <Calendar size={20} /> },
    { label: 'Performance Metrics', href: '/dpo/performance', icon: <TrendingUp size={20} /> },
    { label: 'Department Settings', href: '/dpo/settings', icon: <Settings size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="DPO Dashboard"
      subtitle="Director of Psychological Operations"
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
          <OperationLink href="/dpo/cases" label="Review Cases" />
          <OperationLink href="/dpo/high-risk" label="High-Risk Cases" />
          <OperationLink href="/dpo/counselors" label="Team Management" />
          <OperationLink href="/dpo/reports" label="Operations Reports" />
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
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}

function OverviewItem({ label, value, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs font-medium text-gray-700 mt-1">{status}</p>
    </div>
  );
}
