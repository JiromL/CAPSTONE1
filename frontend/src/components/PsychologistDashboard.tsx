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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <ClinicalCard label="Cases Under Review" value="24" color="bg-purple-50 text-purple-600" />
        <ClinicalCard label="Critical Cases" value="3" color="bg-red-50 text-red-600" />
        <ClinicalCard label="Sessions This Week" value="18" color="bg-blue-50 text-blue-600" />
        <ClinicalCard label="Supervision Requests" value="5" color="bg-green-50 text-green-600" />
      </div>

      {/* Clinical Work Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Case Review</h2>
          <div className="space-y-2">
            <ClinicalLink href="/psychologist/cases/pending" label="Pending Reviews" badge="7" />
            <ClinicalLink href="/psychologist/cases/high-risk" label="High-Risk Cases" badge="3" />
            <ClinicalLink href="/psychologist/cases/assigned" label="My Cases" />
            <ClinicalLink href="/psychologist/cases/archived" label="Case Archive" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Clinical Documentation</h2>
          <div className="space-y-2">
            <ClinicalLink href="/psychologist/notes" label="Clinical Notes" />
            <ClinicalLink href="/psychologist/assessments" label="Assessments" />
            <ClinicalLink href="/psychologist/treatment-plans" label="Treatment Plans" />
            <ClinicalLink href="/psychologist/progress-reports" label="Progress Reports" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Supervision & Training</h2>
          <div className="space-y-2">
            <ClinicalLink href="/psychologist/supervision/schedule" label="Schedule Supervision" />
            <ClinicalLink href="/psychologist/supervision/group" label="Group Supervision" />
            <ClinicalLink href="/psychologist/supervision/notes" label="Supervision Notes" />
            <ClinicalLink href="/psychologist/training" label="Training Materials" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Risk Management</h2>
          <div className="space-y-2">
            <ClinicalLink href="/psychologist/risk/assessment" label="Risk Assessments" />
            <ClinicalLink href="/psychologist/risk/escalations" label="Escalation Log" />
            <ClinicalLink href="/psychologist/risk/crisis" label="Crisis Interventions" />
            <ClinicalLink href="/psychologist/risk/safety-plans" label="Safety Plans" />
          </div>
        </div>
      </div>

      {/* Weekly Review Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Weekly Review Panel</h2>
          <span className="text-sm text-gray-600">Next: Tuesday 10:00 AM</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReviewPanelItem label="Cases for Review" value="7" status="pending" />
          <ReviewPanelItem label="Supervision Cases" value="3" status="scheduled" />
          <ReviewPanelItem label="Crisis Consults" value="1" status="urgent" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function ClinicalCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function ClinicalLink({ href, label, badge }: any) {
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

function ReviewPanelItem({ label, value, status }: any) {
  const statusStyles = {
    pending: "bg-yellow-50 text-yellow-700",
    scheduled: "bg-blue-50 text-blue-700",
    urgent: "bg-red-50 text-red-700"
  };
  
  return (
    <div className={`${statusStyles[status as keyof typeof statusStyles]} rounded-lg p-4`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
