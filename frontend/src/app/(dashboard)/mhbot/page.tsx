'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import PendingStudentsWithPerma, { PermaBadge, PERMA_CONFIG } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';
import {
  Activity, Wifi, WifiOff, RefreshCw, Loader2, Users,
  LogIn, LogOut, Eye, EyeOff, TrendingUp, AlertTriangle,
} from 'lucide-react';

interface AuthStatus { connected: boolean; mhbot_username?: string; expired?: boolean; }
interface PermaDistribution { total_students_tracked: number; distribution: Record<string, number>; }
interface PermaEntry { perma_label: string | null; date: string; }

const LABEL_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];
const STUDENT_ROLES = ['STUDENT'];
const STAFF_TABS = ['overview', 'at-risk', 'students'] as const;

/* ─── helpers ──────────────────────────────────────────────────────────── */
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Connect card (shared for both roles) ─────────────────────────────── */
function ConnectCard({
  expired, onLogin,
}: { expired?: boolean; onLogin: (u: string, p: string) => Promise<string | null> }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const error = await onLogin(user, pass);
    if (error) setErr(error);
    setBusy(false);
  };

  return (
    <div className="max-w-sm mx-auto mt-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <Activity size={22} className="text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Connect to EMA</h2>
          <p className="text-xs text-gray-400 text-center mt-1">
            Sign in with your EMA account to continue
          </p>
          {expired && (
            <p className="text-xs text-orange-500 mt-2 text-center">Your previous session expired. Please log in again.</p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">EMA Username</label>
            <input type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="e.g. ema_lVk"
              required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a5228] focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a5228] focus:outline-none" />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a5228] hover:bg-[#163d20] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition mt-1">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          Your credentials are only used to obtain a session token and are not stored.
        </p>
      </div>
    </div>
  );
}

