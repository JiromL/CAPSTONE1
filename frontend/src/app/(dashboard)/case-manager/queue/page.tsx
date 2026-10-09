'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertTriangle, RefreshCw, User, ExternalLink, CheckCircle } from 'lucide-react';
import { TriageFlags, TriageReasons, ClearCrisisButton } from '@/components/PermaTriage';

interface QueueStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  school_id: string;
  college: string;
  mhbot_username: string;
  triage_label: 'Struggling' | 'In Crisis';
  flags: string[];
  reasons: string[];
  crisis_pending_review: boolean;
  latest_label: string | null;
  latest_date: string | null;
  case_id: string | null;
  case_status: string | null;
}

interface CrisisReview {
  review_id: string;
  student_id: string;
  student_name: string;
  school_id: string;
  college: string;
  reviewed_at: string;
  reviewed_by: string;
  reviewed_by_role: string | null;
  note: string;
  current_label: string | null;
  in_crisis_again: boolean;
  case_id: string | null;
}

const REVIEW_DAYS = 14;
const ROLE_NAME: Record<string, string> = {
  CASE_MANAGER: 'Case manager', ADMIN: 'Admin', COUNSELOR: 'Counselor', PSYCHOLOGIST: 'Psychologist',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function labelStyle(label: string): { badge: React.CSSProperties; dot: React.CSSProperties } {
  if (label === 'In Crisis') return {
    badge: { background: 'var(--color-danger-surface)', color: 'var(--color-danger)' },
    dot:   { background: 'var(--color-danger)' },
  };
  return {
    badge: { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' },
    dot:   { background: 'var(--color-warning)' },
  };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CaseManagerQueuePage() {
  const [students, setStudents] = useState<QueueStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [reviews, setReviews] = useState<CrisisReview[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(api('/api/mhbot/cm-queue'), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to load queue'); }
      const d = await r.json();
      setStudents(d.students || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
    // Recent reviews load separately so a problem here never hides the queue itself
    try {
      const r = await fetch(api(`/api/mhbot/cm-queue/recent-reviews?days=${REVIEW_DAYS}`), { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 403) { setReviews([]); setReviewsError(null); return; }
      if (!r.ok) throw new Error();
      const d = await r.json();
      setReviews(d.reviews || []); setReviewsError(null);
    } catch { setReviewsError('Could not load recent reviews. Try refreshing.'); }
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return s.student_name.toLowerCase().includes(q) || s.school_id.toLowerCase().includes(q) || s.college.toLowerCase().includes(q);
  });

  const crisis    = filtered.filter(s => s.triage_label === 'In Crisis');
  const struggling = filtered.filter(s => s.triage_label === 'Struggling');

  const q = search.trim().toLowerCase();
  const filteredReviews = reviews.filter(r => !q ||
    [r.student_name, r.school_id, r.college, r.reviewed_by].some(v => (v || '').toLowerCase().includes(q)));

  const StudentCard = ({ s }: { s: QueueStudent }) => {
    const { badge, dot } = labelStyle(s.triage_label);
    return (
      <div className="border rounded-xl p-4 flex items-start justify-between gap-4 transition"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-bg)' }}>
            <User size={16} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{s.student_name || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.school_id || s.student_email}</p>
            {s.college && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.college}</p>}
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Last EMA check-in: {fmtDate(s.latest_date)}{s.latest_label && s.latest_label !== s.triage_label ? ` (${s.latest_label})` : ''}
            </p>
            <div className="mt-2 space-y-1.5">
              <TriageFlags flags={s.flags} />
              <TriageReasons reasons={s.reasons} />
              {s.crisis_pending_review && <div className="pt-1"><ClearCrisisButton studentId={s.student_id} onCleared={load} /></div>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={badge}>
            <span className="w-1.5 h-1.5 rounded-full" style={dot} />
            {s.triage_label}
          </span>
          {s.case_id ? (
            <Link href={`/cases/${s.case_id}`}
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}>
              View Case <ExternalLink size={11} />
            </Link>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No case yet</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardPageWrapper title="CM Queue" subtitle="Students flagged as Struggling or In Crisis via EMA">
      <div className="space-y-5">

        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary)' }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-primary)' }}>
            <span className="font-semibold">About this queue: </span>
            Students whose worst EMA result in the last 7 days was Struggling or In Crisis. An In Crisis result stays here until it&apos;s marked reviewed, even if later check-ins look better. Not all may have an open case yet — use this list to prioritize outreach and case creation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search name, ID or college…"
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            className="flex-1 px-3 py-2 text-sm rounded-lg outline-none transition"
            style={{
              background: 'var(--color-bg)',
              border: `1px solid ${searchFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
            }} />
          <button onClick={load} disabled={loading} title="Refresh"
            className="p-2 rounded-lg border transition disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-lg border text-sm"
            style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              {error.includes('EMA') && (
                <p className="mt-1 text-xs">
                  Go to <Link href="/mhbot" className="underline">EMA page</Link> to connect your account first.
                </p>
              )}
            </div>
          </div>
        )}

        {loading && !error && (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading queue…</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No flagged students</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'No results match your search.' : 'All tracked students are Surviving or above.'}
            </p>
          </div>
        )}

        {crisis.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-danger)' }}>
                In Crisis ({crisis.length})
              </p>
            </div>
            {crisis.map(s => <StudentCard key={s.student_id} s={s} />)}
          </div>
        )}

        {struggling.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-warning)' }}>
              Struggling ({struggling.length})
            </p>
            {struggling.map(s => <StudentCard key={s.student_id} s={s} />)}
          </div>
        )}

        {!loading && (filteredReviews.length > 0 || reviewsError) && (
          <section className="space-y-3 pt-2" aria-labelledby="recent-reviews-title">
            <div>
              <h2 id="recent-reviews-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-success-text)' }}>
                <CheckCircle size={14} aria-hidden="true" /> Recently reviewed ({filteredReviews.length})
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Crises marked reviewed in the last {REVIEW_DAYS} days, newest first. Use this to follow up after the flag is cleared.
              </p>
            </div>
            {reviewsError && <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>{reviewsError}</p>}
            {filteredReviews.map(r => {
              const { badge, dot } = labelStyle(r.current_label || '');
              const calm = !r.current_label || !['In Crisis', 'Struggling'].includes(r.current_label);
              return (
                <div key={r.review_id} className="border rounded-xl p-4 flex items-start justify-between gap-4"
                  style={{ background: 'var(--color-surface)', borderColor: r.in_crisis_again ? 'var(--color-danger)' : 'var(--color-border)' }}>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{r.student_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {[r.school_id, r.college].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      Reviewed by <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.reviewed_by}</span>
                      {r.reviewed_by_role ? ` (${ROLE_NAME[r.reviewed_by_role] ?? r.reviewed_by_role})` : ''} · {fmtDateTime(r.reviewed_at)}
                    </p>
                    {r.note && (
                      <p className="text-sm mt-1.5 rounded-lg px-3 py-2 whitespace-pre-line" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                        {r.note}
                      </p>
                    )}
                    {r.in_crisis_again && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold mt-2" style={{ color: 'var(--color-danger-text)' }}>
                        <AlertTriangle size={13} aria-hidden="true" /> In crisis again since this review. See In Crisis above.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={calm ? { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' } : badge}>
                      {!calm && <span className="w-1.5 h-1.5 rounded-full" style={dot} />}
                      Now: {r.current_label || 'No recent data'}
                    </span>
                    {r.case_id ? (
                      <Link href={`/cases/${r.case_id}`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                        View Case <ExternalLink size={11} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No case yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
