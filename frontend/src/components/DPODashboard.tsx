import Link from 'next/link';
import { Users, AlertTriangle, TrendingUp, Calendar, BarChart3, Settings, Shield } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function DPODashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 size={20} /> },
    { label: 'Team Management', href: '/dpo/counselors', icon: <Users size={20} /> },
    { label: 'Case Supervision', href: '/dpo/cases', icon: <Shield size={20} /> },
    { label: 'High-Risk Review', href: '/dpo/high-risk', icon: <AlertTriangle size={20} />, badge: 8 },
    { label: 'Weekly Reviews', href: '/dpo/reviews', icon: <Calendar size={20} /> },
    { label: 'Performance Metrics', href: '/dpo/performance', icon: <TrendingUp size={20} /> },
    { label: 'Department Settings', href: '/dpo/settings', icon: <Settings size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="DPO Dashboard"
      subtitle="Director of Psychological Operations"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Counselors" value="15" change="+2" color="bg-blue-50 text-blue-600" />
        <MetricCard label="Critical Cases" value="8" change="-1" color="bg-red-50 text-red-600" />
        <MetricCard label="Weekly Sessions" value="124" change="+5%" color="bg-green-50 text-green-600" />
        <MetricCard label="Avg Satisfaction" value="4.8/5" change="+0.2" color="bg-purple-50 text-purple-600" />
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Team Management</h2>
          <div className="space-y-2">
            <OperationLink href="/dpo/counselors" label="Manage Counselors" />
            <OperationLink href="/dpo/assignments" label="Case Assignments" />
            <OperationLink href="/dpo/schedules" label="Team Schedules" />
            <OperationLink href="/dpo/performance" label="Performance Metrics" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Case Supervision</h2>
          <div className="space-y-2">
            <OperationLink href="/dpo/cases" label="All Cases" />
            <OperationLink href="/dpo/high-risk" label="High-Risk Review" badge="8" />
            <OperationLink href="/dpo/escalations" label="Escalations" />
            <OperationLink href="/dpo/outcomes" label="Case Outcomes" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quality Assurance</h2>
          <div className="space-y-2">
            <OperationLink href="/dpo/audits" label="File Audits" />
            <OperationLink href="/dpo/compliance" label="Compliance Check" />
            <OperationLink href="/dpo/training" label="Staff Training" />
            <OperationLink href="/dpo/feedback" label="Client Feedback" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Strategic Planning</h2>
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
        <h2 className="text-lg font-bold text-gray-900 mb-4">This Week Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OverviewItem label="Sessions Scheduled" value="48" status="On Track" />
          <OverviewItem label="New Assessments" value="12" status="On Track" />
          <OverviewItem label="Follow-ups Required" value="5" status="Action Needed" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, change, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-green-600 text-xs font-medium">{change}</p>
      </div>
    </div>
  );
}

function OperationLink({ href, label, badge }: any) {
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
