"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { CheckInForm, CheckInHistory } from '@/components/CheckInForm';
import { useIntakeApi, useCheckInApi } from '@/utils/useApi';
import { AlertCircle, Loader, Plus, FileText, Target } from 'lucide-react';
import { api } from '@/utils/api';

interface SessionNote {
  note_id: string;
  session_date: string;
  session_type: string;
  mood_rating?: number;
  symptom_severity?: string;
  risk_flagged?: boolean;
  counselor?: string;
  topics_discussed?: string;
  interventions?: string;
  client_response?: string;
  homework_assigned?: string;
  progress_on_goals?: string;
}

const emptyNote = {
  session_date: '',
  session_type: 'INDIVIDUAL',
  topics_discussed: '',
  interventions: '',
  client_response: '',
  homework_assigned: '',
  mood_rating: 5,
  symptom_severity: 'MILD',
  progress_on_goals: '',
  risk_flagged: false,
  risk_notes: '',
};

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const { getCase, updateCaseStatus, loading: intakeLoading } = useIntakeApi();
  const { createCheckIn, getCheckInHistory, loading: checkInLoading } = useCheckInApi();

  const [caseData, setCaseData] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'session-notes' | 'treatment-plan' | 'check-ins'>('details');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ ...emptyNote, session_date: '' });
  const [savingNote, setSavingNote] = useState(false);

  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setNoteForm((f) => ({ ...f, session_date: now.toISOString().slice(0, 16) }));
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setError(null);
      const [caseRes, historyRes] = await Promise.all([
        getCase(caseId),
        getCheckInHistory(caseId),
      ]);
      setCaseData(caseRes);
      setCheckInHistory(historyRes?.check_ins || []);
      if (caseRes?.treatment_plan) setTreatmentPlan(caseRes.treatment_plan);
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
    }
  };

  const loadSessionNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/counseling/case/${caseId}/session-history`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessionNotes(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load session notes:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'session-notes') loadSessionNotes();
  }, [activeTab]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdateStatus = async (clientStatus: string) => {
    try {
      setError(null);
      await updateCaseStatus(caseId, clientStatus, 'Updated via case detail');
      await loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCheckIn = async (data: any) => {
    try {
      setError(null);
      await createCheckIn({ ...data, case_id: caseId });
      await loadCaseData();
      setActiveTab('check-ins');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/counseling/case/${caseId}/session-note`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save session note');
      }
      showSuccess('Session note saved');
      setShowNoteForm(false);
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setNoteForm({ ...emptyNote, session_date: now.toISOString().slice(0, 16) });
      await loadSessionNotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveTreatmentPlan = async () => {
    try {
      setSavingPlan(true);
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/cases/${caseId}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatment_plan: treatmentPlan }),
      });
      if (!res.ok) throw new Error('Failed to save treatment plan');
      setEditingPlan(false);
      showSuccess('Treatment plan updated');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  if (!caseData && !error) {
    return (
      <DashboardPageWrapper title="Case Details" subtitle="">
        <div className="flex items-center justify-center p-8">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      </DashboardPageWrapper>
    );
  }

  const tabs = [
    { id: 'details' as const, label: 'Case Details' },
    { id: 'session-notes' as const, label: `Session Notes (${sessionNotes.length})` },
    { id: 'treatment-plan' as const, label: 'Treatment Plan' },
    { id: 'check-ins' as const, label: `Check-Ins (${checkInHistory.length})` },
  ];

  return (
    <DashboardPageWrapper
      title={`Case: ${caseData?.case_number || caseData?.student_id || 'Unknown'}`}
      subtitle={`Status: ${caseData?.client_status || caseData?.case_status || 'N/A'}`}
    >
      {error && (
        <div className="mb-4 flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-lg leading-none">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Details Tab ─────────────────────────────────────────── */}
      {activeTab === 'details' && caseData && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">Case Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Student ID</p>
                <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">{caseData.student_id}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Client Status</p>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                  {caseData.client_status || 'N/A'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Risk Level</p>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  caseData.risk_level === 'RED' ? 'bg-red-100 text-red-800' :
                  caseData.risk_level === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {caseData.risk_level || 'GREEN'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">
                  {caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {caseData.target_sessions != null && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Sessions</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">
                    {caseData.session_count || 0} / {caseData.target_sessions}
                  </p>
                </div>
              )}
              {caseData.transaction_type && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Transaction Type</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50 mt-0.5">{caseData.transaction_type}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-3">Update Client Status</h3>
            <select
              value={caseData.client_status || 'ACTIVE'}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              disabled={intakeLoading}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            >
              <option value="ACTIVE">ACTIVE — Ongoing Counseling</option>
              <option value="INACTIVE">INACTIVE — Not Receiving Services</option>
              <option value="CHECK_IN_ONLY">CHECK_IN_ONLY — Periodic Monitoring</option>
              <option value="WITH_MH_CHECK_IN">WITH_MH_CHECK_IN — Collaborative Care</option>
              <option value="UNDER_ACCOMMODATION">UNDER_ACCOMMODATION — SDFO</option>
              <option value="TERMINATION_PENDING">TERMINATION_PENDING — Closing Out</option>
            </select>
          </div>

          {caseData.presenting_issue && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-2">Presenting Issue</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{caseData.presenting_issue}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Session Notes Tab ──────────────────────────────────── */}
      {activeTab === 'session-notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Session Notes</h3>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus size={15} /> Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">New Session Note</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Session Date & Time</label>
                  <input
                    type="datetime-local"
                    value={noteForm.session_date}
                    onChange={(e) => setNoteForm({ ...noteForm, session_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Session Type</label>
                  <select
                    value={noteForm.session_type}
                    onChange={(e) => setNoteForm({ ...noteForm, session_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="GROUP">Group</option>
                    <option value="CRISIS">Crisis</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="INTAKE">Intake</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mood Rating (1–10)</label>
                  <input
                    type="number" min="1" max="10"
                    value={noteForm.mood_rating}
                    onChange={(e) => setNoteForm({ ...noteForm, mood_rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Symptom Severity</label>
                  <select
                    value={noteForm.symptom_severity}
                    onChange={(e) => setNoteForm({ ...noteForm, symptom_severity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  >
                    <option value="NONE">None</option>
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                  </select>
                </div>
                {(['topics_discussed', 'interventions', 'client_response', 'progress_on_goals'] as const).map((field) => (
                  <div key={field} className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                    <textarea
                      value={noteForm[field] as string}
                      onChange={(e) => setNoteForm({ ...noteForm, [field]: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Homework / Tasks Assigned</label>
                  <input
                    type="text"
                    value={noteForm.homework_assigned}
                    onChange={(e) => setNoteForm({ ...noteForm, homework_assigned: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="risk_flagged"
                    checked={noteForm.risk_flagged}
                    onChange={(e) => setNoteForm({ ...noteForm, risk_flagged: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="risk_flagged" className="text-sm font-medium text-red-700 dark:text-red-400">Flag as Risk Concern</label>
                </div>
                {noteForm.risk_flagged && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Notes</label>
                    <textarea
                      value={noteForm.risk_notes}
                      onChange={(e) => setNoteForm({ ...noteForm, risk_notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {savingNote ? 'Saving…' : 'Save Note'}
                </button>
                <button
                  onClick={() => setShowNoteForm(false)}
                  className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {sessionNotes.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FileText size={28} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No session notes yet.</p>
              <p className="text-xs text-gray-500 mt-1">Click "Add Note" to record a session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionNotes.map((note) => (
                <div key={note.note_id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {new Date(note.session_date).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{note.session_type}{note.counselor ? ` · ${note.counselor}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {note.risk_flagged && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Risk</span>
                      )}
                      {note.mood_rating && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Mood {note.mood_rating}/10</span>
                      )}
                      {note.symptom_severity && note.symptom_severity !== 'NONE' && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">{note.symptom_severity}</span>
                      )}
                    </div>
                  </div>
                  {note.topics_discussed && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Topics</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{note.topics_discussed}</p>
                    </div>
                  )}
                  {note.interventions && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Interventions</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{note.interventions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Treatment Plan Tab ─────────────────────────────────── */}
      {activeTab === 'treatment-plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Treatment Plan</h3>
            {!editingPlan && (
              <button
                onClick={() => setEditingPlan(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Target size={15} /> {treatmentPlan ? 'Edit Plan' : 'Create Plan'}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editingPlan ? (
              <>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Treatment Plan</label>
                <textarea
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  rows={12}
                  placeholder="Describe the treatment goals, planned interventions, and expected outcomes…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSaveTreatmentPlan}
                    disabled={savingPlan}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                  >
                    {savingPlan ? 'Saving…' : 'Save Plan'}
                  </button>
                  <button
                    onClick={() => { setEditingPlan(false); setTreatmentPlan(caseData?.treatment_plan || ''); }}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : treatmentPlan ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{treatmentPlan}</p>
            ) : (
              <div className="text-center py-10">
                <Target size={28} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No treatment plan on file.</p>
                <p className="text-xs text-gray-500 mt-1">Click "Create Plan" to add a treatment plan for this case.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Check-Ins Tab ──────────────────────────────────────── */}
      {activeTab === 'check-ins' && (
        <div className="space-y-6">
          <CheckInForm caseId={caseId} onSubmit={handleCreateCheckIn} isLoading={checkInLoading} />
          {checkInHistory.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">Check-In History</h3>
              <CheckInHistory checkIns={checkInHistory} isLoading={checkInLoading} />
            </div>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
