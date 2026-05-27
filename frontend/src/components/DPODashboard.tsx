'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Users, AlertTriangle, BarChart2, FileText, ChevronRight, Loader2, Shield, Calendar, ClipboardList } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

function KpiCard({ label, value, sub, iconBg, icon, accent }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${accent || 'text-gray-900 dark:text-white'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, label, desc, iconBg, icon, badge }: any) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer group">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {desc && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>}
        </div>
        {badge != null && badge > 0 && (
          <span className="text-xs font-bold bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1">{badge}</span>
        )}
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

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

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Data protection & oversight" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Data protection and system oversight summary.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Active Cases"       value={summary?.active_cases ?? 0}                sub="currently open"     iconBg="bg-green-50 dark:bg-green-900/30" icon={<ClipboardList size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="High-Risk Cases"    value={summary?.high_risk_cases ?? 0}             sub="RED / CRITICAL"     iconBg="bg-red-50 dark:bg-red-900/30"    icon={<AlertTriangle size={16} className="text-red-600 dark:text-red-400"/>} accent="text-red-600 dark:text-red-400" />
            <KpiCard label="Clinical Staff"     value={(summary?.total_counselors ?? 0) + (summary?.total_psychologists ?? 0)} sub={`${summary?.total_counselors ?? 0}C · ${summary?.total_psychologists ?? 0}P`} iconBg="bg-blue-50 dark:bg-blue-900/30" icon={<Users size={16} className="text-blue-600 dark:text-blue-400"/>} />
            <KpiCard label="Appts This Week"    value={summary?.week_appointments ?? 0}           sub="completed sessions" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={16} className="text-green-600 dark:text-green-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Governance */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Data Governance</p>
              <div className="space-y-2">
                <ActionCard href="/admin/audit-log"          label="Audit Logs"          desc="Access and activity logs"         iconBg="bg-green-50 dark:bg-green-900/30"  icon={<Shield size={14} className="text-green-600"/>} />
                <ActionCard href="/admin/users"              label="User Management"     desc="Accounts and access control"      iconBg="bg-blue-50 dark:bg-blue-900/30"      icon={<Users size={14} className="text-blue-600"/>} />
                <ActionCard href="/admin/reports/export"     label="Data Export"         desc="Export reports and records"       iconBg="bg-teal-50 dark:bg-teal-900/30"      icon={<FileText size={14} className="text-teal-600"/>} />
                <ActionCard href="/documentation"            label="Documentation"       desc="Policies and compliance docs"     iconBg="bg-gray-100 dark:bg-gray-800"        icon={<FileText size={14} className="text-gray-600"/>} />
              </div>
            </div>

            {/* Clinical Oversight */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Clinical Oversight</p>
              <div className="space-y-2">
                <ActionCard href="/high-risk"                label="High-Risk Cases"     desc="Monitor critical clients"         iconBg="bg-red-50 dark:bg-red-900/30"        icon={<AlertTriangle size={14} className="text-red-600"/>} badge={summary?.high_risk_cases} />
                <ActionCard href="/cases"                    label="All Cases"           desc="Caseload overview"                iconBg="bg-green-50 dark:bg-green-900/30"  icon={<ClipboardList size={14} className="text-green-600"/>} />
                <ActionCard href="/admin/analytics"          label="Analytics Dashboard" desc="System-wide metrics"             iconBg="bg-purple-50 dark:bg-purple-900/30"  icon={<BarChart2 size={14} className="text-purple-600"/>} />
                <ActionCard href="/appointment-requests"     label="Appointments"        desc="Recent appointment activity"     iconBg="bg-green-50 dark:bg-green-900/30"    icon={<Calendar size={14} className="text-green-600"/>} />
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
