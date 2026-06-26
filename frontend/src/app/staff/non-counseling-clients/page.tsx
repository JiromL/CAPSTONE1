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
    // Fetch counselors for assignment
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
    if (query.length < 2) {
      setStudents([]);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      // Search by email or name
      const response = await fetch(
        api(`/api/users?search=${encodeURIComponent(query)}&roles=STUDENT`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    setFormData({
      ...formData,
      student_id: student._id,
      student_name: student.name,
    });
    setStudents([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.student_id) {
        setError('Please select a student');
        setLoading(false);
        return;
      }
      if (!formData.concern) {
        setError('Please enter a concern');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/cases/checkin/create'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
      setSuccess(`✅ Check-in case created for ${result.student_name}`);
      
      // Reset form
      setFormData({
        student_id: '',
        student_name: '',
        concern: '',
        client_status: 'CHECK_IN_ONLY',
        assigned_counselor_id: '',
        notes: '',
      });

      // Redirect to success
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Error creating case. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell 
      title="Non-Counseling Check-In Clients"
      subtitle="Create periodic check-in cases for referred students"
    >
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex gap-3 bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-700 rounded p-4">
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              <p className="text-blue-700 dark:text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Student Search */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Select Student *
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                  />
                  {searching && <Loader size={16} className="absolute right-3 top-3 text-gray-400 animate-spin" />}
                </div>
              </div>

              {/* Search Results */}
              {students.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shadow-lg z-10">
                  {students.slice(0, 5).map((student) => (
                    <button
                      key={student._id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-sm"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-50">{student.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{student.email}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Student */}
              {formData.student_id && (
                <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-200">{formData.student_name}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">ID: {formData.student_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Concern */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Concern/Issue for Check-In *
            </label>
            <textarea
              value={formData.concern}
              onChange={(e) => setFormData({ ...formData, concern: e.target.value })}
              placeholder="e.g., Academic Stress Monitoring, Anxiety Management, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
              rows={2}
            />
          </div>

          {/* Client Status */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Client Status *
            </label>
            <select
              value={formData.client_status}
              onChange={(e) => setFormData({ ...formData, client_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
            >
              <option value="CHECK_IN_ONLY">Check-In Only</option>
              <option value="WITH_MH_CHECK_IN">Collaborating with MH - Check-In Only</option>
              <option value="UNDER_ACCOMMODATION">Under Accommodation (SDFO)</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATION_PENDING">Termination Pending</option>
            </select>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Select the appropriate status for this student
            </p>
          </div>

          {/* Assigned Counselor */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Assign to Counselor (Optional)
            </label>
            <select
              value={formData.assigned_counselor_id}
              onChange={(e) => setFormData({ ...formData, assigned_counselor_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
            >
              <option value="">-- Select Counselor --</option>
              {counselors.map((counselor) => (
                <option key={counselor._id} value={counselor._id}>
                  {counselor.name} ({counselor.role})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this student's check-in..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.student_id || !formData.concern}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium text-sm transition"
            >
              {loading ? 'Creating...' : 'Create Check-In Case'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
