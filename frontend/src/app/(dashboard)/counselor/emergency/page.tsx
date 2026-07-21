"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertCircle, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

interface EmergencyIntake {
  _id: string;
  counseling_id: string;
  student_name?: string;
  phq9_score: number;
  gad7_score: number;
  pss_score?: number;
  submitted_at: string;
  case_id?: string;
  is_anonymous: boolean;
}

function scoreSeverityStyle(score: number, max: number): { bg: string; color: string } {
  const pct = (score / max) * 100;
  if (pct >= 80) return { bg: 'var(--color-danger-surface)',  color: 'var(--color-danger)'  };
  if (pct >= 60) return { bg: 'var(--color-warning-surface)', color: 'var(--color-warning)' };
  if (pct >= 40) return { bg: '#FFFBEB',                      color: '#B45309'              };
  return             { bg: 'var(--color-success-surface)',     color: 'var(--color-success)' };
}

const IC  = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition';
const ICS: React.CSSProperties = { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

export default function CounselorEmergencyPage() {
  const [emergencies, setEmergencies]     = useState<EmergencyIntake[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [assigning, setAssigning]         = useState(false);
  const [assignmentData, setAssignmentData] = useState({ appointment_date: '', appointment_time: '', notes: '' });
  const [message, setMessage]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadEmergencies(); }, []);

  const loadEmergencies = async () => {
    setLoading(true); setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(api('/api/intake/emergency'), { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (res.ok) setEmergencies(data.emergency_intakes || []);
      else setMessage({ type: 'error', text: data.error || 'Failed to load emergencies' });
    } catch { setMessage({ type: 'error', text: 'Error loading emergency intakes' }); }
    finally { setLoading(false); }
  };

  const handleAssign = async (intakeId: string) => {
    if (!assignmentData.appointment_date || !assignmentData.appointment_time) {
      setMessage({ type: 'error', text: 'Please provide appointment date and time' }); return;
    }
    setAssigning(true); setMessage(null);
    try {
      const token    = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const res      = await fetch(api(`/api/intake/emergency/${intakeId}/assign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ counselor_id: userData.user_id, ...assignmentData }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Emergency intake assigned successfully' });
        setSelectedId(null);
        setAssignmentData({ appointment_date: '', appointment_time: '', notes: '' });
        await loadEmergencies();
      } else { setMessage({ type: 'error', text: data.error || 'Failed to assign intake' }); }
    } catch { setMessage({ type: 'error', text: 'Error assigning emergency intake' }); }
    finally { setAssigning(false); }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <DashboardPageWrapper title="Emergency Intakes" subtitle="Manage urgent student requests">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Emergency Intakes" subtitle="Manage urgent student requests">
      {message && (
        <div className="mb-6 p-4 rounded-lg text-sm"
          style={message.type === 'success'
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
            : { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger)'  }}>
          {message.text}
        </div>
      )}

      {emergencies.length === 0 ? (
        <div className="text-center py-12 rounded-2xl shadow-card"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <CheckCircle className="mx-auto mb-4" size={48} style={{ color: 'var(--color-success)' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>No Emergency Intakes</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>All emergency intakes have been reviewed and assigned.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {emergencies.map(intake => {
            const isSelected   = selectedId === intake._id;
            const phq9Sev      = scoreSeverityStyle(intake.phq9_score, 27);
            const gad7Sev      = scoreSeverityStyle(intake.gad7_score, 21);
            return (
              <div key={intake._id} className="rounded-lg overflow-hidden shadow-card transition"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>

                <div className="p-6 cursor-pointer" onClick={() => setSelectedId(isSelected ? null : intake._id)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertCircle className="flex-shrink-0 mt-1" size={20} style={{ color: 'var(--color-danger)' }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {intake.is_anonymous ? 'Anonymous Submission' : intake.student_name}
                          </h3>
                          <code className="px-2 py-1 rounded text-xs font-mono"
                            style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                            {intake.counseling_id}
                          </code>
                        </div>
                        <div className="flex gap-4 text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {formatDate(intake.submitted_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 ml-4">
                      {([
                        { label: 'PHQ-9', score: intake.phq9_score, sev: phq9Sev },
                        { label: 'GAD-7', score: intake.gad7_score, sev: gad7Sev },
                      ] as const).map(({ label, score, sev }) => (
                        <div key={label} className="px-3 py-2 rounded" style={{ background: sev.bg }}>
                          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                          <div className="text-2xl font-bold" style={{ color: sev.color }}>{score}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="pt-6 mt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <h4 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Schedule Appointment</h4>

                      <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                              Appointment Date *
                            </label>
                            <input type="date" value={assignmentData.appointment_date}
                              onChange={e => setAssignmentData({ ...assignmentData, appointment_date: e.target.value })}
                              className={IC} style={ICS} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                              Appointment Time *
                            </label>
                            <input type="time" value={assignmentData.appointment_time}
                              onChange={e => setAssignmentData({ ...assignmentData, appointment_time: e.target.value })}
                              className={IC} style={ICS} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            Internal Notes (optional)
                          </label>
                          <textarea value={assignmentData.notes}
                            onChange={e => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                            rows={3} placeholder="Add any internal notes about this case…"
                            className="w-full px-3 py-2 text-sm rounded-lg outline-none transition resize-none" style={ICS} />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => handleAssign(intake._id)} disabled={assigning}
                          className="px-4 py-2 text-white text-sm rounded-lg transition hover:opacity-90 disabled:opacity-50"
                          style={{ background: assigning ? 'var(--color-border)' : 'var(--color-primary)' }}>
                          {assigning ? 'Assigning…' : 'Confirm Assignment'}
                        </button>
                        <button onClick={() => setSelectedId(null)}
                          className="px-4 py-2 text-sm rounded-lg border transition"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
