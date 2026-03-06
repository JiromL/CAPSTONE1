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
    { label: 'Dashboard', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Active Clients', href: '/csp/clients/active', icon: <Users size={20} /> },
    { label: 'Follow-ups Due', href: '/csp/clients/follow-up', icon: <Phone size={20} />, badge: 7 },
    { label: 'Case Documentation', href: '/csp/cases/documentation', icon: <FileText size={20} /> },
    { label: 'Client Messages', href: '/csp/communication/messages', icon: <MessageCircle size={20} />, badge: 5 },
    { label: 'Referral Assistance', href: '/csp/cases/referrals', icon: <AlertCircle size={20} />, badge: 3 },
    { label: 'Resources', href: '/csp/procedures/protocols', icon: <CheckCircle size={20} /> },
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <TeamCard label="Clients Assisted" value="45" />
        <TeamCard label="Support Calls" value="18" />
        <TeamCard label="Cases Processed" value="32" />
        <TeamCard label="Follow-ups" value="7" />
      </div>

      {/* Support Functions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Client Support */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Client Support</h2>
          <div className="space-y-1">
            <TeamLink href="/csp/clients/active" label="Active Clients" badge="45" />
            <TeamLink href="/csp/clients/intake" label="Intake Assistance" badge="8" />
            <TeamLink href="/csp/clients/follow-up" label="Follow-up Calls" badge="7" />
            <TeamLink href="/csp/clients/resources" label="Client Resources" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h2>
          <div className="space-y-1">
            <TeamLink href="/csp/contact/outreach" label="Client Outreach" />
            <TeamLink href="/csp/scheduling/assist" label="Help Schedule Appointment" />
            <TeamLink href="/csp/communication/messages" label="Client Messages" badge="5" />
            <TeamLink href="/csp/cases/referrals" label="Referral Support" badge="3" />
          </div>
        </div>

        {/* Case Support */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Case Management</h2>
          <div className="space-y-1">
            <TeamLink href="/csp/cases/pending" label="Pending Cases" badge="12" />
            <TeamLink href="/csp/cases/documentation" label="Case Documentation" />
            <TeamLink href="/csp/cases/referrals" label="Referral Assistance" badge="3" />
            <TeamLink href="/csp/cases/archive" label="Archived Cases" />
          </div>
        </div>

        {/* Communication */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Communication</h2>
          <div className="space-y-1">
            <TeamLink href="/csp/communication/messages" label="Client Messages" badge="5" />
            <TeamLink href="/csp/communication/calls" label="Call Log" />
            <TeamLink href="/csp/communication/emails" label="Email Templates" />
            <TeamLink href="/csp/communication/scheduling" label="Scheduling Help" />
          </div>
        </div>
      </div>

      {/* Pending Follow-ups */}
      <div className="border border-gray-200 rounded p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Pending Client Follow-ups</h2>
          <span className="text-xs text-gray-600">7 Due Today</span>
        </div>
        <div className="space-y-2">
          <FollowUpItem
            clientId="C-2341"
            name="Sarah Mitchell"
            reason="Missed appointment follow-up"
            dueTime="Today"
            priority="high"
          />
          <FollowUpItem
            clientId="C-2342"
            name="James Brown"
            reason="Check-in call"
            dueTime="Today"
            priority="medium"
          />
          <FollowUpItem
            clientId="C-2343"
            name="Emma Wilson"
            reason="Confirm new appointment"
            dueTime="Tomorrow"
            priority="low"
          />
        </div>
      </div>

      {/* Support Metrics */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Weekly Support Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricBox label="Clients Assisted" value="45" trend="+8" />
          <MetricBox label="Avg Response Time" value="2.1 hrs" trend="-0.3h" />
          <MetricBox label="Client Satisfaction" value="4.7/5" trend="+0.2" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function TeamCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function TeamLink({ href, label, badge }: any) {
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
