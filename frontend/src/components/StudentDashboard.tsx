import Link from 'next/link';
import { BookOpen, CheckCircle, AlertCircle, FileText, Heart } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [counselingId, setCounselingId] = useState<string | null>(null);

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
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Welcome, {user?.name || 'Student'}!
        </h2>
      </div>

      {/* Counseling ID - if available */}
      {counselingId && (
        <div className="mb-6 border border-green-300 rounded-lg p-6 bg-green-50">
          <p className="text-sm text-green-700 font-medium mb-2">Your Counseling ID</p>
          <p className="text-3xl font-bold text-green-900 font-mono tracking-wider">{counselingId}</p>
          <p className="text-xs text-green-700 mt-2">Use this ID for all counseling communications</p>
        </div>
      )}

      {/* Next Appointment & Crisis Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Next Appointment</h2>
          <div className="space-y-2">
            <p className="text-gray-900 font-medium text-sm">March 15, 2026 at 2:00 PM</p>
            <p className="text-gray-600 text-xs">Dr. Sarah Lee • Room 205-B</p>
            <Link href="/reservations">
              <button className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                Schedule Another
              </button>
            </Link>
          </div>
        </div>

        {/* Crisis Support */}
        <div className="border border-red-300 rounded-lg p-6 bg-red-50">
          <h2 className="text-base font-bold text-red-900 mb-2">In Crisis?</h2>
          <p className="text-red-800 text-xs mb-4">
            Call 988 (National Crisis Hotline) or Campus Security (Ext. 911)
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

