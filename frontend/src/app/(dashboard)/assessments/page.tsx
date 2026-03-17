'use client';

import { useState, useEffect } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { AlertCircle, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { api } from '@/utils/api';

interface Assessment {
  counseling_id: string;
  submitted_at: string;
  risk_level: string;
  scores: {
    phq9_score?: number;
    gad7_score?: number;
    pss_score?: number;
    acad_score?: number;
  };
  appointment_date?: string;
}

export default function AssessmentsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await fetch(api('/api/intake/assessments/dashboard'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch assessments: ${response.status}`);
        }

        const data = await response.json();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load assessments';
        console.error('Error loading assessments:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAssessments();
  }, []);

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

  if (loading) {
    return (
      <DashboardPageWrapper title="Assessments & Results" subtitle="View your assessment history and scores">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Assessments & Results" subtitle="View your assessment history and scores">
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded p-4 flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {dashboardData && (
          <>
            {/* Summary Cards */}
            {dashboardData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardData.summary.total_intakes !== undefined && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Assessments</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                          {dashboardData.summary.total_intakes}
                        </p>
                      </div>
                      <BarChart3 className="text-blue-600 dark:text-blue-400" size={32} />
                    </div>
                  </div>
                )}

                {dashboardData.summary.high_risk_count !== undefined && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">High Risk Cases</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                          {dashboardData.summary.high_risk_count}
                        </p>
                      </div>
                      <TrendingUp className="text-red-600 dark:text-red-400" size={32} />
                    </div>
                  </div>
                )}

                {dashboardData.summary.emergency_count !== undefined && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Emergency Cases</p>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                          {dashboardData.summary.emergency_count}
                        </p>
                      </div>
                      <AlertCircle className="text-orange-600 dark:text-orange-400" size={32} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assessments List */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Recent Assessments</h2>
              </div>

              {dashboardData.recent_cases && dashboardData.recent_cases.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData.recent_cases.map((item: Assessment, index: number) => (
                    <div key={index} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText size={16} className="text-gray-400 dark:text-gray-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-50">
                              Assessment #{index + 1}
                            </span>
                            {item.counseling_id && (
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                                {item.counseling_id}
                              </code>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Submitted: {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.scores && Object.entries(item.scores).map(([key, value]) => (
                              <span key={key} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                {key.replace('_score', '').toUpperCase()}: {value}
                              </span>
                            ))}
                          </div>
                          {item.appointment_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Appointment: {new Date(item.appointment_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full font-medium text-sm whitespace-nowrap ${getRiskColor(item.risk_level)}`}>
                          {item.risk_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <FileText className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No assessments found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
