'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';

const STATUS_OPTIONS = [
  { value: 'DOING_WELL', label: 'Doing Well',  desc: 'Everything is going smoothly',    icon: '✓', bg: 'var(--color-success-surface)',  color: 'var(--color-success)',  border: 'var(--color-success)'  },
  { value: 'MANAGING',   label: 'Managing',    desc: 'Getting through, day by day',      icon: '→', bg: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: 'var(--color-primary)' },
  { value: 'STRUGGLING', label: 'Struggling',  desc: 'Finding things difficult',         icon: '⚠', bg: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: 'var(--color-warning)' },
  { value: 'IN_CRISIS',  label: 'In Crisis',   desc: 'Need immediate support',           icon: '🆘', bg: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: 'var(--color-danger)'  },
];

const MOOD_CHIPS = ['anxious','hopeful','tired','stressed','calm','sad','motivated','overwhelmed','grateful','uncertain'];

const WELLNESS_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#f97316', 4: '#eab308', 5: '#eab308',
  6: '#84cc16', 7: '#22c55e', 8: '#22c55e', 9: '#10b981', 10: '#6366f1',
};

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  if (!opt) return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{status}</span>;
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: opt.bg, color: opt.color, border: `1px solid ${opt.border}` }}>
      {opt.icon} {opt.label}
    </span>
  );
}

