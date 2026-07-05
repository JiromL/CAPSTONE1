'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, Heart, CheckCircle2 } from 'lucide-react';
import { getDashboardData, formatDateTime, getRiskLevelColor, getRiskLevelIcon } from '@/utils/assessmentApi';

interface AssessmentDashboardProps {
  token: string;
  userRole: string;
}

/**
 * Efficient Assessment Dashboard Component
 * Displays role-specific assessment data with risk indicators
 */
export function AssessmentDashboard({ token, userRole }: AssessmentDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboardData(token);
        if (data) {
          setDashboardData(data);
        } else {
          setError('Failed to load assessment data');
        }
      } catch (err) {
        setError('Error loading dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded"></div>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {dashboardData.alerts && dashboardData.alerts.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              {dashboardData.alerts.length} High-Risk Alert{dashboardData.alerts.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {dashboardData.alerts.slice(0, 5).map((alert: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-red-800 dark:text-red-300">
                  {getRiskLevelIcon(alert.risk_level)} Case {alert.counseling_id}
                </span>
                <span className="font-mono text-xs text-red-700 dark:text-red-400">
                  {alert.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Section */}
      {dashboardData.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userRole === 'STUDENT' && (
            <>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Intakes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'COUNSELOR' && (
            <>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Assigned Cases</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {dashboardData.summary.assigned_cases || 0}
                </p>
              </div>
              <div className="border border-orange-200 dark:border-orange-800 rounded p-4 bg-orange-50 dark:bg-orange-900/20">
                <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">High-Risk Alerts</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {dashboardData.summary.high_risk_alerts || 0}
                </p>
              </div>
              <div className="border border-blue-200 dark:border-blue-800 rounded p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Recent Assessments</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {dashboardData.summary.recent_assessments || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'PSYCHOLOGIST' && (
            <>
              <div className="border border-red-200 dark:border-red-800 rounded p-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Critical Cases</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {dashboardData.summary.critical_cases || 0}
                </p>
              </div>
              <div className="border border-orange-200 dark:border-orange-800 rounded p-4 bg-orange-50 dark:bg-orange-900/20">
                <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">High-Risk Cases</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {dashboardData.summary.high_risk_cases || 0}
                </p>
              </div>
              <div className="border border-blue-200 dark:border-blue-800 rounded p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Reviewed</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {dashboardData.summary.total_reviewed || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'IC' && (
            <>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Intakes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded p-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Emergency Cases</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {dashboardData.summary.emergency_count || 0}
                </p>
              </div>
              <div className="border border-purple-200 dark:border-purple-800 rounded p-4 bg-purple-50 dark:bg-purple-900/20">
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Anonymous</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {dashboardData.summary.anonymous_count || 0}
                </p>
              </div>
            </>
          )}

          {['ADMIN', 'DPO', 'CASE_MANAGER'].includes(userRole) && (
            <>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Intakes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded p-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {dashboardData.summary.critical_alerts || 0}
                </p>
              </div>
              <div className="border border-green-200 dark:border-blue-800 rounded p-4 bg-green-50 dark:bg-green-900/20 col-span-2">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Risk Distribution</p>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold">🟢 {dashboardData.summary.risk_distribution?.GREEN || 0}</span>
                  <span className="font-semibold">🟡 {dashboardData.summary.risk_distribution?.YELLOW || 0}</span>
                  <span className="font-semibold">🟠 {dashboardData.summary.risk_distribution?.RED || 0}</span>
                  <span className="font-semibold">🔴 {dashboardData.summary.risk_distribution?.CRITICAL || 0}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Cases */}
      {dashboardData.recent_cases && dashboardData.recent_cases.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">Recent Cases</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {dashboardData.recent_cases.slice(0, 10).map((caseItem: any, idx: number) => (
              <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {caseItem.counseling_id}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskLevelColor(
                          caseItem.risk_level
                        )}`}
                      >
                        {getRiskLevelIcon(caseItem.risk_level)} {caseItem.risk_level}
                      </span>
                    </div>
                    {caseItem.purpose && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Concern: {caseItem.purpose}
                      </p>
                    )}
                    {caseItem.submitted_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDateTime(caseItem.submitted_at)}
                      </p>
                    )}
                    {caseItem.is_emergency && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                        🚨 Emergency Case
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
