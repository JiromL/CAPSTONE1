'use client';

import Link from 'next/link';
import { Users, HelpCircle, CheckCircle, BarChart3, MessageSquare, Settings, FileText } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Cases', href: '/dashboard/cases', icon: <MessageSquare size={20} />, badge: 4 },
    { label: 'Appointments', href: '/dashboard/appointments', icon: <HelpCircle size={20} />, badge: 12 },
    { label: 'Documentation', href: '/dashboard/documentation', icon: <Users size={20} /> },
    { label: 'Tasks', href: '/dashboard/tasks', icon: <FileText size={20} />, badge: 3 },
    { label: 'Profile', href: '/dashboard/profile', icon: <Settings size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Support Staff Dashboard"
      subtitle="Administrative & Support Services"
    >
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <SupportCard label="Clients Supported" value="156" />
        <SupportCard label="Support Tickets" value="12" color="orange" />
        <SupportCard label="Tasks Completed" value="28" color="green" />
        <SupportCard label="Pending Tasks" value="5" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <SupportLink href="/dashboard/cases" label="Client Inquiries" />
          <SupportLink href="/dashboard/appointments" label="Communications" />
          <SupportLink href="/dashboard/documentation" label="Document Management" />
          <SupportLink href="/dashboard/tasks" label="Support Tickets" />
        </div>
      </div>

      {/* Pending Tickets */}
      <div className="border border-gray-200 rounded p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Support Tickets</h2>
        <div className="space-y-2">
          <TicketItem id="TK-2340" title="Can't reset password" client="Student" priority="high" status="open" />
          <TicketItem id="TK-2339" title="Schedule appointment issue" client="Student" priority="medium" status="in-progress" />
          <TicketItem id="TK-2338" title="Document upload problem" client="Counselor" priority="low" status="in-progress" />
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Today's Tasks</h2>
        <div className="space-y-1">
          <TaskCheckbox label="Update client contact information" completed={false} />
          <TaskCheckbox label="Process scheduling requests" completed={true} />
          <TaskCheckbox label="Send appointment reminders" completed={false} />
          <TaskCheckbox label="Archive completed referrals" completed={false} />
          <TaskCheckbox label="Respond to support tickets" completed={true} />
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
