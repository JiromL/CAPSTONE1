'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Calendar, FileText, CheckCircle, AlertCircle, BookOpen, Heart, MessageCircle, Users, Brain, Shield, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole, getActiveSectionFromPath } from '@/utils/navigation';
import { canAccessPage } from '@/utils/roleAccess';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredRoles?: string[];
}

export function DashboardPageWrapper({ children, title, subtitle, requiredRoles }: DashboardPageWrapperProps) {
  const [user, setUser] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Check role-based access
    if (!canAccessPage(pathname, parsedUser.role)) {
      setAccessDenied(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return;
    }

    setUser(parsedUser);
  }, [pathname, router]);

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
    return getMenuItemsByRole(role);
  };

  // Determine active section from pathname
  const getActiveSection = (pathname: string) => {
    return getActiveSectionFromPath(pathname);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <AlertCircle size={64} className="mx-auto mb-4 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to dashboard...</p>
        </div>
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
      subtitle={subtitle}
      activeSection={activeSection}
    >
      {children}
    </DashboardLayout>
  );
}
