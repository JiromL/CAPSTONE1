"use client";

import { useState } from 'react';
import { Bell, Save } from 'lucide-react';
import PageShell from '@/components/PageShell';

interface Rule { id: string; label: string; desc: string; enabled: boolean; threshold?: number; unit?: string; }

const DEFAULT: Rule[] = [
  { id:'high_risk', label:'High-Risk Case Created', desc:'Alert when a RED risk case is opened.', enabled:true },
  { id:'missed', label:'Missed Session', desc:'Alert when a student misses a confirmed appointment.', enabled:true, threshold:1, unit:'missed sessions' },
  { id:'overdue_note', label:'Overdue Session Note', desc:'Alert when a session note is not submitted within the deadline.', enabled:true, threshold:24, unit:'hours after session' },
  { id:'overload', label:'Counselor Overload', desc:'Alert when a counselor exceeds daily appointment threshold.', enabled:false, threshold:8, unit:'appointments/day' },
  { id:'failed_login', label:'Failed Login Attempts', desc:'Alert on repeated failed login attempts.', enabled:true, threshold:5, unit:'attempts' },
  { id:'export', label:'Data Export Performed', desc:'Alert when any user performs a data export.', enabled:true },
];

export default function AlertsPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const toggle = (id: string) => setRules((r) => r.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const setT = (id: string, v: number) => setRules((r) => r.map((a) => a.id === id ? { ...a, threshold: v } : a));

  return (
    <PageShell title="Alert Configuration" subtitle="Configure system-wide alert rules and thresholds">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Alert rules saved.</div>}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bell size={15} className={`mt-0.5 flex-shrink-0 ${rule.enabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{rule.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rule.desc}</p>
                    {rule.threshold != null && rule.enabled && (
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-gray-600">Threshold:</label>
                        <input type="number" value={rule.threshold} onChange={(e) => setT(rule.id, Number(e.target.value))}
                          className="w-14 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50" />
                        <span className="text-xs text-gray-500">{rule.unit}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(rule.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition flex-shrink-0 ${rule.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
          <Save size={14} /> Save Alert Rules
        </button>
      </div>
    </PageShell>
  );
}
