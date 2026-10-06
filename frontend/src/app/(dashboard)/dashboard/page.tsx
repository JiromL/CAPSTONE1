'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DPODashboard } from '@/components/DPODashboard';
import { CounselorDashboard } from '@/components/CounselorDashboard';
import { PsychologistDashboard } from '@/components/PsychologistDashboard';
import { IntakeCounselorDashboard } from '@/components/IntakeCounselorDashboard';
import { SupportStaffDashboard } from '@/components/SupportStaffDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import { CaseManagerDashboard } from '@/components/CaseManagerDashboard';
import { CpsLogoMark, CPS_LOGO_TILE } from '@/components/CpsLogo';

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
    ['token', 'user', 'appointments_cache', 'cases_cache', 'assessments_cache', 'dashboard_cache'].forEach(k => localStorage.removeItem(k));
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={CPS_LOGO_TILE}>
              <CpsLogoMark />
            </div>
            <svg className="absolute -inset-2 w-16 h-16 animate-spin" style={{ animationDuration: '1.4s' }} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="var(--color-primary)" strokeOpacity="0.15" strokeWidth="3" />
              <path d="M32 4 A28 28 0 0 1 60 32" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Normalize role to uppercase for comparison
  const normalizedRole = user.role?.toUpperCase() || 'STUDENT';

  switch (normalizedRole) {
    case 'ADMIN':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'DPO':
      return <DPODashboard user={user} onLogout={handleLogout} />;
    case 'COUNSELOR':
      return <CounselorDashboard user={user} onLogout={handleLogout} />;
    case 'PSYCHOLOGIST':
      return <PsychologistDashboard user={user} onLogout={handleLogout} />;
    case 'IC':
      return <IntakeCounselorDashboard user={user} onLogout={handleLogout} />;
    case 'CASE_MANAGER':
      return <CaseManagerDashboard user={user} onLogout={handleLogout} />;
    case 'STAFF':
      return <SupportStaffDashboard user={user} onLogout={handleLogout} />;
    case 'STUDENT':
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    default:
      return <StudentDashboard user={user} onLogout={handleLogout} />;
  }
}
