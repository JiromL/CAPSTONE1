'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function BatchAssignPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments/staff/batch-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch assign appointments');
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Batch Assignment" subtitle="Auto-assign pending appointments to counselors">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Assignment Criteria
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
              >
                {loading ? 'Processing...' : 'Run Assignment'}
              </button>
            </form>

            {success && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-blue-800 rounded-lg flex gap-2">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-800 dark:text-green-300">Assignments completed!</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {assignments.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={24} className="text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {assignments.length} Appointment{assignments.length !== 1 ? 's' : ''} Assigned
                  </h2>
                </div>

                <div className="space-y-3">
                  {assignments.map((apt, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <Calendar size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {apt.student_name || 'Student'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Assigned to: <span className="font-medium">{apt.counselor_name || 'Counselor'}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(apt.scheduled_start).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                        Assigned
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Clock size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select date range and run assignment to see results
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
