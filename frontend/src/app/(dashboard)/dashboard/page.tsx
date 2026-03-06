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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    console.log('Dashboard loaded. Token:', token ? 'exists' : 'missing');
    console.log('Dashboard loaded. User data:', userData ? 'exists' : 'missing');

    if (!userData || !token) {
      console.log('No token or user data, redirecting to login');
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    console.log('Parsed user:', parsedUser);
    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
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
      return <StudentDashboard user={user} onLogout={handleLogout} />;
  }
}
