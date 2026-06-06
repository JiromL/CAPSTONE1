'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';

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

  const menuItems     = getMenuItemsByRole(user.role);
  const firstName     = user.first_name || user.name?.split(' ')[0] || 'DPO';
  const highRisk      = summary?.high_risk_cases ?? 0;
  const clinicalStaff = (summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="" activeSection="dashboard">

      <div className="mb-6 pb-5 border-b border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">{dateLabel}</p>
        <h2 className="text-xl font-semibold text-gray-900">Good day, {firstName}.</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">

          {highRisk > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <span className="text-red-800">
                <strong>{highRisk}</strong> high-risk case{highRisk !== 1 ? 's' : ''} active.
              </span>
              <Link href="/high-risk" className="ml-auto text-xs font-semibold text-red-700 underline underline-offset-2">Review</Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* System snapshot */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">System Snapshot</p>
              <div className="space-y-1">
                {[
                  { label: 'Active cases',           value: summary?.active_cases ?? '—',        color: 'text-gray-900' },
                  { label: 'High-risk (RED/CRITICAL)',value: highRisk,                            color: highRisk > 0 ? 'text-red-600' : 'text-gray-900' },
                  { label: 'Appointments this week',  value: summary?.week_appointments ?? '—',   color: 'text-gray-900' },
                  { label: 'Total counselors',        value: summary?.total_counselors ?? '—',    color: 'text-gray-900' },
                  { label: 'Total psychologists',     value: summary?.total_psychologists ?? '—', color: 'text-gray-900' },
                  { label: 'Clinical staff total',    value: clinicalStaff || '—',                color: 'text-gray-900' },
                  { label: 'Students served',         value: summary?.total_students ?? '—',      color: 'text-gray-900' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`text-sm font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {/* Data governance */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Data Governance</p>
                <div className="divide-y divide-gray-100">
                  {[
                    { href: '/admin/audit-log',      label: 'Audit Logs' },
                    { href: '/admin/users',           label: 'User Management' },
                    { href: '/admin/reports/export',  label: 'Data Export' },
                    { href: '/documentation',         label: 'Documentation' },
                    { href: '/announcements',         label: 'Announcements' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                      <span>{label}</span>
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Clinical oversight */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Clinical Oversight</p>
                <div className="divide-y divide-gray-100">
                  {[
                    { href: '/high-risk',            label: 'High-Risk Cases' },
                    { href: '/cases',                label: 'All Cases' },
                    { href: '/admin/analytics',      label: 'Analytics Dashboard' },
                    { href: '/appointment-requests', label: 'Appointments' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                      <span>{label}</span>
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
