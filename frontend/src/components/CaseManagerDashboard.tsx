import Link from 'next/link';
import { Users, Calendar, CheckCircle, AlertCircle, FileText, TrendingUp, Settings } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <Users size={20} /> },
    { label: 'My Tasks', href: '/tasks', icon: <CheckCircle size={20} />, badge: 15 },
    { label: 'Cases', href: '/cases', icon: <FileText size={20} />, badge: 32 },
    { label: 'High-Risk', href: '/high-risk', icon: <AlertCircle size={20} />, badge: 3 },
    { label: 'Documentation', href: '/documentation', icon: <TrendingUp size={20} /> },
    { label: 'Profile', href: '/profile', icon: <Settings size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Case Manager Dashboard"
      subtitle="Case Coordination & Follow-up"
    >
      {/* Key Metrics - Caseload */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <CaseCard label="Active Cases" value="32" color="bg-blue-50 text-blue-600" />
        <CaseCard label="Follow-ups Due" value="7" color="bg-orange-50 text-orange-600" />
        <CaseCard label="Completed This Month" value="8" color="bg-green-50 text-green-600" />
        <CaseCard label="At-Risk Clients" value="4" color="bg-red-50 text-red-600" />
      </div>

      {/* Case Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Caseload</h2>
          <div className="space-y-2">
            <CaseLink href="/casemanager/cases" label="View All Cases" badge="32" />
            <CaseLink href="/casemanager/intake" label="Pending Intakes" badge="5" />
            <CaseLink href="/casemanager/follow-ups" label="Follow-ups Due" badge="7" />
            <CaseLink href="/casemanager/closed" label="Closed Cases" badge="16" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Scheduling</h2>
          <div className="space-y-2">
            <CaseLink href="/casemanager/appointments" label="Upcoming Appointments" badge="12" />
            <CaseLink href="/casemanager/schedule" label="My Schedule" />
            <CaseLink href="/casemanager/availability" label="Manage Availability" />
            <CaseLink href="/casemanager/reminders" label="Send Reminders" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Documentation</h2>
          <div className="space-y-2">
            <CaseLink href="/casemanager/documents" label="Case Files" />
            <CaseLink href="/casemanager/notes" label="Session Notes" />
            <CaseLink href="/casemanager/intake-forms" label="Intake Forms" />
            <CaseLink href="/casemanager/referrals" label="Referrals" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Client Progress</h2>
          <div className="space-y-2">
            <CaseLink href="/casemanager/assessments" label="Assessment Results" />
            <CaseLink href="/casemanager/progress" label="Track Progress" />
            <CaseLink href="/casemanager/outcomes" label="Case Outcomes" />
            <CaseLink href="/casemanager/discharge" label="Discharge Planning" />
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Tasks</h2>
        <div className="space-y-3">
          <TaskItem title="Follow-up call with Client #2341" dueTime="2:00 PM" status="pending" />
          <TaskItem title="Complete intake form for new student" dueTime="Before EOD" status="pending" />
          <TaskItem title="Review assessment results from Dr. Lee" dueTime="Done" status="completed" />
          <TaskItem title="Schedule appointments for 3 clients" dueTime="3:30 PM" status="pending" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function CaseCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function CaseLink({ href, label, badge }: any) {
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

function TaskItem({ title, dueTime, status }: any) {
  const statusStyles = status === "completed" 
    ? "border-l-4 border-green-500 bg-green-50"
    : "border-l-4 border-orange-500 bg-orange-50";
    
  return (
    <div className={`${statusStyles} p-4 rounded-lg flex items-center justify-between`}>
      <div>
        <p className="text-gray-900 font-medium">{title}</p>
        <p className="text-gray-600 text-sm mt-1">{dueTime}</p>
      </div>
      <input type="checkbox" checked={status === "completed"} readOnly className="w-5 h-5" />
    </div>
  );
}
