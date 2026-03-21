'use client';

import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = getMenuItemsByRole(user.role);

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Psychologist Dashboard"
      subtitle="Clinical Review"
      activeSection="dashboard"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <ClinicalCard label="Cases Under Review" value="24" />
        <ClinicalCard label="Critical Cases" value="3" />
        <ClinicalCard label="Pending Reviews" value="7" />
        <ClinicalCard label="This Week Sessions" value="18" />
      </div>
    </DashboardLayout>
  );
}

function ClinicalCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}

function ReviewPanelItem({ label, value, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
