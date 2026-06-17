'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';

const PERMA_BARS: { label: string; color: string }[] = [
  { label: 'Excelling',  color: 'bg-green-500'  },
  { label: 'Thriving',   color: 'bg-teal-500'   },
  { label: 'Surviving',  color: 'bg-yellow-500' },
  { label: 'Struggling', color: 'bg-orange-500' },
  { label: 'In Crisis',  color: 'bg-red-500'    },
];

function PermaDistributionWidget() {
  const [data, setData] = useState<{ total_students_tracked: number; distribution: Record<string, number> } | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(api('/api/mhbot/stats/perma-distribution'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { setNotConnected(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setNotConnected(true));
  }, []);

  const dist = data?.distribution ?? {};
  const total = data?.total_students_tracked ?? 0;
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Student Wellbeing Overview</p>
        {total > 0 && <span className="text-xs text-gray-400">{total} tracked</span>}
      </div>
      {notConnected || (!data && !notConnected) ? (
        <p className="text-xs text-gray-400 text-center py-8">
          {notConnected ? 'Connect MHBot to see wellbeing data.' : 'Loading…'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {PERMA_BARS.map(({ label, color }) => {
            const count = dist[label] ?? 0;
            if (count === 0 && dist['No Data'] === total) return null;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${color} transition-all`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DashboardProps { user: any; onLogout: () => void; }

export function AdminDashboard({ user, onLogout }: DashboardProps) {
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
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Admin';

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const highRisk = summary?.high_risk_cases ?? 0;

  const SYSTEM_LINKS = [
    { href: '/admin/users',          label: 'User Management' },
    { href: '/admin/audit-log',      label: 'Audit Logs' },
    { href: '/admin/reports/export', label: 'Data Export' },
    { href: '/admin/analytics',      label: 'Analytics' },
    { href: '/admin/settings',       label: 'System Settings' },
    { href: '/announcements',        label: 'Announcements' },
  ];

  const CLINICAL_LINKS = [
    { href: '/cases',                label: 'All Cases' },
    { href: '/high-risk',            label: 'High-Risk Cases' },
    { href: '/appointment-requests', label: 'Appointment Requests' },
    { href: '/counseling-cases',     label: 'Counseling Cases' },
    { href: '/documentation',        label: 'Documentation' },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Admin Dashboard" subtitle="" activeSection="dashboard">

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

          {/* High-risk alert banner */}
          {highRisk > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <span className="text-red-800">
                <strong>{highRisk}</strong> high-risk case{highRisk !== 1 ? 's' : ''} require attention.
              </span>
              <Link href="/high-risk" className="ml-auto text-xs font-semibold text-red-700 underline underline-offset-2">Review</Link>
            </div>
          )}

          {/* PERMA wellbeing overview */}
          <PermaDistributionWidget />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* System overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">System Overview</p>
              <div className="space-y-3">
                {[
                  { label: 'Total active cases',    value: summary?.active_cases ?? '—', color: 'text-gray-900' },
                  { label: 'High-risk (RED+)',       value: highRisk,                    color: highRisk > 0 ? 'text-red-600' : 'text-gray-900' },
                  { label: 'Appointments this week', value: summary?.week_appointments ?? '—', color: 'text-gray-900' },
                  { label: 'Counselors on staff',   value: summary?.total_counselors ?? '—', color: 'text-gray-900' },
                  { label: 'Psychologists on staff', value: summary?.total_psychologists ?? '—', color: 'text-gray-900' },
                  { label: 'Total students served',  value: summary?.total_students ?? '—', color: 'text-gray-900' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`text-sm font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick access split */}
            <div className="space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">System</p>
                <div className="divide-y divide-gray-100">
                  {SYSTEM_LINKS.map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                      <span>{label}</span>
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Clinical</p>
                <div className="divide-y divide-gray-100">
                  {CLINICAL_LINKS.map(({ href, label }) => (
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
