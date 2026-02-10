import Link from 'next/link';
import { Users, HelpCircle, CheckCircle, BarChart3, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function SupportStaffDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Staff Dashboard</h1>
            <p className="text-gray-600 mt-1">Administrative & Support Services</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Support Staff</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SupportCard
            label="Clients Supported"
            value="156"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <SupportCard
            label="Support Tickets"
            value="12"
            icon={HelpCircle}
            color="bg-orange-50 text-orange-600"
          />
          <SupportCard
            label="Tasks Completed"
            value="28"
            icon={CheckCircle}
            color="bg-green-50 text-green-600"
          />
          <SupportCard
            label="Pending Tasks"
            value="5"
            icon={BarChart3}
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Support Functions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Client Support */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Support</h2>
            <div className="space-y-2">
              <SupportLink href="/staff/clients/inquiries" label="Client Inquiries" badge="4" />
              <SupportLink href="/staff/clients/info" label="Client Information" badge="" />
              <SupportLink href="/staff/clients/referrals" label="Referral Requests" badge="2" />
              <SupportLink href="/staff/clients/feedback" label="Client Feedback" badge="" />
            </div>
          </div>

          {/* Administrative */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Administrative</h2>
            <div className="space-y-2">
              <SupportLink href="/staff/admin/documents" label="Document Management" badge="" />
              <SupportLink href="/staff/admin/scheduling" label="Scheduling Support" badge="" />
              <SupportLink href="/staff/admin/communications" label="Communications" badge="3" />
              <SupportLink href="/staff/admin/records" label="Records Management" badge="" />
            </div>
          </div>

          {/* Resources & Help */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resources & Help</h2>
            <div className="space-y-2">
              <SupportLink href="/staff/help/faq" label="FAQ Management" badge="" />
              <SupportLink href="/staff/help/knowledge-base" label="Knowledge Base" badge="" />
              <SupportLink href="/staff/help/training" label="Training Materials" badge="" />
              <SupportLink href="/staff/help/contact" label="Contact Directory" badge="" />
            </div>
          </div>

          {/* Reports & Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reports & Data</h2>
            <div className="space-y-2">
              <SupportLink href="/staff/reports/activity" label="Activity Reports" badge="" />
              <SupportLink href="/staff/reports/statistics" label="Statistics" badge="" />
              <SupportLink href="/staff/reports/logs" label="System Logs" badge="" />
              <SupportLink href="/staff/reports/export" label="Export Data" badge="" />
            </div>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Support Tickets</h2>
          <div className="space-y-3">
            <TicketItem
              id="TK-2340"
              title="Can't reset password"
              client="Student"
              priority="high"
              status="open"
            />
            <TicketItem
              id="TK-2339"
              title="Schedule appointment issue"
              client="Student"
              priority="medium"
              status="in-progress"
            />
            <TicketItem
              id="TK-2338"
              title="Document upload problem"
              client="Counselor"
              priority="low"
              status="in-progress"
            />
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Today's Tasks</h2>
          <div className="space-y-2">
            <TaskCheckbox label="Update client contact information" completed={false} />
            <TaskCheckbox label="Process scheduling requests" completed={true} />
            <TaskCheckbox label="Send appointment reminders" completed={false} />
            <TaskCheckbox label="Archive completed referrals" completed={false} />
            <TaskCheckbox label="Respond to support tickets" completed={true} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SupportCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
      </div>
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
