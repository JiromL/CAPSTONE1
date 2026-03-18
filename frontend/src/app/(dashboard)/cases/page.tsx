'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, AlertCircle, CheckCircle, FileText, ExternalLink } from 'lucide-react';
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
        setCases(data.cases || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cases';
        console.error('Error loading cases:', err);
        setError(errorMessage);
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
    switch (user.role) {
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
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'RED':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'YELLOW':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'intake_scheduled':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getClientStatusColor = (clientStatus: string) => {
    switch (clientStatus?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'CHECK_IN_ONLY':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'WITH_MH_CHECK_IN':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
      case 'UNDER_ACCOMMODATION':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400';
      case 'TERMINATION_PENDING':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
      case 'INACTIVE':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title={getRoleSpecificTitle()} subtitle="Manage and track student cases">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title={getRoleSpecificTitle()} subtitle="Manage and track student cases">
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded p-4 flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                        <div className="flex items-center gap-3 mb-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-gray-50 hover:text-blue-600 dark:hover:text-blue-400">
                            {caseItem.presenting_issue || 'N/A'}
                          </span>
                          <ExternalLink size={14} className="text-gray-400" />
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
              <FileText className="mx-auto mb-2 text-gray-400" size={32} />
              <p>No cases found</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cases"
            value={cases.length}
            color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Open Cases"
            value={cases.filter((c) => c.status === 'open').length}
            color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          />
          <StatCard
            label="High Risk"
            value={cases.filter((c) => c.risk_level?.toUpperCase() === 'RED' || c.risk_level?.toUpperCase() === 'CRITICAL').length}
            color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          />
          <StatCard
            label="Closed"
            value={cases.filter((c) => c.status === 'closed').length}
            color="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          />
        </div>
      </div>
    </DashboardPageWrapper>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className={`${color} rounded-lg p-6 text-center border border-current border-opacity-20`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-2">{label}</p>
    </div>
  );
}
