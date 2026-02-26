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
      {/* Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded p-4">
          <p className="text-gray-600 text-xs font-medium mb-1">Active Cases</p>
          <p className="text-2xl font-bold text-gray-900">32</p>
        </div>
        <div className="border border-gray-200 rounded p-4">
          <p className="text-gray-600 text-xs font-medium mb-1">Follow-ups Due</p>
          <p className="text-2xl font-bold text-gray-900">7</p>
        </div>
      </div>

      {/* Core Actions */}
      <div className="border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Actions</h2>
        <div className="space-y-1">
          <CaseLink href="/cases" label="View Cases" badge="32" />
          <CaseLink href="/high-risk" label="High-Risk Clients" badge="4" />
          <CaseLink href="/documentation" label="Documentation" />
        </div>
      </div>
    </DashboardLayout>
  );
}


function CaseLink({ href, label, badge }: any) {
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
