'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import PendingStudentsWithPerma, { PermaBadge, PERMA_STYLES } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';
import {
  Activity, Wifi, WifiOff, RefreshCw, Loader2, Users,
  LogIn, LogOut, Eye, EyeOff, TrendingUp, AlertTriangle, ExternalLink, MessageSquare,
} from 'lucide-react';

interface AuthStatus { connected: boolean; mhbot_username?: string; expired?: boolean; }
interface PermaDistribution { total_students_tracked: number; distribution: Record<string, number>; }
interface PermaEntry { perma_label: string | null; date: string; }

const LABEL_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];
const STUDENT_ROLES = ['STUDENT'];
const STAFF_TABS = ['overview', 'at-risk', 'students', 'chatbot'] as const;
const EMA_URL = 'https://pchrd-ema.dlsu.edu.ph/app/login/';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const IC_S: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' };
const onFIn  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-surface)'; };
const onFOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

/* ─── Connect card ────────────────────────────────────────────────────────── */
function ConnectCard({ expired, onLogin }: { expired?: boolean; onLogin: (u: string, p: string) => Promise<string | null> }) {
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
      <div className="rounded-2xl shadow-card p-8 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-success-surface)' }}>
            <Activity size={22} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Connect to EMA</h2>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>Sign in with your EMA account to continue</p>
          {expired && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-warning)' }}>Your previous session expired. Please log in again.</p>
          )}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>EMA Username</label>
            <input type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="e.g. ema_lVk"
              required className={IC} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" required className={`${IC} pr-9`} style={IC_S} onFocus={onFIn} onBlur={onFOut} />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {err && (
            <p className="text-xs rounded-lg px-3 py-2 border" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>{err}</p>
          )}
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 mt-1 hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Your credentials are only used to obtain a session token and are not stored.
        </p>
      </div>
    </div>
  );
}

