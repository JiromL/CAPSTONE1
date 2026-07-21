'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { BarChart3, FileText, Info, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

type EmaLabel = 'Excelling' | 'Thriving' | 'Surviving' | 'Struggling' | 'In Crisis' | null;

export default function AssessmentsPage() {
  const [userRole, setUserRole] = useState<string>('STUDENT');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emaLabel, setEmaLabel] = useState<EmaLabel>(null);
  const [emaLinked, setEmaLinked] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) { try { setUserRole(JSON.parse(raw).role || 'STUDENT'); } catch {} }
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const role = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role || ''; } catch { return ''; } })();

      const [assessRes, permaRes] = await Promise.all([
        fetch(api('/api/intake/assessments/dashboard'), { headers }),
        role === 'STUDENT' ? fetch(api('/api/mhbot/my-perma'), { headers }) : Promise.resolve(null),
      ]);

      if (assessRes.ok) { const d = await assessRes.json(); setAssessments(d.recent_cases || []); }
      if (permaRes && permaRes.ok) {
        const d = await permaRes.json();
        if (d.mhbot_username) { setEmaLinked(true); setEmaLabel(d.latest_label ?? null); }
      }
    } catch {}
    setLoading(false);
  };

  const CLINICAL_ROLES = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'DPO', 'ADMIN', 'STAFF'];
  const isClinical = CLINICAL_ROLES.includes(userRole);

  if (loading) {
    return (
      <DashboardPageWrapper title="Assessments" subtitle="">
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  /* ── Student view ── */
  if (!isClinical) {
    const isLocked   = emaLinked && (emaLabel === 'Struggling' || emaLabel === 'In Crisis');
    const isAssisted = emaLinked && emaLabel === 'Surviving';

    return (
      <DashboardPageWrapper title="Assessments" subtitle="Your counseling history">
        <div className="max-w-lg mx-auto space-y-4">

          {isLocked && (
            <div className="rounded-xl p-4 flex gap-3 border" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
              <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Assessments are currently unavailable</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-danger)' }}>
                  Based on your recent EMA check-in ({emaLabel}), your case has been referred to a Case Manager.
                  Please visit the CPS office or wait for a Case Manager to reach out before proceeding with any assessments.
                </p>
              </div>
            </div>
          )}

          {isAssisted && (
            <div className="rounded-xl p-4 flex gap-3 border" style={{ background: 'var(--color-warning-surface)', borderColor: 'var(--color-warning)' }}>
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>Assisted assessment mode</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>
                  Based on your recent EMA check-in (Surviving), PHQ-9 and GAD-7 assessments must be
                  completed with your IC or counselor present. Please attend your scheduled session.
                </p>
              </div>
            </div>
          )}

          {!isLocked && !isAssisted && (
            <div className="rounded-xl p-4 flex gap-3 border" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
              <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                Assessments (PHQ-9, GAD-7, PSS) are administered by your counselor during sessions.
                Your counselor interprets the results with you. If you have questions, speak with your assigned counselor.
              </p>
            </div>
          )}

          <div className="border rounded-xl shadow-card p-5 flex items-center gap-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary-surface)' }}>
              <BarChart3 size={22} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{assessments.length}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Assessment session{assessments.length !== 1 ? 's' : ''} on file</p>
            </div>
          </div>

          {assessments.length > 0 && (
            <div className="border rounded-xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                Sessions
              </p>
              <div>
                {assessments.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: i < assessments.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <FileText size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {a.submitted_at
                        ? new Date(a.submitted_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' })
                        : 'Date unknown'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardPageWrapper>
    );
  }

  /* ── Clinical view ── */
  return (
    <DashboardPageWrapper title="Assessment Overview" subtitle="Intake assessment data">
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg p-3 text-sm border" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-xl shadow-card p-5 flex items-center gap-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <BarChart3 size={24} style={{ color: 'var(--color-primary)' }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{assessments.length}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total intakes</p>
            </div>
          </div>
        </div>

        {assessments.length > 0 ? (
          <div className="border rounded-xl shadow-card overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              Recent Intakes
            </p>
            <div>
              {assessments.slice(0, 20).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 transition"
                  style={{ borderBottom: i < Math.min(assessments.length, 20) - 1 ? '1px solid var(--color-border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <FileText size={14} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {a.counseling_id || `Case ${i + 1}`}
                    </p>
                    {a.submitted_at && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(a.submitted_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {a.is_emergency && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                      style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      Emergency
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border rounded-xl shadow-card p-12 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <FileText size={28} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No intake assessments on file</p>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
