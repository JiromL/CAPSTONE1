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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Counselors" value="15" change="+2" />
        <MetricCard label="Critical Cases" value="8" change="-1" />
        <MetricCard label="Weekly Sessions" value="124" change="+5%" />
        <MetricCard label="Avg Satisfaction" value="4.8/5" change="+0.2" />
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Team Management</h2>
          <div className="space-y-1">
            <OperationLink href="/dpo/counselors" label="Manage Counselors" />
            <OperationLink href="/dpo/assignments" label="Case Assignments" />
            <OperationLink href="/dpo/schedules" label="Team Schedules" />
            <OperationLink href="/dpo/performance" label="Performance Metrics" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Case Supervision</h2>
          <div className="space-y-1">
            <OperationLink href="/dpo/cases" label="All Cases" />
            <OperationLink href="/dpo/high-risk" label="High-Risk Review" badge="8" />
            <OperationLink href="/dpo/escalations" label="Escalations" />
            <OperationLink href="/dpo/outcomes" label="Case Outcomes" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Quality Assurance</h2>
          <div className="space-y-1">
            <OperationLink href="/dpo/audits" label="File Audits" />
            <OperationLink href="/dpo/compliance" label="Compliance Check" />
            <OperationLink href="/dpo/training" label="Staff Training" />
            <OperationLink href="/dpo/feedback" label="Client Feedback" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Strategic Planning</h2>
          <div className="space-y-1">
            <OperationLink href="/dpo/reports" label="Operations Report" />
            <OperationLink href="/dpo/trends" label="Trend Analysis" />
            <OperationLink href="/dpo/capacity" label="Capacity Planning" />
            <OperationLink href="/dpo/goals" label="Department Goals" />
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">This Week Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <OverviewItem label="Sessions Scheduled" value="48" status="On Track" />
          <OverviewItem label="New Assessments" value="12" status="On Track" />
          <OverviewItem label="Follow-ups Required" value="5" status="Action Needed" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, change }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-gray-600 text-xs font-medium">{change}</p>
      </div>
    </div>
  );
}

function OperationLink({ href, label, badge }: any) {
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

function OverviewItem({ label, value, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs font-medium text-gray-700 mt-1">{status}</p>
    </div>
  );
}
