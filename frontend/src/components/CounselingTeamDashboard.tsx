'use client';

import Link from 'next/link';
import { Users, FileText, Phone, AlertCircle, MessageCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselingTeamDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Appointments', href: '/dashboard/appointments', icon: <Users size={20} /> },
    { label: 'Cases', href: '/dashboard/cases', icon: <Phone size={20} />, badge: 7 },
    { label: 'Documentation', href: '/dashboard/documentation', icon: <FileText size={20} /> },
    { label: 'Referrals', href: '/dashboard/referrals', icon: <MessageCircle size={20} />, badge: 5 },
    { label: 'High-Risk', href: '/dashboard/high-risk', icon: <AlertCircle size={20} />, badge: 3 },
    { label: 'Profile', href: '/dashboard/profile', icon: <CheckCircle size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counseling Support Team Dashboard"
      subtitle="Client Case Support & Coordination"
    >
      {/* Team Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <TeamCard label="Active Clients" value="45" />
        <TeamCard label="Follow-ups Due" value="7" color="orange" />
        <TeamCard label="Support Messages" value="5" color="blue" />
        <TeamCard label="Referrals" value="3" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <TeamLink href="/dashboard/cases" label="Active Clients" />
          <TeamLink href="/dashboard/appointments" label="Client Follow-ups" />
          <TeamLink href="/dashboard/referrals" label="Client Messages" />
          <TeamLink href="/dashboard/referrals" label="Referral Support" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function TeamCard({ label, value, color = "blue" }: any) {
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

function TeamLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}

function FollowUpItem({ clientId, name, reason, dueTime, priority }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-xs">{clientId} - {name}</p>
          <p className="text-gray-600 text-xs mt-0.5">{reason}</p>
          <p className="text-gray-600 text-xs mt-1">Due: {dueTime}</p>
        </div>
        <span className="text-xs font-medium text-gray-700">{priority.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MetricBox({ label, value, trend }: any) {
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
