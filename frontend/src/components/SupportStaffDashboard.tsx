import Link from 'next/link';
import { Users, HelpCircle, CheckCircle, BarChart3, MessageSquare, Settings, FileText } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SupportCard label="Clients Supported" value="156" color="bg-blue-50 text-blue-600" />
        <SupportCard label="Support Tickets" value="12" color="bg-orange-50 text-orange-600" />
        <SupportCard label="Tasks Completed" value="28" color="bg-green-50 text-green-600" />
        <SupportCard label="Pending Tasks" value="5" color="bg-purple-50 text-purple-600" />
      </div>

      {/* Support Functions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Client Support</h2>
          <div className="space-y-2">
            <SupportLink href="/staff/clients/inquiries" label="Client Inquiries" badge="4" />
            <SupportLink href="/staff/clients/info" label="Client Information" />
            <SupportLink href="/staff/clients/referrals" label="Referral Requests" badge="2" />
            <SupportLink href="/staff/clients/feedback" label="Client Feedback" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Administrative</h2>
          <div className="space-y-2">
            <SupportLink href="/staff/admin/documents" label="Document Management" />
            <SupportLink href="/staff/admin/scheduling" label="Scheduling Support" />
            <SupportLink href="/staff/admin/communications" label="Communications" badge="3" />
            <SupportLink href="/staff/admin/records" label="Records Management" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resources & Help</h2>
          <div className="space-y-2">
            <SupportLink href="/staff/help/faq" label="FAQ Management" />
            <SupportLink href="/staff/help/knowledge-base" label="Knowledge Base" />
            <SupportLink href="/staff/help/training" label="Training Materials" />
            <SupportLink href="/staff/help/contact" label="Contact Directory" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reports & Data</h2>
          <div className="space-y-2">
            <SupportLink href="/staff/reports/activity" label="Activity Reports" />
            <SupportLink href="/staff/reports/statistics" label="Statistics" />
            <SupportLink href="/staff/reports/logs" label="System Logs" />
            <SupportLink href="/staff/reports/export" label="Export Data" />
          </div>
        </div>
      </div>

      {/* Pending Tickets */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Support Tickets</h2>
        <div className="space-y-3">
          <TicketItem id="TK-2340" title="Can't reset password" client="Student" priority="high" status="open" />
          <TicketItem id="TK-2339" title="Schedule appointment issue" client="Student" priority="medium" status="in-progress" />
          <TicketItem id="TK-2338" title="Document upload problem" client="Counselor" priority="low" status="in-progress" />
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Tasks</h2>
        <div className="space-y-2">
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

function SupportCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function SupportLink({ href, label, badge }: any) {
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

function TicketItem({ id, title, client, priority, status }: any) {
  const priorityColor = priority === "high" ? "text-red-600" : priority === "medium" ? "text-orange-600" : "text-green-600";
  const statusBg = status === "open" ? "bg-red-50" : "bg-blue-50";
  
  return (
    <div className={`${statusBg} rounded-lg p-4 flex items-center justify-between`}>
      <div>
        <p className="font-bold text-gray-900">{id} - {title}</p>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-gray-600 text-sm">{client}</span>
          <span className={`text-sm font-medium ${priorityColor}`}>{priority.toUpperCase()}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}

function TaskCheckbox({ label, completed }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <input type="checkbox" checked={completed} readOnly className="w-5 h-5" />
      <span className={completed ? "line-through text-gray-400" : "text-gray-900"}>{label}</span>
    </div>
  );
}
