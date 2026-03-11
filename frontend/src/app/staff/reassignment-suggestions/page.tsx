'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, CheckCircle, ArrowRight, User } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function ReassignmentSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments/staff/reassignment-suggestions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: any) => {
    setProcessing(suggestion.appointment_id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/appointments/${suggestion.appointment_id}/assign`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            counselor_id: suggestion.suggested_counselor_id,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to apply suggestion');
      
      setSuccessMsg(`Appointment reassigned to ${suggestion.suggested_counselor_name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      
      // Remove from suggestions
      setSuggestions(suggestions.filter((s: any) => s.appointment_id !== suggestion.appointment_id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <PageShell title="Reassignment Suggestions" subtitle="AI-powered workload balancing recommendations">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reassignment Suggestions" subtitle="AI-powered workload balancing recommendations">
      {successMsg && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-2">
          <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-green-800 dark:text-green-300">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-12 text-center">
          <Lightbulb size={48} className="mx-auto text-blue-400 mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            No Reassignments Needed
          </h3>
          <p className="text-blue-800 dark:text-blue-300">
            Workload is well balanced across all counselors. Check back later for new recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                      {suggestion.student_name || 'Student'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Appointment: {new Date(suggestion.scheduled_start).toLocaleString()}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </div>
                </div>

                {/* Current vs Suggested */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Currently Assigned */}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Currently Assigned
                      </p>
                      <div className="flex items-center gap-2">
                        <User size={20} className="text-orange-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {suggestion.current_counselor_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Load: {suggestion.current_utilization}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <ArrowRight size={24} className="text-gray-400 flex-shrink-0" />

                    {/* Suggested */}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Suggested
                      </p>
                      <div className="flex items-center gap-2">
                        <User size={20} className="text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {suggestion.suggested_counselor_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Load: {suggestion.suggested_utilization}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <span className="font-medium">Why:</span> {suggestion.reason || 'Better workload distribution'}
                  </p>
                </div>

                {/* Impact */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-sm">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Load Reduction</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">
                      -{suggestion.load_reduction}%
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Balance Improvement</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">
                      +{suggestion.balance_improvement}%
                    </p>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => applySuggestion(suggestion)}
                  disabled={processing === suggestion.appointment_id}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                >
                  {processing === suggestion.appointment_id ? 'Applying...' : 'Apply Suggestion'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          <span className="font-medium">💡 Tip:</span> These recommendations are based on current workload distribution, 
          counselor expertise, and appointment type. Review and approve each suggestion before applying.
        </p>
      </div>
    </PageShell>
  );
}
