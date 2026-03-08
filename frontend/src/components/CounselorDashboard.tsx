'use client';

import Link from 'next/link';
import { TrendingUp, Clock, Users, AlertTriangle, FileText, MessageCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState, useEffect } from 'react';
import { fetchDashboardData, getRiskLevelColor } from '@/utils/dashboard-api';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Appointments', href: '/appointments', icon: <Clock size={20} />, badge: dashboardData?.summary?.assigned_cases || 0 },
    { label: 'Cases', href: '/cases', icon: <Users size={20} /> },
    { label: 'Referrals', href: '/referrals', icon: <MessageCircle size={20} /> },
    { label: 'Documentation', href: '/documentation', icon: <FileText size={20} />, badge: dashboardData?.summary?.high_risk_alerts || 0 },
    { label: 'Profile', href: '/profile', icon: <Clock size={20} /> },
  ];

  const summary = dashboardData?.summary || {};
  const alerts = dashboardData?.alerts || [];
  const recentCases = dashboardData?.recent_cases || [];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counselor Dashboard"
      subtitle="Session Management & Client Care"
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
              icon={<Users size={20} />} 
            />
            <MetricCard 
              label="Recent Assessments" 
              value={String(summary.recent_assessments || 0)} 
              icon={<Clock size={20} />} 
              color="blue" 
            />
            <MetricCard 
              label="High-Risk Alerts" 
              value={String(summary.high_risk_alerts || 0)} 
              icon={<AlertTriangle size={20} />} 
              color={summary.high_risk_alerts > 0 ? "red" : "blue"}
            />
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="mb-6 border border-red-200 dark:border-red-700 rounded p-4 bg-red-50 dark:bg-red-900/30">
              <h2 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-3">High-Risk Alerts</h2>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-red-800 dark:text-red-300">
                      ID: {alert.counseling_id || 'N/A'} - Risk Level: {alert.risk_level}
                    </span>
                    <Link href={`/cases/${alert.case_id}`}>
                      <button className="px-2 py-1 bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100 rounded hover:bg-red-300 dark:hover:bg-red-600 transition">
                        View
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <ActionButton href="/appointments" label="View Appointments" />
              <ActionButton href="/documentation" label="Review Notes" />
              <ActionButton href="/high-risk" label="High-Risk Clients" />
            </div>
          </div>

          {/* Recent Cases */}
          {recentCases.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Recent Cases</h2>
              <div className="space-y-2">
                {recentCases.slice(0, 5).map((caseItem: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 p-3 rounded flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-gray-50 font-medium text-xs">
                        ID: {caseItem.counseling_id || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        Risk: <span className={`font-semibold ${getRiskLevelColor(caseItem.risk_level)}`}>
                          {caseItem.risk_level || 'GREEN'}
                        </span>
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border ${
                      caseItem.is_emergency 
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
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

function MetricCard({ label, value, icon, color = "blue" }: any) {
  const colorStyles = {
    blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700",
    orange: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700",
    red: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700",
  };

  return (
    <div className={`border ${colorStyles[color as keyof typeof colorStyles]} rounded p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{value}</p>
        </div>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
    </div>
  );
}

function ActionButton({ href, label }: any) {
  return (
    <Link href={href}>
      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium">
        {label}
      </button>
    </Link>
  );
}
