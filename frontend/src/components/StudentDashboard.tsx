import Link from 'next/link';
import { Calendar, FileText, CheckCircle, AlertCircle, BookOpen, Clock, Heart, MessageCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BookOpen size={20} /> },
    { label: 'Appointments', href: '/appointments', icon: <Calendar size={20} />, badge: 1 },
    { label: 'Assessments', href: '/assessments', icon: <CheckCircle size={20} /> },
    { label: 'Referrals', href: '/referrals', icon: <MessageCircle size={20} /> },
    { label: 'Intake Form', href: '/intake', icon: <FileText size={20} /> },
    { label: 'Wellness Resources', href: '/resources', icon: <Heart size={20} /> },
    { label: 'My Profile', href: '/profile', icon: <AlertCircle size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Student Dashboard"
      subtitle="Campus Counseling Services"
    >
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Welcome, {user?.name || 'Student'}!
        </h2>
        <p className="text-green-100">
          We're here to support your mental health and wellbeing.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Upcoming Appointments" value="1" color="bg-blue-50 text-blue-600" />
        <StatCard label="Wellness Score" value="Good" color="bg-green-50 text-green-600" />
        <StatCard label="Last Session" value="Feb 25" color="bg-purple-50 text-purple-600" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Next Appointment</h2>
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <p className="text-green-900 font-bold">March 15, 2026 at 2:00 PM</p>
            <p className="text-green-800 text-sm mt-1">Counselor: Dr. Sarah Lee</p>
            <p className="text-green-700 text-sm mt-2">Location: Room 205-B</p>
          </div>
          <Link href="/reservations">
            <button className="mt-4 w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Schedule Another Appointment
            </button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickActionLink href="/intake" label="Complete Intake Form" />
            <QuickActionLink href="/assessments" label="Take Wellness Assessment" />
            <QuickActionLink href="/resources" label="Access Resources" />
            <QuickActionLink href="/messages" label="Contact Counselor" />
          </div>
        </div>

        {/* Wellness Tips */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💡 Wellness Tip</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            Take regular breaks during study sessions. Studies show that 5-minute breaks every 25 minutes can improve focus and reduce stress.
          </p>
          <Link href="/resources/wellness-tips">
            <p className="text-green-600 text-sm mt-3 font-medium cursor-pointer hover:underline">
              View More Tips →
            </p>
          </Link>
        </div>

        {/* Crisis Support */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <h2 className="text-lg font-bold text-red-900 mb-2">🚨 In Crisis?</h2>
          <p className="text-red-800 text-sm mb-4">
            If you're in immediate danger, please contact campus security or the National Crisis Hotline.
          </p>
          <div className="space-y-2">
            <p className="text-red-900 font-bold text-sm">Campus Security: Ext. 911</p>
            <p className="text-red-900 font-bold text-sm">Crisis Hotline: 988</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Progress</h2>
        <div className="space-y-3">
          <ProgressItem label="Intake Form Completion" percentage={100} />
          <ProgressItem label="Assessment Completion" percentage={50} />
          <ProgressItem label="Treatment Goals" percentage={75} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function QuickActionLink({ href, label }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
        <span className="text-gray-900 font-medium text-sm">{label}</span>
        <span className="text-gray-400">→</span>
      </div>
    </Link>
  );
}

function ProgressItem({ label, percentage }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-sm text-gray-600">{percentage}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
