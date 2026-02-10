import Link from 'next/link';
import { Users, AlertTriangle, TrendingUp, Calendar, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function DPODashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DPO Dashboard</h1>
            <p className="text-gray-600 mt-1">Director of Psychological Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Operations Director</p>
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
            label="Counselors"
            value="15"
            change="+2"
            icon={Users}
          />
          <MetricCard
            label="Critical Cases"
            value="8"
            change="-1"
            icon={AlertTriangle}
          />
          <MetricCard
            label="Weekly Sessions"
            value="124"
            change="+5%"
            icon={Calendar}
          />
          <MetricCard
            label="Avg Satisfaction"
            value="4.8/5"
            change="+0.2"
            icon={TrendingUp}
          />
        </div>

        {/* Operations Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Team Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Management</h2>
            <div className="space-y-2">
              <OperationLink href="/dpo/counselors" label="Manage Counselors" />
              <OperationLink href="/dpo/assignments" label="Case Assignments" />
              <OperationLink href="/dpo/schedules" label="Team Schedules" />
              <OperationLink href="/dpo/performance" label="Performance Metrics" />
            </div>
          </div>

          {/* Case Supervision */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Case Supervision</h2>
            <div className="space-y-2">
              <OperationLink href="/dpo/cases" label="All Cases" />
              <OperationLink href="/dpo/high-risk" label="High-Risk Review" />
              <OperationLink href="/dpo/escalations" label="Escalations" />
              <OperationLink href="/dpo/outcomes" label="Case Outcomes" />
            </div>
          </div>

          {/* Quality Assurance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quality Assurance</h2>
            <div className="space-y-2">
              <OperationLink href="/dpo/audits" label="File Audits" />
              <OperationLink href="/dpo/compliance" label="Compliance Check" />
              <OperationLink href="/dpo/training" label="Staff Training" />
              <OperationLink href="/dpo/feedback" label="Client Feedback" />
            </div>
          </div>

          {/* Strategic Planning */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Strategic Planning</h2>
            <div className="space-y-2">
              <OperationLink href="/dpo/reports" label="Operations Report" />
              <OperationLink href="/dpo/trends" label="Trend Analysis" />
              <OperationLink href="/dpo/capacity" label="Capacity Planning" />
              <OperationLink href="/dpo/goals" label="Department Goals" />
            </div>
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">This Week Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OverviewItem label="Sessions Scheduled" value="48" status="On Track" />
            <OverviewItem label="New Assessments" value="12" status="On Track" />
            <OverviewItem label="Follow-ups Required" value="5" status="Action Needed" />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-green-600 text-sm mt-2">{change}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function OperationLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        <span className="text-gray-400">→</span>
      </div>
    </Link>
  );
}

function OverviewItem({ label, value, status }: any) {
  const statusColor = status === "On Track" ? "text-green-600" : "text-orange-600";
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className={`text-sm font-medium mt-2 ${statusColor}`}>{status}</p>
    </div>
  );
}
