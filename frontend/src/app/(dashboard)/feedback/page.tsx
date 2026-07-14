'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Star, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

const CATEGORIES = [
  { value: 'general',   label: 'General Experience', icon: '🏢', desc: 'Overall impression of CPS services' },
  { value: 'session',   label: 'Counseling Session',  icon: '🗣', desc: 'Feedback on a counseling session' },
  { value: 'program',   label: 'Program / Workshop',  icon: '📋', desc: 'Events, group sessions, or workshops' },
  { value: 'resources', label: 'Wellness Resources',  icon: '📚', desc: 'Materials, guides, online resources' },
  { value: 'staff',     label: 'Staff Experience',    icon: '👤', desc: 'Administrative or support staff' },
  { value: 'other',     label: 'Other',               icon: '💬', desc: 'Something else entirely' },
];

const SESSION_FORMATS = [
  { value: 'walk_in',   label: 'Walk-in',                       icon: '🚶' },
  { value: 'in_person', label: 'In-person (booked)',            icon: '🏠' },
  { value: 'online',    label: 'Online (Google Meet / Zoom)',   icon: '💻' },
  { value: 'phone',     label: 'Phone call',                    icon: '📞' },
];

type RecommendValue = 'yes' | 'maybe' | 'no';
function recommendStyle(v: RecommendValue, selected: boolean): React.CSSProperties {
  if (!selected) return { border: '2px solid var(--color-border)' };
  switch (v) {
    case 'yes':   return { border: '2px solid var(--color-success)', background: 'var(--color-success-surface)' };
    case 'maybe': return { border: '2px solid var(--color-warning)', background: 'var(--color-warning-surface)' };
    case 'no':    return { border: '2px solid var(--color-danger)',  background: 'var(--color-danger-surface)' };
  }
}

const RECOMMEND_OPTIONS: { value: RecommendValue; label: string; icon: string }[] = [
  { value: 'yes',   label: 'Yes, definitely', icon: '👍' },
  { value: 'maybe', label: 'Maybe',           icon: '🤔' },
  { value: 'no',    label: 'No',              icon: '👎' },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Excellent',
};

interface CompletedAppt {
  _id: string;
  counselor_name?: string;
  scheduled_start?: string;
  requested_start?: string;
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

export default function FeedbackPage() {
  const [rating, setRating]           = useState(0);
  const [hover, setHover]             = useState(0);
  const [category, setCategory]       = useState('');
  const [sessionFormat, setSessionFormat] = useState('');
  const [hadSession, setHadSession]   = useState<boolean | null>(null);
  const [content, setContent]         = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<RecommendValue>('yes');
  const [loading, setLoading]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [completedAppts, setCompletedAppts] = useState<CompletedAppt[]>([]);
  const [appointmentId, setAppointmentId]   = useState('');
  const [fContent, setFContent]       = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/appointments/my-appointments'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const done: CompletedAppt[] = (data.appointments || []).filter(
          (a: CompletedAppt & { status: string }) => a.status === 'COMPLETED'
        );
        setCompletedAppts(done);
      })
      .catch(() => {});
  }, []);

  const showSessionFormat = category === 'session';
  const displayRating     = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('Please select what your feedback is about'); return; }
    if (!rating)   { setError('Please select a star rating'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) { setError('Not authenticated'); setLoading(false); return; }
      const r = await fetch(api('/api/engagement/feedback'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category,
          content,
          would_recommend: wouldRecommend,
          session_format: showSessionFormat ? sessionFormat || null : null,
          had_session:    hadSession,
          appointment_id: showSessionFormat && appointmentId ? appointmentId : undefined,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed to submit'); }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setRating(0); setHover(0); setCategory(''); setSessionFormat('');
    setHadSession(null); setContent(''); setWouldRecommend('yes');
    setAppointmentId(''); setSubmitted(false); setError(null);
  };

  if (submitted) {
    return (
      <DashboardPageWrapper title="Feedback" subtitle="Share your thoughts">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'var(--color-success-surface)' }}>
            <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Thank you!</h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Your feedback has been submitted. It helps us improve our services for everyone.
          </p>
          <button onClick={reset}
            className="px-6 py-2.5 text-white text-sm font-medium rounded-lg transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}>
            Submit Another
          </button>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Feedback" subtitle="Help us improve our services">
      <div className="max-w-xl mx-auto">

        {error && (
          <div className="mb-5 flex gap-2.5 rounded-xl p-4"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Category */}
          <Card>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>What is your feedback about?</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>You can give feedback even if you haven't had a session yet.</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => {
                const sel = category === c.value;
                return (
                  <button key={c.value} type="button"
                    onClick={() => { setCategory(c.value); if (c.value !== 'session') setSessionFormat(''); }}
                    className="text-left p-3 rounded-xl transition-all"
                    style={sel
                      ? { border: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                      : { border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <span className="text-xl block mb-1">{c.icon}</span>
                    <p className="text-sm font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{c.label}</p>
                    <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--color-text-muted)' }}>{c.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Session format */}
          {showSessionFormat && (
            <Card>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Session format <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SESSION_FORMATS.map(f => {
                      const sel = sessionFormat === f.value;
                      return (
                        <button key={f.value} type="button"
                          onClick={() => setSessionFormat(sel ? '' : f.value)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
                          style={sel
                            ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'white', border: '1px solid var(--color-primary)' }
                            : { border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                          <span>{f.icon}</span> {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {completedAppts.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Which session are you rating? <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                    </p>
                    <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                      <option value="">Select a session…</option>
                      {completedAppts.map(a => {
                        const dt = a.scheduled_start || a.requested_start;
                        const label = dt ? new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Session';
                        return <option key={a._id} value={a._id}>{label}{a.counselor_name ? ` · ${a.counselor_name}` : ''}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Rating */}
          <Card>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>How would you rate your experience?</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110 focus:outline-none">
                  <Star size={36}
                    className="transition-colors"
                    style={{ color: s <= displayRating ? '#FBBF24' : 'var(--color-border)', fill: s <= displayRating ? '#FBBF24' : 'none' }} />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium min-w-[80px]" style={{ color: 'var(--color-text-secondary)' }}>
                {displayRating ? RATING_LABELS[displayRating] : 'Select…'}
              </span>
            </div>
          </Card>

          {/* Recommend */}
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Would you recommend our services?</p>
            <div className="flex gap-3">
              {RECOMMEND_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setWouldRecommend(opt.value)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                  style={recommendStyle(opt.value, wouldRecommend === opt.value)}>
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Comments */}
          <Card>
            <label className="text-sm font-semibold block mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Tell us more <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Share any comments, suggestions, or specific experiences…"
              maxLength={1000} rows={4} style={{
                width: '100%',
                padding: '0.75rem 0.875rem',
                fontSize: '0.875rem',
                borderRadius: '0.5rem',
                outline: 'none',
                resize: 'none',
                background: 'var(--color-bg)',
                border: `1px solid ${fContent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: 'var(--color-text-primary)',
              }}
              onFocus={() => setFContent(true)} onBlur={() => setFContent(false)} />
            <div className="flex justify-end mt-1.5">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{content.length}/1000</span>
            </div>
          </Card>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {loading ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </DashboardPageWrapper>
  );
}
