'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Check, X, Clock, CalendarDays, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';

interface RescheduleRequest {
  _id: string;
  appointment_id: string;
  student_id: string;
  student_name?: string;
  current_time?: string;
  requested_start: string;
  requested_end: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  appointment_type?: string;
}

type Tab = 'pending' | 'approved' | 'denied';

function fmtDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}
function fmtTime(s?: string) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}
function fmtAgo(s?: string) {
  if (!s) return '';
  try {
    const diff = Date.now() - new Date(s).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch { return ''; }
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied',   label: 'Denied' },
];

export default function RescheduleRequestsPage() {
  const [requests, setRequests]         = useState<RescheduleRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<Tab>('pending');
  const [selected, setSelected]         = useState<RescheduleRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/appointments/reschedule-requests'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed to fetch (${r.status})`);
      const d = await r.json();
      setRequests(Array.isArray(d.requests) ? d.requests : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  };

  const doAction = async (id: string, action: 'approve' | 'deny') => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api(`/api/appointments/reschedule-requests/${id}/${action}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed to ${action}`);
      setActionMsg({ type: 'ok', text: action === 'approve' ? 'Request approved.' : 'Request denied.' });
      setTimeout(() => { setSelected(null); setActionMsg(null); load(); }, 900);
    } catch (e) {
      setActionMsg({ type: 'err', text: e instanceof Error ? e.message : 'Action failed.' });
    } finally { setActionLoading(false); }
  };

  const counts = Object.fromEntries(
    TABS.map(t => [t.key, requests.filter(r => r.status === t.key).length])
  ) as Record<Tab, number>;

  const filtered = requests.filter(r => r.status === activeTab);
  const pendingCount = counts.pending;

  return (
    <DashboardPageWrapper
      title="Reschedule Requests"
      subtitle={pendingCount > 0 ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}` : 'No pending requests'}
    >
      <div className="space-y-4">

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <X size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Card wrapper */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Reschedule Requests</h2>
            <button onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-end border-b border-gray-100 px-2 pt-1.5 gap-0.5">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const cnt = counts[tab.key];
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap relative flex-shrink-0 ${
                    isActive
                      ? 'bg-[#1a5228]/5 text-[#1a5228] border-b-2 border-[#1a5228]'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}>
                  {tab.key === 'pending'  && <Clock size={13} />}
                  {tab.key === 'approved' && <Check size={13} />}
                  {tab.key === 'denied'   && <X    size={13} />}
                  {tab.label}
                  {cnt > 0 && (
                    <span className={`text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1 ${
                      isActive ? 'bg-[#1a5228] text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <CalendarDays size={18} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                {activeTab === 'pending' ? 'No pending requests' : `No ${activeTab} requests`}
              </p>
              <p className="text-xs text-gray-400 mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(req => (
                <button
                  key={req._id}
                  onClick={() => { setSelected(req); setActionMsg(null); }}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50/70 transition group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5"
                      style={{ backgroundColor: '#1a5228' }}>
                      {(req.student_name || 'S').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + type */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900">{req.student_name || 'Unknown Student'}</p>
                        {req.appointment_type && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            {req.appointment_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      {/* Time change: current → new */}
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                          {fmtDate(req.current_time)} {fmtTime(req.current_time)}
                        </span>
                        <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />
                        <span className={`px-2 py-1 rounded-lg font-medium ${
                          req.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : req.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500 line-through'
                        }`}>
                          {fmtDate(req.requested_start)} {fmtTime(req.requested_start)}
                        </span>
                      </div>

                      {/* Reason */}
                      {req.reason && (
                        <p className="text-xs text-gray-400 mt-1.5 truncate max-w-[360px]">"{req.reason}"</p>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={req.status} />
                      <span className="text-[11px] text-gray-400">{fmtAgo(req.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing <strong className="text-gray-600">{filtered.length}</strong> {activeTab} request{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            {/* Color strip */}
            <div className={`h-1.5 w-full ${
              selected.status === 'pending'  ? 'bg-amber-400' :
              selected.status === 'approved' ? 'bg-green-600' : 'bg-gray-400'
            }`} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Reschedule Request</p>
                  <h3 className="text-base font-semibold text-gray-900">{selected.student_name || 'Unknown Student'}</h3>
                  {selected.appointment_type && (
                    <p className="text-xs text-gray-400 mt-0.5">{selected.appointment_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <button onClick={() => setSelected(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Time change visual */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Schedule Change</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Current</p>
                    <p className="text-sm font-medium text-gray-700">{fmtDate(selected.current_time)}</p>
                    <p className="text-xs text-gray-400">{fmtTime(selected.current_time)}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                  <div className={`flex-1 rounded-lg px-3 py-2.5 border ${
                    selected.status === 'approved'
                      ? 'bg-green-50 border-green-200'
                      : selected.status === 'denied'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Requested</p>
                    <p className="text-sm font-medium text-gray-700">{fmtDate(selected.requested_start)}</p>
                    <p className="text-xs text-gray-400">{fmtTime(selected.requested_start)}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selected.reason && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Reason</p>
                  <p className="text-sm text-gray-700 leading-relaxed">"{selected.reason}"</p>
                </div>
              )}

              {/* Submitted */}
              <p className="text-xs text-gray-400 mb-5">Submitted {fmtAgo(selected.created_at)} · {fmtDate(selected.created_at)}</p>

              {/* Action feedback */}
              {actionMsg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-4 ${
                  actionMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {actionMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />}
                  {actionMsg.text}
                </div>
              )}

              {/* Actions */}
              {selected.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => doAction(selected._id, 'deny')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition disabled:opacity-40"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Deny
                  </button>
                  <button
                    onClick={() => doAction(selected._id, 'approve')}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition disabled:opacity-40"
                    style={{ backgroundColor: '#1a5228' }}
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                </div>
              ) : (
                <button onClick={() => setSelected(null)}
                  className="w-full px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'pending'  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
    status === 'approved' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
    'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
