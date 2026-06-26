"use client";

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface IntakeFormData {
  student_id?: string;
  client_status: string;
  transaction_type: string;
  presenting_issue: string;
  primary_concern: string;
  notes?: string;
}

export const CLIENT_STATUSES = [
  { value: 'ACTIVE', label: 'Active (Ongoing Counseling)' },
  { value: 'INACTIVE', label: 'Inactive (Not Receiving Services)' },
  { value: 'CHECK_IN_ONLY', label: 'Check-In Only (Periodic Monitoring)' },
  { value: 'WITH_MH_CHECK_IN', label: 'With MH Check-In (Collaborative Care)' },
  { value: 'UNDER_ACCOMMODATION', label: 'Under Accommodation (SDFO)' },
  { value: 'TERMINATION_PENDING', label: 'Termination Pending' },
];

export const TRANSACTION_TYPES = [
  { value: 'NEW_INTAKE', label: 'New Intake (First Time)' },
  { value: 'CHECK_IN', label: 'Check-In (Periodic Monitoring)' },
  { value: 'SELF_REFERRED', label: 'Self-Referred by Student' },
  { value: 'REFERRED', label: 'Referred from Another Department' },
  { value: 'WALK_IN', label: 'Walk-In Visit' },
  { value: 'FOLLOW_UP', label: 'Follow-Up Contact' },
];

interface IntakeFormProps {
  onSubmit: (data: IntakeFormData) => Promise<void>;
  initialData?: Partial<IntakeFormData>;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function IntakeForm({
  onSubmit,
  initialData,
  isLoading = false,
  isEditing = false,
}: IntakeFormProps) {
  const [formData, setFormData] = useState<IntakeFormData>({
    client_status: initialData?.client_status || 'ACTIVE',
    transaction_type: initialData?.transaction_type || 'NEW_INTAKE',
    presenting_issue: initialData?.presenting_issue || '',
    primary_concern: initialData?.primary_concern || '',
    notes: initialData?.notes || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.presenting_issue.trim()) {
      setError('Presenting issue is required');
      return;
    }

    try {
      await onSubmit(formData);
      setSuccess(true);
      if (!isEditing) {
        setFormData({
          client_status: 'ACTIVE',
          transaction_type: 'NEW_INTAKE',
          presenting_issue: '',
          primary_concern: '',
          notes: '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit intake form');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-900 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex gap-3 bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-700 rounded-lg p-4">
          <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-blue-900 dark:text-green-200">
              {isEditing ? 'Case updated successfully' : 'Intake submitted successfully'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Status */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
            Client Status <span className="text-red-500">*</span>
          </label>
          <select
            name="client_status"
            value={formData.client_status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Select how the client will be served (active counseling, periodic check-ins, etc.)
          </p>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
            Transaction Type <span className="text-red-500">*</span>
          </label>
          <select
            name="transaction_type"
            value={formData.transaction_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            How is the student coming to services? (self-referred, referred, check-in, etc.)
          </p>
        </div>
      </div>

      {/* Presenting Issue */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
          Presenting Issue <span className="text-red-500">*</span>
        </label>
        <textarea
          name="presenting_issue"
          value={formData.presenting_issue}
          onChange={handleChange}
          rows={4}
          placeholder="What brings the student in today? (e.g., anxiety, academic stress, relationship issues, etc.)"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Primary Concern */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
          Primary Concern
        </label>
        <textarea
          name="primary_concern"
          value={formData.primary_concern}
          onChange={handleChange}
          rows={3}
          placeholder="What is the main area of focus? (Can differ from presenting issue for check-ins)"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Useful for tracking changes during check-ins
        </p>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional information..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Status Legend */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3">Client Status Guide</h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li><strong>ACTIVE:</strong> Student receiving active ongoing counseling (8 weeks typical)</li>
          <li><strong>CHECK_IN_ONLY:</strong> Periodic monitoring after completing counseling</li>
          <li><strong>WITH_MH_CHECK_IN:</strong> Collaborative care with external mental health provider</li>
          <li><strong>UNDER_ACCOMMODATION:</strong> SDFO accommodations being tracked</li>
          <li><strong>TERMINATION_PENDING:</strong> Currently closing out case</li>
          <li><strong>INACTIVE:</strong> Not currently receiving services</li>
        </ul>
      </div>

      {/* Transaction Type Legend */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-3">Transaction Type Guide</h4>
        <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300">
          <li><strong>NEW_INTAKE:</strong> First-time student seeking services</li>
          <li><strong>SELF_REFERRED:</strong> Student initiated contact themselves</li>
          <li><strong>REFERRED:</strong> Referred from another campus department</li>
          <li><strong>CHECK_IN:</strong> Periodic monitoring of existing client</li>
          <li><strong>WALK_IN:</strong> Unscheduled visit or emergency contact</li>
          <li><strong>FOLLOW_UP:</strong> Follow-up contact after previous interaction</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              {isEditing ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            isEditing ? 'Update Case' : 'Submit Intake'
          )}
        </button>
      </div>
    </form>
  );
}
