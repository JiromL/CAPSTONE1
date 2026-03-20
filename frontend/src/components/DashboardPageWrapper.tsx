'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, FileText, CheckCircle, AlertCircle, BookOpen, Heart, MessageCircle, Users, Brain, Shield, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole, getActiveSectionFromPath } from '@/utils/navigation';

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
    return getMenuItemsByRole(role);
  };

  // Determine active section from pathname
  const getActiveSection = (pathname: string) => {
    return getActiveSectionFromPath(pathname);
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
