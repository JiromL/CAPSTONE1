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
    // Standard menu items for all roles
    const standardItems = [
      { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
      { label: 'My Tasks', href: '/tasks', id: 'tasks' },
      { label: 'Intake Form', href: '/intake', id: 'intake' },
      { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
      { label: 'Wellness Resources', href: '/resources', id: 'resources' },
      { label: 'Profile', href: '/profile', id: 'profile' },
    ];

    return standardItems;
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
