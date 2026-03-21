'use client';

import Link from 'next/link';
import { Clock, Users, FileText } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';
import { fetchDashboardData, getRiskLevelColor } from '@/utils/dashboard-api';
import { getMenuItemsByRole } from '@/utils/navigation';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Skip if not mounted (prevents hydration mismatch)
    if (!mounted) return;

    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const data = await fetchDashboardData(token);
          setDashboardData(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [mounted]);
  
  const menuItems = getMenuItemsByRole(user.role);

  const summary = dashboardData?.summary || {};
  const alerts = dashboardData?.alerts || [];
  const recentCases = dashboardData?.recent_cases || [];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counselor Dashboard"
      subtitle="Session Management"
      activeSection="dashboard"
    >
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mb-4 border border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700 rounded p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricCard 
              label="Assigned Cases" 
              value={String(summary.assigned_cases || 0)} 
            />
            <MetricCard 
              label="Recent Assessments" 
              value={String(summary.recent_assessments || 0)} 
            />
            <MetricCard 
              label="High-Risk Alerts" 
              value={String(summary.high_risk_alerts || 0)} 
            />
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">High-Risk Alerts</h2>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300">
                      ID: {alert.counseling_id || 'N/A'} - Risk: {alert.risk_level}
                    </span>
                    <Link href={`/cases/${alert.case_id}`}>
                      <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        View
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Cases */}
          {recentCases.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Cases</h2>
              <div className="space-y-2">
                {recentCases.slice(0, 5).map((caseItem: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 p-3 rounded flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium text-xs">
                        ID: {caseItem.counseling_id || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        Risk: <span className="font-medium">{caseItem.risk_level || 'GREEN'}</span>
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border font-medium ${
                      caseItem.is_emergency 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {caseItem.is_emergency ? 'EMERGENCY' : 'Standard'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function MetricCard({ label, value }: any) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}
