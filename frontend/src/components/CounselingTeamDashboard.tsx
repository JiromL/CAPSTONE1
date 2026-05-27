'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { Users, Calendar, ArrowRightLeft, FileText, ChevronRight, Loader2, Layers, MessageSquare } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

function KpiCard({ label, value, sub, iconBg, icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
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
          <span className="text-xs font-bold bg-green-600 text-white rounded-full min-w-5 h-5 flex items-center justify-center px-1">{badge}</span>
        )}
        <ChevronRight size={13} className="text-gray-400 group-hover:text-green-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

export function CounselingTeamDashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    (async () => {
      try {
        const r = await fetch(api('/api/appointments/dashboard/role-view'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          setSummary(d.summary || {});
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Team Member';
  const roleLabel = user.role?.toUpperCase() === 'CSC' ? 'CSC' : 'CSP';

  return (
    <DashboardLayout user={user} onLogout={onLogout} menuItems={menuItems} title="Dashboard" subtitle="Counseling support overview" activeSection="dashboard">

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {firstName}.</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{roleLabel} — Client case support and coordination.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Active Cases"       value={summary?.total_cases ?? 0}        sub="with appointments" iconBg="bg-green-50 dark:bg-green-900/30" icon={<Layers size={16} className="text-green-600 dark:text-green-400"/>} />
            <KpiCard label="Total Appointments" value={summary?.total_appointments ?? 0} sub="all records"       iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Calendar size={16} className="text-blue-600 dark:text-blue-400"/>} />
            <KpiCard label="Referrals"          value={0}                                sub="view referrals"    iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<ArrowRightLeft size={16} className="text-teal-600 dark:text-teal-400"/>} />
            <KpiCard label="C2C Referrals"      value={0}                                sub="peer referrals"    iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<MessageSquare size={16} className="text-purple-600 dark:text-purple-400"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="space-y-2">
                <ActionCard href="/cases"                label="Cases"               desc="View all active cases"          iconBg="bg-green-50 dark:bg-green-900/30" icon={<FileText size={14} className="text-green-600"/>} />
                <ActionCard href="/counseling-cases"     label="Counseling Cases"    desc="Cases under your team"          iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Users size={14} className="text-blue-600"/>} />
                <ActionCard href="/appointments"         label="Appointments"        desc="Scheduled sessions"             iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<Calendar size={14} className="text-teal-600"/>} />
                <ActionCard href="/check-ins"            label="Check-Ins"           desc="Monitor client wellness"        iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={14} className="text-green-600"/>} />
                <ActionCard href="/referrals"            label="Referrals"           desc="Manage referral requests"       iconBg="bg-orange-50 dark:bg-orange-900/30" icon={<ArrowRightLeft size={14} className="text-orange-600"/>} />
                <ActionCard href="/c2c-referrals"        label="C2C Referrals"       desc="Peer-to-peer referrals"         iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<MessageSquare size={14} className="text-purple-600"/>} />
              </div>
            </div>

            {/* Supervision & Tools */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Clinical Tools</p>
              <div className="space-y-2">
                <ActionCard href="/supervision"          label="Supervision"         desc="Case supervision sessions"      iconBg="bg-green-50 dark:bg-green-900/30" icon={<Users size={14} className="text-green-600"/>} />
                <ActionCard href="/recurring-appointments" label="Recurring Sessions" desc="Manage recurring appointments" iconBg="bg-blue-50 dark:bg-blue-900/30"   icon={<Calendar size={14} className="text-blue-600"/>} />
                <ActionCard href="/assessments"          label="Assessments"         desc="Review client assessments"      iconBg="bg-teal-50 dark:bg-teal-900/30"   icon={<FileText size={14} className="text-teal-600"/>} />
                <ActionCard href="/mhbot"                label="MHBot / PERMA"       desc="Mental health tracking"         iconBg="bg-purple-50 dark:bg-purple-900/30" icon={<MessageSquare size={14} className="text-purple-600"/>} />
                <ActionCard href="/video-links"          label="Video Links"         desc="Online session links"           iconBg="bg-green-50 dark:bg-green-900/30" icon={<Calendar size={14} className="text-green-600"/>} />
                <ActionCard href="/documentation"        label="Documentation"       desc="Forms and guidelines"           iconBg="bg-gray-100 dark:bg-gray-800"     icon={<FileText size={14} className="text-gray-600"/>} />
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
