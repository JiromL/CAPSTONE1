'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DPODashboard } from '@/components/DPODashboard';
import { CounselorDashboard } from '@/components/CounselorDashboard';
import { PsychologistDashboard } from '@/components/PsychologistDashboard';
import { CounselingTeamDashboard } from '@/components/CounselingTeamDashboard';
import { IntakeCounselorDashboard } from '@/components/IntakeCounselorDashboard';
import { SupportStaffDashboard } from '@/components/SupportStaffDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // First effect: Only mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Second effect: Only check auth after hydration
  useEffect(() => {
    if (!mounted) return;

    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      // If no auth data, redirect to login
      if (!token || !userData) {
        setLoading(false);
        router.replace('/login');
        return;
      }

      // Parse and set user
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setLoading(false);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.clear();
      setLoading(false);
      router.replace('/login');
    }
  }, [mounted, router]);

  const handleLogout = () => {
    // Clear all caches before clearing localStorage
    localStorage.removeItem('appointments_cache');
    localStorage.removeItem('cases_cache');
    localStorage.removeItem('assessments_cache');
    localStorage.removeItem('dashboard_cache');
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Normalize role to uppercase for comparison
  const normalizedRole = user.role?.toUpperCase() || 'STUDENT';
  console.log('User role:', user.role, '| Normalized:', normalizedRole);

  switch (normalizedRole) {
    case 'ADMIN':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'DPO':
      return <DPODashboard user={user} onLogout={handleLogout} />;
    case 'COUNSELOR':
      return <CounselorDashboard user={user} onLogout={handleLogout} />;
    case 'PSYCHOLOGIST':
      return <PsychologistDashboard user={user} onLogout={handleLogout} />;
    case 'CSC':
    case 'CSP':
      return <CounselingTeamDashboard user={user} onLogout={handleLogout} />;
    case 'IC':
      return <IntakeCounselorDashboard user={user} onLogout={handleLogout} />;
    case 'STAFF':
      return <SupportStaffDashboard user={user} onLogout={handleLogout} />;
    case 'STUDENT':
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    default:
      console.warn('Unknown role:', normalizedRole, 'Defaulting to StudentDashboard');
      return <StudentDashboard user={user} onLogout={handleLogout} />;
  }
}
