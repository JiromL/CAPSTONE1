'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { api } from '@/utils/api';

export default function CheckInPage() {
  const [step, setStep] = useState<'pending' | 'form'>('pending');
  const [status, setStatus] = useState('');
  const [wellnessRating, setWellnessRating] = useState(5);
  const [mood, setMood] = useState('');
  const [concern, setConcern] = useState('');
  const [needsSupport, setNeedsSupport] = useState(false);
  const [supportType, setSupportType] = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [pendingCheckins, setPendingCheckins] = useState<any[]>([]);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDataLoaded(true);
        return;
      }

      const [pendingRes, historyRes] = await Promise.all([
        fetch(api('/api/check-ins/student/pending-checkins'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(api('/api/check-ins/student/my-checkins'), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingCheckins(data.pending_checkins || []);
      }
      
      if (historyRes.ok) {
        const data = await historyRes.json();
        setCheckInHistory(data.check_ins || []);
      }
      
      setDataLoaded(true);
    } catch (err) {
      console.error('Failed to load check-in data:', err);
      setDataLoaded(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!status) {
        setError('Please select how you are doing');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/check-ins/student/self-checkin'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          wellness_rating: wellnessRating,
          mood,
          concern,
          needs_support: needsSupport,
          support_type: supportType,
          support_details: supportDetails,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to submit check-in');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      // Reset form
      setStatus('');
      setWellnessRating(5);
      setMood('');
      setConcern('');
      setNeedsSupport(false);
      setSupportType('');
      setSupportDetails('');
      setNotes('');
      
      // Reload data
      await loadData();
      
      // Go back to pending after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setStep('pending');
      }, 3000);
    } catch (err) {
      setError('Error submitting check-in. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPageWrapper title="Check-In">
      {step === 'pending' && (
        <>
          {/* Pending Check-ins */}
          {pendingCheckins.length > 0 && (
            <div className="mb-6 border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Check-In Due
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                {pendingCheckins[0].message}
                {pendingCheckins[0].days_overdue && ` (${pendingCheckins[0].days_overdue} days overdue)`}
              </p>
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium text-sm transition"
              >
                Submit Check-In
              </button>
            </div>
          )}

          {/* Check-In History */}
          {checkInHistory.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
                Recent Check-Ins
              </h3>
              <div className="space-y-3">
                {checkInHistory.slice(0, 5).map((checkin) => (
                  <div
                    key={checkin._id}
                    className="border border-gray-100 dark:border-gray-800 rounded p-3 bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">
                          Status: <span className="font-semibold">{checkin.status}</span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(checkin.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-50">
                              {checkin.wellness_rating}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">/10</span>
                        </div>
                        {checkin.reviewed_at && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Reviewed</p>
                        )}
                      </div>
                    </div>
                    {checkin.mood && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Mood: {checkin.mood}
                      </p>
                    )}
                    {checkin.concern && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Concern: {checkin.concern}
                      </p>
                    )}
                    {checkin.staff_notes && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Staff Response:</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{checkin.staff_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep('form')}
                className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium text-sm"
              >
                Submit New Check-In
              </button>
            </div>
          )}

          {!dataLoaded && (
            <div className="border border-gray-200 dark:border-gray-700 rounded p-8 text-center bg-gray-50 dark:bg-gray-800">
              <Loader size={32} className="mx-auto text-gray-400 mb-4 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Loading your check-in information...
              </p>
            </div>
          )}

          {dataLoaded && !pendingCheckins.length && !checkInHistory.length && (
            <div className="border border-gray-200 dark:border-gray-700 rounded p-8 text-center bg-gray-50 dark:bg-gray-800">
              <p className="text-gray-600 dark:text-gray-400">
                No check-ins yet. Start by submitting one!
              </p>
              <button
                onClick={() => setStep('form')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition"
              >
                Submit Check-In
              </button>
            </div>
          )}
        </>
      )}

      {step === 'form' && (
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded p-6 text-center">
              <CheckCircle size={40} className="mx-auto text-green-600 dark:text-green-400 mb-3" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
                Check-In Submitted!
              </h3>
              <p className="text-green-800 dark:text-green-300 text-sm">
                Thank you for checking in. Your response will be reviewed by your support team.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* How are you doing? */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
                  How are you doing right now?
                </label>
                <div className="space-y-2">
                  {['DOING_WELL', 'MANAGING', 'STRUGGLING', 'IN_CRISIS'].map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={option}
                        checked={status === option}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option === 'DOING_WELL' && '✓ Doing well'}
                        {option === 'MANAGING' && '→ Managing'}
                        {option === 'STRUGGLING' && '⚠ Struggling'}
                        {option === 'IN_CRISIS' && '🆘 In crisis'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Wellness rating */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
                  Wellness Rating: {wellnessRating}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={wellnessRating}
                  onChange={(e) => setWellnessRating(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  1 = Not well at all, 10 = Excellent
                </p>
              </div>

              {/* Mood */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
                  How are you feeling? (optional)
                </label>
                <input
                  type="text"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="e.g., anxious, hopeful, tired..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                />
              </div>

              {/* Current concerns */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
                  Any current concerns? (optional)
                </label>
                <textarea
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  placeholder="Share any concerns or challenges you're facing..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                  rows={3}
                />
              </div>

              {/* Support needs */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={needsSupport}
                    onChange={(e) => setNeedsSupport(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    I need support with something
                  </span>
                </label>
                {needsSupport && (
                  <div className="space-y-3 mt-3 pl-7">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
                        What type of support?
                      </label>
                      <select
                        value={supportType}
                        onChange={(e) => setSupportType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="">Select support type...</option>
                        <option value="COUNSELING">Counseling/Therapy</option>
                        <option value="RESOURCES">Resources/Information</option>
                        <option value="REFERRAL">Referral to another service</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
                        Tell us more (optional)
                      </label>
                      <textarea
                        value={supportDetails}
                        onChange={(e) => setSupportDetails(e.target.value)}
                        placeholder="What specific support would help?"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Additional notes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else you'd like to share?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium text-sm transition"
                >
                  {loading ? 'Submitting...' : 'Submit Check-In'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('pending')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
