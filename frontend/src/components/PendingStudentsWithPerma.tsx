'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { Search, Loader2, AlertCircle, Link2 } from 'lucide-react';

interface PermaStatus { label: string | null; date: string; }
interface PendingStudent {
  appointment_id: string; case_id: string; student_id: string;
  student_name: string; student_email: string; mhbot_username: string | null;
  requested_start: string; appointment_type: string; perma_status: PermaStatus | null;
}

export const PERMA_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'Excelling':  { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-400',   dot: 'bg-green-500'  },
  'Thriving':   { bg: 'bg-teal-100 dark:bg-teal-900/30',     text: 'text-teal-700 dark:text-teal-400',     dot: 'bg-teal-500'   },
  'Surviving':  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  'Struggling': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  'In Crisis':  { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400',       dot: 'bg-red-500'    },
};

export function PermaBadge({ label }: { label: string | null }) {
  const cfg = label ? (PERMA_CONFIG[label] ?? null) : null;
  if (!cfg) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      No data
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {label}
    </span>
  );
}

export default function PendingStudentsWithPerma() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/students/pending'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { const d = await r.json(); setStudents(d.students ?? []); }
      else setError('Failed to load pending students');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setSearching(true); setError(''); setLookupResult(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/lookup'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: searchUsername }),
      });
      const d = await r.json();
      if (r.ok) setLookupResult(d);
      else setError(d.error || 'Username not found in MHBot');
    } catch { setError('Network error'); }
    finally { setSearching(false); }
  }

  async function linkAccount(caseId: string, username: string) {
    setLinkingId(caseId);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api(`/api/mhbot/case/${caseId}/link-mhbot`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mhbot_username: username }),
      });
      const d = await r.json();
      if (r.ok) { fetchStudents(); setSearchUsername(''); setLookupResult(null); }
      else setError(d.error || 'Failed to link account');
    } catch { setError('Network error'); }
    finally { setLinkingId(null); }
  }

  return (
    <div className="space-y-5">
      {/* Lookup */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Lookup MHBot Username</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input
            type="text"
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            placeholder="e.g. ema_lVk"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={searching || !searchUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Lookup
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {lookupResult && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{lookupResult.username}</p>
              <PermaBadge label={lookupResult.latest_label} />
            </div>
            {lookupResult.history?.slice(0, 4).map((h: any, i: number) => (
              <div key={i} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{h.perma_label || '—'}</span>
                <span>{new Date(h.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending students */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Pending Appointments <span className="ml-1 text-xs font-normal text-gray-400">({students.length})</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No pending appointments</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {students.map(s => (
              <div key={s.appointment_id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.student_name}</p>
                  <p className="text-xs text-gray-400">{s.student_email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.appointment_type} · {new Date(s.requested_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {s.mhbot_username
                    ? <PermaBadge label={s.perma_status?.label ?? null} />
                    : lookupResult
                      ? (
                        <button
                          onClick={() => linkAccount(s.case_id, lookupResult.username)}
                          disabled={linkingId === s.case_id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                        >
                          {linkingId === s.case_id ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                          Link {lookupResult.username}
                        </button>
                      )
                      : <span className="text-xs text-gray-400">Not linked</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
