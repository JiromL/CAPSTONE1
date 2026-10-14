'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '@/utils/api';
import { LabelChip } from './EmaInsights';

// Crises marked reviewed recently, for follow-up after the flag is cleared (backend:
// GET /mhbot/cm-queue/recent-reviews). Shown at the foot of the CM Queue's "Needs action" tab.

interface CrisisReview {
  review_id: string; student_id: string; student_name: string; school_id: string; college: string;
  reviewed_at: string; reviewed_by: string; reviewed_by_role: string | null; note: string;
  current_label: string | null; in_crisis_again: boolean; case_id: string | null;
}

const REVIEW_DAYS = 14;
const ROLE_NAME: Record<string, string> = {
  CASE_MANAGER: 'Case manager', ADMIN: 'Admin', COUNSELOR: 'Counselor', PSYCHOLOGIST: 'Psychologist',
};
const ink = { primary: 'var(--color-text-primary)', secondary: 'var(--color-text-secondary)', muted: 'var(--color-text-muted)' };

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function RecentCrisisReviews() {
  const [reviews, setReviews] = useState<CrisisReview[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(api(`/api/mhbot/cm-queue/recent-reviews?days=${REVIEW_DAYS}`),
        { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } });
      if (r.status === 403) { setReviews([]); return; }
      if (!r.ok) throw new Error();
      setReviews((await r.json()).reviews || []); setError('');
    } catch { setError('Could not load recent reviews. Try refreshing.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!error && (!reviews || reviews.length === 0)) return null;

  return (
    <section className="space-y-3 max-w-5xl" aria-labelledby="recent-reviews-title">
      <div>
        <h2 id="recent-reviews-title" className="type-section-title flex items-center gap-2" style={{ color: ink.primary }}>
          <CheckCircle size={15} aria-hidden="true" style={{ color: 'var(--color-success-text)' }} /> Recently reviewed ({reviews?.length ?? 0})
        </h2>
        <p className="text-xs mt-1" style={{ color: ink.muted }}>
          Crises marked reviewed in the last {REVIEW_DAYS} days, newest first. Use this to follow up after the flag is cleared.
        </p>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>{error}</p>}
      {reviews?.map(r => (
        <article key={r.review_id} className="card p-4 flex flex-wrap items-start justify-between gap-4"
          style={r.in_crisis_again ? { borderColor: 'var(--color-danger)' } : undefined}>
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: ink.primary }}>{r.student_name}</p>
            <p className="text-xs" style={{ color: ink.muted }}>{[r.school_id, r.college].filter(Boolean).join(' · ')}</p>
            <p className="text-xs mt-2" style={{ color: ink.muted }}>
              Reviewed by <span className="font-medium" style={{ color: ink.primary }}>{r.reviewed_by}</span>
              {r.reviewed_by_role ? ` (${ROLE_NAME[r.reviewed_by_role] ?? r.reviewed_by_role})` : ''} · {fmtDateTime(r.reviewed_at)}
            </p>
            {r.note && (
              <p className="text-sm mt-1.5 rounded-lg px-3 py-2 whitespace-pre-line" style={{ background: 'var(--color-bg)', color: ink.secondary }}>{r.note}</p>
            )}
            {r.in_crisis_again && (
              <p className="flex items-center gap-1.5 text-xs font-semibold mt-2" style={{ color: 'var(--color-danger-text)' }}>
                <AlertTriangle size={13} aria-hidden="true" /> In crisis again since this review. See the list above.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: ink.muted }}>
              Now: {r.current_label ? <LabelChip label={r.current_label} /> : 'No recent data'}
            </span>
            {r.case_id ? (
              <Link href={`/cases/${r.case_id}`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-primary-text)' }}>
                View case <ExternalLink size={11} aria-hidden="true" />
              </Link>
            ) : <span className="text-xs" style={{ color: ink.muted }}>No case yet</span>}
          </div>
        </article>
      ))}
    </section>
  );
}
