'use client';

import { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/utils/api';
import PageShell from '@/components/PageShell';

const IC = 'input';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

export default function BatchAssignPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/appointments/staff/batch-assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });
      if (!response.ok) throw new Error('Failed to batch assign appointments');
      const data = await response.json();
      setAssignments(data.assignments || []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Batch Assignment" subtitle="Auto-assign pending appointments to counselors">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="rounded-lg p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Assignment Criteria</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={IC} style={ICS} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className={IC} style={ICS} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
                style={{ background: loading ? 'var(--color-border-strong)' : 'var(--color-primary)' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
                {loading ? 'Processing...' : 'Run Assignment'}
              </button>
            </form>

            {success && (
              <div className="mt-4 p-3 rounded-lg flex gap-2" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
                <CheckCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                <span className="text-sm" style={{ color: 'var(--color-success-text)' }}>Assignments completed!</span>
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-lg flex gap-2" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
                <AlertCircle size={20} className="flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
                <span className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {assignments.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {assignments.length} Appointment{assignments.length !== 1 ? 's' : ''} Assigned
                  </h2>
                </div>
                <div className="space-y-3">
                  {assignments.map((apt, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                      <Calendar size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{apt.student_name || 'Student'}</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          Assigned to: <span className="font-medium">{apt.counselor_name || 'Counselor'}</span>
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(apt.scheduled_start).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                        Assigned
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-12 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <Calendar size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>Select date range and run assignment to see results</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
