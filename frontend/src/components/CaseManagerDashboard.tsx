import Link from 'next/link';
import { Users, Calendar, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">Case Coordination & Follow-up</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Case Manager</p>
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
        {/* Key Metrics - Caseload */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <CaseCard
            label="Active Cases"
            value="32"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <CaseCard
            label="Follow-ups Due"
            value="7"
            icon={Calendar}
            color="bg-orange-50 text-orange-600"
          />
          <CaseCard
            label="Completed This Month"
            value="8"
            icon={CheckCircle}
            color="bg-green-50 text-green-600"
          />
          <CaseCard
            label="At-Risk Clients"
            value="4"
            icon={AlertCircle}
            color="bg-red-50 text-red-600"
          />
        </div>

        {/* Case Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* My Caseload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Caseload</h2>
            <div className="space-y-2">
              <CaseLink href="/casemanager/cases" label="View All Cases" badge="32" />
              <CaseLink href="/casemanager/intake" label="Pending Intakes" badge="5" />
              <CaseLink href="/casemanager/follow-ups" label="Follow-ups Due" badge="7" />
              <CaseLink href="/casemanager/closed" label="Closed Cases" badge="16" />
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scheduling</h2>
            <div className="space-y-2">
              <CaseLink href="/casemanager/appointments" label="Upcoming Appointments" badge="12" />
              <CaseLink href="/casemanager/schedule" label="My Schedule" badge="" />
              <CaseLink href="/casemanager/availability" label="Manage Availability" badge="" />
              <CaseLink href="/casemanager/reminders" label="Send Reminders" badge="" />
            </div>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Documentation</h2>
            <div className="space-y-2">
              <CaseLink href="/casemanager/documents" label="Case Files" badge="" />
              <CaseLink href="/casemanager/notes" label="Session Notes" badge="" />
              <CaseLink href="/casemanager/intake-forms" label="Intake Forms" badge="" />
              <CaseLink href="/casemanager/referrals" label="Referrals" badge="" />
            </div>
          </div>

          {/* Client Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Progress</h2>
            <div className="space-y-2">
              <CaseLink href="/casemanager/assessments" label="Assessment Results" badge="" />
              <CaseLink href="/casemanager/progress" label="Track Progress" badge="" />
              <CaseLink href="/casemanager/outcomes" label="Case Outcomes" badge="" />
              <CaseLink href="/casemanager/discharge" label="Discharge Planning" badge="" />
            </div>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Today's Tasks</h2>
          <div className="space-y-3">
            <TaskItem title="Follow-up call with Client #2341" dueTime="2:00 PM" status="pending" />
            <TaskItem title="Complete intake form for new student" dueTime="Before EOD" status="pending" />
            <TaskItem title="Review assessment results from Dr. Lee" dueTime="Done" status="completed" />
            <TaskItem title="Schedule appointments for 3 clients" dueTime="3:30 PM" status="pending" />
          </div>
        </div>
      </main>
    </div>
  );
}

function CaseCard({ label, value, icon: Icon, color }: any) {
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
