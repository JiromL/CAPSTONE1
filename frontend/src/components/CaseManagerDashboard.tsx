'use client';

import Link from 'next/link';
import { Users, Calendar, CheckCircle, AlertCircle, FileText, TrendingUp, Settings } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard', icon: <Users size={20} /> },
    { label: 'My Tasks', href: '/tasks', id: 'tasks', icon: <CheckCircle size={20} />, badge: 15 },
    { label: 'Cases', href: '/cases', id: 'cases', icon: <FileText size={20} />, badge: 32 },
    { label: 'High-Risk', href: '/high-risk', id: 'high-risk', icon: <AlertCircle size={20} />, badge: 3 },
    { label: 'Documentation', href: '/documentation', id: 'documentation', icon: <TrendingUp size={20} /> },
    { label: 'Profile', href: '/profile', id: 'profile', icon: <Settings size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Case Manager Dashboard"
      subtitle="Case Coordination & Follow-up"
      activeSection="dashboard"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Active Cases" value="32" />
        <MetricCard label="Follow-ups Due" value="7" color="orange" />
        <MetricCard label="High-Risk" value="4" color="red" />
        <MetricCard label="Completed (Month)" value="18" color="green" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <CaseLink href="/cases" label="View Cases" />
          <CaseLink href="/high-risk" label="High-Risk Clients" />
          <CaseLink href="/tasks" label="My Tasks" />
          <CaseLink href="/documentation" label="Documentation" />
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

function CaseLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}
