"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface UserEntry {
  _id: string; name: string; email: string; role: string;
  is_active: boolean; created_at: string | null; department: string;
}

const ROLE_ORDER = ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'COUNSELOR', 'IC', 'STAFF', 'STUDENT'];

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ADMIN:        { background: 'var(--color-danger-surface)',   color: 'var(--color-danger)'   },
    DPO:          { background: '#F5F3FF',                       color: '#7C3AED'               },
    PSYCHOLOGIST: { background: 'var(--color-info-surface)',     color: 'var(--color-info)'     },
    COUNSELOR:    { background: 'var(--color-success-surface)',  color: 'var(--color-success)'  },
    IC:           { background: 'var(--color-warning-surface)',  color: 'var(--color-warning)'  },
    STAFF:        { background: 'var(--color-bg)',               color: 'var(--color-text-secondary)' },
    STUDENT:      { background: 'var(--color-primary-surface)',  color: 'var(--color-primary)'  },
  };
  return map[role] ?? { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide"
    style={{ color: 'var(--color-text-muted)' }}>{children}</th>
);

export default function UsersReportPage() {
  const [users, setUsers]     = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(api('/api/users/all'), { headers });
      if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load user data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const roleCounts = ROLE_ORDER.map(role => {
    const all    = users.filter(u => u.role === role);
    const active = all.filter(u => u.is_active).length;
    return { role, total: all.length, active, inactive: all.length - active };
  });

  const totalUsers  = users.length;
  const totalActive = users.filter(u => u.is_active).length;

  return (
    <DashboardPageWrapper title="User Activity Report" subtitle="User counts and role distribution">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>User data from the CPS system database</p>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg text-sm"
            style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {loading && !users.length ? (
          <div className="py-20 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading user statistics…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Users', value: totalUsers,              accent: 'var(--color-primary)' },
                { label: 'Active',      value: totalActive,             accent: 'var(--color-success)' },
                { label: 'Inactive',    value: totalUsers - totalActive, accent: 'var(--color-text-muted)' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${card.accent}` }}>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>{card.label}</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Users size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Users by Role</h2>
              </div>
              {users.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No users found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--color-bg)' }}>
                    <tr>{['Role', 'Total', 'Active', 'Inactive', '% of Total'].map(h => <TH key={h}>{h}</TH>)}</tr>
                  </thead>
                  <tbody>
                    {roleCounts.filter(r => r.total > 0).map(row => (
                      <tr key={row.role} className="transition"
                        style={{ borderTop: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={roleBadgeStyle(row.role)}>{row.role}</span>
                        </td>
                        <td className="px-6 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{row.total}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-primary)' }}>{row.active}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-muted)' }}>{row.inactive}</td>
                        <td className="px-6 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                          {totalUsers > 0 ? `${((row.total / totalUsers) * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
