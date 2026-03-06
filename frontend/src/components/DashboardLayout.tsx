import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';

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
    // Load sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setSidebarOpen(JSON.parse(savedSidebarState));
    }
  }, []);

  const handleToggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans flex">
      {/* Fixed Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 h-screen transition-all duration-300 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen && 'hidden'}`}>
              <div className="text-xl font-bold text-green-700 dark:text-green-500">CPS</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Counseling Services</p>
            </div>
            <button
              onClick={handleToggleSidebar}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item, index) => {
            const isActive = activeSection && item.id && activeSection === item.id;
            const MenuItemContent = (
              <div className={`flex items-center gap-3 px-4 py-3 transition cursor-pointer border-l-4 ${
                isActive 
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-900 dark:border-gray-400 text-gray-900 dark:text-gray-50' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent hover:border-gray-700 dark:hover:border-gray-600'
              }`}>
                {sidebarOpen && (
                  <div className="text-gray-600 dark:text-gray-400 flex-shrink-0">{item.icon}</div>
                )}
                <span className={`font-medium text-sm flex-1 ${!sidebarOpen && 'hidden'}`}>
                  {item.label}
                </span>
                {item.badge && sidebarOpen && (
                  <span className="bg-gray-600 dark:bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            );

            // If using state-based navigation
            if (item.id && onMenuClick) {
              return (
                <button
                  key={index}
                  onClick={() => onMenuClick(item.id!)}
                  className="w-full text-left hover:no-underline"
                >
                  {MenuItemContent}
                </button>
              );
            }

            // Otherwise use href-based navigation
            return (
              <Link key={index} href={item.href || '#'}>
                {MenuItemContent}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium text-sm transition"
          >
            <LogOut size={20} />
            <span className={sidebarOpen ? 'block' : 'hidden'}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex-1 flex flex-col min-h-screen`}>
        {/* Top Header - Fixed */}
        <header className="sticky top-0 px-8 py-4 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
            {subtitle && <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-gray-900 dark:text-gray-50 font-medium text-sm">{user?.name || user?.email}</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">
                {user?.role === 'STUDENT' 
                  ? `ID: ${user?.id || 'N/A'}` 
                  : user?.role?.replace('_', ' ') || 'User'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

