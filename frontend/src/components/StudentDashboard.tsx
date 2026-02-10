import Link from 'next/link';
import { Calendar, FileText, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600 mt-1">Campus Counseling Services</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.email}</p>
              <p className="text-gray-600 text-sm">Student</p>
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
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Student'}!</h2>
          <p className="text-blue-100">We're here to support your mental health and wellbeing. Start by scheduling an appointment or completing your intake form.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ActionCard
            icon={Calendar}
            title="Book Appointment"
            description="Schedule a counseling session"
            href="/reservations"
            color="bg-blue-50 text-blue-600"
          />
          <ActionCard
            icon={FileText}
            title="My Information"
            description="Complete intake form"
            href="/intake"
            color="bg-green-50 text-green-600"
          />
          <ActionCard
            icon={CheckCircle}
            title="Assessments"
            description="Take a wellness assessment"
            href="/assessments"
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* My Appointments & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">My Appointments</h2>
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">1 Scheduled</span>
            </div>
            <div className="space-y-3">
              <AppointmentItem
                date="March 15, 2026"
                time="2:00 PM"
                counselor="Dr. Sarah Lee"
                status="confirmed"
              />
              <Link href="/reservations">
                <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Schedule Appointment
                </button>
              </Link>
            </div>
          </div>

          {/* Wellness Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Wellness Check</h2>
            <div className="space-y-3">
              <WellnessItem label="Overall Well-being" value="Good" color="text-green-600" />
              <WellnessItem label="Last Assessment" value="Feb 25, 2026" color="text-blue-600" />
              <WellnessItem label="Counselor" value="Dr. Sarah Lee" color="text-purple-600" />
            </div>
          </div>

          {/* My Resources */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Resources</h2>
            <div className="space-y-2">
              <StudentLink href="/resources/crisis-line" label="Crisis Support" badge="24/7" />
              <StudentLink href="/resources/wellness-tips" label="Wellness Tips" badge="" />
              <StudentLink href="/resources/faq" label="Frequently Asked Questions" badge="" />
              <StudentLink href="/resources/contact" label="Contact Us" badge="" />
            </div>
          </div>

          {/* My Profile */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Profile</h2>
            <div className="space-y-2">
              <StudentLink href="/profile/view" label="View Profile" badge="" />
              <StudentLink href="/profile/edit" label="Edit Information" badge="" />
              <StudentLink href="/profile/preferences" label="Preferences" badge="" />
              <StudentLink href="/profile/history" label="Medical History" badge="" />
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Emergency Support</h3>
              <p className="text-blue-800 text-sm mb-3">
                If you're experiencing a crisis or emergency, please contact campus security at ext. 911 or call the National Crisis Hotline at 988.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                Learn more about crisis support →
              </button>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
          <div className="space-y-4">
            <ProgressBar label="Intake Form Completion" percentage={100} />
            <ProgressBar label="Assessment Completion" percentage={50} />
            <ProgressBar label="Treatment Goals" percentage={75} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, href, color }: any) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
        <div className={`p-3 rounded-lg ${color} mb-4 w-fit`}>
          <Icon size={24} />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}

function AppointmentItem({ date, time, counselor, status }: any) {
  const statusColor = status === "confirmed" ? "text-green-600" : "text-yellow-600";
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">{date} at {time}</p>
          <p className="text-gray-600 text-sm">Counselor: {counselor}</p>
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>{status.toUpperCase()}</span>
      </div>
    </div>
  );
}

function WellnessItem({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function StudentLink({ href, label, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        {badge && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">{badge}</span>}
        {!badge && <span className="text-gray-400">→</span>}
      </div>
    </Link>
  );
}

function ProgressBar({ label, percentage }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{percentage}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
