'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Power, Menu, Bell, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getMenuIcon } from '@/utils/dashboard-icons';
import { api } from '@/utils/api';
import { EmaFloatingChat } from './EmaFloatingChat';

interface MenuItem {
  label: string;
  href?: string;
  id?: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  user: any;
  onLogout: () => void;
  menuItems: MenuItem[];
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeSection?: string;
  onMenuClick?: (id: string) => void;
}

const ROLE_LABEL: Record<string, string> = {
  IC: 'Intake Counselor',
  COUNSELOR: 'Counselor',
  PSYCHOLOGIST: 'Psychologist',
  CASE_MANAGER: 'Case Manager',
  STAFF: 'Office Assistant',
  ADMIN: 'Administrator',
  DPO: 'Data Privacy Officer',
  STUDENT: 'Student',
};

export function DashboardLayout({
  user,
  onLogout,
  menuItems,
  children,
  title,
  subtitle,
  activeSection,
  onMenuClick,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/reminders'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const reminders = d.reminders || d || [];
        const pending = Array.isArray(reminders)
          ? reminders.filter((r: any) => !r.is_read && !r.acknowledged).length
          : 0;
        setReminderCount(pending);
      })
      .catch(() => {});

    const now = new Date().toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    localStorage.setItem('last_login_display', now);
  }, []);

  const firstName  = user?.first_name || user?.name?.split(' ')[0] || 'User';
  const lastName   = user?.last_name  || '';
  const fullName   = `${firstName} ${lastName}`.trim();
  const initials   = firstName.charAt(0).toUpperCase() + (lastName.charAt(0) || '').toUpperCase();
  const roleLabel  = ROLE_LABEL[user?.role] ?? (user?.role || 'User');
  const idNumber   = user?.id_number || user?.student_id || '';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Image src="/dlsu-seal.svg" alt="DLSU" width={22} height={22} className="brightness-[10]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight tracking-tight">CPS Portal</p>
          <p className="text-[10px] text-gray-400 leading-tight font-medium">DLSU · Counseling</p>
        </div>
        <button onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gray-100 mb-3 flex-shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {menuItems.map((item, index) => {
          const isActive = (activeSection && item.id && activeSection === item.id)
            || (!activeSection && item.href && pathname === item.href);
          const icon = item.icon || (item.id ? getMenuIcon(item.id) : null);

          const content = (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
              isActive
                ? 'bg-[#2563eb] text-white font-semibold shadow-sm shadow-blue-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}>
              {icon && (
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {icon}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={`text-[10px] min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-[#2563eb] text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </div>
          );

          if (item.id && onMenuClick) {
            return (
              <button key={index} onClick={() => { onMenuClick(item.id!); setMobileOpen(false); }} className="w-full text-left">
                {content}
              </button>
            );
          }
          return (
            <Link key={index} href={item.href || '#'} className="block">
              {content}
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="mx-1 mb-3 h-px bg-gray-100" />

        {/* Profile card */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2 ring-blue-100">
            {initials || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{fullName}</p>
            <p className="text-[10px] text-gray-400 truncate leading-tight">{roleLabel}{idNumber ? ` · ${idNumber}` : ''}</p>
          </div>
        </div>

        <button onClick={onLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium">
          <Power size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen z-30 w-64
        bg-white border-r border-gray-100 shadow-sm
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">

        {/* Top header */}
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-6 bg-white/90 border-b border-gray-100 backdrop-blur-md">

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Menu size={19} />
          </button>

          {/* Page title */}
          <div className="hidden lg:block">
            <p className="text-base font-bold text-gray-900 tracking-tight">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 leading-none mt-0.5">{subtitle}</p>}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">

            {/* Notifications */}
            <Link href="/reminders"
              className="relative w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Bell size={17} />
              {reminderCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#2563eb] rounded-full ring-2 ring-white" />
              )}
            </Link>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2 ring-blue-100">
                {initials || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-7">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {user?.role === 'STUDENT' && <EmaFloatingChat />}
    </div>
  );
}
