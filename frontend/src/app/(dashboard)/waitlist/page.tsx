'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { Users, Clock, CheckCircle, Trash2, TrendingUp, Loader2, RefreshCw, ChevronUp } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  reason: string;
  concern: string;
  preferred_method: string;
  position: number;
  status: string;
  notes: string;
  joined_at: string;
  promoted_at: string | null;
}

interface Stats {
  waiting: number;
  promoted: number;
  removed: number;
  total: number;
}

const METHOD_LABELS: Record<string, string> = {
  in_person: 'In-Person',
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  phone: 'Phone',
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'waiting' | 'promoted' | 'removed'>('waiting');
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [promoteNotes, setPromoteNotes] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState<WaitlistEntry | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function load() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    const [listRes, statsRes] = await Promise.all([
      fetch(api(`/api/waitlist/?status=${tab}`), { headers: h }),
      fetch(api('/api/waitlist/stats'), { headers: h }),
    ]);
    if (listRes.ok) setEntries((await listRes.json()).waitlist ?? []);
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]);

  async function promote(entry: WaitlistEntry) {
    setActionId(entry.id);
    const token = localStorage.getItem('token');
    const res = await fetch(api(`/api/waitlist/${entry.id}/promote`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: promoteNotes }),
    });
    const data = await res.json();
    setActionId(null);
    setShowPromoteModal(null);
    setPromoteNotes('');
    if (res.ok) {
      showToast(`${entry.student_name} has been notified — slot available!`);
      load();
    } else {
      showToast(data.error || 'Failed to promote');
    }
  }

  async function remove(id: string) {
    setConfirmRemoveId(null);
    setActionId(id);
    const token = localStorage.getItem('token');
    const res = await fetch(api(`/api/waitlist/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setActionId(null);
    if (res.ok) {
      showToast('Removed from waitlist');
      load();
    } else {
      showToast('Failed to remove');
    }
  }

  return (
    <DashboardPageWrapper title="Waitlist" subtitle="Students waiting for an available counseling slot">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Waiting',  value: stats.waiting,  icon: <Clock size={16}/>,       color: 'text-yellow-500' },
            { label: 'Promoted', value: stats.promoted, icon: <CheckCircle size={16}/>, color: 'text-green-500' },
            { label: 'Removed',  value: stats.removed,  icon: <Trash2 size={16}/>,      color: 'text-gray-400' },
            { label: 'Total',    value: stats.total,    icon: <Users size={16}/>,        color: 'text-green-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {(['waiting', 'promoted', 'removed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Users size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {tab} entries</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Position badge */}
                {tab === 'waiting' && (
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    #{entry.position}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{entry.student_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{entry.student_email}</p>
                  {entry.concern && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Concern:</span> {entry.concern}
                    </p>
                  )}
                  {entry.reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 italic">"{entry.reason}"</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{METHOD_LABELS[entry.preferred_method] ?? entry.preferred_method}</span>
                    <span>·</span>
                    <span>Joined {new Date(entry.joined_at).toLocaleDateString()}</span>
                    {entry.promoted_at && (
                      <>
                        <span>·</span>
                        <span className="text-green-500">Promoted {new Date(entry.promoted_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {tab === 'waiting' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowPromoteModal(entry)}
                    disabled={actionId === entry.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <TrendingUp size={12} /> Promote
                  </button>
                  {confirmRemoveId === entry.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => remove(entry.id)} className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg font-semibold">Remove</button>
                      <button onClick={() => setConfirmRemoveId(null)} className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(entry.id)}
                      disabled={actionId === entry.id}
                      className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Promote Student</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Notify <strong>{showPromoteModal.student_name}</strong> that a slot is available. They will receive an in-app notification to book their appointment.
            </p>
            <textarea
              value={promoteNotes}
              onChange={e => setPromoteNotes(e.target.value)}
              placeholder="Optional notes for the student…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowPromoteModal(null); setPromoteNotes(''); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => promote(showPromoteModal)}
                disabled={actionId === showPromoteModal.id}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {actionId === showPromoteModal.id && <Loader2 size={13} className="animate-spin" />}
                Notify Student
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
