'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';
import { Search, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface PermaStatus {
  label: string | null;
  date: string;
}

interface PendingStudent {
  appointment_id: string;
  case_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  mhbot_username: string | null;
  requested_start: string;
  requested_end: string;
  appointment_type: string;
  perma_status: PermaStatus | null;
  case_status: string;
}

interface PermaLookup {
  username: string;
  latest_label: string | null;
  latest_date: string;
  history: any[];
}

const PERMA_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Excelling: { bg: 'bg-green-100', text: 'text-green-800', icon: '✨' },
  Thriving: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '🌟' },
  Stable: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵' },
  Managing: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
  Struggling: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '😟' },
  Surviving: { bg: 'bg-red-100', text: 'text-red-800', icon: '🆘' },
  Crisis: { bg: 'bg-red-200', text: 'text-red-900', icon: '🚨' },
  'No Data': { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❓' },
};

export default function PendingStudentsWithPerma() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [lookupResult, setLookupResult] = useState<PermaLookup | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkingMhbot, setLinkingMhbot] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  const fetchPendingStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/mhbot/students/pending'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setError(null);
      } else {
        setError('Failed to fetch pending students');
      }
    } catch (err) {
      setError('Error loading pending students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupPerma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/mhbot/lookup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: searchUsername }),
      });

      const data = await response.json();
      if (response.ok) {
        setLookupResult(data);
        setError(null);
      } else {
        setError(data.error || 'Username not found');
        setLookupResult(null);
      }
    } catch (err) {
      setError('Error looking up PERMA data');
      setLookupResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkMhbot = async (caseId: string, username: string) => {
    setLinkingMhbot(caseId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/mhbot/case/${caseId}/link-mhbot`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mhbot_username: username }),
      });

      if (response.ok) {
        // Refresh the list
        fetchPendingStudents();
        setSearchUsername('');
        setLookupResult(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to link MHBot account');
      }
    } catch (err) {
      setError('Error linking MHBot account');
    } finally {
      setLinkingMhbot(null);
    }
  };

  const getPermaColor = (label: string | null) => {
    if (!label) return PERMA_COLORS['No Data'];
    return PERMA_COLORS[label] || PERMA_COLORS['No Data'];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <PageShell title="Pending Students" subtitle="With MHBot PERMA Status">
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </PageShell>
    );
  }

  const permaColor = lookupResult ? getPermaColor(lookupResult.latest_label) : null;

  return (
    <PageShell title="Pending Students" subtitle="View pending appointments with mental health status">
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* PERMA Lookup Section */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Lookup Student PERMA Status</h2>

        <form onSubmit={handleLookupPerma} className="flex gap-2 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter MHBot username (e.g., ema_lVk)"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Lookup Result */}
        {lookupResult && permaColor && (
          <div className={`p-4 rounded-lg border-2 ${permaColor.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${permaColor.text}`}>MHBot Username</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{lookupResult.username}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl mb-2">{permaColor.icon}</p>
                <p className={`text-xl font-bold ${permaColor.text}`}>
                  {lookupResult.latest_label || 'No Data'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDate(lookupResult.latest_date)}
                </p>
              </div>
            </div>

            {/* History */}
            {lookupResult.history && lookupResult.history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-sm font-medium text-gray-700 mb-3">Recent History</p>
                <div className="space-y-2">
                  {lookupResult.history.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-600">
                      <span>{entry.perma_label || 'No Data'}</span>
                      <span className="text-gray-500">{formatDate(entry.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Students List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Pending Appointments ({students.length})
          </h2>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No pending appointments at this time</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    MHBot Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => {
                  const permaColorData = getPermaColor(student.perma_status?.label || null);
                  return (
                    <tr key={student.appointment_id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{student.student_name}</p>
                          <p className="text-sm text-gray-600">{student.student_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(student.requested_start)}
                          </p>
                          <p className="text-sm text-gray-600">{student.appointment_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {student.mhbot_username ? (
                          <div className={`inline-block px-3 py-1 rounded-full ${permaColorData.bg}`}>
                            <p className={`text-sm font-medium ${permaColorData.text}`}>
                              {permaColorData.icon} {student.perma_status?.label || 'Loading...'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {!student.mhbot_username && lookupResult && (
                          <button
                            onClick={() =>
                              handleLinkMhbot(student.case_id, lookupResult.username)
                            }
                            disabled={linkingMhbot === student.case_id}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition flex items-center gap-2"
                          >
                            {linkingMhbot === student.case_id ? (
                              <>
                                <Loader className="w-3 h-3 animate-spin" />
                                Linking...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Link {lookupResult.username}
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
