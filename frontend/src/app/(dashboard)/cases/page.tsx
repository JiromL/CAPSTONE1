'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

export default function CasesPage() {
  const [user, setUser] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClientStatus, setFilterClientStatus] = useState('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadCases = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        let url = api('/api/cases');
        if (filterStatus !== 'all') {
          url += `?status=${filterStatus}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch cases: ${response.status}`);
        }

        const data = await response.json();
        const casesList = data.cases || [];
        setCases(casesList);
        // Cache the cases data
        localStorage.setItem('cases_cache', JSON.stringify(casesList));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cases';
        console.error('Error loading cases:', err);
        setError(errorMessage);
        // Try to load from cache on error
        const cached = localStorage.getItem('cases_cache');
        if (cached) {
          try {
            setCases(JSON.parse(cached));
          } catch (e) {
            console.error('Failed to load cached cases');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [user, filterStatus]);

  const filteredCases = cases.filter((c) =>
    (filterStatus === 'all' || c.status === filterStatus) &&
    (filterClientStatus === 'all' || c.client_status === filterClientStatus) &&
    (c.presenting_issue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c._id?.includes(searchTerm) ||
      c.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleSpecificTitle = () => {
    if (!user) return 'Case Management';
    const normalizedRole = user.role?.toUpperCase() || 'STUDENT';
    switch (normalizedRole) {
      case 'COUNSELOR':
        return 'My Client Cases';
      case 'PSYCHOLOGIST':
        return 'Clinical Case Review';
      case 'ADMIN':
        return 'All Cases';
      case 'DPO':
        return 'Case Oversight';
      case 'IC':
        return 'New Intake Cases';
      default:
        return 'Case Management';
    }
  };

  const getRiskColor = (level: string) => {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const getStatusColor = (status: string) => {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const getClientStatusColor = (clientStatus: string) => {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  if (loading) {
    return (
      <DashboardPageWrapper title={getRoleSpecificTitle()} subtitle="Manage and track student cases">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title={getRoleSpecificTitle()} subtitle="Manage and track student cases">
      <div className="space-y-6">
        {error && (
          <div className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search cases by issue, ID, or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="intake_scheduled">Intake Scheduled</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <select
                value={filterClientStatus}
                onChange={(e) => setFilterClientStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
              >
                <option value="all">All Client Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CHECK_IN_ONLY">Check-In Only</option>
                <option value="WITH_MH_CHECK_IN">With MH Check-In</option>
                <option value="UNDER_ACCOMMODATION">Under Accommodation</option>
                <option value="TERMINATION_PENDING">Termination Pending</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          {filteredCases.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.map((caseItem) => (
                <Link key={caseItem._id} href={`/cases/${caseItem._id}`}>
                  <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-50">
                            {caseItem.presenting_issue || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            ID: {caseItem.student_id || caseItem._id}
                          </p>
                          {caseItem.transaction_type && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              {caseItem.transaction_type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Created: {new Date(caseItem.created_at).toLocaleDateString()}
                        </p>
                        {caseItem.session_count && (
                          <p className="text-xs text-gray-500">
                            Sessions: {caseItem.session_count}/{caseItem.target_sessions || 'N/A'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {caseItem.client_status && (
                          <span className={`px-3 py-1 rounded-full font-medium text-sm ${getClientStatusColor(caseItem.client_status)}`}>
                            {caseItem.client_status?.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full font-medium text-sm ${getStatusColor(caseItem.status)}`}>
                          {caseItem.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full font-medium text-sm ${getRiskColor(caseItem.risk_level)}`}>
                          {caseItem.risk_level?.toUpperCase() || 'GREEN'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <p>No cases found</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cases"
            value={cases.length}
          />
          <StatCard
            label="Open Cases"
            value={cases.filter((c) => c.status === 'open').length}
          />
          <StatCard
            label="High Risk"
            value={cases.filter((c) => c.risk_level?.toUpperCase() === 'RED' || c.risk_level?.toUpperCase() === 'CRITICAL').length}
          />
          <StatCard
            label="Closed"
            value={cases.filter((c) => c.status === 'closed').length}
          />
        </div>
      </div>
    </DashboardPageWrapper>
  );
}

function StatCard({ label, value }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
      <p className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{label}</p>
    </div>
  );
}
