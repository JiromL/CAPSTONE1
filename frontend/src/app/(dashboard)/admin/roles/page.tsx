"use client";

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface User { _id: string; name: string; email: string; role: string; is_active: boolean; }

const VALID_ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'STAFF', 'STUDENT'];

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ADMIN:        { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)'   },
    DPO:          { background: '#F5F3FF',                      color: '#7C3AED'               },
    COUNSELOR:    { background: 'var(--color-info-surface)',    color: 'var(--color-info)'     },
    PSYCHOLOGIST: { background: 'var(--color-success-surface)', color: 'var(--color-success)'  },
    IC:           { background: '#FFF7ED',                      color: '#EA580C'               },
    STAFF:        { background: 'var(--color-warning-surface)', color: 'var(--color-warning)'  },
    STUDENT:      { background: 'var(--color-primary-surface)', color: 'var(--color-primary)'  },
  };
  return map[role] ?? { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
}

const IS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };
const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{children}</th>
);

export default function RolesPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [updating, setUpdating]   = useState<string | null>(null);
  const [message, setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api('/api/users/all'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: `Failed to load users: ${(err as Error).message}` });
    } finally { setLoading(false); }
  };

  const updateRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(api(`/api/users/${userId}/role`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: 'Role updated' });
      setTimeout(() => setMessage(null), 2500);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally { setUpdating(null); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (!filterRole || u.role === filterRole) &&
      (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <DashboardPageWrapper title="Role Management" subtitle="Assign and manage user roles">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {message && (
          <div className="p-3 rounded-lg text-sm"
            style={message.type === 'success'
              ? { background: 'var(--color-success-surface)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }
              : { background: 'var(--color-danger-surface)',  border: '1px solid var(--color-danger)',  color: 'var(--color-danger)'  }}>
            {message.text}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none" style={IS} />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg outline-none" style={IS}>
            <option value="">All Roles</option>
            {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {VALID_ROLES.map(role => (
            <button key={role} onClick={() => setFilterRole(filterRole === role ? '' : role)}
              className="p-3 rounded-lg text-center transition"
              style={filterRole === role
                ? { border: '1px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                : { border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
              onMouseEnter={e => { if (filterRole !== role) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { if (filterRole !== role) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'; }}>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {users.filter(u => u.role === role).length}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{role}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>{['User', 'Email', 'Current Role', 'Change Role'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user._id} className="transition"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                          style={{ background: 'var(--color-border-strong)', color: 'var(--color-text-primary)' }}>
                          {user.name?.[0] || '?'}
                        </div>
                        {user.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={roleBadgeStyle(user.role)}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role} onChange={e => updateRole(user._id, e.target.value)}
                        disabled={updating === user._id}
                        className="px-2 py-1 text-xs rounded outline-none disabled:opacity-50" style={IS}>
                        {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} of {users.length} users</p>
      </div>
    </DashboardPageWrapper>
  );
}
