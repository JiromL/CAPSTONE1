'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle, AlertCircle, FileText, Heart } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [counselingId, setCounselingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // Load counseling ID from localStorage
    const savedId = localStorage.getItem('counseling_id');
    if (savedId) {
      setCounselingId(savedId);
    }
  }, []);

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BookOpen size={20} /> },
    { label: 'My Tasks', href: '/tasks', icon: <CheckCircle size={20} />, badge: 3 },
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
      {/* Welcome */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Welcome, {user?.name || 'Student'}!
        </h2>
      </div>

      {/* Counseling ID - if available */}
      {counselingId && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">Your Counseling ID</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-50 font-mono tracking-wider">{counselingId}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Use this ID for all counseling communications</p>
        </div>
      )}

      {/* Next Appointment & Crisis Support & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Appointment */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Next Appointment</h2>
          <div className="space-y-1">
            <p className="text-gray-900 dark:text-gray-50 font-medium text-xs">March 15, 2026 at 2:00 PM</p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">Dr. Sarah Lee • Room 205-B</p>
            <Link href="/intake">
              <button className="mt-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition text-xs font-medium">
                Schedule Another
              </button>
            </Link>
          </div>
        </div>

        {/* Crisis Support */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">In Crisis?</h2>
          <p className="text-gray-700 dark:text-gray-300 text-xs">
            Call 988 (National Crisis Hotline) or Campus Security (Ext. 911)
          </p>
        </div>

        {/* Calendar */}
        <DashboardCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          title="Appointment Schedule"
          showAppointments={true}
          appointments={[
            {
              date: new Date(2026, 2, 15),
              title: 'Counseling Session',
              time: '2:00 PM - 3:00 PM',
            },
            {
              date: new Date(2026, 2, 22),
              title: 'Follow-up Session',
              time: '10:00 AM - 11:00 AM',
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}

