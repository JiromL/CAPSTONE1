'use client';

import Link from 'next/link';
import { LogOut, Menu, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { getMenuIcon } from '@/utils/dashboard-icons';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) setSidebarOpen(JSON.parse(saved));
  }, []);

  const handleToggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem('sidebarOpen', JSON.stringify(next));
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-[70px]'} fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">CPS</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">CPS System</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Counseling Services</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={handleToggleSidebar} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed toggle */}
        {!sidebarOpen && (
          <button onClick={handleToggleSidebar} className="mx-auto mt-3 p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Menu size={16} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuItems.map((item, index) => {
            const isActive = activeSection && item.id && activeSection === item.id;
            const icon = item.icon || (item.id ? getMenuIcon(item.id) : null);

            const content = (
              <div
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                {icon && (
                  <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {icon}
                  </span>
                )}
                {sidebarOpen && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {sidebarOpen && item.badge && (
                  <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
            );

            if (item.id && onMenuClick) {
              return (
                <button key={index} onClick={() => onMenuClick(item.id!)} className="w-full text-left mb-0.5">
                  {content}
                </button>
              );
            }
            return (
              <Link key={index} href={item.href || '#'} className="block mb-0.5">
                {content}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-1">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || user?.email}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-[70px]'} transition-all duration-300 ease-in-out flex-1 flex flex-col min-h-screen`}>
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
