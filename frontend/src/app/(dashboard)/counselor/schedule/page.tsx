'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon, Clock, Users, Filter, Search,
  AlertCircle, Phone, Mail, Video, MapPin, ExternalLink, RefreshCw,
} from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface AppointmentDetail {
  appointment_id: string;
  student_name: string;
  student_email: string;
  student_id?: string;
  status: string;
  purpose: string;
  concern: string;
  preferred_date: string;
  preferred_time: string;
  method: string;
  meeting_link?: string;
  referral_type: string;
  created_at: string;
  notes?: string;
  risk_level?: string;
}

interface FilterState {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  status: string;
  method: string;
  searchTerm: string;
  customStartDate?: string;
  customEndDate?: string;
}

function getStatusStyle(status: string): { style: React.CSSProperties; label: string } {
  switch (status) {
    case 'PENDING_APPROVAL': return { style: { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }, label: 'Pending Approval' };
    case 'CONFIRMED':        return { style: { background: 'var(--color-success-surface)', color: 'var(--color-success)' }, label: 'Confirmed' };
    case 'COMPLETED':        return { style: { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }, label: 'Completed' };
    case 'CANCELLED':        return { style: { background: 'var(--color-danger-surface)',  color: 'var(--color-danger)'  }, label: 'Cancelled' };
    case 'REQUESTED':        return { style: { background: '#F5F3FF', color: '#7C3AED' }, label: 'Requested' };
    default: return { style: { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }, label: status };
  }
}

function getMethodIcon(method: string) {
  const m = method.toLowerCase();
  if (m === 'google-meet' || m === 'zoom') return <Video className="w-4 h-4" />;
  if (m === 'phone') return <Phone className="w-4 h-4" />;
  if (m === 'in-person' || m === 'in_person') return <MapPin className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border shadow-card p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</p>
    </div>
  );
}

