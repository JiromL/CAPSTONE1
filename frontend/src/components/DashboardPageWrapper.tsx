'use client';

import { useEffect, useState } from 'react';
import { Calendar, FileText, CheckCircle, AlertCircle, BookOpen, Heart, MessageCircle, Users, Brain, Shield, TrendingUp } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardPageWrapper({ children, title, subtitle }: DashboardPageWrapperProps) {
  const [user, setUser] = useState<any>(null);

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
    localStorage.clear();
    window.location.href = '/login';
  };

  // Get menu items based on user role
  const getMenuItems = (role: string) => {
    const baseItems = [
      { label: 'Dashboard', href: '/dashboard/dashboard', icon: <BookOpen size={20} /> },
    ];

    switch(role) {
      case 'STUDENT':
        return [
          ...baseItems,
          { label: 'My Tasks', href: '/dashboard/tasks', icon: <CheckCircle size={20} />, badge: 3 },
          { label: 'Intake Form', href: '/intake', icon: <FileText size={20} /> },
          { label: 'Wellness Resources', href: '/resources', icon: <Heart size={20} /> },
          { label: 'My Profile', href: '/dashboard/profile', icon: <AlertCircle size={20} /> },
        ];
      case 'ADMIN':
        return [
          ...baseItems,
          { label: 'Users', href: '/dashboard/admin/users', icon: <Users size={20} /> },
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'PSYCHOLOGIST':
        return [
          ...baseItems,
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Assessments', href: '/dashboard/assessments', icon: <Calendar size={20} />, badge: 7 },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'High-Risk', href: '/dashboard/high-risk', icon: <AlertCircle size={20} />, badge: 3 },
          { label: 'Referrals', href: '/dashboard/referrals', icon: <Users size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'COUNSELOR':
        return [
          ...baseItems,
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Appointments', href: '/dashboard/appointments', icon: <Calendar size={20} />, badge: 4 },
          { label: 'Referrals', href: '/dashboard/referrals', icon: <Users size={20} /> },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'IC':
        return [
          ...baseItems,
          { label: 'Assessments', href: '/dashboard/assessments', icon: <Calendar size={20} />, badge: 12 },
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Referrals', href: '/dashboard/referrals', icon: <Users size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'DPO':
        return [
          ...baseItems,
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'High-Risk', href: '/dashboard/high-risk', icon: <AlertCircle size={20} />, badge: 5 },
          { label: 'Reports', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Team', href: '/dashboard/referrals', icon: <Users size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'CSP':
      case 'CSC':
        return [
          ...baseItems,
          { label: 'Appointments', href: '/dashboard/appointments', icon: <Calendar size={20} />, badge: 6 },
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Tasks', href: '/dashboard/tasks', icon: <CheckCircle size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      case 'STAFF':
        return [
          ...baseItems,
          { label: 'Cases', href: '/dashboard/cases', icon: <FileText size={20} /> },
          { label: 'Appointments', href: '/dashboard/appointments', icon: <Calendar size={20} /> },
          { label: 'Documentation', href: '/dashboard/documentation', icon: <Shield size={20} /> },
          { label: 'Tasks', href: '/dashboard/tasks', icon: <CheckCircle size={20} /> },
          { label: 'Profile', href: '/dashboard/profile', icon: <TrendingUp size={20} /> },
        ];
      default:
        return [
          ...baseItems,
          { label: 'My Tasks', href: '/dashboard/tasks', icon: <CheckCircle size={20} />, badge: 3 },
          { label: 'Intake Form', href: '/intake', icon: <FileText size={20} /> },
          { label: 'Wellness Resources', href: '/resources', icon: <Heart size={20} /> },
          { label: 'My Profile', href: '/dashboard/profile', icon: <AlertCircle size={20} /> },
        ];
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const menuItems = getMenuItems(user.role);

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      menuItems={menuItems}
      title={title}
      subtitle={subtitle || 'Campus Counseling Services'}
    >
      {children}
    </DashboardLayout>
  );
}
