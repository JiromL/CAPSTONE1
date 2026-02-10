import Link from 'next/link';
import { Users, Brain, AlertTriangle, FileText, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function PsychologistDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Psychologist Dashboard</h1>
            <p className="text-gray-600 mt-1">Clinical Review & Case Oversight</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Clinical Supervisor</p>
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
          <ClinicalCard
            label="Cases Under Review"
            value="24"
            icon={FileText}
            color="bg-purple-50 text-purple-600"
          />
          <ClinicalCard
            label="Critical Cases"
            value="3"
            icon={AlertTriangle}
            color="bg-red-50 text-red-600"
          />
          <ClinicalCard
            label="Sessions This Week"
            value="18"
            icon={Brain}
            color="bg-blue-50 text-blue-600"
          />
          <ClinicalCard
            label="Supervision Requests"
            value="5"
            icon={Users}
            color="bg-green-50 text-green-600"
          />
        </div>

        {/* Clinical Work */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Case Review */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Case Review</h2>
            <div className="space-y-2">
              <ClinicalLink href="/psychologist/cases/pending" label="Pending Reviews" />
              <ClinicalLink href="/psychologist/cases/high-risk" label="High-Risk Cases" />
              <ClinicalLink href="/psychologist/cases/assigned" label="My Cases" />
              <ClinicalLink href="/psychologist/cases/archived" label="Case Archive" />
            </div>
          </div>

          {/* Clinical Documentation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Documentation</h2>
            <div className="space-y-2">
              <ClinicalLink href="/psychologist/notes" label="Clinical Notes" />
              <ClinicalLink href="/psychologist/assessments" label="Assessments" />
              <ClinicalLink href="/psychologist/treatment-plans" label="Treatment Plans" />
              <ClinicalLink href="/psychologist/progress-reports" label="Progress Reports" />
            </div>
          </div>

          {/* Supervision & Training */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Supervision</h2>
            <div className="space-y-2">
              <ClinicalLink href="/psychologist/supervision/schedule" label="Schedule Supervision" />
              <ClinicalLink href="/psychologist/supervision/group" label="Group Supervision" />
              <ClinicalLink href="/psychologist/supervision/notes" label="Supervision Notes" />
              <ClinicalLink href="/psychologist/training" label="Training Materials" />
            </div>
          </div>

          {/* Risk Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Management</h2>
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
            <h2 className="text-2xl font-bold text-gray-900">Weekly Review Panel</h2>
            <span className="text-sm text-gray-600">Next: Tuesday 10:00 AM</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReviewPanelItem label="Cases for Review" value="7" status="pending" />
            <ReviewPanelItem label="Supervision Cases" value="3" status="scheduled" />
            <ReviewPanelItem label="Crisis Consults" value="1" status="urgent" />
          </div>
        </div>
      </main>
    </div>
  );
}

function ClinicalCard({ label, value, icon: Icon, color }: any) {
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

function ClinicalLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        <span className="text-gray-400">→</span>
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
