'use client';

import Link from 'next/link';
import { TrendingUp, Clock, Users, AlertTriangle, FileText, MessageCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Appointments', href: '/appointments', icon: <Clock size={20} />, badge: 4 },
    { label: 'Cases', href: '/cases', icon: <Users size={20} /> },
    { label: 'Referrals', href: '/referrals', icon: <MessageCircle size={20} /> },
    { label: 'Documentation', href: '/documentation', icon: <FileText size={20} />, badge: 2 },
    { label: 'Profile', href: '/profile', icon: <Clock size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counselor Dashboard"
      subtitle="Session Management & Client Care"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Sessions Today" value="4" icon={<Clock size={20} />} />
        <MetricCard label="Pending Notes" value="2" icon={<FileText size={20} />} color="orange" />
        <MetricCard label="High-Risk Alerts" value="1" icon={<AlertTriangle size={20} />} color="red" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton href="/appointments" label="View Today's Sessions" />
          <ActionButton href="/documentation" label="Review Pending Notes" />
          <ActionButton href="/high-risk" label="High-Risk Clients" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, icon, color = "blue" }: any) {
  const colorStyles = {
    blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
    orange: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
    red: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
  };

  return (
    <div className={`border ${colorStyles[color as keyof typeof colorStyles]} rounded p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
        </div>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
    </div>
  );
}

function ActionButton({ href, label }: any) {
  return (
    <Link href={href}>
      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium">
        {label}
      </button>
    </Link>
  );
}

function SessionItem({ time, client, room, status }: any) {
  const statusStyles = "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900";

  return (
    <div className={`${statusStyles} p-3 rounded flex items-center justify-between`}>
      <div>
        <p className="text-gray-900 dark:text-gray-50 font-medium text-xs">{time} - {client}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs">{room}</p>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {status === "next" ? "NEXT" : "Scheduled"}
      </span>
    </div>
  );
}
