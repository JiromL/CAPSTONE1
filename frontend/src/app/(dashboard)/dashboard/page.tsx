'use client';

import { useEffect, useState } from 'react';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DPODashboard } from '@/components/DPODashboard';
import { PsychologistDashboard } from '@/components/PsychologistDashboard';
import { CaseManagerDashboard } from '@/components/CaseManagerDashboard';
import { CounselorDashboard } from '@/components/CounselorDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import { IntakeCounselorDashboard } from '@/components/IntakeCounselorDashboard';
import { SupportStaffDashboard } from '@/components/SupportStaffDashboard';
import { CounselingTeamDashboard } from '@/components/CounselingTeamDashboard';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const ConnectCalendarButton = (
    <Link href="/oauth/start">
      <button className="bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50">
        Connect Calendar
      </button>
    </Link>
  );

  switch (user.role) {
    case 'ADMIN':
      return (
        <PageShell title="Admin" actions={ConnectCalendarButton}>
          <AdminDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'DPO':
      return (
        <PageShell title="DPO" actions={ConnectCalendarButton}>
          <DPODashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'PSYCHOLOGIST':
      return (
        <PageShell title="Psychologist" actions={ConnectCalendarButton}>
          <PsychologistDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'CASE_MANAGER':
      return (
        <PageShell title="Case Manager" actions={ConnectCalendarButton}>
          <CaseManagerDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'CSC':
    case 'CSP':
      return (
        <PageShell title="Counseling Team" actions={ConnectCalendarButton}>
          <CounselingTeamDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'IC':
      return (
        <PageShell title="Intake" actions={ConnectCalendarButton}>
          <IntakeCounselorDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'COUNSELOR':
      return (
        <PageShell title="Counselor" actions={ConnectCalendarButton}>
          <CounselorDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'STAFF':
      return (
        <PageShell title="Staff" actions={ConnectCalendarButton}>
          <SupportStaffDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    case 'STUDENT':
      return (
        <PageShell title="Student" actions={ConnectCalendarButton}>
          <StudentDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
    default:
      return (
        <PageShell title="Dashboard" actions={ConnectCalendarButton}>
          <StudentDashboard user={user} onLogout={handleLogout} />
        </PageShell>
      );
  }
}
