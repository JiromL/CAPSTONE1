'use client';

import Link from 'next/link';
import { Users, Brain, AlertTriangle, FileText, Calendar, TrendingUp, Shield } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard/dashboard', icon: <Brain size={20} /> },
    { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
    { label: 'Assessments', href: '/dashboard/assessments', icon: <Calendar size={20} />, badge: 7 },
    { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
    { label: 'High-Risk', href: '/dashboard/high-risk', icon: <AlertTriangle size={20} />, badge: 3 },
    { label: 'Referrals', href: '/dashboard/referrals', icon: <Users size={20} /> },
    { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Psychologist Dashboard"
      subtitle="Clinical Review & Case Oversight"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <ClinicalCard label="Cases Under Review" value="24" />
        <ClinicalCard label="Critical Cases" value="3" color="red" />
        <ClinicalCard label="Pending Reviews" value="7" color="orange" />
        <ClinicalCard label="This Week Sessions" value="18" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ClinicalLink href="/dashboard/cases" label="Review Pending Cases" />
          <ClinicalLink href="/dashboard/assessments" label="Risk Assessments" />
          <ClinicalLink href="/dashboard/appointments" label="Schedule Supervision" />
          <ClinicalLink href="/dashboard/documentation" label="Clinical Notes" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function ClinicalCard({ label, value, color = "blue" }: any) {
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

function ClinicalLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}

function ReviewPanelItem({ label, value, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
