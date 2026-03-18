"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import IntakeForm from '@/components/IntakeForm';
import {
  CheckInForm,
  CheckInHistory,
} from '@/components/CheckInForm';
import { useIntakeApi, useCheckInApi } from '@/utils/useApi';
import { AlertCircle, Loader } from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const { getCase, updateCaseStatus, loading: intakeLoading } = useIntakeApi();
  const { createCheckIn, getCheckInHistory, loading: checkInLoading } =
    useCheckInApi();

  const [caseData, setCaseData] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'check-ins'>(
    'details'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setError(null);
      const [caseRes, historyRes] = await Promise.all([
        getCase(caseId),
        getCheckInHistory(caseId),
      ]);
      setCaseData(caseRes);
      setCheckInHistory(historyRes?.check_ins || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
    }
  };

  const handleUpdateStatus = async (clientStatus: string) => {
    try {
      setError(null);
      await updateCaseStatus(caseId, clientStatus, 'Updated via case detail');
      await loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCheckIn = async (data: any) => {
    try {
      setError(null);
      await createCheckIn({
        ...data,
        case_id: caseId,
      });
      await loadCaseData();
      setActiveTab('check-ins');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!caseData && !error) {
    return (
      <DashboardPageWrapper title="Case Details" subtitle="">
        <div className="flex items-center justify-center p-8">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper
      title={`Case: ${caseData?.student_id || 'Unknown'}`}
      subtitle={`Status: ${caseData?.client_status || 'N/A'}`}
    >
      {error && (
        <div className="mb-6 flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <p className="font-medium text-red-900 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'details'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          Case Details
        </button>
        <button
          onClick={() => setActiveTab('check-ins')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'check-ins'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          Check-Ins ({checkInHistory.length})
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && caseData && (
        <div className="space-y-6">
          {/* Case Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Case Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Student ID
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  {caseData.student_id}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Client Status
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                    {caseData.client_status || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transaction Type
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  {caseData.transaction_type || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Created
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  {caseData.created_at
                    ? new Date(caseData.created_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Update Client Status
            </h3>
            <select
              value={caseData.client_status || 'ACTIVE'}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
            >
              <option value="ACTIVE">ACTIVE - Ongoing Counseling</option>
              <option value="INACTIVE">
                INACTIVE - Not Receiving Services
              </option>
              <option value="CHECK_IN_ONLY">
                CHECK_IN_ONLY - Periodic Monitoring
              </option>
              <option value="WITH_MH_CHECK_IN">
                WITH_MH_CHECK_IN - Collaborative Care
              </option>
              <option value="UNDER_ACCOMMODATION">
                UNDER_ACCOMMODATION - SDFO
              </option>
              <option value="TERMINATION_PENDING">
                TERMINATION_PENDING - Closing Out
              </option>
            </select>
          </div>

          {/* Presenting Issue */}
          {caseData.presenting_issue && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
                Presenting Issue
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {caseData.presenting_issue}
              </p>
            </div>
          )}

          {/* Primary Concern */}
          {caseData.primary_concern && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
                Primary Concern
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {caseData.primary_concern}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Check-Ins Tab */}
      {activeTab === 'check-ins' && (
        <div className="space-y-6">
          {/* Create Check-In Form */}
          <CheckInForm
            caseId={caseId}
            onSubmit={handleCreateCheckIn}
            isLoading={checkInLoading}
          />

          {/* Check-In History */}
          {checkInHistory.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                Check-In History
              </h3>
              <CheckInHistory
                checkIns={checkInHistory}
                isLoading={checkInLoading}
              />
            </div>
          )}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
