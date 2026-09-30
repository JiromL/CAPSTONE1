'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { AlertCircle, CheckCircle, Loader, Search } from 'lucide-react';
import { api } from '@/utils/api';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Counselor {
  _id: string;
  name: string;
  role: string;
}

const IC = 'input';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

export default function NonCounselingClientsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    concern: '',
    client_status: 'CHECK_IN_ONLY',
    assigned_counselor_id: '',
    notes: '',
  });

  useEffect(() => {
    const fetchCounselors = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api('/api/users?roles=PSYCHOLOGIST,COUNSELOR'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCounselors(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch counselors:', err);
      }
    };
    fetchCounselors();
  }, []);

  const handleStudentSearch = async (query: string) => {
    if (query.length < 2) { setStudents([]); return; }
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/users?search=${encodeURIComponent(query)}&roles=STUDENT`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.users || []);
      }
    } catch (err) {
      console.error('Failed to search students:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setFormData({ ...formData, student_id: student._id, student_name: student.name });
    setStudents([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!formData.student_id) { setError('Please select a student'); setLoading(false); return; }
      if (!formData.concern)    { setError('Please enter a concern');   setLoading(false); return; }
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/cases/checkin/create'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: formData.student_id,
          concern: formData.concern,
          client_status: formData.client_status,
          assigned_counselor_id: formData.assigned_counselor_id || undefined,
          notes: formData.notes,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create case');
        setLoading(false);
        return;
      }
      const result = await response.json();
      setSuccess(`Check-in case created for ${result.student_name}`);
      setFormData({ student_id: '', student_name: '', concern: '', client_status: 'CHECK_IN_ONLY', assigned_counselor_id: '', notes: '' });
      setTimeout(() => { router.push('/dashboard'); }, 2000);
    } catch (err) {
      setError('Error creating case. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const SECTION: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)' };

  return (
    <PageShell title="Non-Counseling Check-In Clients" subtitle="Create periodic check-in cases for referred students">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex gap-3 rounded p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
              <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
              <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex gap-3 rounded p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
              <CheckCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-success)' }} />
              <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>{success}</p>
            </div>
          )}

          {/* Student Search */}
          <div style={SECTION}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Select Student <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
                  <input type="text" placeholder="Search by name or email..."
                    onChange={e => handleStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg outline-none" style={ICS} />
                  {searching && <Loader size={16} className="absolute right-3 top-3 animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
                </div>
              </div>

              {students.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded z-10"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                  {students.slice(0, 5).map(student => (
                    <button key={student._id} type="button" onClick={() => handleSelectStudent(student)}
                      className="w-full text-left px-3 py-2 text-sm transition"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{student.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{student.email}</p>
                    </button>
                  ))}
                </div>
              )}

              {formData.student_id && (
                <div className="mt-2 px-3 py-2 rounded text-sm" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formData.student_name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>ID: {formData.student_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Concern */}
          <div style={SECTION}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Concern/Issue for Check-In <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea value={formData.concern} onChange={e => setFormData({ ...formData, concern: e.target.value })}
              placeholder="e.g., Academic Stress Monitoring, Anxiety Management, etc."
              className={IC} style={{ ...ICS, resize: 'vertical' }} rows={2} />
          </div>

          {/* Client Status */}
          <div style={SECTION}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Client Status <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select value={formData.client_status} onChange={e => setFormData({ ...formData, client_status: e.target.value })}
              className={IC} style={ICS}>
              <option value="CHECK_IN_ONLY">Check-In Only</option>
              <option value="WITH_MH_CHECK_IN">Collaborating with MH - Check-In Only</option>
              <option value="UNDER_ACCOMMODATION">Under Accommodation (SDFO)</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATION_PENDING">Termination Pending</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Select the appropriate status for this student</p>
          </div>

          {/* Assigned Counselor */}
          <div style={SECTION}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Assign to Counselor (Optional)
            </label>
            <select value={formData.assigned_counselor_id} onChange={e => setFormData({ ...formData, assigned_counselor_id: e.target.value })}
              className={IC} style={ICS}>
              <option value="">-- Select Counselor --</option>
              {counselors.map(counselor => (
                <option key={counselor._id} value={counselor._id}>{counselor.name} ({counselor.role})</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={SECTION}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Additional Notes (Optional)
            </label>
            <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this student's check-in..."
              className={IC} style={{ ...ICS, resize: 'vertical' }} rows={2} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="submit" disabled={loading || !formData.student_id || !formData.concern}
              className="flex-1 px-4 py-2 text-white rounded font-medium text-sm transition disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}>
              {loading ? 'Creating...' : 'Create Check-In Case'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="flex-1 px-4 py-2 rounded font-medium text-sm transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
