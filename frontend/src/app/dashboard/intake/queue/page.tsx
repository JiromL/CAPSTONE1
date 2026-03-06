'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

export default function IntakeQueuePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('NEW');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('CLINICAL');
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCases();
    fetchCounselors();
  }, [filter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases?status=${filter}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Failed to fetch cases', error);
      setMessage('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/users?roles=PSYCHOLOGIST,COUNSELOR'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCounselors(data.users || []);
    } catch (error) {
      console.error('Failed to fetch counselors', error);
    }
  };

  const handleAssignCase = async () => {
    if (!selectedCounselorId) {
      setMessage('Please select a counselor');
      return;
    }
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases/${selectedCaseId}/assign`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assigned_counselor_id: selectedCounselorId,
          case_type: selectedCaseType
        })
      });

      if (response.ok) {
        setMessage('✓ Case assigned successfully');
        setTimeout(() => {
          setSelectedCaseId(null);
          setSelectedCounselorId('');
          setSelectedCaseType('CLINICAL');
          setMessage('');
          fetchCases();
        }, 1500);
      } else {
        setMessage('Failed to assign case');
      }
    } catch (error) {
      console.error('Failed to assign case', error);
      setMessage('Error assigning case');
    } finally {
      setAssigning(false);
    }
  };

  const getRiskStyle = (risk: string) => {
    switch (risk) {
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
    <PageShell title="Intake Queue" subtitle="New referrals awaiting assignment">
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400">New Cases</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
            {cases.filter((c) => c.status === 'NEW').length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-600 dark:text-purple-400">High Risk</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
            {cases.filter((c) => c.risk_level === 'CRITICAL' || c.risk_level === 'RED').length}
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm text-indigo-600 dark:text-indigo-400">Ready to Assign</p>
          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">
            {cases.length}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Queue List */}
        <div className="flex-1">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('NEW')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'NEW'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
              }`}
            >
              New Referrals
            </button>
            <button
              onClick={() => setFilter('INTAKE_SCHEDULED')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'INTAKE_SCHEDULED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
              }`}
            >
              Scheduled
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">No cases in this queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    setSelectedCaseId(c._id);
                    setMessage('');
                    setSelectedCounselorId('');
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedCaseId === c._id
                      ? 'border-blue-600 bg-blue-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                        #{c._id.slice(-4)} - {c.presenting_issue || 'No issue specified'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Created: {new Date(c.created_at).toLocaleDateString()} at{' '}
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold ${getRiskStyle(c.risk_level)}`}>
                      {c.risk_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignment Panel */}
        {selectedCaseId && (
          <div className="w-80 bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-600 p-6 sticky top-6 h-fit">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
              Assign Case
            </h2>

            {message && (
              <div className={`mb-4 px-3 py-2 rounded text-sm font-medium ${
                message.startsWith('✓')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-4">
              {/* Case Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Case Type
                </label>
                <select
                  value={selectedCaseType}
                  onChange={(e) => setSelectedCaseType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                >
                  <option value="CLINICAL">Clinical (Psychologist)</option>
                  <option value="DEVELOPMENTAL">Developmental (Counselor)</option>
                  <option value="CHECK_IN">Check-in</option>
                </select>
              </div>

              {/* Counselor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available {selectedCaseType === 'CLINICAL' ? 'Psychologists' : 'Counselors'}
                </label>
                <select
                  value={selectedCounselorId}
                  onChange={(e) => setSelectedCounselorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                >
                  <option value="">Select a person...</option>
                  {counselors
                    .filter((c) => {
                      if (selectedCaseType === 'CLINICAL') return c.role === 'PSYCHOLOGIST';
                      return c.role === 'COUNSELOR';
                    })
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Assign Button */}
              <button
                onClick={handleAssignCase}
                disabled={assigning || !selectedCounselorId}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {assigning ? 'Assigning...' : 'Assign Case'}
              </button>

              <button
                onClick={() => {
                  setSelectedCaseId(null);
                  setMessage('');
                  setSelectedCounselorId('');
                }}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
