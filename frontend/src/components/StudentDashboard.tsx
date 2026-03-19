'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';
import { fetchDashboardData, formatDate } from '@/utils/dashboard-api';
import { api } from '@/utils/api';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

interface ResourceResponse {
  resources_count: number;
  resources?: any[];
}

export function StudentDashboard({ user, onLogout }: DashboardProps) {
  const [counselingId, setCounselingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceCount, setResourceCount] = useState(0);
  const [isCheckInOnly, setIsCheckInOnly] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load counseling ID from localStorage
        const savedId = localStorage.getItem('counseling_id');
        if (savedId) {
          setCounselingId(savedId);
        }

        // Fetch dashboard data if token is available
        const token = localStorage.getItem('token');
        if (token) {
          const data = await fetchDashboardData(token);
          setDashboardData(data);

          // Fetch resource count
          try {
            const resourceResponse = await fetch(api('/api/resources/student'), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resourceResponse.ok) {
              const resourceData: ResourceResponse = await resourceResponse.json();
              setResourceCount(resourceData.resources_count || 0);
            }
          } catch (err) {
            console.error('Failed to fetch resource count:', err);
          }

          // Check if student is check-in only
          try {
            const caseResponse = await fetch(api('/api/cases/my-current'), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (caseResponse.ok) {
              const caseData = await caseResponse.json();
              const clientStatus = caseData.client_status;
              // Show check-in menu for check-in only statuses
              if (['CHECK_IN_ONLY', 'WITH_MH_CHECK_IN', 'UNDER_ACCOMMODATION'].includes(clientStatus)) {
                setIsCheckInOnly(true);
              }
            }
          } catch (err) {
            console.error('Failed to fetch case status:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Build menu items conditionally
  const baseMenuItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Tasks', href: '/dashboard/tasks', badge: dashboardData?.recent_cases?.length || 0 },
    { label: 'Intake Form', href: '/intake' },
    { label: 'Appointments', href: '/appointments' },
    ...(isCheckInOnly ? [{ label: 'Check-In', href: '/check-ins-student' }] : []),
    { label: 'Resources', href: '/resources', badge: resourceCount },
    { label: 'Profile', href: '/profile' },
  ];

  const menuItems = baseMenuItems;

  // Get first appointment from dashboard data if available
  const nextAppointment = dashboardData?.recent_cases?.[0];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Student Dashboard"
      subtitle="Manage your wellness"
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mb-4 border border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700 rounded p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Next Appointment & Crisis Support & Calendar */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Next Appointment */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Next Appointment</h2>
            <div className="space-y-1">
              {nextAppointment ? (
                <>
                  <p className="text-gray-900 dark:text-gray-50 font-medium text-xs">
                    {formatDate(nextAppointment.appointment_date)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{nextAppointment.counselor_name || 'Assigned Counselor'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Status: {nextAppointment.status || 'Scheduled'}</p>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-xs">No appointments scheduled yet</p>
              )}
              <Link href="/intake">
                <button className="mt-2 px-3 py-1.5 border border-gray-300 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-medium">
                  Schedule Appointment
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
            appointments={
              dashboardData?.recent_cases?.map((apt: any) => ({
                date: new Date(apt.appointment_date),
                title: 'Counseling Session',
                time: apt.status || 'Scheduled',
              })) || []
            }
          />
        </div>
      )}
    </DashboardLayout>
  );
}

