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
        <div className="animate-pulse h-24 rounded" style={{ background: 'var(--color-border)' }}></div>
        <div className="animate-pulse h-32 rounded" style={{ background: 'var(--color-border)' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg p-4" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
        <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
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
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-danger-text)' }}>
              {dashboardData.alerts.length} High-Risk Alert{dashboardData.alerts.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {dashboardData.alerts.slice(0, 5).map((alert: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-danger-text)' }}>
                  {getRiskLevelIcon(alert.risk_level)} Case {alert.counseling_id}
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
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
              <div className="rounded p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Total Intakes</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'COUNSELOR' && (
            <>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Assigned Cases</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {dashboardData.summary.assigned_cases || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid #F97316', background: '#FFF7ED' }}>
                <p className="text-xs mb-1" style={{ color: '#C2410C' }}>High-Risk Alerts</p>
                <p className="text-2xl font-bold" style={{ color: '#9A3412' }}>
                  {dashboardData.summary.high_risk_alerts || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-info)', background: 'var(--color-info-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-info-text)' }}>Recent Assessments</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-info-text)' }}>
                  {dashboardData.summary.recent_assessments || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'PSYCHOLOGIST' && (
            <>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-danger-text)' }}>Critical Cases</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-danger-text)' }}>
                  {dashboardData.summary.critical_cases || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid #F97316', background: '#FFF7ED' }}>
                <p className="text-xs mb-1" style={{ color: '#C2410C' }}>High-Risk Cases</p>
                <p className="text-2xl font-bold" style={{ color: '#9A3412' }}>
                  {dashboardData.summary.high_risk_cases || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-info)', background: 'var(--color-info-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-info-text)' }}>Total Reviewed</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-info-text)' }}>
                  {dashboardData.summary.total_reviewed || 0}
                </p>
              </div>
            </>
          )}

          {userRole === 'IC' && (
            <>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Total Intakes</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-danger-text)' }}>Emergency Cases</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-danger-text)' }}>
                  {dashboardData.summary.emergency_count || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid #D8B4FE', background: '#FAF5FF' }}>
                <p className="text-xs mb-1" style={{ color: '#7C3AED' }}>Anonymous</p>
                <p className="text-2xl font-bold" style={{ color: '#6B21A8' }}>
                  {dashboardData.summary.anonymous_count || 0}
                </p>
              </div>
            </>
          )}

          {['ADMIN', 'DPO', 'CASE_MANAGER'].includes(userRole) && (
            <>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Total Intakes</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {dashboardData.summary.total_intakes || 0}
                </p>
              </div>
              <div className="rounded p-4" style={{ border: '1px solid var(--color-danger)', background: 'var(--color-danger-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-danger-text)' }}>Critical Alerts</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-danger-text)' }}>
                  {dashboardData.summary.critical_alerts || 0}
                </p>
              </div>
              <div className="rounded p-4 col-span-2" style={{ border: '1px solid var(--color-success)', background: 'var(--color-success-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-success-text)' }}>Risk Distribution</p>
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
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="p-4" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Cases</h3>
          </div>
          <div style={{ background: 'var(--color-surface)' }}>
            {dashboardData.recent_cases.slice(0, 10).map((caseItem: any, idx: number) => (
              <div
                key={idx}
                className="p-4 transition"
                style={{ borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface)'}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        {caseItem.counseling_id}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={getRiskLevelColor(caseItem.risk_level)}
                      >
                        {getRiskLevelIcon(caseItem.risk_level)} {caseItem.risk_level}
                      </span>
                    </div>
                    {caseItem.purpose && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Concern: {caseItem.purpose}
                      </p>
                    )}
                    {caseItem.submitted_at && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDateTime(caseItem.submitted_at)}
                      </p>
                    )}
                    {caseItem.is_emergency && (
                      <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-danger)' }}>
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
