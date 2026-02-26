import Link from 'next/link';
import { Users, Brain, AlertTriangle, FileText, Calendar, TrendingUp, Shield } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <Brain size={20} /> },
    { label: 'Case Review', href: '/psychologist/cases', icon: <FileText size={20} /> },
    { label: 'Pending Reviews', href: '/psychologist/pending', icon: <Calendar size={20} />, badge: 7 },
    { label: 'Clinical Notes', href: '/psychologist/notes', icon: <Shield size={20} /> },
    { label: 'Risk Assessment', href: '/psychologist/risk', icon: <AlertTriangle size={20} />, badge: 3 },
    { label: 'Supervision', href: '/psychologist/supervision', icon: <Users size={20} /> },
    { label: 'Progress Reports', href: '/psychologist/reports', icon: <TrendingUp size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Psychologist Dashboard"
      subtitle="Clinical Review & Case Oversight"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <ClinicalCard label="Cases Under Review" value="24" />
        <ClinicalCard label="Critical Cases" value="3" />
        <ClinicalCard label="Sessions This Week" value="18" />
        <ClinicalCard label="Supervision Requests" value="5" />
      </div>

      {/* Clinical Work Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Case Review</h2>
          <div className="space-y-1">
            <ClinicalLink href="/psychologist/cases/pending" label="Pending Reviews" badge="7" />
            <ClinicalLink href="/psychologist/cases/high-risk" label="High-Risk Cases" badge="3" />
            <ClinicalLink href="/psychologist/cases/assigned" label="My Cases" />
            <ClinicalLink href="/psychologist/cases/archived" label="Case Archive" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Clinical Documentation</h2>
          <div className="space-y-1">
            <ClinicalLink href="/psychologist/notes" label="Clinical Notes" />
            <ClinicalLink href="/psychologist/assessments" label="Assessments" />
            <ClinicalLink href="/psychologist/treatment-plans" label="Treatment Plans" />
            <ClinicalLink href="/psychologist/progress-reports" label="Progress Reports" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Supervision & Training</h2>
          <div className="space-y-1">
            <ClinicalLink href="/psychologist/supervision/schedule" label="Schedule Supervision" />
            <ClinicalLink href="/psychologist/supervision/group" label="Group Supervision" />
            <ClinicalLink href="/psychologist/supervision/notes" label="Supervision Notes" />
            <ClinicalLink href="/psychologist/training" label="Training Materials" />
          </div>
        </div>

        <div className="border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Risk Management</h2>
          <div className="space-y-1">
            <ClinicalLink href="/psychologist/risk/assessment" label="Risk Assessments" />
            <ClinicalLink href="/psychologist/risk/escalations" label="Escalation Log" />
            <ClinicalLink href="/psychologist/risk/crisis" label="Crisis Interventions" />
            <ClinicalLink href="/psychologist/risk/safety-plans" label="Safety Plans" />
          </div>
        </div>
      </div>

      {/* Weekly Review Panel */}
      <div className="border border-gray-200 rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Weekly Review Panel</h2>
          <span className="text-xs text-gray-600">Next: Tuesday 10:00 AM</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReviewPanelItem label="Cases for Review" value="7" status="pending" />
          <ReviewPanelItem label="Supervision Cases" value="3" status="scheduled" />
          <ReviewPanelItem label="Crisis Consults" value="1" status="urgent" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function ClinicalCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function ClinicalLink({ href, label, badge }: any) {
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

function ReviewPanelItem({ label, value, status }: any) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
