'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, Briefcase, Clock, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface CounselorStats {
  name: string;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  upcomingWeek: number;
  lastUpdated?: string;
}

export default function CounselorsAvailabilityPage() {
  const [counselorStats, setCounselorStats] = useState<CounselorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'load' | 'pending'>('name');

  useEffect(() => {
    const loadCounselorsData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(api('/api/appointments'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch appointments');
        const data = await response.json();
        const appointments = Array.isArray(data) ? data : data.appointments || [];

        const statsMap = new Map<string, CounselorStats>();
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        appointments.forEach((apt: any) => {
          const counselor = apt.counselor_name || 'Unassigned';
          if (!statsMap.has(counselor)) {
            statsMap.set(counselor, {
              name: counselor,
              totalAppointments: 0,
              confirmedAppointments: 0,
              pendingAppointments: 0,
              upcomingWeek: 0,
              lastUpdated: new Date().toISOString(),
            });
          }

          const stats = statsMap.get(counselor)!;
          stats.totalAppointments++;

          if (apt.status === 'confirmed') stats.confirmedAppointments++;
          if (apt.status === 'pending') stats.pendingAppointments++;

          const aptDate = new Date(apt.scheduled_start || apt.requested_start);
          if (aptDate >= now && aptDate <= nextWeek) {
            stats.upcomingWeek++;
          }
        });

        const stats = Array.from(statsMap.values());

        if (sortBy === 'load') {
          stats.sort((a, b) => b.totalAppointments - a.totalAppointments);
        } else if (sortBy === 'pending') {
          stats.sort((a, b) => b.pendingAppointments - a.pendingAppointments);
        } else {
          stats.sort((a, b) => a.name.localeCompare(b.name));
        }

        setCounselorStats(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load counselor data');
      } finally {
        setLoading(false);
      }
    };

    loadCounselorsData();
  }, [sortBy]);

  const totalAppointments = counselorStats.reduce((sum, c) => sum + c.totalAppointments, 0);
  const avgLoad = counselorStats.length > 0 ? Math.round(totalAppointments / counselorStats.length) : 0;
  const totalPending = counselorStats.reduce((sum, c) => sum + c.pendingAppointments, 0);

  if (loading) {
    return (
      <DashboardPageWrapper title="Counselor Availability" subtitle="View all counselor workload and availability">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12" style={{
            borderWidth: 2, borderStyle: 'solid',
            borderColor: 'transparent', borderBottomColor: 'var(--color-primary)'
          }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Counselor Availability" subtitle="View all counselor workload and availability">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg p-4 flex gap-3"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg p-6" style={{ background: 'var(--color-info-surface)', border: '1px solid var(--color-info)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active Counselors</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{counselorStats.length}</p>
              </div>
              <Users size={32} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Appointments</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalAppointments}</p>
              </div>
              <Briefcase size={32} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Pending</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalPending}</p>
              </div>
              <Clock size={32} style={{ color: 'var(--color-warning)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Avg Load</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{avgLoad}</p>
              </div>
              <TrendingUp size={32} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="rounded-lg p-4 flex gap-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          {(['name', 'load', 'pending'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={sortBy === opt
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              onMouseEnter={e => { if (sortBy !== opt) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)'; }}
              onMouseLeave={e => { if (sortBy !== opt) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
            >
              {opt === 'name' ? 'Sort by Name' : opt === 'load' ? 'Sort by Load' : 'Sort by Pending'}
            </button>
          ))}
        </div>

        {/* Counselor List */}
        <div className="space-y-4">
          {counselorStats.length > 0 ? (
            counselorStats.map((counselor) => {
              const loadPercent = Math.round((counselor.totalAppointments / totalAppointments) * 100) || 0;
              const isOverloaded = counselor.totalAppointments > avgLoad + 3;
              const isUnderloaded = counselor.totalAppointments < avgLoad - 2 && counselor.totalAppointments > 0;
              const barColor = isOverloaded ? 'var(--color-danger)' : isUnderloaded ? 'var(--color-success)' : 'var(--color-primary)';

              return (
                <div
                  key={counselor.name}
                  className="rounded-lg p-6 transition"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-lg)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{counselor.name}</h3>
                      <div className="flex gap-2">
                        {isOverloaded && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}>
                            ⚠️ Overloaded
                          </span>
                        )}
                        {isUnderloaded && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                            ✓ Available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{counselor.totalAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Confirmed</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{counselor.confirmedAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Pending</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{counselor.pendingAppointments}</p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Next 7 Days</p>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{counselor.upcomingWeek}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Workload Distribution</p>
                        <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{loadPercent}%</p>
                      </div>
                      <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${loadPercent}%`, background: barColor }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition"
                        style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        View Schedule
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg font-medium text-sm transition"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      >
                        Assign Case
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg p-12 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <Users className="mx-auto mb-3" size={32} style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>No counselor data available</p>
            </div>
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
