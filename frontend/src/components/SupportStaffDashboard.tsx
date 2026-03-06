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
    { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Support Tickets', href: '/staff/tickets', icon: <HelpCircle size={20} />, badge: 12 },
    { label: 'Client Inquiries', href: '/staff/inquiries', icon: <MessageSquare size={20} />, badge: 4 },
    { label: 'Client Management', href: '/staff/clients', icon: <Users size={20} /> },
    { label: 'Documents', href: '/staff/documents', icon: <FileText size={20} /> },
    { label: 'Communications', href: '/staff/communications', icon: <CheckCircle size={20} />, badge: 3 },
    { label: 'Settings', href: '/staff/settings', icon: <Settings size={20} /> },
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <SupportCard label="Clients Supported" value="156" />
        <SupportCard label="Support Tickets" value="12" />
        <SupportCard label="Tasks Completed" value="28" />
        <SupportCard label="Pending Tasks" value="5" />
      </div>

      {/* Support Functions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Client Support</h2>
          <div className="space-y-1">
            <SupportLink href="/staff/clients/inquiries" label="Client Inquiries" badge="4" />
            <SupportLink href="/staff/clients/info" label="Client Information" />
            <SupportLink href="/staff/clients/referrals" label="Referral Requests" badge="2" />
            <SupportLink href="/staff/clients/feedback" label="Client Feedback" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Administrative</h2>
          <div className="space-y-1">
            <SupportLink href="/staff/admin/documents" label="Document Management" />
            <SupportLink href="/staff/admin/scheduling" label="Scheduling Support" />
            <SupportLink href="/staff/admin/communications" label="Communications" badge="3" />
            <SupportLink href="/staff/admin/records" label="Records Management" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Resources & Help</h2>
          <div className="space-y-1">
            <SupportLink href="/staff/help/faq" label="FAQ Management" />
            <SupportLink href="/staff/help/knowledge-base" label="Knowledge Base" />
            <SupportLink href="/staff/help/training" label="Training Materials" />
            <SupportLink href="/staff/help/contact" label="Contact Directory" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Reports & Data</h2>
          <div className="space-y-1">
            <SupportLink href="/staff/reports/activity" label="Activity Reports" />
            <SupportLink href="/staff/reports/statistics" label="Statistics" />
            <SupportLink href="/staff/reports/logs" label="System Logs" />
            <SupportLink href="/staff/reports/export" label="Export Data" />
          </div>
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

function SupportCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function SupportLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-xs">{label}</span>
        {badge && <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded">{badge}</span>}
        {!badge && <span className="text-gray-400 text-xs">→</span>}
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