/* ─── Student view ────────────────────────────────────────────────────────── */
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
      const r = await fetch(api('/api/mhbot/my-perma?limit=10'), { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok || d.fetch_error) { setErr(d.fetch_error || d.error || 'Could not load PERMA data'); }
      else { setLabel(d.latest_label ?? null); setDate(d.latest_date ?? null); setHistory(d.history || []); }
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cfg = label ? (PERMA_STYLES[label as keyof typeof PERMA_STYLES] ?? null) : null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Connection bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>Connected as <span className="font-semibold">{username}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded transition"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
            <RefreshCw size={13} />
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={11} /> Disconnect
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : err ? (
        <div className="p-4 rounded-xl border text-sm" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>{err}</div>
      ) : (
        <>
          <div className="border rounded-xl p-6 flex items-center gap-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--color-success-surface)' }}>
              <Activity size={28} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Your current EMA well-being</p>
              <PermaBadge label={label} />
              {date && <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>Last check-in: {fmtDate(date)}</p>}
              {!label && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>No check-in data yet — complete a check-in on the EMA app.</p>}
            </div>
          </div>

          {label && (
            <div className="p-4 rounded-xl border" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {label === 'Excelling'  && 'You\'re doing great! Your wellbeing is strong across all dimensions.'}
                {label === 'Thriving'   && 'You\'re in a generally positive mental state with minor concerns.'}
                {label === 'Surviving'  && 'You\'re coping but experiencing some difficulties. Your IC can help if needed.'}
                {label === 'Struggling' && 'You\'re experiencing significant challenges. A Case Manager will reach out to support you.'}
                {label === 'In Crisis'  && 'You\'ve been flagged for immediate support. A Case Manager will contact you — please reach out to the CPS office directly if you need help now.'}
              </p>
              {(label === 'Struggling' || label === 'In Crisis') && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  PH Crisis Hotlines: <strong>Hopeline 8804-4673</strong> · <strong>Crisis Line 0917-899-8727</strong>
                </p>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <TrendingUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Check-in History</p>
              </div>
              <div>
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: i < history.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(h.date)}</p>
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

/* ─── Staff view ──────────────────────────────────────────────────────────── */
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

  useEffect(() => { fetchDist(); checkServer(); }, []);
  useEffect(() => { if (tab === 'at-risk' && atRisk.length === 0) fetchAtRisk(); }, [tab]);

  const totalTracked = dist?.total_students_tracked ?? 0;
  const totalLabeled = dist
    ? Object.entries(dist.distribution).filter(([k]) => k !== 'No Data').reduce((s, [, v]) => s + v, 0)
    : 0;

  const STAFF_TAB_LABELS: [typeof STAFF_TABS[number], string][] = [
    ['overview', 'Overview'], ['at-risk', 'At-Risk'], ['students', 'Students'], ['chatbot', 'Chatbot'],
  ];

  return (
    <div className="space-y-5">
      {/* Connection bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
        {serverUp === null ? <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          : serverUp ? <Wifi size={15} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
          : <WifiOff size={15} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            Connected as <span className="font-semibold">{username}</span>
          </p>
          {serverUp === false && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>EMA server unreachable — data may be stale</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => { fetchDist(); checkServer(); if (tab === 'at-risk') fetchAtRisk(); }}
            className="p-1.5 rounded transition"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
            <RefreshCw size={13} />
          </button>
          <button onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-bg)' }}>
        {STAFF_TAB_LABELS.map(([id, label]) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={active
                ? { background: 'var(--color-surface)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="border rounded-xl p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>PERMA Distribution</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Across all linked students</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Users size={14} /> {totalTracked} tracked
              </div>
            </div>
            {loadingDist ? (
              <div className="flex justify-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : !dist || totalTracked === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No students linked to EMA yet.</p>
            ) : (
              <div className="space-y-3">
                {LABEL_ORDER.map(label => {
                  const count = dist.distribution[label] ?? 0;
                  const pct = totalLabeled > 0 ? Math.round((count / totalLabeled) * 100) : 0;
                  const cfg = PERMA_STYLES[label as keyof typeof PERMA_STYLES];
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-24 text-right"><PermaBadge label={label} /></div>
                      <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                        <div style={{ width: `${pct}%`, transition: 'width 0.6s ease', height: '100%', borderRadius: '9999px', backgroundColor: cfg?.dot ?? 'var(--color-text-muted)' }} />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {count} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                {(dist.distribution['No Data'] ?? 0) > 0 && (
                  <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div className="w-24 text-right"><PermaBadge label={null} /></div>
                    <div className="flex-1" />
                    <span className="w-16 text-right text-sm" style={{ color: 'var(--color-text-muted)' }}>{dist.distribution['No Data']}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-xl p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Activity size={14} style={{ color: 'var(--color-success)' }} /> PERMA Labels
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {[
                { label: 'Excelling',  desc: 'Strong wellbeing across all PERMA dimensions' },
                { label: 'Thriving',   desc: 'Generally positive mental state with minor concerns' },
                { label: 'Surviving',  desc: 'Coping but experiencing noticeable difficulties' },
                { label: 'Struggling', desc: 'Significant challenges — PHQ-9/GAD-7 requires IC assistance' },
                { label: 'In Crisis',  desc: 'Immediate support needed — auto-routed to Case Manager' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                  <PermaBadge label={label} />
                  <p className="mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
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
            <div className="flex justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : atRisk.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No at-risk students</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>All tracked students are Surviving or above.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <AlertTriangle size={13} style={{ color: 'var(--color-warning)' }} />
                {atRisk.length} student{atRisk.length !== 1 ? 's' : ''} flagged (Struggling or In Crisis)
              </div>
              {atRisk.map((s: any) => (
                <div key={s.student_id} className="border rounded-xl p-4 flex items-center justify-between gap-4"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.student_name || '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.school_id || s.student_email}</p>
                    {s.college && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.college}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Last check-in: {fmtDate(s.latest_date)}</p>
                  </div>
                  <PermaBadge label={s.latest_label} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'students' && <PendingStudentsWithPerma />}
      {tab === 'chatbot' && <EmaEmbed />}
    </div>
  );
}

/* ─── EMA iframe embed ────────────────────────────────────────────────────── */
function EmaEmbed() {
  const [iframeKey, setIframeKey] = useState(0);
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <MessageSquare size={13} />
          <span>EMA Chatbot — <a href={EMA_URL} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-primary)' }}>pchrd-ema.dlsu.edu.ph</a></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIframeKey(k => k + 1)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={12} /> Reload
          </button>
          <a href={EMA_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
            <ExternalLink size={12} /> New tab
          </a>
        </div>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border shadow-card" style={{ borderColor: 'var(--color-border)' }}>
        <iframe key={iframeKey} src={EMA_URL} title="EMA Chatbot" className="w-full h-full border-0" allow="microphone; camera" />
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
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
      if (r.ok) { setAuthStatus({ connected: true, mhbot_username: d.mhbot_username }); return null; }
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
        <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Checking connection…
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
      {isStudent
        ? <StudentView username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
        : <StaffView  username={authStatus.mhbot_username!} onDisconnect={handleDisconnect} />
      }
    </DashboardPageWrapper>
  );
}
