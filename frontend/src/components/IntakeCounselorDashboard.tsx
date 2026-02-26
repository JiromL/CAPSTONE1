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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Pending Intakes" value="15" />
        <MetricCard label="Scheduled Today" value="8" />
        <MetricCard label="Completed (Week)" value="32" />
        <MetricCard label="Overdue" value="2" />
      </div>

      {/* Intake Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Intake Queue */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Intake Queue</h2>
          <div className="space-y-1">
            <IntakeLink href="/ic/intake/pending" label="Pending Intakes" badge="15" />
            <IntakeLink href="/ic/intake/in-progress" label="In Progress" badge="8" />
            <IntakeLink href="/ic/intake/completed" label="Completed Today" badge="12" />
            <IntakeLink href="/ic/intake/overdue" label="Overdue" badge="2" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h2>
          <div className="space-y-1">
            <IntakeLink href="/ic/intake/new" label="Start New Intake" />
            <IntakeLink href="/ic/schedule/assign" label="Assign Time Slots" />
            <IntakeLink href="/ic/forms/verify" label="Verify Information" badge="6" />
            <IntakeLink href="/ic/notifications/send" label="Send Notifications" />
          </div>
        </div>

        {/* Form Processing */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Form Management</h2>
          <div className="space-y-1">
            <IntakeLink href="/ic/forms/new" label="New Forms" badge="5" />
            <IntakeLink href="/ic/forms/incomplete" label="Incomplete Forms" badge="3" />
            <IntakeLink href="/ic/forms/review" label="For Review" badge="7" />
            <IntakeLink href="/ic/forms/archive" label="Archived Forms" />
          </div>
        </div>

        {/* Quality Assurance */}
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Verification & QA</h2>
          <div className="space-y-1">
            <IntakeLink href="/ic/qa/verify" label="Verify Information" badge="6" />
            <IntakeLink href="/ic/qa/missing-data" label="Missing Data" badge="4" />
            <IntakeLink href="/ic/qa/contact" label="Contact Students" />
            <IntakeLink href="/ic/qa/follow-up" label="Follow-up Tasks" />
          </div>
        </div>
      </div>

      {/* Today's Intake Schedule */}
      <div className="border border-gray-200 rounded p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Today's Intake Schedule</h2>
          <span className="text-xs text-gray-600">8 Scheduled</span>
        </div>
        <div className="space-y-2">
          <ScheduleItem time="9:00 AM" student="John Davis" counselor="Dr. Lee" status="scheduled" />
          <ScheduleItem time="10:30 AM" student="Maya Patel" counselor="Dr. Smith" status="in-progress" />
          <ScheduleItem time="1:00 PM" student="Alex Kim" counselor="Dr. Johnson" status="scheduled" />
          <ScheduleItem time="3:00 PM" student="Sam Wilson" counselor="Dr. Lee" status="scheduled" />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PerfBox label="Intakes Completed" value="32" trend="+8%" />
          <PerfBox label="Avg Completion Time" value="2.5 hours" trend="-0.3h" />
          <PerfBox label="Data Accuracy" value="98%" trend="+1%" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function IntakeLink({ href, label, badge }: any) {
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

function ScheduleItem({ time, student, counselor, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900 text-xs">{time} - {student}</p>
        <p className="text-gray-600 text-xs mt-0.5">Counselor: {counselor}</p>
      </div>
      <span className="text-xs font-medium text-gray-600">{status.toUpperCase()}</span>
    </div>
  );
}

function PerfBox({ label, value, trend }: any) {
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
