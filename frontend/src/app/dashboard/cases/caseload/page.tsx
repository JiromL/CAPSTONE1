'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

export default function CaseloadPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ACTIVE');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    duration_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    fetchCases();
  }, [filter]);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases?status=${filter}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Failed to fetch cases', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async () => {
    if (!selectedCaseId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases/${selectedCaseId}/sessions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          duration_minutes: sessionFormData.duration_minutes,
          notes: sessionFormData.notes
        })
      });

      if (response.ok) {
        alert('Session recorded');
        setSessionFormData({ duration_minutes: 60, notes: '' });
        fetchCases();
      }
    } catch (error) {
      console.error('Failed to record session', error);
    }
  };

  const handleUpdateStatus = async (caseId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases/${caseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchCases();
      }
    } catch (error) {
      console.error('Failed to update case', error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  return (
    <PageShell title="My Caseload" subtitle="Manage your assigned cases and track sessions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Cases</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {cases.filter((c) => c.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Termination</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {cases.filter((c) => c.status === 'PENDING_TERMINATION').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">High Risk</p>
            <p className="text-2xl font-bold text-red-600">
              {cases.filter((c) => c.risk_level === 'CRITICAL' || c.risk_level === 'RED').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {cases.reduce((sum, c) => sum + (c.session_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['ACTIVE', 'PENDING_TERMINATION', 'CLOSED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Cases List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : cases.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">No cases found</p>
            </div>
          ) : (
            cases.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedCaseId(c._id)}
                className={`p-6 rounded-lg border-2 cursor-pointer transition ${
                  selectedCaseId === c._id
                    ? 'border-blue-600 bg-blue-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-gray-50">
                    Case #{c._id.slice(-4)}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(c.risk_level)}`}>
                    {c.risk_level}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Issue:</span> {c.presenting_issue || 'N/A'}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Sessions</p>
                    <p className="font-bold text-gray-900 dark:text-gray-50">
                      {c.session_count || 0} / {c.target_sessions || '∞'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Status</p>
                    <p className="font-bold text-gray-900 dark:text-gray-50">
                      {c.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {c.last_session_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Last session: {new Date(c.last_session_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Case Detail Panel */}
        {selectedCaseId && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-600 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-6">
              Case #{ cases.find((c) => c._id === selectedCaseId)?._id.slice(-4)}
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session Duration (minutes)
                </label>
                <input
                  type="number"
                  value={sessionFormData.duration_minutes}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Level
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                  <option>GREEN</option>
                  <option>YELLOW</option>
                  <option>RED</option>
                  <option>CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session Notes
              </label>
              <textarea
                value={sessionFormData.notes}
                onChange={(e) => setSessionFormData({ ...sessionFormData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                placeholder="Enter session notes..."
              />
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={handleAddSession}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Record Session
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedCaseId, 'PENDING_TERMINATION')}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
              >
                Start Termination
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedCaseId, 'CLOSED')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Close Case
              </button>
            </div>

            <button
              onClick={() => setSelectedCaseId(null)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
