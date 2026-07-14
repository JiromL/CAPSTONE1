'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';

const IC = 'w-full px-3 py-2 text-sm rounded-lg outline-none';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

// Status badge styles — semantic colors, kept fixed
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:   { background: '#FFFBEB', color: '#92400E' },
  confirmed: { background: '#EFF6FF', color: '#1E40AF' },
  completed: { background: '#ECFDF5', color: '#065F46' },
  cancelled: { background: '#FEF2F2', color: '#991B1B' },
};
const STATUS_ICON: Record<string, any> = {
  pending: Clock, confirmed: CheckCircle, completed: CheckCircle, cancelled: AlertCircle,
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => { fetchAppointments(); }, []);
  useEffect(() => { filterAndSort(); }, [appointments, searchTerm, statusFilter, platformFilter, sortBy]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments'), { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : data.appointments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let result = [...appointments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((apt: any) =>
        (apt.student_name?.toLowerCase() || '').includes(term) ||
        (apt.counselor_name?.toLowerCase() || '').includes(term) ||
        (apt._id || '').includes(term)
      );
    }
    if (statusFilter !== 'all') result = result.filter((apt: any) => apt.status === statusFilter);
    if (platformFilter !== 'all') result = result.filter((apt: any) => apt.preferred_platform === platformFilter);
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date': return new Date(a.scheduled_start || a.requested_start || 0).getTime() - new Date(b.scheduled_start || b.requested_start || 0).getTime();
        case 'status': return (a.status || '').localeCompare(b.status || '');
        case 'student': return (a.student_name || '').localeCompare(b.student_name || '');
        default: return 0;
      }
    });
    setFiltered(result);
  };

  if (loading) {
    return (
      <PageShell title="All Appointments" subtitle="View and manage all system appointments">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="All Appointments" subtitle="View and manage all system appointments">
      {error && (
        <div className="mb-4 p-4 rounded-lg flex gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
          <span className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={18} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search student, counselor, or ID..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg outline-none" style={ICS} />
          </div>
          {[
            { value: statusFilter, onChange: setStatusFilter, opts: [['all','All Status'],['pending','Pending'],['confirmed','Confirmed'],['completed','Completed'],['cancelled','Cancelled']] },
            { value: platformFilter, onChange: setPlatformFilter, opts: [['all','All Platforms'],['in-person','In-Person'],['zoom','Zoom'],['phone','Phone']] },
            { value: sortBy, onChange: setSortBy, opts: [['date','Sort by Date'],['status','Sort by Status'],['student','Sort by Student']] },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
              className="px-4 py-2 text-sm rounded-lg outline-none" style={ICS}>
              {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} style={{ color: 'var(--color-success)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{filtered.length}</span> of{' '}
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{appointments.length}</span> appointments
        </p>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>No appointments found matching your filters</p>
          </div>
        ) : (
          filtered.map((apt, idx) => {
            const sStyle = STATUS_STYLE[apt.status] || STATUS_STYLE.pending;
            const SIcon = STATUS_ICON[apt.status] || Clock;
            const appointmentDate = new Date(apt.scheduled_start || apt.requested_start);
            return (
              <div key={idx} className="rounded-lg p-4 transition"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
                      <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name || 'Unknown Student'}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      {[
                        ['Date & Time', appointmentDate.toLocaleString()],
                        ['Counselor', apt.counselor_name || 'Unassigned'],
                        ['Platform', apt.preferred_platform?.replace('-', ' ') || 'N/A'],
                        ['Type', apt.appointment_type || 'N/A'],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                          <p className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium" style={sStyle}>
                      <SIcon size={14} />
                      {apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
