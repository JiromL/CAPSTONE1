"use client";

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import {
  CheckInForm,
  CheckInHistory,
  PendingCheckIns,
  CHECK_IN_TYPES,
  CONTACT_METHODS,
} from '@/components/CheckInForm';
import { useCheckInApi } from '@/utils/useApi';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function CheckInsPage() {
  const {
    loading,
    error,
    getPendingCheckIns,
    getCheckInSummary,
  } = useCheckInApi();

  const [pendingCheckIns, setPendingCheckIns] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'summary'>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [pendingData, summaryData] = await Promise.all([
        getPendingCheckIns(),
        getCheckInSummary(),
      ]);
      setPendingCheckIns(pendingData?.pending_check_ins || []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load check-in data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardPageWrapper 
      title="Check-In Management" 
      subtitle="Manage periodic client check-ins and monitoring"
    >
      {error && (
        <div className="mb-6 flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-900 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'pending'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Pending Check-Ins ({pendingCheckIns.length})
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'summary'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Summary
        </button>
      </div>

      {/* Refresh Button */}
      <div className="mb-6">
        <button
          onClick={loadData}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' && (
        <div>
          <PendingCheckIns
            checkIns={pendingCheckIns}
            isLoading={loading}
          />
        </div>
      )}

      {activeTab === 'summary' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Status Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Client Status Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.by_client_status || {}).map(
                ([status, count]: [string, any]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Check-In Type Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Check-In Type Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.by_check_in_type || {}).map(
                ([type, count]: [string, any]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                      {CHECK_IN_TYPES.find((t) => t.value === type)?.label || type}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Overall Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Overall Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  Total Cases
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-50 text-lg">
                  {summary.total_cases || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  Total Check-Ins
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-50 text-lg">
                  {summary.total_check_ins || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  Requiring Check-In (30+ days)
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-50 text-lg text-yellow-600 dark:text-yellow-400">
                  {summary.pending_count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  Overdue (45+ days)
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-50 text-lg text-red-600 dark:text-red-400">
                  {summary.overdue_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Contact Methods Used
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.by_contact_method || {}).map(
                ([method, count]: [string, any]) => (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                      {CONTACT_METHODS.find((m) => m.value === method)
                        ?.label || method}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
