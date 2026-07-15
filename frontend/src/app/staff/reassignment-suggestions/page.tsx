'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, CheckCircle, ArrowRight, User } from 'lucide-react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';

interface Suggestion {
  case_id: string;
  student_name: string;
  current_counselor: string;
  suggested_counselor: string;
  confidence: number;
  reason: string;
}

export default function ReassignmentSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/appointments/staff/reassignment-suggestions'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleApply = async (suggestion: Suggestion) => {
    setApplyingId(suggestion.case_id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases/${suggestion.case_id}/reassign`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselor_name: suggestion.suggested_counselor }),
      });
      if (!response.ok) throw new Error('Failed to apply reassignment');
      setAppliedIds(prev => new Set([...prev, suggestion.case_id]));
      setSuccessMsg(`Reassigned ${suggestion.student_name} to ${suggestion.suggested_counselor}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply reassignment');
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <PageShell title="Reassignment Suggestions" subtitle="AI-powered counselor reassignment recommendations">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reassignment Suggestions" subtitle="AI-powered counselor reassignment recommendations">
      <div className="space-y-4">
        {successMsg && (
          <div className="p-4 rounded-lg flex gap-2" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <CheckCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
            <span className="text-sm" style={{ color: 'var(--color-success-text)' }}>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg flex gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
            <span className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</span>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 rounded-lg flex gap-3" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
          <Lightbulb size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--color-warning-text)' }}>
            These suggestions are generated based on counselor workload, specialization, and student needs. Review each suggestion before applying.
          </p>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-12 rounded-lg text-center" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
            <Lightbulb size={48} className="mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No Suggestions Available</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              The system has no reassignment recommendations at this time. All cases appear to be optimally assigned.
            </p>
          </div>
        ) : (
          suggestions.map(suggestion => {
            const isApplied = appliedIds.has(suggestion.case_id);
            const isApplying = applyingId === suggestion.case_id;
            return (
              <div key={suggestion.case_id} className="rounded-lg overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={16} style={{ color: 'var(--color-text-secondary)' }} />
                        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{suggestion.student_name}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded"
                          style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary-text)' }}>
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    {isApplied ? (
                      <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded"
                        style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                        <CheckCircle size={14} /> Applied
                      </span>
                    ) : (
                      <button onClick={() => handleApply(suggestion)} disabled={isApplying}
                        className="px-4 py-1.5 text-sm font-medium rounded text-white transition disabled:opacity-50"
                        style={{ background: isApplying ? 'var(--color-border-strong)' : 'var(--color-primary)' }}
                        onMouseEnter={e => { if (!isApplying) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                        onMouseLeave={e => { if (!isApplying) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                        {isApplying ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>

                  {/* Current → Suggested */}
                  <div className="flex items-center gap-3 p-3 rounded-lg mb-3" style={{ background: 'var(--color-bg)' }}>
                    <div className="flex-1 text-sm">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Current</p>
                      <p className="font-medium" style={{ color: '#EA580C' }}>{suggestion.current_counselor}</p>
                    </div>
                    <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                    <div className="flex-1 text-sm">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Suggested</p>
                      <p className="font-medium" style={{ color: '#16A34A' }}>{suggestion.suggested_counselor}</p>
                    </div>
                  </div>

                  {/* Why */}
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-primary-text)' }}>Why this suggestion?</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{suggestion.reason}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
