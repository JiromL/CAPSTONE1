'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Monitor, MapPin } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

const DAYS = [
  { label: 'Monday',    dow: 0 },
  { label: 'Tuesday',   dow: 1 },
  { label: 'Wednesday', dow: 2 },
  { label: 'Thursday',  dow: 3 },
  { label: 'Friday',    dow: 4 },
  { label: 'Saturday',  dow: 5 },
  { label: 'Sunday',    dow: 6 },
];

// 30-min steps from 07:00 to 20:00
const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface DayEntry {
  enabled: boolean;
  start_time: string;
  end_time: string;
  session_method: 'in-person' | 'online';
}

type WeekState = Record<number, DayEntry>;

const DEFAULT_WEEK: WeekState = Object.fromEntries(
  DAYS.map(({ dow }) => [dow, { enabled: dow < 5, start_time: '09:00', end_time: '17:00', session_method: 'in-person' as const }])
);

export default function AvailabilityPage() {
  const [week, setWeek] = useState<WeekState>(DEFAULT_WEEK);
  const [sessionMethod, setSessionMethod] = useState<'in-person' | 'online'>('in-person');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    fetch(api('/api/availability/weekly'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.session_method) setSessionMethod(data.session_method);
        if (data.schedule?.length) {
          const globalMethod = data.session_method || 'in-person';
          const loaded: WeekState = { ...DEFAULT_WEEK };
          DAYS.forEach(({ dow }) => { loaded[dow] = { ...loaded[dow], enabled: false }; });
          data.schedule.forEach((e: any) => {
            loaded[e.day_of_week] = {
              enabled: true,
              start_time: e.start_time,
              end_time: e.end_time,
              session_method: e.session_method || globalMethod,
            };
          });
          setWeek(loaded);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const show = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    const schedule = DAYS.filter(({ dow }) => week[dow].enabled).map(({ dow }) => ({
      day_of_week: dow,
      start_time: week[dow].start_time,
      end_time: week[dow].end_time,
      session_method: week[dow].session_method,
    }));
    try {
      const r = await fetch(api('/api/availability/weekly'), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, session_method: sessionMethod }),
      });
      const d = await r.json();
      if (r.ok) show(d.message ?? 'Saved', true);
      else show(d.error ?? 'Failed to save', false);
    } catch {
      show('Network error', false);
    } finally {
      setSaving(false);
    }
  };

  const activeDays = DAYS.filter(({ dow }) => week[dow].enabled).length;

  return (
    <DashboardPageWrapper title="My Availability" subtitle="Set the days and hours you're available for appointments">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {toast.ok && <Check size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Weekly Schedule</h2>
              <p className="text-xs text-gray-400 mt-0.5">{activeDays} day{activeDays !== 1 ? 's' : ''} active · 1-hour slots</p>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition"
              style={{ backgroundColor: '#2563eb' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>


          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">Loading schedule…</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {DAYS.map(({ label, dow }) => {
                const entry = week[dow];
                return (
                  <div key={dow} className={`px-6 py-4 flex items-center gap-4 transition-colors ${entry.enabled ? '' : 'opacity-50'}`}>
                    {/* Toggle */}
                    <button onClick={() => setWeek(w => ({
                      ...w,
                      [dow]: {
                        ...w[dow],
                        enabled: !w[dow].enabled,
                        // Apply default method when enabling a day
                        session_method: w[dow].enabled ? w[dow].session_method : sessionMethod,
                      },
                    }))}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${entry.enabled ? 'bg-[#2563eb]' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${entry.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>

                    {/* Day name */}
                    <span className="w-24 text-sm font-medium text-gray-800">{label}</span>

                    {/* Hours */}
                    {entry.enabled ? (
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <select value={entry.start_time}
                          onChange={e => setWeek(w => ({ ...w, [dow]: { ...w[dow], start_time: e.target.value } }))}
                          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] focus:outline-none">
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                        </select>
                        <span className="text-xs text-gray-400">to</span>
                        <select value={entry.end_time}
                          onChange={e => setWeek(w => ({ ...w, [dow]: { ...w[dow], end_time: e.target.value } }))}
                          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] focus:outline-none">
                          {TIME_OPTIONS.filter(t => t > entry.start_time).map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                        </select>
                        {/* Per-day session method toggle */}
                        <div className="flex gap-1 ml-auto">
                          {(['in-person', 'online'] as const).map(v => (
                            <button key={v} onClick={() => setWeek(w => ({ ...w, [dow]: { ...w[dow], session_method: v } }))}
                              title={v === 'in-person' ? 'Face to Face' : 'Online'}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition
                                ${entry.session_method === v
                                  ? v === 'in-person' ? 'bg-green-50 text-[#2563eb] border-[#2563eb]/40'
                                                      : 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                              {v === 'in-person' ? <MapPin size={10} /> : <Monitor size={10} />}
                              {v === 'in-person' ? 'F2F' : 'Online'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Students see your free 1-hour slots with the method you set per day (F2F or Online). Confirmed sessions are automatically excluded.
            </p>
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
