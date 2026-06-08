'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import PendingStudentsWithPerma, { PermaBadge, PERMA_CONFIG } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';
import {
  Activity, Wifi, WifiOff, RefreshCw, Loader2, Users,
  LogIn, LogOut, Eye, EyeOff,
} from 'lucide-react';

interface PermaDistribution {
  total_students_tracked: number;
  distribution: Record<string, number>;
}

interface AuthStatus {
  connected: boolean;
  mhbot_username?: string;
  expired?: boolean;
}

const LABEL_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];

export default function MhbotPage() {
  const [authStatus, setAuthStatus]   = useState<AuthStatus | null>(null);
  const [serverUp, setServerUp]       = useState<boolean | null>(null);
  const [dist, setDist]               = useState<PermaDistribution | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingDist, setLD]          = useState(false);
  const [tab, setTab]                 = useState<'overview' | 'pending'>('overview');

  // Login form
  const [loginUser, setLoginUser]     = useState('');
  const [loginPass, setLoginPass]     = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loggingIn, setLoggingIn]     = useState(false);
  const [loginError, setLoginError]   = useState('');

  const cpsToken = () => localStorage.getItem('token');

  async function checkAuth() {
    setLoadingAuth(true);
    try {
      const r = await fetch(api('/api/mhbot/auth/status'), {
        headers: { Authorization: `Bearer ${cpsToken()}` },
      });
      const d = await r.json();
      setAuthStatus(d);
      if (d.connected) {
        fetchDist();
        checkServer();
      }
    } catch {
      setAuthStatus({ connected: false });
    } finally {
      setLoadingAuth(false);
    }
  }

  async function checkServer() {
    try {
      const r = await fetch(api('/api/mhbot/health'));
      setServerUp(r.ok && (await r.json()).status === 'healthy');
    } catch { setServerUp(false); }
  }

  async function fetchDist() {
    setLD(true);
    try {
      const r = await fetch(api('/api/mhbot/stats/perma-distribution'), {
        headers: { Authorization: `Bearer ${cpsToken()}` },
      });
      if (r.ok) setDist(await r.json());
    } catch {}
    finally { setLD(false); }
  }

  useEffect(() => { checkAuth(); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true); setLoginError('');
    try {
      const r = await fetch(api('/api/mhbot/auth/login'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${cpsToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const d = await r.json();
      if (r.ok) {
        setAuthStatus({ connected: true, mhbot_username: d.mhbot_username });
        setLoginUser(''); setLoginPass('');
        fetchDist();
        checkServer();
      } else {
        setLoginError(d.error || 'Login failed');
      }
    } catch { setLoginError('Network error'); }
    finally { setLoggingIn(false); }
  }

  async function handleLogout() {
    await fetch(api('/api/mhbot/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${cpsToken()}` },
    });
    setAuthStatus({ connected: false });
    setDist(null);
    setServerUp(null);
  }

  const totalTracked = dist?.total_students_tracked ?? 0;
  const totalLabeled = dist
    ? Object.entries(dist.distribution).filter(([k]) => k !== 'No Data').reduce((s, [, v]) => s + v, 0)
    : 0;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <DashboardPageWrapper title="MHBot / PERMA" subtitle="PERMA wellbeing tracking via MHBot chatbot">
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" /> Checking connection…
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Not connected — show login form ──────────────────────────────────────
  if (!authStatus?.connected) {
    return (
      <DashboardPageWrapper title="MHBot / PERMA" subtitle="PERMA wellbeing tracking via MHBot chatbot">
        <div className="max-w-sm mx-auto mt-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">

            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <Activity size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Connect to MHBot</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                Sign in with your MHBot account to view student PERMA data
              </p>
              {authStatus?.expired && (
                <p className="text-xs text-orange-500 mt-2 text-center">Your previous session expired. Please log in again.</p>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">MHBot Username</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  placeholder="e.g. ema_lVk"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {loginError}
                </p>
              )}

              <button type="submit" disabled={loggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition mt-1">
                {loggingIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                {loggingIn ? 'Connecting…' : 'Connect'}
              </button>
            </form>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
              Your credentials are only used to obtain a session token from MHBot and are not stored.
            </p>
          </div>
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── Connected — show dashboard ────────────────────────────────────────────
  return (
    <DashboardPageWrapper title="MHBot / PERMA" subtitle="PERMA wellbeing tracking via MHBot chatbot">

      {/* Connection status bar */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 mb-6">
        {serverUp === null ? (
          <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />
        ) : serverUp ? (
          <Wifi size={16} className="text-green-500 shrink-0" />
        ) : (
          <WifiOff size={16} className="text-red-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Connected as <span className="font-semibold">{authStatus.mhbot_username}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {serverUp === false ? 'MHBot server unreachable — data may be stale' : 'MHBot server is reachable'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { fetchDist(); checkServer(); }}
            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <RefreshCw size={13} />
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit">
        {(['overview', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t === 'pending' ? 'Pending Students' : 'Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {/* PERMA distribution */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">PERMA Distribution</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Across all linked students</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Users size={14} /> {totalTracked} tracked
              </div>
            </div>

            {loadingDist ? (
              <div className="flex justify-center py-10 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : !dist || totalTracked === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                No students linked to MHBot yet.<br />
                <span className="text-xs">Use the Pending Students tab to link MHBot usernames to cases.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {LABEL_ORDER.map(label => {
                  const count = dist.distribution[label] ?? 0;
                  const pct = totalLabeled > 0 ? Math.round((count / totalLabeled) * 100) : 0;
                  const cfg = PERMA_CONFIG[label];
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-24 text-right"><PermaBadge label={label} /></div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full rounded-full ${cfg?.dot ?? 'bg-gray-400'}`}
                          style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                        <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {(dist.distribution['No Data'] ?? 0) > 0 && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="w-24 text-right"><PermaBadge label={null} /></div>
                    <div className="flex-1" />
                    <div className="w-16 text-right">
                      <span className="text-sm text-gray-400">{dist.distribution['No Data']}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* About PERMA */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity size={15} className="text-green-500" /> About PERMA Labels
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              {[
                { label: 'Excelling',  desc: 'Strong wellbeing across all PERMA dimensions' },
                { label: 'Thriving',   desc: 'Generally positive mental state with minor concerns' },
                { label: 'Surviving',  desc: 'Coping but experiencing noticeable difficulties' },
                { label: 'Struggling', desc: 'Significant challenges affecting daily function' },
                { label: 'In Crisis',  desc: 'Immediate support recommended — high distress' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <PermaBadge label={label} />
                  <p className="mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              PERMA = Positive emotion · Engagement · Relationships · Meaning · Achievement.
              Labels are generated by the MHBot chatbot based on student self-reports.
            </p>
          </div>
        </div>
      )}

      {tab === 'pending' && <PendingStudentsWithPerma />}

    </DashboardPageWrapper>
  );
}
