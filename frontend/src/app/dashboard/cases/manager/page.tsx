'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { api } from '@/utils/api';

export default function CaseManagerPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkCounselorId, setBulkCounselorId] = useState('');

  useEffect(() => {
    Promise.all([fetchCases(), fetchCounselors()]);
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

  const handleBulkAssign = async () => {
    if (!bulkCounselorId || selectedCases.size === 0) return;

    try {
      const token = localStorage.getItem('token');
      for (const caseId of selectedCases) {
        await fetch(api(`/api/cases/${caseId}/assign`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            assigned_counselor_id: bulkCounselorId,
            case_type: 'DEVELOPMENTAL'
          })
        });
      }
      alert(`${selectedCases.size} cases assigned successfully`);
      setSelectedCases(new Set());
      setBulkCounselorId('');
      setShowBulkAssign(false);
      fetchCases();
    } catch (error) {
      console.error('Failed to bulk assign', error);
    }
  };

  const handleExportReport = () => {
    const csv = cases.map((c) => ({
      'Case ID': c._id.slice(-4),
      'Student': c.student_id,
      'Assigned To': c.assigned_counselor_id || 'Unassigned',
      'Status': c.status,
      'Risk Level': c.risk_level,
      'Sessions': c.session_count,
      'Created': new Date(c.created_at).toLocaleDateString()
    }));

    const header = Object.keys(csv[0] || {}).join(',');
    const rows = csv.map((row) => Object.values(row).join(',')).join('\n');
    const content = `${header}\n${rows}`;

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cases-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredCases = cases.filter((c) =>
    c._id.includes(searchQuery) || c.presenting_issue?.includes(searchQuery)
  );

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
    <PageShell title="Case Manager" subtitle="View and manage all cases across the team">
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total Cases', value: cases.length, color: 'blue' },
            { label: 'Active', value: cases.filter((c) => c.status === 'ACTIVE').length, color: 'green' },
            { label: 'Unassigned', value: cases.filter((c) => !c.assigned_counselor_id).length, color: 'yellow' },
            { label: 'High Risk', value: cases.filter((c) => c.risk_level === 'CRITICAL' || c.risk_level === 'RED').length, color: 'red' },
            { label: 'Total Sessions', value: cases.reduce((sum, c) => sum + (c.session_count || 0), 0), color: 'purple' }
          ].map((stat) => (
            <div key={stat.label} className={`bg-${stat.color}-50 dark:bg-gray-900 rounded-lg p-4 border border-${stat.color}-200 dark:border-gray-700`}>
              <p className={`text-sm text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-900 dark:text-${stat.color}-200`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="Search by case ID or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
          />

          <div className="flex gap-2">
            {['ACTIVE', 'NEW', 'PENDING_TERMINATION', 'CLOSED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowBulkAssign(!showBulkAssign)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
            disabled={selectedCases.size === 0}
          >
            Bulk Assign ({selectedCases.size})
          </button>

          <button
            onClick={handleExportReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Export CSV
          </button>
        </div>

        {/* Bulk Assign Panel */}
        {showBulkAssign && (
          <div className="bg-blue-50 dark:bg-gray-800 border-2 border-blue-600 rounded-lg p-4">
            <div className="flex gap-3 items-center">
              <select
                value={bulkCounselorId}
                onChange={(e) => setBulkCounselorId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
              >
                <option value="">Select counselor to assign {selectedCases.size} cases to...</option>
                {counselors.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.first_name} {c.last_name} ({c.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkCounselorId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => setShowBulkAssign(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-50 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cases Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCases.size === filteredCases.length && filteredCases.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCases(new Set(filteredCases.map((c) => c._id)));
                      } else {
                        setSelectedCases(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Case</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Assigned To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Risk</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Sessions</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                    No cases found
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCases.has(c._id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedCases);
                          if (e.target.checked) {
                            newSet.add(c._id);
                          } else {
                            newSet.delete(c._id);
                          }
                          setSelectedCases(newSet);
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">#{c._id.slice(-4)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {c.assigned_counselor_id ? 'Assigned' : <span className="text-yellow-600 dark:text-yellow-400 font-bold">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.status}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(c.risk_level)}`}>
                        {c.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {c.session_count || 0}/{c.target_sessions || '∞'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
