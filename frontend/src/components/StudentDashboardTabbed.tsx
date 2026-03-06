'use client';

import Link from 'next/link';
import { FileText, CheckCircle, MessageCircle, AlertCircle, BookOpen } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function StudentDashboardTabbed({ user, onLogout }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'appointments' | 'assessments' | 'referrals' | 'intake' | 'resources' | 'profile'>('overview');
  
  const menuItems = [
    { label: 'Overview', id: 'overview' as const, icon: <BookOpen size={20} /> },
    { label: 'Appointments', id: 'appointments' as const, icon: <AlertCircle size={20} />, badge: 1 },
    { label: 'Assessments', id: 'assessments' as const, icon: <CheckCircle size={20} /> },
    { label: 'Referrals', id: 'referrals' as const, icon: <MessageCircle size={20} /> },
    { label: 'Intake Form', id: 'intake' as const, icon: <FileText size={20} /> },
    { label: 'Resources', id: 'resources' as const, icon: <BookOpen size={20} /> },
    { label: 'Profile', id: 'profile' as const, icon: <AlertCircle size={20} /> },
  ];

  const handleMenuClick = (sectionId: string) => {
    setActiveSection(sectionId as typeof activeSection);
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      activeSection={activeSection}
      onMenuClick={handleMenuClick}
      title={getTitleForSection(activeSection)}
      subtitle="Campus Counseling Services"
    >
      {/* Render different content based on active section */}
      {activeSection === 'overview' && <OverviewSection user={user} />}
      {activeSection === 'appointments' && <AppointmentsSection />}
      {activeSection === 'assessments' && <AssessmentsSection />}
      {activeSection === 'referrals' && <ReferralsSection />}
      {activeSection === 'intake' && <IntakeSection />}
      {activeSection === 'resources' && <ResourcesSection />}
      {activeSection === 'profile' && <ProfileSection user={user} />}
    </DashboardLayout>
  );
}

function getTitleForSection(section: string): string {
  const titles: Record<string, string> = {
    overview: 'Student Dashboard',
    appointments: 'Your Appointments',
    assessments: 'Assessments',
    referrals: 'Referrals',
    intake: 'Intake Form',
    resources: 'Wellness Resources',
    profile: 'My Profile',
  };
  return titles[section] || 'Dashboard';
}

function OverviewSection({ user }: { user: any }) {
  return (
    <div>
      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2 text-gray-900">
          Welcome, {user?.name || 'Student'}!
        </h2>
        <p className="text-sm text-gray-700">
          We're here to support your mental health and wellbeing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Upcoming Appointments" value="1" />
        <StatCard label="Wellness Score" value="Good" />
        <StatCard label="Last Session" value="Feb 25" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Next Appointment</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <p className="text-gray-900 font-bold text-sm">March 15, 2026 at 2:00 PM</p>
            <p className="text-gray-700 text-xs mt-1">Counselor: Dr. Sarah Lee</p>
            <p className="text-gray-600 text-xs mt-2">Location: Room 205-B</p>
          </div>
          <button className="mt-4 w-full py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm">
            Schedule Another Appointment
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
              <span className="text-gray-900 font-medium text-xs">Complete Intake Form</span>
              <span className="text-gray-400">→</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
              <span className="text-gray-900 font-medium text-xs">Take Wellness Assessment</span>
              <span className="text-gray-400">→</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
              <span className="text-gray-900 font-medium text-xs">Access Resources</span>
              <span className="text-gray-400">→</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
              <span className="text-gray-900 font-medium text-xs">Contact Counselor</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Wellness Tip</h2>
          <p className="text-gray-700 text-xs leading-relaxed">
            Take regular breaks during study sessions. Studies show that 5-minute breaks every 25 minutes can improve focus and reduce stress.
          </p>
          <p className="text-gray-700 text-xs mt-3 font-medium cursor-pointer hover:underline">
            View More Tips →
          </p>
        </div>

        <div className="border border-red-300 rounded-lg p-6">
          <h2 className="text-base font-bold text-red-900 mb-2">In Crisis?</h2>
          <p className="text-red-800 text-xs mb-4">
            If you're in immediate danger, please contact campus security or the National Crisis Hotline.
          </p>
          <div className="space-y-2">
            <p className="text-red-900 font-bold text-xs">Campus Security: Ext. 911</p>
            <p className="text-red-900 font-bold text-xs">Crisis Hotline: 988</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Your Progress</h2>
        <div className="space-y-3">
          <ProgressItem label="Intake Form Completion" percentage={100} />
          <ProgressItem label="Assessment Completion" percentage={50} />
          <ProgressItem label="Treatment Goals" percentage={75} />
        </div>
      </div>
    </div>
  );
}

function AppointmentsSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-3">
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-gray-900 font-bold text-sm">Initial Consultation</p>
          <p className="text-gray-700 text-xs mt-1">Dr. Sarah Johnson</p>
          <p className="text-gray-600 text-xs">Jan 25, 2024 at 10:00 AM</p>
          <p className="text-gray-600 text-xs">Room 206</p>
        </div>
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-gray-900 font-bold text-sm">Follow-up Session</p>
          <p className="text-gray-700 text-xs mt-1">Dr. Michael Chen</p>
          <p className="text-gray-600 text-xs">Jan 29, 2024 at 2:30 PM</p>
          <p className="text-gray-600 text-xs">Room 312</p>
        </div>
      </div>
      <button className="mt-4 w-full py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm">
        Schedule New Appointment
      </button>
    </div>
  );
}

function AssessmentsSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-700 text-sm mb-4">Complete wellness assessments to help us better support you.</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-900 font-medium text-sm">Wellness Assessment</span>
          <span className="text-gray-600 text-sm">Not Started</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-900 font-medium text-sm">Stress Level Evaluation</span>
          <span className="text-gray-600 text-sm">Completed</span>
        </div>
      </div>
    </div>
  );
}

function ReferralsSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-700 text-sm mb-4">View and manage your referrals to other services.</p>
      <div className="text-gray-600 text-sm p-4 bg-gray-50 rounded-lg">
        No active referrals at this time.
      </div>
    </div>
  );
}

function IntakeSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-700 text-sm mb-4">Complete your intake form to help us understand your needs.</p>
      <button className="w-full py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm">
        Start Intake Form
      </button>
    </div>
  );
}

function ResourcesSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-3">
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-gray-900 font-bold text-sm">Stress Management Guide</p>
          <p className="text-gray-600 text-xs mt-1">Learn evidence-based techniques</p>
        </div>
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-gray-900 font-bold text-sm">Sleep Hygiene Tips</p>
          <p className="text-gray-600 text-xs mt-1">Improve your sleep quality</p>
        </div>
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-gray-900 font-bold text-sm">Crisis Resources</p>
          <p className="text-gray-600 text-xs mt-1">24/7 support available</p>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }: { user: any }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-4">
        <div>
          <p className="text-gray-600 text-xs">Email</p>
          <p className="text-gray-900 font-medium text-sm">{user?.email || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Name</p>
          <p className="text-gray-900 font-medium text-sm">{user?.name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Role</p>
          <p className="text-gray-900 font-medium text-sm">Student</p>
        </div>
      </div>
      <button className="mt-6 w-full py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm">
        Edit Profile
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold mt-2 text-gray-900">{value}</p>
    </div>
  );
}

function ProgressItem({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900 text-xs">{label}</p>
        <p className="text-xs text-gray-600">{percentage}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gray-800 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