/* ─── Student view ──────────────────────────────────────────────────────── */
function StudentView({ username, onDisconnect }: { username: string; onDisconnect: () => void }) {
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [history, setHistory] = useState<PermaEntry[]>([]);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/my-perma?limit=10'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok || d.fetch_error) { setErr(d.fetch_error || d.error || 'Could not load PERMA data'); }
      else {
        setLabel(d.latest_label ?? null);
        setDate(d.latest_date ?? null);
        setHistory(d.history || []);
      }
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cfg = label ? (PERMA_CONFIG[label] ?? null) : null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Connection bar */}
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-green-500" />
          <p className="text-sm text-green-700">Connected as <span className="font-semibold">{username}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded hover:bg-green-100 text-gray-400 hover:text-gray-600 transition">
            <RefreshCw size={13} />
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <LogOut size={11} /> Disconnect
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : err ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</div>
      ) : (
        <>
          {/* Current label */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${cfg?.bg ?? 'bg-gray-100'}`}>
              <Activity size={28} className={cfg?.text ?? 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Your current EMA well-being</p>
              <PermaBadge label={label} />
              {date && <p className="text-xs text-gray-400 mt-1.5">Last check-in: {fmtDate(date)}</p>}
              {!label && <p className="text-xs text-gray-400 mt-1">No check-in data yet — complete a check-in on the EMA app.</p>}
            </div>
          </div>

          {/* What it means */}
          {label && (
            <div className={`p-4 rounded-xl border ${cfg?.bg ?? 'bg-gray-50'} border-gray-200`}>
              <p className={`text-sm font-semibold ${cfg?.text ?? 'text-gray-600'} mb-1`}>{label}</p>
              <p className="text-sm text-gray-600">
                {label === 'Excelling'  && 'You\'re doing great! Your wellbeing is strong across all dimensions.'}
                {label === 'Thriving'   && 'You\'re in a generally positive mental state with minor concerns.'}
                {label === 'Surviving'  && 'You\'re coping but experiencing some difficulties. Your IC can help if needed.'}
                {label === 'Struggling' && 'You\'re experiencing significant challenges. A Case Manager will reach out to support you.'}
                {label === 'In Crisis'  && 'You\'ve been flagged for immediate support. A Case Manager will contact you — please reach out to the CPS office directly if you need help now.'}
              </p>
              {(label === 'Struggling' || label === 'In Crisis') && (
                <p className="text-xs text-gray-500 mt-2">
                  PH Crisis Hotlines: <strong>Hopeline 8804-4673</strong> · <strong>Crisis Line 0917-899-8727</strong>
                </p>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp size={14} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in History</p>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <p className="text-xs text-gray-500">{fmtDate(h.date)}</p>
                    <PermaBadge label={h.perma_label} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Staff view ────────────────────────────────────────────────────────── */
function StaffView({ username, onDisconnect }: { username: string; onDisconnect: () => void }) {
  const [tab, setTab] = useState<typeof STAFF_TABS[number]>('overview');
  const [dist, setDist] = useState<PermaDistribution | null>(null);
  const [loadingDist, setLD] = useState(false);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [loadingRisk, setLR] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchDist = async () => {
    setLD(true);
    try {
      const r = await fetch(api('/api/mhbot/stats/perma-distribution'), { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) setDist(await r.json());
    } catch {} finally { setLD(false); }
  };

  const fetchAtRisk = async () => {
    setLR(true);
    try {
      const r = await fetch(api('/api/mhbot/cm-queue'), { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) { const d = await r.json(); setAtRisk(d.students || []); }
    } catch {} finally { setLR(false); }
  };

  const checkServer = async () => {
    try {
      const r = await fetch(api('/api/mhbot/health'));
      setServerUp(r.ok && (await r.json()).status === 'healthy');
    } catch { setServerUp(false); }
  };

  useEffect(() => {
    fetchDist(); checkServer();
  }, []);

  useEffect(() => {
    if (tab === 'at-risk' && atRisk.length === 0) fetchAtRisk();
  }, [tab]);

  const totalTracked = dist?.total_students_tracked ?? 0;
  const totalLabeled = dist
    ? Object.entries(dist.distribution).filter(([k]) => k !== 'No Data').reduce((s, [, v]) => s + v, 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Connection bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
        {serverUp === null ? <Loader2 size={15} className="animate-spin text-gray-400 shrink-0" />
          : serverUp ? <Wifi size={15} className="text-green-500 shrink-0" />
          : <WifiOff size={15} className="text-red-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-700">
            Connected as <span className="font-semibold">{username}</span>
          </p>
          {serverUp === false && (
            <p className="text-xs text-red-500 mt-0.5">EMA server unreachable — data may be stale</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { fetchDist(); checkServer(); if (tab === 'at-risk') fetchAtRisk(); }}
            className="p-1.5 rounded hover:bg-green-100 text-gray-400 hover:text-gray-600 transition" title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {([['overview', 'Overview'], ['at-risk', 'At-Risk'], ['students', 'Students']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-gray-900">PERMA Distribution</p>
                <p className="text-xs text-gray-400 mt-0.5">Across all linked students</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users size={14} /> {totalTracked} tracked
              </div>
            </div>
            {loadingDist ? (
              <div className="flex justify-center py-10 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
            ) : !dist || totalTracked === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No students linked to EMA yet.</p>
            ) : (
              <div className="space-y-3">
                {LABEL_ORDER.map(label => {
                  const count = dist.distribution[label] ?? 0;
                  const pct = totalLabeled > 0 ? Math.round((count / totalLabeled) * 100) : 0;
                  const cfg = PERMA_CONFIG[label];
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-24 text-right"><PermaBadge label={label} /></div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full rounded-full ${cfg?.dot ?? 'bg-gray-400'}`}
                          style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-gray-900">
                        {count} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                {(dist.distribution['No Data'] ?? 0) > 0 && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <div className="w-24 text-right"><PermaBadge label={null} /></div>
                    <div className="flex-1" />
                    <span className="w-16 text-right text-sm text-gray-400">{dist.distribution['No Data']}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PERMA legend */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-green-500" /> PERMA Labels
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
              {[
                { label: 'Excelling',  desc: 'Strong wellbeing across all PERMA dimensions' },
                { label: 'Thriving',   desc: 'Generally positive mental state with minor concerns' },
                { label: 'Surviving',  desc: 'Coping but experiencing noticeable difficulties' },
                { label: 'Struggling', desc: 'Significant challenges — PHQ-9/GAD-7 requires IC assistance' },
                { label: 'In Crisis',  desc: 'Immediate support needed — auto-routed to Case Manager' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                  <PermaBadge label={label} />
                  <p className="mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              PERMA = Positive emotion · Engagement · Relationships · Meaning · Achievement.
              Labels are generated by the EMA chatbot based on student self-reports.
            </p>
          </div>
        </div>
      )}

      {/* At-Risk tab */}
      {tab === 'at-risk' && (
        <div className="space-y-4">
          {loadingRisk ? (
            <div className="flex justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : atRisk.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-600">No at-risk students</p>
              <p className="text-xs text-gray-400 mt-1">All tracked students are Surviving or above.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertTriangle size={13} className="text-orange-500" />
                {atRisk.length} student{atRisk.length !== 1 ? 's' : ''} flagged (Struggling or In Crisis)
              </div>
              {atRisk.map((s: any) => {
                const labelCfg = PERMA_CONFIG[s.latest_label] ?? null;
                return (
                  <div key={s.student_id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{s.student_name || '—'}</p>
                      <p className="text-xs text-gray-400">{s.school_id || s.student_email}</p>
                      {s.college && <p className="text-xs text-gray-400">{s.college}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">Last check-in: {fmtDate(s.latest_date)}</p>
                    </div>
                    <PermaBadge label={s.latest_label} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && <PendingStudentsWithPerma />}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function EMAPage() {
  const [role, setRole] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const token = () => localStorage.getItem('token');

  const checkAuth = async () => {
    setLoadingAuth(true);
    try {
      const r = await fetch(api('/api/mhbot/auth/status'), { headers: { Authorization: `Bearer ${token()}` } });
      setAuthStatus(await r.json());
    } catch { setAuthStatus({ connected: false }); }
    finally { setLoadingAuth(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) { try { setRole(JSON.parse(raw).role || ''); } catch {} }
    checkAuth();
  }, []);

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    try {
      const r = await fetch(api('/api/mhbot/auth/login'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (r.ok) {
        setAuthStatus({ connected: true, mhbot_username: d.mhbot_username });
        return null;
      }
      return d.error || 'Login failed';
    } catch { return 'Network error'; }
  };

  const handleDisconnect = async () => {
    await fetch(api('/api/mhbot/auth/logout'), { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
    setAuthStatus({ connected: false });
  };

  const isStudent = STUDENT_ROLES.includes(role.toUpperCase());

  if (loadingAuth) {
    return (
      <DashboardPageWrapper title="EMA" subtitle="PERMA well-being tracking">
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" /> Checking connection…
        </div>
      </DashboardPageWrapper>
    );
  }

  if (!authStatus?.connected) {
    return (
      <DashboardPageWrapper
        title="EMA"
        subtitle={isStudent ? 'Connect your EMA account to track your well-being' : 'Connect to EMA to view student PERMA data'}
      >
        <ConnectCard expired={authStatus?.expired} onLogin={handleLogin} />
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title="EMA"
      subtitle={isStudent ? 'Your PERMA well-being' : 'Student PERMA well-being overview'}
    >
      {isStudent ? (
        <StudentView username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
      ) : (
        <StaffView username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
      )}
    </DashboardPageWrapper>
  );
}
