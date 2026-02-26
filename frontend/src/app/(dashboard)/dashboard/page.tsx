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

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'DPO':
      return <DPODashboard user={user} onLogout={handleLogout} />;
    case 'PSYCHOLOGIST':
      return <PsychologistDashboard user={user} onLogout={handleLogout} />;
    case 'CASE_MANAGER':
      return <CaseManagerDashboard user={user} onLogout={handleLogout} />;
    case 'CSC':
    case 'CSP':
      return <CounselingTeamDashboard user={user} onLogout={handleLogout} />;
    case 'IC':
      return <IntakeCounselorDashboard user={user} onLogout={handleLogout} />;
    case 'COUNSELOR':
      return <CounselorDashboard user={user} onLogout={handleLogout} />;
    case 'STAFF':
      return <SupportStaffDashboard user={user} onLogout={handleLogout} />;
    case 'STUDENT':
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    default:
      return <StudentDashboard user={user} onLogout={handleLogout} />;
  }
}
