'use client';

import Link from 'next/link';
import { DashboardLayout } from './DashboardLayout';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { getMenuItemsByRole } from '@/utils/navigation';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';

interface DashboardProps { user: any; onLogout: () => void; }

export function IntakeCounselorDashboard({ user, onLogout }: DashboardProps) {
  const [summary, setSummary]         = useState<any>(null);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);

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
          setPendingList((d.pending_requests || []).slice(0, 6));
        }
      } finally { setLoading(false); }
    })();
  }, [mounted]);

  const menuItems = getMenuItemsByRole(user.role);
  const firstName = user.first_name || user.name?.split(' ')[0] || 'Counselor';

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch { return '—'; }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

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
              <p className="text-2xl font-bold text-orange-500">{summary?.action_required ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Action required</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.unassigned_requests ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Unassigned requests</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.awaiting_approval ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Awaiting approval</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Quick links */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Pages</p>
              <div className="divide-y divide-gray-100">
                <Link href="/new-intakes" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <div>
                    <span>New Intakes</span>
                    {(summary?.unassigned_requests ?? 0) > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{summary.unassigned_requests}</span>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/appointment-requests" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <div>
                    <span>Appointment Requests</span>
                    {(summary?.action_required ?? 0) > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">{summary.action_required}</span>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/assessments" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Assessments</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/reminders" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>Reminders</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
                <Link href="/mhbot" className="flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-[#1a5228] transition-colors group">
                  <span>MHBot / PERMA</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a5228] transition-colors" />
                </Link>
              </div>
            </div>

            {/* Pending requests */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pending Requests</p>
                <Link href="/appointment-requests" className="text-xs text-[#1a5228] hover:underline">View all</Link>
              </div>
              {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <CheckCircle size={22} className="text-green-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">All clear!</p>
                  <p className="text-xs text-gray-400 mt-1">No pending requests right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingList.map((req: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{req.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtDate(req.preferred_date || req.created_at)} · {req.method || 'in-person'}
                        </p>
                      </div>
                      <Link href="/appointment-requests">
                        <button className="text-xs px-2.5 py-1 text-white rounded-lg transition-colors flex-shrink-0"
                          style={{ backgroundColor: '#1a5228' }}>
                          Assign
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
