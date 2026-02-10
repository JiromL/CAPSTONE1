import Link from 'next/link';
import { Users, FileText, CheckCircle, Clock, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function IntakeCoordinatorDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Intake Coordinator Dashboard</h1>
            <p className="text-gray-600 mt-1">Intake Processing & Scheduling</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Intake Coordinator</p>
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
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Pending Intakes"
            value="15"
            icon={Clock}
            color="bg-orange-50 text-orange-600"
          />
          <MetricCard
            label="Scheduled Today"
            value="8"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Completed (Week)"
            value="32"
            icon={CheckCircle}
            color="bg-green-50 text-green-600"
          />
          <MetricCard
            label="Overdue"
            value="2"
            icon={FileText}
            color="bg-red-50 text-red-600"
          />
        </div>

        {/* Intake Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Intake Queue */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Intake Queue</h2>
            <div className="space-y-2">
              <IntakeLink href="/ic/intake/pending" label="Pending Intakes" badge="15" />
              <IntakeLink href="/ic/intake/in-progress" label="In Progress" badge="8" />
              <IntakeLink href="/ic/intake/completed" label="Completed Today" badge="12" />
              <IntakeLink href="/ic/intake/overdue" label="Overdue" badge="2" />
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scheduling</h2>
            <div className="space-y-2">
              <IntakeLink href="/ic/schedule/calendar" label="Schedule Calendar" badge="" />
              <IntakeLink href="/ic/schedule/availability" label="Assign Time Slots" badge="" />
              <IntakeLink href="/ic/schedule/counselors" label="Counselor Availability" badge="" />
              <IntakeLink href="/ic/schedule/notifications" label="Send Notifications" badge="" />
            </div>
          </div>

          {/* Form Processing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Form Processing</h2>
            <div className="space-y-2">
              <IntakeLink href="/ic/forms/new" label="New Forms" badge="5" />
              <IntakeLink href="/ic/forms/incomplete" label="Incomplete Forms" badge="3" />
              <IntakeLink href="/ic/forms/review" label="For Review" badge="7" />
              <IntakeLink href="/ic/forms/archive" label="Archived Forms" badge="" />
            </div>
          </div>

          {/* Verification & QA */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Verification & QA</h2>
            <div className="space-y-2">
              <IntakeLink href="/ic/qa/verify" label="Verify Information" badge="6" />
              <IntakeLink href="/ic/qa/missing-data" label="Missing Data" badge="4" />
              <IntakeLink href="/ic/qa/contact" label="Contact Students" badge="" />
              <IntakeLink href="/ic/qa/follow-up" label="Follow-up Tasks" badge="" />
            </div>
          </div>
        </div>

        {/* Today's Intake Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Today's Intake Schedule</h2>
          <div className="space-y-3">
            <IntakeScheduleItem
              time="9:00 AM"
              student="John Davis"
              status="scheduled"
              counselor="Dr. Lee"
            />
            <IntakeScheduleItem
              time="10:30 AM"
              student="Maya Patel"
              status="in-progress"
              counselor="Dr. Smith"
            />
            <IntakeScheduleItem
              time="1:00 PM"
              student="Alex Kim"
              status="scheduled"
              counselor="Dr. Johnson"
            />
            <IntakeScheduleItem
              time="3:00 PM"
              student="Sam Wilson"
              status="scheduled"
              counselor="Dr. Lee"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: any) {
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

function IntakeLink({ href, label, badge }: any) {
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

function IntakeScheduleItem({ time, student, status, counselor }: any) {
  const statusColor = status === "in-progress" ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-300";
  return (
    <div className={`${statusColor} border rounded-lg p-4 flex items-center justify-between`}>
      <div>
        <p className="font-bold text-gray-900">{time} - {student}</p>
        <p className="text-gray-600 text-sm">with {counselor}</p>
      </div>
      <span className="text-sm font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}