function AppointmentCard({ appointment, onSelect }: { appointment: AppointmentDetail; onSelect: () => void }) {
  const { style: sStyle, label: sLabel } = getStatusStyle(appointment.status);
  const aptDate = new Date(appointment.preferred_date);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  let dateLabel = aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  if (aptDate.toDateString() === today.toDateString()) dateLabel = 'Today';
  else if (aptDate.toDateString() === tomorrow.toDateString()) dateLabel = 'Tomorrow';

  return (
    <div onClick={onSelect} className="border rounded-xl p-4 cursor-pointer transition shadow-card"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{appointment.student_name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap" style={sStyle}>{sLabel}</span>
          </div>
          <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span className="truncate">{appointment.student_email}</span></div>
            <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /><span>{dateLabel}</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{appointment.preferred_time || 'TBD'}</span></div>
            {appointment.purpose && <div className="text-xs"><span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Purpose:</span> {appointment.purpose}</div>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            {getMethodIcon(appointment.method)}
            <span className="text-sm">{appointment.method.charAt(0).toUpperCase() + appointment.method.slice(1).replace('-', ' ')}</span>
          </div>
          {appointment.meeting_link && (
            <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition"
              style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Join <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {appointment.risk_level && (
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger)' }}>
              Risk: {appointment.risk_level}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentDetailsModal({ appointment, onClose }: { appointment: AppointmentDetail; onClose: () => void }) {
  const { style: sStyle, label: sLabel } = getStatusStyle(appointment.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ background: 'var(--color-surface)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-6"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Appointment Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        <div className="p-6 space-y-6">
          {/* Student info */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--color-primary-surface)', borderColor: 'var(--color-primary)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Student Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm opacity-75" style={{ color: 'var(--color-primary)' }}>Name</p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{appointment.student_name}</p>
              </div>
              <div>
                <p className="text-sm opacity-75" style={{ color: 'var(--color-primary)' }}>Email</p>
                <p className="font-medium break-all" style={{ color: 'var(--color-text-primary)' }}>{appointment.student_email}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Date', value: new Date(appointment.preferred_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Time', value: appointment.preferred_time || 'TBD' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
              </div>
            ))}
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
              <span className="text-sm font-medium px-3 py-1 rounded" style={sStyle}>{sLabel}</span>
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Method</p>
              <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {getMethodIcon(appointment.method)}
                <span>{appointment.method.charAt(0).toUpperCase() + appointment.method.slice(1).replace('-', ' ')}</span>
              </div>
            </div>
          </div>

          {appointment.purpose && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Purpose</p>
              <p style={{ color: 'var(--color-text-primary)' }}>{appointment.purpose}</p>
            </div>
          )}
          {appointment.concern && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Concern</p>
              <p style={{ color: 'var(--color-text-primary)' }}>{appointment.concern}</p>
            </div>
          )}
          {appointment.meeting_link && (
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-success)' }}>Meeting Link</p>
              <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 font-medium break-all hover:underline"
                style={{ color: 'var(--color-success)' }}>
                {appointment.meeting_link}<ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>
          )}
          {appointment.risk_level && (
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-danger)' }}>Risk Level</p>
              <p className="font-semibold" style={{ color: 'var(--color-danger)' }}>{appointment.risk_level}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Close
          </button>
          {appointment.meeting_link && (
            <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-90 flex items-center gap-2"
              style={{ background: 'var(--color-primary)' }}>
              <Video className="w-4 h-4" /> Join Meeting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView({ appointments }: { appointments: AppointmentDetail[] }) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(today.getFullYear(), today.getMonth(), dayNum);
  });

  return (
    <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
          <div key={day} className="p-4 text-center text-sm font-semibold"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="p-3 min-h-24" style={{ background: 'var(--color-bg)' }} />;
          const dayApts = appointments.filter(a => new Date(a.preferred_date).toDateString() === date.toDateString());
          return (
            <div key={date.toISOString()} className="p-3 min-h-24 transition"
              style={{ border: '1px solid var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>{date.getDate()}</p>
              <div className="space-y-1">
                {dayApts.slice(0, 2).map(apt => (
                  <div key={apt.appointment_id} className="px-2 py-1 rounded text-xs font-medium truncate"
                    style={{ background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }}>
                    {apt.student_name.split(' ')[0]}
                  </div>
                ))}
                {dayApts.length > 2 && (
                  <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>+{dayApts.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SEL_S = (focused: boolean): React.CSSProperties => ({
  background: 'var(--color-bg)',
  border: `1px solid ${focused ? 'var(--color-primary)' : 'var(--color-border)'}`,
  color: 'var(--color-text-primary)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
});

export default function CounselorSchedulePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState<FilterState>({ dateRange: 'all', status: 'all', method: 'all', searchTerm: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<AppointmentDetail | null>(null);
  const [sorting, setSorting] = useState<'date-asc' | 'date-desc' | 'status' | 'name'>('date-asc');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [focusedField, setFocusedField] = useState<string>('');

  useEffect(() => {
    const ud = localStorage.getItem('user'); const tok = localStorage.getItem('token');
    if (!ud || !tok) { router.push('/login'); return; }
    const u = JSON.parse(ud);
    if (!['COUNSELOR','PSYCHOLOGIST','IC','ADMIN'].includes(u.role?.toUpperCase())) { router.push('/dashboard'); return; }
    fetchAppointments(tok);
  }, [router]);

  const fetchAppointments = async (token: string) => {
    setRefreshing(true);
    try {
      const r = await fetch(api('/api/appointments/dashboard/role-view'), { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (r.ok) {
        const d = await r.json();
        if (d.appointments) {
          if (Array.isArray(d.appointments)) setAppointments(d.appointments);
          else if (d.appointments.confirmed) setAppointments([...(d.appointments.pending_approval||[]),...(d.appointments.confirmed||[]),...(d.appointments.completed||[])]);
          else setAppointments(Object.values(d.appointments).flat() as AppointmentDetail[]);
        }
      } else setError('Failed to fetch appointments');
    } catch { setError('Error loading appointments'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = useMemo(() => {
    let f = appointments;
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filters.dateRange === 'today') { const t2 = new Date(today); t2.setDate(t2.getDate()+1); f = f.filter(a => new Date(a.preferred_date) >= today && new Date(a.preferred_date) < t2); }
    else if (filters.dateRange === 'week') { const we = new Date(today); we.setDate(we.getDate()+7); f = f.filter(a => new Date(a.preferred_date) >= today && new Date(a.preferred_date) <= we); }
    else if (filters.dateRange === 'month') { const me = new Date(today); me.setMonth(me.getMonth()+1); f = f.filter(a => new Date(a.preferred_date) >= today && new Date(a.preferred_date) <= me); }
    else if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) { f = f.filter(a => new Date(a.preferred_date) >= new Date(filters.customStartDate!) && new Date(a.preferred_date) <= new Date(filters.customEndDate!)); }
    if (filters.status !== 'all') f = f.filter(a => a.status === filters.status);
    if (filters.method !== 'all') f = f.filter(a => a.method === filters.method);
    if (filters.searchTerm) { const t = filters.searchTerm.toLowerCase(); f = f.filter(a => a.student_name.toLowerCase().includes(t) || a.student_email.toLowerCase().includes(t) || a.purpose.toLowerCase().includes(t)); }
    return [...f].sort((a,b) => {
      if (sorting === 'date-asc') return new Date(a.preferred_date).getTime() - new Date(b.preferred_date).getTime();
      if (sorting === 'date-desc') return new Date(b.preferred_date).getTime() - new Date(a.preferred_date).getTime();
      if (sorting === 'name') return a.student_name.localeCompare(b.student_name);
      return a.status.localeCompare(b.status);
    });
  }, [appointments, filters, sorting]);

  const stats = useMemo(() => ({
    total:     appointments.length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    pending:   appointments.filter(a => a.status === 'PENDING_APPROVAL').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
  }), [appointments]);

  return (
    <DashboardPageWrapper title="Counselor Schedule" subtitle="View and manage your assigned appointments">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total"     value={stats.total} />
          <StatCard label="Confirmed" value={stats.confirmed} color="var(--color-success)" />
          <StatCard label="Pending"   value={stats.pending}   color="var(--color-warning)" />
          <StatCard label="Completed" value={stats.completed} color="var(--color-primary)" />
        </div>

        {/* Toolbar */}
        <div className="border rounded-xl p-4 space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search by student name, email, or purpose…"
                value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition"
                style={{ background: 'var(--color-bg)', border: `1px solid ${searchFocused ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)' }}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            </div>
            <div className="flex gap-2">
              {(['list','calendar'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition capitalize"
                  style={viewMode === m
                    ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)' }
                    : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={() => { const t = localStorage.getItem('token'); if (t) fetchAppointments(t); }} disabled={refreshing}
              className="p-2 rounded-lg transition disabled:opacity-50"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
              style={showFilters
                ? { background: 'var(--color-primary-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4"
              style={{ borderTop: '1px solid var(--color-border)' }}>
              {[
                { label: 'Date Range', field: 'dateRange', options: [['all','All Time'],['today','Today'],['week','This Week'],['month','This Month'],['custom','Custom Range']], value: filters.dateRange },
                { label: 'Status', field: 'status', options: [['all','All Statuses'],['PENDING_APPROVAL','Pending Approval'],['CONFIRMED','Confirmed'],['COMPLETED','Completed'],['CANCELLED','Cancelled']], value: filters.status },
                { label: 'Method', field: 'method', options: [['all','All Methods'],['in-person','In-Person'],['google-meet','Google Meet'],['zoom','Zoom'],['phone','Phone']], value: filters.method },
                { label: 'Sort By', field: 'sorting', options: [['date-asc','Date (Earliest)'],['date-desc','Date (Latest)'],['name','Student Name'],['status','Status']], value: sorting },
              ].map(({ label, field, options, value }) => (
                <div key={field}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                  <select value={value}
                    onChange={e => field === 'sorting' ? setSorting(e.target.value as any) : setFilters({...filters, [field]: e.target.value})}
                    style={SEL_S(focusedField === field)}
                    onFocus={() => setFocusedField(field)} onBlur={() => setFocusedField('')}>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
          </div>
        ) : error ? (
          <div className="rounded-xl border p-4 text-sm" style={{ background: 'var(--color-danger-surface)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border rounded-xl p-8 text-center" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <CalendarIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No appointments found matching your filters</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filtered.map(apt => <AppointmentCard key={apt.appointment_id} appointment={apt} onSelect={() => setSelected(apt)} />)}
          </div>
        ) : (
          <CalendarView appointments={filtered} />
        )}
      </div>

      {selected && <AppointmentDetailsModal appointment={selected} onClose={() => setSelected(null)} />}
    </DashboardPageWrapper>
  );
}
