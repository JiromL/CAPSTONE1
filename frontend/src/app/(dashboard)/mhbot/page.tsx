'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import PendingStudentsWithPerma, { PermaBadge, PERMA_CONFIG } from '@/components/PendingStudentsWithPerma';
import { api } from '@/utils/api';
import { Activity, Wifi, WifiOff, RefreshCw, Loader2, Users } from 'lucide-react';

interface PermaDistribution {
  total_students_tracked: number;
  distribution: Record<string, number>;
}

interface MhbotHealth {
  status: string;
  mhbot_server: string;
  message?: string;
  error?: string;
  token_configured: boolean;
}

const LABEL_ORDER = ['Excelling', 'Thriving', 'Surviving', 'Struggling', 'In Crisis'];

export default function MhbotPage() {
  const [health, setHealth]       = useState<MhbotHealth | null>(null);
  const [dist, setDist]           = useState<PermaDistribution | null>(null);
  const [loadingHealth, setLH]    = useState(true);
  const [loadingDist, setLD]      = useState(true);
  const [tab, setTab]             = useState<'overview' | 'pending'>('overview');

  async function fetchHealth() {
    setLH(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/health'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setHealth(d);
    } catch { setHealth({ status: 'error', mhbot_server: '', token_configured: false, error: 'Cannot reach backend' }); }
    finally { setLH(false); }
  }

  async function fetchDist() {
    setLD(true);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/stats/perma-distribution'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDist(await r.json());
    } catch {}
    finally { setLD(false); }
  }

  useEffect(() => {
    fetchHealth();
    fetchDist();
  }, []);

  const isHealthy = health?.status === 'healthy';
  const totalTracked = dist?.total_students_tracked ?? 0;
  const totalLabeled = dist ? Object.entries(dist.distribution).filter(([k]) => k !== 'No Data').reduce((s, [, v]) => s + v, 0) : 0;

  return (
    <DashboardPageWrapper title="MHBot Integration" subtitle="PERMA wellbeing tracking via MHBot chatbot">

      {/* Server status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
        loadingHealth ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' :
        isHealthy     ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30' :
                        'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
      }`}>
        {loadingHealth ? (
          <Loader2 size={18} className="animate-spin text-gray-400" />
        ) : isHealthy ? (
          <Wifi size={18} className="text-green-500" />
        ) : (
          <WifiOff size={18} className="text-red-500" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            loadingHealth ? 'text-gray-600 dark:text-gray-400' :
            isHealthy ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-400'
          }`}>
            {loadingHealth ? 'Checking MHBot server…' :
             isHealthy ? 'MHBot server is connected' :
             `MHBot server unreachable — ${health?.error ?? 'check MHBOT_BASE_URL and MHBOT_API_TOKEN in .env'}`}
          </p>
          {health?.mhbot_server && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{health.mhbot_server}</p>
          )}
        </div>
        <button onClick={() => { fetchHealth(); fetchDist(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit">
        {(['overview', 'pending'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
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
                <Users size={14} />
                {totalTracked} tracked
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
                      <div className="w-24 text-right">
                        <PermaBadge label={label} />
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cfg?.dot ?? 'bg-gray-400'}`}
                          style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                        />
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
                    <div className="w-24 text-right">
                      <PermaBadge label={null} />
                    </div>
                    <div className="flex-1" />
                    <div className="w-16 text-right">
                      <span className="text-sm text-gray-400">{dist.distribution['No Data']}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What is PERMA */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity size={15} className="text-indigo-500" /> About PERMA Labels
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
