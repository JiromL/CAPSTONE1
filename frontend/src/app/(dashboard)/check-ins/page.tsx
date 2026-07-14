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
  const { loading, error, getPendingCheckIns, getCheckInSummary } = useCheckInApi();

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

  useEffect(() => { loadData(); }, []);

  return (
    <DashboardPageWrapper title="Check-In Management" subtitle="Manage periodic client check-ins and monitoring">
      {error && (
        <div className="mb-6 flex gap-3 rounded-xl p-4 border"
          style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
          <AlertCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
          <p className="font-medium" style={{ color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {[
          { key: 'pending' as const,  label: `Pending Check-Ins (${pendingCheckIns.length})` },
          { key: 'summary' as const, label: 'Summary' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-medium transition"
              style={isActive
                ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                : { color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="mb-6">
        <button onClick={loadData} disabled={isRefreshing}
          className="flex items-center gap-2 text-sm font-medium transition disabled:opacity-50"
          style={{ color: 'var(--color-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {activeTab === 'pending' && (
        <PendingCheckIns checkIns={pendingCheckIns} isLoading={loading} />
      )}

      {activeTab === 'summary' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Status Distribution */}
          <div className="rounded-2xl border shadow-card p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Client Status Distribution</h3>
            <div className="space-y-3">
              {Object.entries(summary.by_client_status || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Check-In Type Distribution */}
          <div className="rounded-2xl border shadow-card p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Check-In Type Distribution</h3>
            <div className="space-y-3">
              {Object.entries(summary.by_check_in_type || {}).map(([type, count]: [string, any]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {CHECK_IN_TYPES.find(t => t.value === type)?.label || type}
                  </span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Stats */}
          <div className="rounded-2xl border shadow-card p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Overall Statistics</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Cases',            value: summary.total_cases    || 0, color: 'var(--color-text-primary)' },
                { label: 'Total Check-Ins',        value: summary.total_check_ins || 0, color: 'var(--color-text-primary)' },
                { label: 'Requiring Check-In (30+ days)', value: summary.pending_count || 0, color: 'var(--color-warning)' },
                { label: 'Overdue (45+ days)',     value: summary.overdue_count  || 0, color: 'var(--color-danger)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span className="font-semibold text-lg" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="rounded-2xl border shadow-card p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Contact Methods Used</h3>
            <div className="space-y-3">
              {Object.entries(summary.by_contact_method || {}).map(([method, count]: [string, any]) => (
                <div key={method} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {CONTACT_METHODS.find(m => m.value === method)?.label || method}
                  </span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
