'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function WalkInIntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    phone: '',
    concern: '',
    isUrgent: false,
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setError('First name, last name, and email are required');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/intake/walkin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          student_id: formData.studentId,
          phone: formData.phone,
          concern: formData.concern,
          is_urgent: formData.isUrgent,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create walk-in intake');
      }

      const result = await response.json();
      setSuccess(`Walk-in intake created successfully. ID: ${result.intake_id || result._id || 'N/A'}`);

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        studentId: '',
        phone: '',
        concern: '',
        isUrgent: false,
        notes: '',
      });

      setTimeout(() => router.push('/appointment-requests'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPageWrapper title="Walk-In Intake" subtitle="Register a student visiting the office">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2 items-start">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-2 items-start">
              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  placeholder="John" required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  placeholder="Doe" required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="student@dlsu.edu.ph" required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                <input type="text" name="studentId" value={formData.studentId} onChange={handleChange}
                  placeholder="00-1234"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="+63 9XX XXX XXXX"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Concern</label>
              <select name="concern" value={formData.concern} onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">— Select a concern —</option>
                <option value="academic">Academic Concerns</option>
                <option value="mental_health">Mental Health</option>
                <option value="personal">Personal Issues</option>
                <option value="relationship">Relationship Issues</option>
                <option value="career">Career Counseling</option>
                <option value="crisis">Crisis Support</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isUrgent" checked={formData.isUrgent} onChange={handleChange}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Mark as Urgent — needs immediate attention
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange}
                placeholder="Any additional information about the student's visit..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition text-sm">
                {loading ? 'Registering...' : 'Register Walk-In Student'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-50 font-medium py-2 px-4 rounded-lg transition text-sm">
                Cancel
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The student will be added to the intake queue and assigned to an available counselor. All walk-in registrations are logged in the audit trail.
            </p>
          </div>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
