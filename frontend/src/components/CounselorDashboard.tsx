import Link from 'next/link';
import { Users, Clock, CheckCircle, AlertTriangle, FileText, MessageCircle, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Today\'s Sessions', href: '/counselor/sessions/today', icon: <Clock size={20} />, badge: 4 },
    { label: 'My Clients', href: '/counselor/clients', icon: <Users size={20} /> },
    { label: 'Session Notes', href: '/counselor/notes/pending', icon: <FileText size={20} />, badge: 2 },
    { label: 'High-Risk Clients', href: '/counselor/high-risk', icon: <AlertTriangle size={20} />, badge: 1 },
    { label: 'Messages', href: '/counselor/messages', icon: <MessageCircle size={20} /> },
    { label: 'My Schedule', href: '/counselor/schedule', icon: <Clock size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counselor Dashboard"
      subtitle="Session Management & Client Care"
    >
      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Client Load" value="18" color="bg-blue-50 text-blue-600" />
        <StatCard label="Sessions Today" value="4" color="bg-purple-50 text-purple-600" />
        <StatCard label="Pending Notes" value="2" color="bg-orange-50 text-orange-600" />
        <StatCard label="Completed (Week)" value="18" color="bg-green-50 text-green-600" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Session Queue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Session Queue</h2>
          <div className="space-y-3">
            <SessionItem time="10:00 AM" client="Sarah Johnson" room="Rm 201" status="next" />
            <SessionItem time="11:00 AM" client="Marcus Lee" room="Rm 203" status="upcoming" />
            <SessionItem time="1:00 PM" client="Emma Davis" room="Rm 205" status="upcoming" />
            <SessionItem time="2:30 PM" client="Alex Rodriguez" room="Rm 201" status="upcoming" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickLink href="/counselor/notes/pending" label="Complete Session Notes" badge="2" />
            <QuickLink href="/counselor/treatment-plans" label="Update Treatment Plans" />
            <QuickLink href="/counselor/high-risk" label="High-Risk Review" badge="1" />
            <QuickLink href="/counselor/consultation" label="Request Supervision" />
          </div>
        </div>

        {/* Pending Documentation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Documentation</h2>
          <div className="space-y-2">
            <DocItem title="Session notes for Client #2341" dueTime="By EOD Today" />
            <DocItem title="Progress update for Client #2342" dueTime="By Tomorrow" />
            <DocItem title="Risk assessment review" dueTime="By Friday" />
          </div>
        </div>

        {/* Client Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Client Alerts</h2>
          <div className="space-y-2">
            <AlertItem severity="high" title="High-Risk Client Follow-up Needed" client="Client #2567" />
            <AlertItem severity="medium" title="Missed Appointment - Reschedule" client="Client #2341" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricBox label="Sessions Completed" value="18" trend="+5%" />
          <MetricBox label="Client Satisfaction" value="4.8/5" trend="+0.2" />
          <MetricBox label="Documentation Rate" value="95%" trend="+3%" />
          <MetricBox label="No-shows Avoided" value="2" trend="↓" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function SessionItem({ time, client, room, status }: any) {
  const statusStyles = status === "next"
    ? "border-l-4 border-green-500 bg-green-50"
    : "border-l-4 border-gray-300 bg-gray-50";

  return (
    <div className={`${statusStyles} p-4 rounded-lg flex items-center justify-between`}>
      <div>
        <p className="text-gray-900 font-bold">{time} - {client}</p>
        <p className="text-gray-600 text-sm">{room}</p>
      </div>
      <span className={`text-sm font-medium ${status === "next" ? "text-green-700" : "text-gray-600"}`}>
        {status === "next" ? "NEXT" : "Scheduled"}
      </span>
    </div>
  );
}

function QuickLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        {badge && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{badge}</span>}
        {!badge && <span className="text-gray-400">→</span>}
      </div>
    </Link>
  );
}

function DocItem({ title, dueTime }: any) {
  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 p-3 rounded-lg">
      <p className="text-gray-900 font-medium text-sm">{title}</p>
      <p className="text-gray-600 text-xs mt-1">{dueTime}</p>
    </div>
  );
}

function AlertItem({ severity, title, client }: any) {
  const severityColor = severity === "high" ? "bg-red-50 border-red-300" : "bg-yellow-50 border-yellow-300";
  return (
    <div className={`border-l-4 ${severityColor} p-3 rounded-lg`}>
      <p className="text-gray-900 font-medium text-sm">{title}</p>
      <p className="text-gray-600 text-xs mt-1">{client}</p>
    </div>
  );
}

function MetricBox({ label, value, trend }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-green-600 text-sm font-medium">{trend}</p>
      </div>
    </div>
  );
}
