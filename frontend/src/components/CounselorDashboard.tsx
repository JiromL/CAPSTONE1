import Link from 'next/link';
import { Users, Clock, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Counselor Dashboard</h1>
            <p className="text-gray-600 mt-1">Session Management & Client Care</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Counselor</p>
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
        {/* Daily Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Client Load"
            value="18"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Sessions Today"
            value="4"
            icon={Clock}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Session Notes Due"
            value="2"
            icon={AlertTriangle}
            color="bg-orange-50 text-orange-600"
          />
          <StatCard
            label="Completed (Week)"
            value="18"
            icon={CheckCircle}
            color="bg-green-50 text-green-600"
          />
        </div>

        {/* Main Work Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sessions</h2>
            <div className="space-y-2">
              <WorkLink href="/counselor/sessions/today" label="Today's Sessions" badge="4" />
              <WorkLink href="/counselor/sessions/upcoming" label="Upcoming Sessions" badge="12" />
              <WorkLink href="/counselor/clients" label="My Clients" badge="18" />
              <WorkLink href="/counselor/schedule" label="My Schedule" badge="" />
            </div>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Documentation</h2>
            <div className="space-y-2">
              <WorkLink href="/counselor/notes/pending" label="Pending Session Notes" badge="2" />
              <WorkLink href="/counselor/notes" label="All Session Notes" badge="" />
              <WorkLink href="/counselor/treatment-plans" label="Treatment Plans" badge="" />
              <WorkLink href="/counselor/case-files" label="Case Files" badge="" />
            </div>
          </div>

          {/* Client Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Management</h2>
            <div className="space-y-2">
              <WorkLink href="/counselor/intake" label="Intake Forms" badge="" />
              <WorkLink href="/counselor/progress" label="Progress Tracking" badge="" />
              <WorkLink href="/counselor/referrals" label="Referrals" badge="" />
              <WorkLink href="/counselor/follow-ups" label="Follow-ups" badge="" />
            </div>
          </div>

          {/* Risk & Support */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Risk & Support</h2>
            <div className="space-y-2">
              <WorkLink href="/counselor/high-risk" label="High-Risk Clients" badge="1" />
              <WorkLink href="/counselor/safety-plans" label="Safety Plans" badge="" />
              <WorkLink href="/counselor/supervision" label="Supervision Notes" badge="" />
              <WorkLink href="/counselor/consultation" label="Request Consultation" badge="" />
            </div>
          </div>
        </div>

        {/* Session Queue */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Today's Session Queue</h2>
          <div className="space-y-3">
            <SessionQueueItem time="10:00 AM" client="Sarah Johnson" room="Rm 201" status="next" />
            <SessionQueueItem time="11:00 AM" client="Marcus Lee" room="Rm 203" status="upcoming" />
            <SessionQueueItem time="1:00 PM" client="Emma Davis" room="Rm 205" status="upcoming" />
            <SessionQueueItem time="2:30 PM" client="Alex Rodriguez" room="Rm 201" status="upcoming" />
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              title="Session Notes"
              description="Complete 2 pending session notes"
              priority="high"
              dueTime="By 5:00 PM"
            />
            <ActionCard
              title="Treatment Plan Review"
              description="Update treatment plan for Client #567"
              priority="medium"
              dueTime="By Tomorrow"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
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

function WorkLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        {badge && <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">{badge}</span>}
        {!badge && <span className="text-gray-400">→</span>}
      </div>
    </Link>
  );
}

function SessionQueueItem({ time, client, room, status }: any) {
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

function ActionCard({ title, description, priority, dueTime }: any) {
  const priorityColor = priority === "high" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200";
  return (
    <div className={`${priorityColor} border rounded-lg p-4`}>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm mt-1">{description}</p>
      <p className="text-gray-600 text-xs mt-2">{dueTime}</p>
    </div>
  );
}
