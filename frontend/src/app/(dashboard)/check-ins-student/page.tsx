'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';

const STATUS_OPTIONS = [
  { value: 'DOING_WELL', label: 'Doing Well',  desc: 'Everything is going smoothly',    icon: '✓', colorCls: 'border-green-200  dark:border-blue-700  bg-green-50  dark:bg-blue-900/20  text-green-700  dark:text-green-300'  },
  { value: 'MANAGING',   label: 'Managing',    desc: 'Getting through, day by day',      icon: '→', colorCls: 'border-blue-200   dark:border-blue-700   bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300'   },
  { value: 'STRUGGLING', label: 'Struggling',  desc: 'Finding things difficult',         icon: '⚠', colorCls: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' },
  { value: 'IN_CRISIS',  label: 'In Crisis',   desc: 'Need immediate support',           icon: '🆘', colorCls: 'border-red-200    dark:border-red-700    bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-300'    },
];

const MOOD_CHIPS = [
  'anxious', 'hopeful', 'tired', 'stressed', 'calm',
  'sad', 'motivated', 'overwhelmed', 'grateful', 'uncertain',
];

const WELLNESS_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#f97316', 4: '#eab308', 5: '#eab308',
  6: '#84cc16', 7: '#22c55e', 8: '#22c55e', 9: '#10b981', 10: '#6366f1',
};

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  if (!opt) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${opt.colorCls}`}>
      {opt.icon} {opt.label}
    </span>
  );
}

export default function CheckInPage() {
  const [step, setStep]                     = useState<'overview' | 'form'>('overview');
  const [status, setStatus]                 = useState('');
  const [wellnessRating, setWellnessRating] = useState(5);
  const [selectedMoods, setSelectedMoods]   = useState<string[]>([]);
  const [concern, setConcern]               = useState('');
  const [needsSupport, setNeedsSupport]     = useState(false);
  const [supportType, setSupportType]       = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [notes, setNotes]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [submitted, setSubmitted]           = useState(false);
  const [dataLoaded, setDataLoaded]         = useState(false);
  const [pendingCheckins, setPendingCheckins]   = useState<any[]>([]);
  const [checkInHistory, setCheckInHistory]     = useState<any[]>([]);
  const [expandedId, setExpandedId]             = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setDataLoaded(true); return; }
      const [pr, hr] = await Promise.all([
        fetch(api('/api/check-ins/student/pending-checkins'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(api('/api/check-ins/student/my-checkins'),     { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (pr.ok) { const d = await pr.json(); setPendingCheckins(d.pending_checkins || []); }
      if (hr.ok) { const d = await hr.json(); setCheckInHistory(d.check_ins || []); }
    } finally { setDataLoaded(true); }
  };

  const toggleMood = (m: string) =>
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) { setError('Please select how you are doing'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(api('/api/check-ins/student/self-checkin'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          wellness_rating: wellnessRating,
          mood: selectedMoods.join(', '),
          concern,
          needs_support: needsSupport,
          support_type: supportType,
          support_details: supportDetails,
          notes,
        }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Failed to submit'); return; }
      setSubmitted(true);
      setStatus(''); setWellnessRating(5); setSelectedMoods([]); setConcern('');
      setNeedsSupport(false); setSupportType(''); setSupportDetails(''); setNotes('');
      await loadData();
      setTimeout(() => { setSubmitted(false); setStep('overview'); }, 3000);
    } catch { setError('Error submitting. Please try again.'); }
    finally { setLoading(false); }
  };

  const wColor = WELLNESS_COLORS[wellnessRating] ?? '#6366f1';

  return (
    <DashboardPageWrapper title="Wellness Check-In" subtitle="How are you doing today?">

      {/* ── Overview ── */}
      {step === 'overview' && (
        <>
          {pendingCheckins.length > 0 && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 text-sm">⚠</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Check-in Due</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {pendingCheckins[0].message}
                  {pendingCheckins[0].days_overdue ? ` (${pendingCheckins[0].days_overdue} days overdue)` : ''}
                </p>
              </div>
              <button
                onClick={() => setStep('form')}
                className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Check In
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Recent Check-Ins</p>
            <div className="flex gap-2">
              <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400">
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + New Check-In
              </button>
            </div>
          </div>

          {!dataLoaded ? (
            <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> Loading…
            </div>
          ) : checkInHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-2xl">✓</div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">No check-ins yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Let your support team know how you're doing</p>
              <button onClick={() => setStep('form')} className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                Submit Check-In
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {checkInHistory.slice(0, 8).map(ci => {
                const wc  = WELLNESS_COLORS[ci.wellness_rating] ?? '#6366f1';
                const exp = expandedId === ci._id;
                return (
                  <div key={ci._id} className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="h-1" style={{ background: wc }} />
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                          style={{ background: wc }}
                        >
                          {ci.wellness_rating}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={ci.status} />
                            {ci.reviewed_at && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Reviewed</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(ci.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedId(exp ? null : ci._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 flex-shrink-0"
                        >
                          {exp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {exp && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                          {ci.mood    && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Mood: </span>{ci.mood}</p>}
                          {ci.concern && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Concern: </span>{ci.concern}</p>}
                          {ci.notes   && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Notes: </span>{ci.notes}</p>}
                          {ci.staff_notes && (
                            <div className="mt-2 p-2.5 rounded-lg bg-green-50 dark:bg-blue-900/20 border border-green-100 dark:border-blue-800">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Staff Response</p>
                              <p className="text-xs text-green-600 dark:text-green-400">{ci.staff_notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Form ── */}
      {step === 'form' && (
        <div className="max-w-xl mx-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check-In Submitted!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your response will be reviewed by your support team.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">How are you doing right now?</p>
                <button type="button" onClick={() => setStep('overview')} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  ← Back
                </button>
              </div>

              {error && (
                <div className="flex gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Status cards */}
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      status === opt.value
                        ? opt.colorCls + ' border-current'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-lg block mb-1">{opt.icon}</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Wellness slider */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Wellness Rating</p>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: wColor }}
                  >
                    {wellnessRating}
                  </div>
                </div>
                <input
                  type="range" min="1" max="10" value={wellnessRating}
                  onChange={e => setWellnessRating(parseInt(e.target.value))}
                  className="w-full"
                  style={{ accentColor: wColor }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Not well</span><span>Excellent</span>
                </div>
              </div>

              {/* Mood chips */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  How are you feeling? <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {MOOD_CHIPS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMood(m)}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${
                        selectedMoods.includes(m)
                          ? 'bg-green-600 border-blue-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-blue-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concern */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4">
                <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-2">
                  Current concerns <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={concern}
                  onChange={e => setConcern(e.target.value)}
                  placeholder="Share any challenges you're facing…"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              {/* Support needed */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4">
                <label
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setNeedsSupport(!needsSupport)}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      needsSupport ? 'bg-green-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {needsSupport && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">I need support with something</span>
                </label>
                {needsSupport && (
                  <div className="mt-3 pl-8 space-y-3">
                    <select
                      value={supportType}
                      onChange={e => setSupportType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Type of support…</option>
                      <option value="COUNSELING">Counseling / Therapy</option>
                      <option value="RESOURCES">Resources / Information</option>
                      <option value="REFERRAL">Referral to another service</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <textarea
                      value={supportDetails}
                      onChange={e => setSupportDetails(e.target.value)}
                      placeholder="What specific support would help?"
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 shadow-sm dark:border-gray-700 rounded-xl p-4">
                <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-2">
                  Additional notes <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything else you'd like to share?"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('overview')}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Submitting…' : 'Submit Check-In'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
