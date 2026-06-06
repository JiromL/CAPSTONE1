'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

export function DPODashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const r = await fetch(api('/api/analytics/summary'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) setSummary(await r.json());
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'DPO';
  const todayStr  = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const clinicalStaff = (summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0);

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{todayStr}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat strip */}
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.active_cases ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active cases</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-red-500">{summary?.high_risk_cases ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">High-risk (RED/CRITICAL)</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{clinicalStaff}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Clinical staff ({summary?.total_counselors ?? 0}C · {summary?.total_psychologists ?? 0}P)
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.week_appointments ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Appts this week</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Data governance links */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Data Governance</p>
              <div className="divide-y divide-gray-100">
                {[
                  { href: '/admin/audit-log',      label: 'Audit Logs' },
                  { href: '/admin/users',           label: 'User Management' },
                  { href: '/admin/reports/export',  label: 'Data Export' },
                  { href: '/documentation',         label: 'Documentation' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                    <span>{label}</span>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Clinical oversight links */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Clinical Oversight</p>
              <div className="divide-y divide-gray-100">
                {[
                  { href: '/high-risk',          label: 'High-Risk Cases' },
                  { href: '/cases',              label: 'All Cases' },
                  { href: '/admin/analytics',    label: 'Analytics Dashboard' },
                  { href: '/appointment-requests', label: 'Appointments' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                    <span>{label}</span>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
