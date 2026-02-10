import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface MenuItem {
  label: string;
  href: string;
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
}

export function DashboardLayout({
  user,
  onLogout,
  menuItems,
  children,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen && 'hidden'}`}>
              <div className="text-xl font-bold text-green-700">CPS</div>
              <p className="text-xs text-gray-600">Counseling Services</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 transition cursor-pointer border-l-4 border-transparent hover:border-green-700">
                <div className="text-gray-500 flex-shrink-0">{item.icon}</div>
                <span className={`font-medium text-sm flex-1 ${!sidebarOpen && 'hidden'}`}>
                  {item.label}
                </span>
                {item.badge && sidebarOpen && (
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition"
          >
            <LogOut size={20} />
            <span className={sidebarOpen ? 'block' : 'hidden'}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-gray-900 font-medium">{user?.name || user?.email}</p>
              <p className="text-gray-600 text-sm">
                {user?.role === 'STUDENT' 
                  ? `ID: ${user?.id || 'N/A'}` 
                  : user?.role?.replace('_', ' ') || 'User'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

