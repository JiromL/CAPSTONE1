'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, FileText, CheckCircle, AlertCircle, BookOpen, Heart, MessageCircle, Users, Brain, Shield, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardPageWrapper({ children, title, subtitle }: DashboardPageWrapperProps) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('appointments_cache');
    localStorage.removeItem('cases_cache');
    localStorage.removeItem('assessments_cache');
    localStorage.removeItem('dashboard_cache');
    localStorage.clear();
    window.location.href = '/login';
  };

  // Get menu items based on user role
  const getMenuItems = (role: string) => {
    const baseItems = [
      { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    ];

    switch(role) {
      case 'STUDENT':
        return [
          ...baseItems,
          { label: 'My Tasks', href: '/tasks', id: 'tasks', badge: 3 },
          { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
          { label: 'Intake Form', href: '/intake', id: 'intake' },
          { label: 'Wellness Resources', href: '/resources', id: 'resources' },
          { label: 'My Profile', href: '/profile', id: 'profile' },
        ];
      case 'ADMIN':
        return [
          ...baseItems,
          { label: 'Users', href: '/admin/users', id: 'users' },
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'Documentation', href: '/documentation', id: 'documentation' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'PSYCHOLOGIST':
        return [
          ...baseItems,
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'Assessments', href: '/assessments', id: 'assessments', badge: 7 },
          { label: 'Documentation', href: '/documentation', id: 'documentation' },
          { label: 'High-Risk', href: '/high-risk', id: 'high-risk', badge: 3 },
          { label: 'Referrals', href: '/referrals', id: 'referrals' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'COUNSELOR':
        return [
          ...baseItems,
          { label: 'Appointments', href: '/appointments', id: 'appointments', badge: 4 },
          { label: 'Availability', href: '/availability', id: 'availability' },
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'Referrals', href: '/referrals', id: 'referrals' },
          { label: 'Documentation', href: '/documentation', id: 'documentation' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'IC':
        return [
          ...baseItems,
          { label: 'Assessments', href: '/assessments', id: 'assessments', badge: 12 },
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'Schedule Calendar', href: '/ic/schedule/calendar', id: 'schedule-calendar' },
          { label: 'Counselor Availability', href: '/ic/schedule/counselors', id: 'counselor-availability' },
          { label: 'Documentation', href: '/documentation', id: 'documentation' },
          { label: 'Referrals', href: '/referrals', id: 'referrals' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'DPO':
        return [
          ...baseItems,
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'High-Risk', href: '/high-risk', id: 'high-risk', badge: 5 },
          { label: 'Reports', href: '/documentation', id: 'reports' },
          { label: 'Team', href: '/referrals', id: 'team' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'CSP':
      case 'CSC':
        return [
          ...baseItems,
          { label: 'Appointments', href: '/appointments', id: 'appointments', badge: 6 },
          { label: 'Cases', href: '/cases', id: 'cases' },
          { label: 'Documentation', href: '/documentation', id: 'documentation' },
          { label: 'Tasks', href: '/tasks', id: 'tasks' },
          { label: 'Profile', href: '/profile', id: 'profile' },
        ];
      case 'STAFF':
        return [
          ...baseItems,
          { label: 'Batch Assignment', href: '/staff/batch-assign', id: 'batch-assign' },
          { label: 'Workload Report', href: '/staff/workload-report', id: 'workload-report' },
          { label: 'Counselor Availability', href: '/ic/schedule/counselors', id: 'counselor-availability' },
          { label: 'Reassignment Suggestions', href: '/staff/reassignment-suggestions', id: 'reassignment-suggestions' },
          { label: 'Appointments', href: '/staff/appointments', id: 'staff-appointments', badge: 12 },
          { label: 'Staff Settings', href: '/dashboard/staff-settings', id: 'staff-settings' },
        ];
      default:
        return [
          ...baseItems,
          { label: 'My Tasks', href: '/tasks', id: 'tasks', badge: 3 },
          { label: 'Intake Form', href: '/intake', id: 'intake' },
          { label: 'Wellness Resources', href: '/resources', id: 'resources' },
          { label: 'My Profile', href: '/profile', id: 'profile' },
        ];
    }
  };

  // Determine active section from pathname
  const getActiveSection = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'dashboard';
    
    const lastSegment = segments[segments.length - 1];
    
    // Map route segments to menu item IDs
    const routeMap: { [key: string]: string } = {
      'appointments': 'appointments',
      'availability': 'availability',
      'cases': 'cases',
      'assessments': 'assessments',
      'referrals': 'referrals',
      'documentation': 'documentation',
      'profile': 'profile',
      'tasks': 'tasks',
      'intake': 'intake',
      'resources': 'resources',
      'high-risk': 'high-risk',
      'users': 'users',
      'dashboard': 'dashboard',
    };
    
    return routeMap[lastSegment] || 'dashboard';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const menuItems = getMenuItems(user.role);
  const activeSection = getActiveSection(pathname);

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      menuItems={menuItems}
      title={title}
      subtitle={subtitle || 'Campus Counseling Services'}
      activeSection={activeSection}
    >
      {children}
    </DashboardLayout>
  );
}
