"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertCircle, Calendar, Clock, User, CheckCircle, Loader } from 'lucide-react';
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

export default function CounselorEmergencyPage() {
  const [emergencies, setEmergencies] = useState<EmergencyIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    appointment_date: '',
    appointment_time: '',
    notes: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEmergencies();
  }, []);

  const loadEmergencies = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/intake/emergency'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setEmergencies(data.emergency_intakes || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load emergencies' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading emergency intakes' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (intakeId: string) => {
    if (!assignmentData.appointment_date || !assignmentData.appointment_time) {
      setMessage({ type: 'error', text: 'Please provide appointment date and time' });
      return;
    }

    setAssigning(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(api(`/api/intake/emergency/${intakeId}/assign`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          counselor_id: userData.user_id,
          appointment_date: assignmentData.appointment_date,
          appointment_time: assignmentData.appointment_time,
          notes: assignmentData.notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Emergency intake assigned successfully' });
        setSelectedId(null);
        setAssignmentData({ appointment_date: '', appointment_time: '', notes: '' });
        await loadEmergencies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to assign intake' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error assigning emergency intake' });
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreSeverity = (score: number, max: number) => {
    const percent = (score / max) * 100;
    if (percent >= 80) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (percent >= 60) return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    if (percent >= 40) return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-blue-900/20' };
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Emergency Intakes" subtitle="Manage urgent student requests">
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Emergency Intakes" subtitle="Manage urgent student requests">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-blue-900/20 text-blue-700 dark:text-green-400 border border-green-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {emergencies.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <CheckCircle className="mx-auto mb-4 text-green-600 dark:text-green-400" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">No Emergency Intakes</h3>
          <p className="text-gray-600 dark:text-gray-400">All emergency intakes have been reviewed and assigned.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {emergencies.map((intake) => {
            const isSelected = selectedId === intake._id;
            const phq9Severity = getScoreSeverity(intake.phq9_score, 27);
            const gad7Severity = getScoreSeverity(intake.gad7_score, 21);

            return (
              <div
                key={intake._id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 hover:shadow-md transition"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedId(isSelected ? null : intake._id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                            {intake.is_anonymous ? 'Anonymous Submission' : intake.student_name}
                          </h3>
                          <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                            {intake.counseling_id}
                          </code>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(intake.submitted_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Widgets */}
                    <div className="flex gap-3 ml-4">
                      <div className={`px-3 py-2 rounded ${phq9Severity.bg}`}>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">PHQ-9</div>
                        <div className={`text-2xl font-bold ${phq9Severity.color}`}>
                          {intake.phq9_score}
                        </div>
                      </div>
                      <div className={`px-3 py-2 rounded ${gad7Severity.bg}`}>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">GAD-7</div>
                        <div className={`text-2xl font-bold ${gad7Severity.color}`}>
                          {intake.gad7_score}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Assignment Form */}
                  {isSelected && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Schedule Appointment</h4>

                      <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Appointment Date *
                            </label>
                            <input
                              type="date"
                              value={assignmentData.appointment_date}
                              onChange={(e) =>
                                setAssignmentData({ ...assignmentData, appointment_date: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Appointment Time *
                            </label>
                            <input
                              type="time"
                              value={assignmentData.appointment_time}
                              onChange={(e) =>
                                setAssignmentData({ ...assignmentData, appointment_time: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Internal Notes (optional)
                          </label>
                          <textarea
                            value={assignmentData.notes}
                            onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                            placeholder="Add any internal notes about this case..."
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAssign(intake._id)}
                          disabled={assigning}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          {assigning ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                        <button
                          onClick={() => setSelectedId(null)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
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