export default function CheckInPage() {
  const [step, setStep]               = useState<'overview' | 'form'>('overview');
  const [status, setStatus]           = useState('');
  const [wellnessRating, setWellnessRating] = useState(5);
  const [selectedMoods, setSelectedMoods]   = useState<string[]>([]);
  const [concern, setConcern]         = useState('');
  const [needsSupport, setNeedsSupport] = useState(false);
  const [supportType, setSupportType] = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [notes, setNotes]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [submitted, setSubmitted]     = useState(false);
  const [dataLoaded, setDataLoaded]   = useState(false);
  const [pendingCheckins, setPendingCheckins] = useState<any[]>([]);
  const [checkInHistory, setCheckInHistory]   = useState<any[]>([]);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [fieldFocus, setFieldFocus]           = useState<Record<string, boolean>>({});

  const onFIn  = (k: string) => setFieldFocus(f => ({ ...f, [k]: true  }));
  const onFOut = (k: string) => setFieldFocus(f => ({ ...f, [k]: false }));
  const ICS = (k: string): React.CSSProperties => ({
    background: 'var(--color-bg)',
    border: `1px solid ${fieldFocus[k] ? 'var(--color-primary)' : 'var(--color-border)'}`,
    color: 'var(--color-text-primary)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    resize: 'none' as const,
  });

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
        body: JSON.stringify({ status, wellness_rating: wellnessRating, mood: selectedMoods.join(', '), concern, needs_support: needsSupport, support_type: supportType, support_details: supportDetails, notes }),
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

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="border rounded-xl shadow-card p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {children}
    </div>
  );

  return (
    <DashboardPageWrapper title="Wellness Check-In" subtitle="How are you doing today?">

      {/* Overview */}
      {step === 'overview' && (
        <>
          {pendingCheckins.length > 0 && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border p-4"
              style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{ background: 'var(--color-warning)', color: 'white' }}>⚠</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>Check-in Due</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                  {pendingCheckins[0].message}
                  {pendingCheckins[0].days_overdue ? ` (${pendingCheckins[0].days_overdue} days overdue)` : ''}
                </p>
              </div>
              <button onClick={() => setStep('form')}
                className="flex-shrink-0 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-warning)' }}>
                Check In
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Check-Ins</p>
            <div className="flex gap-2">
              <button onClick={loadData} className="p-2 rounded-lg transition"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <RefreshCw size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>
              <button onClick={() => setStep('form')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                + New Check-In
              </button>
            </div>
          </div>

          {!dataLoaded ? (
            <div className="flex items-center justify-center h-40 gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Loading…
            </div>
          ) : checkInHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center border rounded-xl shadow-card"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                style={{ background: 'var(--color-success-surface)' }}>✓</div>
              <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No check-ins yet</p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Let your support team know how you're doing</p>
              <button onClick={() => setStep('form')}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                Submit Check-In
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {checkInHistory.slice(0, 8).map(ci => {
                const wc  = WELLNESS_COLORS[ci.wellness_rating] ?? '#6366f1';
                const exp = expandedId === ci._id;
                return (
                  <div key={ci._id} className="border rounded-xl overflow-hidden shadow-card"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="h-1" style={{ background: wc }} />
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                          style={{ background: wc }}>
                          {ci.wellness_rating}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={ci.status} />
                            {ci.reviewed_at && (
                              <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>✓ Reviewed</span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(ci.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <button onClick={() => setExpandedId(exp ? null : ci._id)}
                          className="p-1.5 rounded-lg flex-shrink-0 transition"
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {exp ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                        </button>
                      </div>

                      {exp && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                          {ci.mood    && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}><span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Mood: </span>{ci.mood}</p>}
                          {ci.concern && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}><span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Concern: </span>{ci.concern}</p>}
                          {ci.notes   && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}><span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Notes: </span>{ci.notes}</p>}
                          {ci.staff_notes && (
                            <div className="mt-2 p-2.5 rounded-lg border"
                              style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
                              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-success)' }}>Staff Response</p>
                              <p className="text-xs" style={{ color: 'var(--color-success)' }}>{ci.staff_notes}</p>
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

      {/* Form */}
      {step === 'form' && (
        <div className="max-w-xl mx-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--color-success-surface)' }}>
                <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Check-In Submitted!</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your response will be reviewed by your support team.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>How are you doing right now?</p>
                <button type="button" onClick={() => setStep('overview')} className="text-xs transition hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Back</button>
              </div>

              {error && (
                <div className="flex gap-2.5 rounded-xl border p-3"
                  style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
                </div>
              )}

              {/* Status cards */}
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => {
                  const isSelected = status === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                      className="text-left p-3.5 rounded-xl border-2 transition-all"
                      style={isSelected
                        ? { background: opt.bg, borderColor: opt.border, color: opt.color }
                        : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                      <span className="text-lg block mb-1">{opt.icon}</span>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: isSelected ? opt.color : 'var(--color-text-muted)', opacity: isSelected ? 0.8 : 1 }}>{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Wellness slider */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Wellness Rating</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: wColor }}>
                    {wellnessRating}
                  </div>
                </div>
                <input type="range" min="1" max="10" value={wellnessRating}
                  onChange={e => setWellnessRating(parseInt(e.target.value))}
                  className="w-full" style={{ accentColor: wColor }} />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Not well</span><span>Excellent</span>
                </div>
              </Card>

              {/* Mood chips */}
              <Card>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  How are you feeling? <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {MOOD_CHIPS.map(m => {
                    const sel = selectedMoods.includes(m);
                    return (
                      <button key={m} type="button" onClick={() => toggleMood(m)}
                        className="px-3 py-1 rounded-full text-sm border transition-all"
                        style={sel
                          ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'white' }
                          : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Concern */}
              <Card>
                <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Current concerns <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={3}
                  placeholder="Share any challenges you're facing…" style={ICS('concern')}
                  onFocus={() => onFIn('concern')} onBlur={() => onFOut('concern')} />
              </Card>

              {/* Support */}
              <Card>
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => setNeedsSupport(!needsSupport)}>
                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={needsSupport
                      ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                      : { borderColor: 'var(--color-border)' }}>
                    {needsSupport && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>I need support with something</span>
                </label>
                {needsSupport && (
                  <div className="mt-3 pl-8 space-y-3">
                    <select value={supportType} onChange={e => setSupportType(e.target.value)} style={ICS('stype')}
                      onFocus={() => onFIn('stype')} onBlur={() => onFOut('stype')}>
                      <option value="">Type of support…</option>
                      <option value="COUNSELING">Counseling / Therapy</option>
                      <option value="RESOURCES">Resources / Information</option>
                      <option value="REFERRAL">Referral to another service</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <textarea value={supportDetails} onChange={e => setSupportDetails(e.target.value)} rows={2}
                      placeholder="What specific support would help?" style={ICS('sdetail')}
                      onFocus={() => onFIn('sdetail')} onBlur={() => onFOut('sdetail')} />
                  </div>
                )}
              </Card>

              {/* Notes */}
              <Card>
                <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Additional notes <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Anything else you'd like to share?" style={ICS('notes')}
                  onFocus={() => onFIn('notes')} onBlur={() => onFOut('notes')} />
              </Card>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep('overview')}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl border transition"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-sm text-white font-medium rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}>
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
