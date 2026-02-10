import Link from 'next/link';
import { Users, FileText, Phone, AlertCircle, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselingTeamDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Counseling Team Dashboard</h1>
            <p className="text-gray-600 mt-1">Client Case Support</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Support Team Member</p>
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
        {/* Team Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <TeamCard
            label="Clients Assisted"
            value="45"
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <TeamCard
            label="Support Calls"
            value="18"
            icon={Phone}
            color="bg-green-50 text-green-600"
          />
          <TeamCard
            label="Cases Processed"
            value="32"
            icon={FileText}
            color="bg-purple-50 text-purple-600"
          />
          <TeamCard
            label="Follow-ups"
            value="7"
            icon={AlertCircle}
            color="bg-orange-50 text-orange-600"
          />
        </div>

        {/* Team Support Functions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Client Support */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client Support</h2>
            <div className="space-y-2">
              <TeamLink href="/csp/clients/active" label="Active Clients" badge="45" />
              <TeamLink href="/csp/clients/intake" label="Intake Assistance" badge="8" />
              <TeamLink href="/csp/clients/follow-up" label="Follow-up Calls" badge="7" />
              <TeamLink href="/csp/clients/resources" label="Client Resources" badge="" />
            </div>
          </div>

          {/* Case Support */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Case Support</h2>
            <div className="space-y-2">
              <TeamLink href="/csp/cases/pending" label="Pending Cases" badge="12" />
              <TeamLink href="/csp/cases/documentation" label="Case Documentation" badge="" />
              <TeamLink href="/csp/cases/referrals" label="Referral Assistance" badge="3" />
              <TeamLink href="/csp/cases/archive" label="Archived Cases" badge="" />
            </div>
          </div>

          {/* Communication */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Communication</h2>
            <div className="space-y-2">
              <TeamLink href="/csp/communication/messages" label="Client Messages" badge="5" />
              <TeamLink href="/csp/communication/calls" label="Call Log" badge="" />
              <TeamLink href="/csp/communication/emails" label="Email Templates" badge="" />
              <TeamLink href="/csp/communication/scheduling" label="Scheduling Assistance" badge="" />
            </div>
          </div>

          {/* Procedures & Guidelines */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Procedures & Guidelines</h2>
            <div className="space-y-2">
              <TeamLink href="/csp/procedures/protocols" label="Support Protocols" badge="" />
              <TeamLink href="/csp/procedures/faq" label="FAQ & Common Issues" badge="" />
              <TeamLink href="/csp/procedures/training" label="Training Materials" badge="" />
              <TeamLink href="/csp/procedures/contact" label="Contact Directory" badge="" />
            </div>
          </div>
        </div>

        {/* Pending Client Follow-ups */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Client Follow-ups</h2>
          <div className="space-y-3">
            <FollowUpItem
              clientId="C-2341"
              name="Sarah Mitchell"
              reason="Missed appointment follow-up"
              dueTime="Today"
              priority="high"
            />
            <FollowUpItem
              clientId="C-2342"
              name="James Brown"
              reason="Check-in call"
              dueTime="Tomorrow"
              priority="medium"
            />
            <FollowUpItem
              clientId="C-2343"
              name="Emma Wilson"
              reason="Confirm new appointment"
              dueTime="This Week"
              priority="low"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function TeamCard({ label, value, icon: Icon, color }: any) {
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

function TeamLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        {badge && <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">{badge}</span>}
        {!badge && <span className="text-gray-400">→</span>}
      </div>
    </Link>
  );
}

function FollowUpItem({ clientId, name, reason, dueTime, priority }: any) {
  const priorityColor = priority === "high" ? "bg-red-50 border-red-300" : priority === "medium" ? "bg-yellow-50 border-yellow-300" : "bg-blue-50 border-blue-300";
  const priorityText = priority === "high" ? "text-red-700" : priority === "medium" ? "text-yellow-700" : "text-blue-700";
  
  return (
    <div className={`${priorityColor} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">{clientId} - {name}</p>
          <p className="text-gray-600 text-sm mt-1">{reason}</p>
          <p className="text-gray-600 text-sm mt-2">Due: {dueTime}</p>
        </div>
        <span className={`text-sm font-medium ${priorityText}`}>{priority.toUpperCase()}</span>
      </div>
    </div>
  );
}
