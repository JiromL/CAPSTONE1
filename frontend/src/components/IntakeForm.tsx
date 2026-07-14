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
        <div className="flex gap-3 rounded-lg p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex gap-3 rounded-lg p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
          <CheckCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-success)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--color-success-text)' }}>
              {isEditing ? 'Case updated successfully' : 'Intake submitted successfully'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Status */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Client Status <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            name="client_status"
            value={formData.client_status}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Select how the client will be served (active counseling, periodic check-ins, etc.)
          </p>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Transaction Type <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            name="transaction_type"
            value={formData.transaction_type}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            How is the student coming to services? (self-referred, referred, check-in, etc.)
          </p>
        </div>
      </div>

      {/* Presenting Issue */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Presenting Issue <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <textarea
          name="presenting_issue"
          value={formData.presenting_issue}
          onChange={handleChange}
          rows={4}
          placeholder="What brings the student in today? (e.g., anxiety, academic stress, relationship issues, etc.)"
          className="w-full px-4 py-2 rounded-lg outline-none transition"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Primary Concern
        </label>
        <textarea
          name="primary_concern"
          value={formData.primary_concern}
          onChange={handleChange}
          rows={3}
          placeholder="What is the main area of focus? (Can differ from presenting issue for check-ins)"
          className="w-full px-4 py-2 rounded-lg outline-none transition"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Useful for tracking changes during check-ins
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional information..."
          className="w-full px-4 py-2 rounded-lg outline-none transition"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--color-primary-surface)', border: '1px solid var(--color-primary-muted)' }}>
        <h4 className="font-medium mb-3" style={{ color: 'var(--color-primary-text)' }}>Client Status Guide</h4>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--color-primary-text)' }}>
          <li><strong>ACTIVE:</strong> Student receiving active ongoing counseling (8 weeks typical)</li>
          <li><strong>CHECK_IN_ONLY:</strong> Periodic monitoring after completing counseling</li>
          <li><strong>WITH_MH_CHECK_IN:</strong> Collaborative care with external mental health provider</li>
          <li><strong>UNDER_ACCOMMODATION:</strong> SDFO accommodations being tracked</li>
          <li><strong>TERMINATION_PENDING:</strong> Currently closing out case</li>
          <li><strong>INACTIVE:</strong> Not currently receiving services</li>
        </ul>
      </div>

      <div className="rounded-lg p-4" style={{ background: '#FAF5FF', border: '1px solid #D8B4FE' }}>
        <h4 className="font-medium mb-3" style={{ color: '#6B21A8' }}>Transaction Type Guide</h4>
        <ul className="space-y-2 text-sm" style={{ color: '#7C3AED' }}>
          <li><strong>NEW_INTAKE:</strong> First-time student seeking services</li>
          <li><strong>SELF_REFERRED:</strong> Student initiated contact themselves</li>
          <li><strong>REFERRED:</strong> Referred from another campus department</li>
          <li><strong>CHECK_IN:</strong> Periodic monitoring of existing client</li>
          <li><strong>WALK_IN:</strong> Unscheduled visit or emergency contact</li>
          <li><strong>FOLLOW_UP:</strong> Follow-up contact after previous interaction</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
          onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
          onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
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
