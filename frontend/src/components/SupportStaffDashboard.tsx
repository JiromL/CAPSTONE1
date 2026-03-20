'use client';

import Link from 'next/link';
import { Users, HelpCircle, CheckCircle, BarChart3, MessageSquare, Settings, FileText, UserPlus, Stethoscope } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
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
      title="Office Assistant Dashboard"
      subtitle="Appointment & Staff Management"
      activeSection="dashboard"
    >
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <SupportCard label="Pending Appointments" value="12" />
        <SupportCard label="Counselor Workload" value="24" color="orange" />
        <SupportCard label="Batch Assignments Today" value="5" color="green" />
        <SupportCard label="Calendar Connected" value="8/12" color="blue" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <SupportLink href="/staff/walkin-intake" label="Add Walk-in Student" />
          <SupportLink href="/staff/non-counseling-clients" label="Add Check-In Client" />
          <SupportLink href="/staff/batch-assign" label="Batch Assign Appointments" />
          <SupportLink href="/staff/workload-report" label="View Workload Report" />
          <SupportLink href="/staff/reassignment-suggestions" label="Reassignment Suggestions" />
          <SupportLink href="/availability" label="Calendar Settings" />
        </div>
      </div>

      {/* Pending Appointments */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 mb-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Unassigned Appointments</h2>
        <div className="space-y-2">
          <TicketItem id="APT-2340" title="Initial consultation request" client="Student" priority="high" status="open" />
          <TicketItem id="APT-2339" title="Follow-up appointment" client="Counselor" priority="medium" status="open" />
          <TicketItem id="APT-2338" title="Crisis assessment needed" client="Student" priority="high" status="open" />
        </div>
      </div>

      {/* Counselor Workload */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Counselor Workload Overview</h2>
        <div className="space-y-1">
          <TaskCheckbox label="Dr. Sarah Smith: 8/10 slots filled" completed={false} />
          <TaskCheckbox label="Dr. James Cohen: 10/10 slots filled (FULL)" completed={true} />
          <TaskCheckbox label="Marcus Johnson: 5/10 slots filled" completed={false} />
          <TaskCheckbox label="Elena Rodriguez: 9/10 slots filled" completed={true} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function SupportCard({ label, value, color = "blue" }: any) {
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

function SupportLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
        <span className="text-gray-900 dark:text-gray-50 font-medium text-sm">{label}</span>
      </div>
    </Link>
  );
}

function TicketItem({ id, title, client, priority, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900 text-xs">{id} - {title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-gray-600 text-xs">{client}</span>
          <span className="text-xs font-medium text-gray-700">{priority.toUpperCase()}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}

function TaskCheckbox({ label, completed }: any) {
  return (
    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded">
      <input type="checkbox" checked={completed} readOnly className="w-4 h-4" />
      <span className={completed ? "line-through text-gray-400 text-sm" : "text-gray-900 text-sm"}>{label}</span>
    </div>
  );
}
