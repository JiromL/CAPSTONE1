'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ArrowRight } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

export function CaseManagerDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Manager';
  const todayStr  = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {/* Stat strip */}
      <div className="flex items-center gap-8 flex-wrap mb-6">
        <div>
          <p className="text-2xl font-bold text-gray-900">32</p>
          <p className="text-xs text-gray-500 mt-0.5">Active cases</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-orange-500">7</p>
          <p className="text-xs text-gray-500 mt-0.5">Follow-ups due</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-red-500">4</p>
          <p className="text-xs text-gray-500 mt-0.5">High-risk</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <p className="text-2xl font-bold text-gray-900">18</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed (month)</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Pages</p>
        <div className="divide-y divide-gray-100">
          {[
            { href: '/cases',         label: 'View Cases' },
            { href: '/high-risk',     label: 'High-Risk Clients' },
            { href: '/tasks',         label: 'My Tasks' },
            { href: '/documentation', label: 'Documentation' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
              <span>{label}</span>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
