'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { BarChart3, FileText, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
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
    if (raw) {
      try { setUserRole(JSON.parse(raw).role || 'STUDENT'); } catch {}
    }
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

      if (assessRes.ok) {
        const data = await assessRes.json();
        setAssessments(data.recent_cases || []);
      }

      if (permaRes && permaRes.ok) {
        const d = await permaRes.json();
        if (d.mhbot_username) {
          setEmaLinked(true);
          setEmaLabel(d.latest_label ?? null);
        }
      }
    } catch {}
    setLoading(false);
  };

  const CLINICAL_ROLES = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'DPO', 'ADMIN', 'STAFF'];
  const isClinical = CLINICAL_ROLES.includes(userRole);

  if (loading) {
    return (
      <DashboardPageWrapper title="Assessments" subtitle="">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardPageWrapper>
    );
  }

  /* ── Student view: no clinical scores ─────────────────────────────────── */
  if (!isClinical) {
    // EMA-based gating
    const isLocked    = emaLinked && (emaLabel === 'Struggling' || emaLabel === 'In Crisis');
    const isAssisted  = emaLinked && emaLabel === 'Surviving';

    return (
      <DashboardPageWrapper title="Assessments" subtitle="Your counseling history">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Locked: Struggling / In Crisis */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <ShieldAlert size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Assessments are currently unavailable</p>
                <p className="text-sm text-red-700 mt-1">
                  Based on your recent EMA check-in ({emaLabel}), your case has been referred to a Case Manager.
                  Please visit the CPS office or wait for a Case Manager to reach out before proceeding with any assessments.
                </p>
              </div>
            </div>
          )}

          {/* Assisted: Surviving */}
          {isAssisted && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Assisted assessment mode</p>
                <p className="text-sm text-amber-700 mt-1">
                  Based on your recent EMA check-in (Surviving), PHQ-9 and GAD-7 assessments must be
                  completed with your IC or counselor present. Please attend your scheduled session.
                </p>
              </div>
            </div>
          )}

          {/* Standard explainer (no EMA / Excelling / Thriving) */}
          {!isLocked && !isAssisted && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex gap-3">
              <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Assessments (PHQ-9, GAD-7, PSS) are administered by your counselor during sessions.
                Your counselor interprets the results with you. If you have questions, speak with your assigned counselor.
              </p>
            </div>
          )}


          {/* Summary count (no scores) */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BarChart3 size={22} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Assessment session{assessments.length !== 1 ? 's' : ''} on file</p>
            </div>
          </div>

          {/* Session list — date only, no scores */}
          {assessments.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <p className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                Sessions
              </p>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {assessments.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {a.submitted_at
                        ? new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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

  /* ── Clinical view: full data ──────────────────────────────────────────── */
  return (
    <DashboardPageWrapper title="Assessment Overview" subtitle="Intake assessment data">
      <div className="space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <BarChart3 size={24} className="text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total intakes</p>
            </div>
          </div>
        </div>

        {assessments.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <p className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
              Recent Intakes
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {assessments.slice(0, 20).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <FileText size={14} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {a.counseling_id || `Case ${i + 1}`}
                    </p>
                    {a.submitted_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {a.is_emergency && (
                    <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">Emergency</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {assessments.length === 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <FileText size={28} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No intake assessments on file</p>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
