'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Calendar, Edit, Save, X, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

interface CheckInClient {
  _id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  check_in_frequency_days: number;
  last_check_in?: string;
  next_check_in_due?: string;
  status: 'active' | 'overdue' | 'paused';
  notes?: string;
  created_at: string;
}

const FREQUENCY_OPTIONS = [
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Bi-weekly' },
  { value: 30, label: 'Monthly' },
  { value: 60, label: 'Every 2 months' },
  { value: 90, label: 'Quarterly' },
];

const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

// Status badge styles — semantic
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:  { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' },
  overdue: { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' },
  paused:  { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
};
const CARD_STYLE: Record<string, React.CSSProperties> = {
  active:  { background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' },
  overdue: { background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' },
  paused:  { background: 'var(--color-surface)', border: '1px solid var(--color-border)' },
};

export default function CheckInManagementPage() {
  const [clients, setClients] = useState<CheckInClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrequency, setEditFrequency] = useState<number>(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'paused'>('all');

  useEffect(() => { loadClients(); }, []);

  const normalizeStatus = (s: string): 'active' | 'overdue' | 'paused' => {
    const lower = (s || '').toLowerCase();
    if (lower === 'active') return 'active';
    if (lower === 'overdue') return 'overdue';
    return 'paused';
  };

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('No authentication token found'); setLoading(false); return; }
      const response = await fetch(api('/api/client-tracking/check-ins'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch check-in clients: ${response.status}`);
      const data = await response.json();
      const raw = Array.isArray(data) ? data : (data.data || data.clients || []);
      setClients(raw.map((c: any) => ({
        ...c,
        student_name: c.client_name || c.student_name || '',
        student_email: c.student_email || c.client_id_number || '',
        status: normalizeStatus(c.status),
        check_in_frequency_days: c.check_in_frequency_days || 30,
      })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load check-in clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFrequency = async (clientId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/client-tracking/check-ins/${clientId}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in_frequency_days: editFrequency }),
      });
      if (!response.ok) throw new Error('Failed to update frequency');
      await loadClients();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update frequency');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const name = (client.student_name || '').toLowerCase();
    const email = (client.student_email || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || name.includes(q) || email.includes(q);
    return matchSearch && (filterStatus === 'all' || client.status === filterStatus);
  });

  const statusCounts = {
    active:  clients.filter(c => c.status === 'active').length,
    overdue: clients.filter(c => c.status === 'overdue').length,
    paused:  clients.filter(c => c.status === 'paused').length,
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Check-In Management" subtitle="Configure check-in frequencies for non-counseling clients">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Check-In Management" subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} in system`}>
      <div className="space-y-6">
        {error && (
          <div className="rounded p-4 flex gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
            <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
            <p className="text-xs" style={{ color: 'var(--color-success-text)' }}>Active Clients</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{statusCounts.active}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
            <p className="text-xs" style={{ color: 'var(--color-warning-text)' }}>Overdue Check-Ins</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{statusCounts.overdue}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Paused</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{statusCounts.paused}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <input type="text" placeholder="Search by name or email..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 text-sm rounded-lg outline-none" style={ICS} />
          <div className="flex gap-2">
            {(['all', 'active', 'overdue', 'paused'] as const).map(status => (
              <button key={status} onClick={() => setFilterStatus(status)}
                className="px-3 py-1 text-xs font-medium rounded transition"
                style={filterStatus === status
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p className="mb-1" style={{ color: 'var(--color-text-secondary)' }}>No clients found</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Check-in clients will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClients.map(client => (
              <div key={client._id} className="rounded-lg p-4 transition" style={CARD_STYLE[client.status]}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{client.student_name}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded" style={STATUS_STYLE[client.status]}>
                        {client.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>{client.student_email}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p style={{ color: 'var(--color-text-muted)' }}>Last Check-In</p>
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {client.last_check_in ? new Date(client.last_check_in).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-muted)' }}>Next Due</p>
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {client.next_check_in_due ? new Date(client.next_check_in_due).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    {editingId === client._id ? (
                      <div className="space-y-2">
                        <select value={editFrequency} onChange={e => setEditFrequency(parseInt(e.target.value))}
                          className="w-40 px-3 py-2 text-sm rounded outline-none" style={ICS}>
                          {FREQUENCY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveFrequency(client._id)} disabled={actionLoading}
                            className="flex-1 px-3 py-1 rounded text-xs font-medium text-white transition disabled:opacity-50"
                            style={{ background: 'var(--color-success)' }}>
                            <Save size={14} className="inline mr-1" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex-1 px-3 py-1 rounded text-xs font-medium transition"
                            style={{ background: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                            <X size={14} className="inline mr-1" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          Every {client.check_in_frequency_days} days
                        </p>
                        <button
                          onClick={() => { setEditingId(client._id); setEditFrequency(client.check_in_frequency_days); }}
                          className="w-full px-3 py-1 rounded text-xs font-medium transition"
                          style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                          <Edit size={14} className="inline mr-1" /> Update
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
