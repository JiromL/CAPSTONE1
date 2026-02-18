import Link from 'next/link';
import { Users, FileText, CheckCircle, Clock, Calendar, AlertCircle, Phone } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <CheckCircle size={20} /> },
    { label: 'Pending Intakes', href: '/ic/intake/pending', icon: <Clock size={20} />, badge: 15 },
    { label: 'In Progress', href: '/ic/intake/in-progress', icon: <FileText size={20} />, badge: 8 },
    { label: 'Completed', href: '/ic/intake/completed', icon: <CheckCircle size={20} /> },
    { label: 'Schedule Calendar', href: '/ic/schedule/calendar', icon: <Calendar size={20} /> },
    { label: 'Student Contact', href: '/ic/contact/students', icon: <Phone size={20} /> },
    { label: 'Counselor Availability', href: '/ic/schedule/counselors', icon: <Users size={20} /> },
    { label: 'Overdue Forms', href: '/ic/intake/overdue', icon: <AlertCircle size={20} />, badge: 2 },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Intake Counselor Dashboard"
      subtitle="Intake Processing & Scheduling"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Pending Intakes" value="15" color="bg-orange-50 text-orange-600" />
        <MetricCard label="Scheduled Today" value="8" color="bg-blue-50 text-blue-600" />
        <MetricCard label="Completed (Week)" value="32" color="bg-green-50 text-green-600" />
        <MetricCard label="Overdue" value="2" color="bg-red-50 text-red-600" />
      </div>

      {/* Intake Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Intake Queue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Intake Queue</h2>
          <div className="space-y-2">
            <IntakeLink href="/ic/intake/pending" label="Pending Intakes" badge="15" />
            <IntakeLink href="/ic/intake/in-progress" label="In Progress" badge="8" />
            <IntakeLink href="/ic/intake/completed" label="Completed Today" badge="12" />
            <IntakeLink href="/ic/intake/overdue" label="Overdue" badge="2" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <IntakeLink href="/ic/intake/new" label="Start New Intake" />
            <IntakeLink href="/ic/schedule/assign" label="Assign Time Slots" />
            <IntakeLink href="/ic/forms/verify" label="Verify Information" badge="6" />
            <IntakeLink href="/ic/notifications/send" label="Send Notifications" />
          </div>
        </div>

        {/* Form Processing */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Form Management</h2>
          <div className="space-y-2">
            <IntakeLink href="/ic/forms/new" label="New Forms" badge="5" />
            <IntakeLink href="/ic/forms/incomplete" label="Incomplete Forms" badge="3" />
            <IntakeLink href="/ic/forms/review" label="For Review" badge="7" />
            <IntakeLink href="/ic/forms/archive" label="Archived Forms" />
          </div>
        </div>

        {/* Quality Assurance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Verification & QA</h2>
          <div className="space-y-2">
            <IntakeLink href="/ic/qa/verify" label="Verify Information" badge="6" />
            <IntakeLink href="/ic/qa/missing-data" label="Missing Data" badge="4" />
            <IntakeLink href="/ic/qa/contact" label="Contact Students" />
            <IntakeLink href="/ic/qa/follow-up" label="Follow-up Tasks" />
          </div>
        </div>
      </div>

      {/* Today's Intake Schedule */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Today's Intake Schedule</h2>
          <span className="text-sm text-gray-600">8 Scheduled</span>
        </div>
        <div className="space-y-3">
          <ScheduleItem time="9:00 AM" student="John Davis" counselor="Dr. Lee" status="scheduled" />
          <ScheduleItem time="10:30 AM" student="Maya Patel" counselor="Dr. Smith" status="in-progress" />
          <ScheduleItem time="1:00 PM" student="Alex Kim" counselor="Dr. Johnson" status="scheduled" />
          <ScheduleItem time="3:00 PM" student="Sam Wilson" counselor="Dr. Lee" status="scheduled" />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PerfBox label="Intakes Completed" value="32" trend="+8%" />
          <PerfBox label="Avg Completion Time" value="2.5 hours" trend="-0.3h" />
          <PerfBox label="Data Accuracy" value="98%" trend="+1%" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
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

function ScheduleItem({ time, student, counselor, status }: any) {
  const statusColor = status === "in-progress" ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-300";
  return (
    <div className={`${statusColor} border rounded-lg p-4 flex items-center justify-between`}>
      <div>
        <p className="font-bold text-gray-900 text-sm">{time} - {student}</p>
        <p className="text-gray-600 text-xs mt-1">Counselor: {counselor}</p>
      </div>
      <span className="text-sm font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}

function PerfBox({ label, value, trend }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-green-600 text-xs font-medium">{trend}</p>
      </div>
    </div>
  );
}
