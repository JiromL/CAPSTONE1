"use client";

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Calendar, Clock, Loader, Plus } from 'lucide-react';

export const CHECK_IN_TYPES = [
  { value: 'STATUS_UPDATE', label: 'Status Update' },
  { value: 'WELFARE_CHECK', label: 'Welfare Check' },
  { value: 'REFERRAL_FOLLOW_UP', label: 'Referral Follow-Up' },
  { value: 'CRISIS_INTERVENTION', label: 'Crisis Intervention' },
  { value: 'OTHER', label: 'Other' },
];

export const CONTACT_METHODS = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'VIDEO', label: 'Video' },
];

export const CHECK_IN_OUTCOMES = [
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'REFERRED', label: 'Referred' },
  { value: 'NEEDS_FOLLOWUP', label: 'Needs Follow-up' },
];

interface ActionItem {
  action: string;
  due_date?: string;
}

interface CheckInFormData {
  check_in_type: string;
  contact_method: string;
  duration_minutes: number;
  notes: string;
  action_items: ActionItem[];
  outcome: string;
  next_check_in_date?: string;
}

interface CheckInFormProps {
  caseId: string;
  onSubmit: (data: CheckInFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CheckInForm({ caseId, onSubmit, isLoading = false }: CheckInFormProps) {
  const [formData, setFormData] = useState<CheckInFormData>({
    check_in_type: 'STATUS_UPDATE',
    contact_method: 'IN_PERSON',
    duration_minutes: 30,
    notes: '',
    action_items: [],
    outcome: 'ONGOING',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newActionItem, setNewActionItem] = useState({ action: '', due_date: '' });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) : value,
    }));
    setError(null);
  };

  const addActionItem = () => {
    if (!newActionItem.action.trim()) {
      setError('Action item cannot be empty');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      action_items: [...prev.action_items, newActionItem],
    }));
    setNewActionItem({ action: '', due_date: '' });
  };

  const removeActionItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.notes.trim()) {
      setError('Please add check-in notes');
      return;
    }

    try {
      await onSubmit(formData);
      setSuccess(true);
      setFormData({
        check_in_type: 'STATUS_UPDATE',
        contact_method: 'IN_PERSON',
        duration_minutes: 30,
        notes: '',
        action_items: [],
        outcome: 'ONGOING',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create check-in');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Create Check-In
      </h3>

      {/* Error Message */}
      {error && (
        <div className="flex gap-3 rounded-lg p-4" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
          <AlertCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-danger)' }} />
          <p className="font-medium" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex gap-3 rounded-lg p-4" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
          <CheckCircle className="flex-shrink-0" size={20} style={{ color: 'var(--color-success)' }} />
          <p className="font-medium" style={{ color: 'var(--color-success-text)' }}>
            Check-in created successfully!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-In Type */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Check-In Type <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            name="check_in_type"
            value={formData.check_in_type}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {CHECK_IN_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Method */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Contact Method <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            name="contact_method"
            value={formData.contact_method}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {CONTACT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Duration (minutes)
          </label>
          <input
            type="number"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            min="5"
            step="5"
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Outcome <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            name="outcome"
            value={formData.outcome}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          >
            {CHECK_IN_OUTCOMES.map((outcome) => (
              <option key={outcome.value} value={outcome.value}>
                {outcome.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Check-In Notes <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          placeholder="Document how the client is doing, any updates, concerns, etc."
          className="w-full px-3 py-2 rounded-lg outline-none transition"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Next Check-In Date (Optional)
        </label>
        <input
          type="date"
          name="next_check_in_date"
          value={formData.next_check_in_date || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg outline-none transition"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          When should the next check-in be scheduled? (Leave blank for 30-day default)
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Action Items (Optional)
        </h4>

        {formData.action_items.length > 0 && (
          <div className="space-y-2 mb-4">
            {formData.action_items.map((item, index) => (
              <div key={index} className="flex items-start justify-between p-3 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.action}</p>
                  {item.due_date && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Due: {new Date(item.due_date).toLocaleDateString()}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeActionItem(index)}
                  className="text-sm font-medium ml-2"
                  style={{ color: 'var(--color-danger)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <input
            type="text"
            value={newActionItem.action}
            onChange={e => setNewActionItem({ ...newActionItem, action: e.target.value })}
            placeholder="What action needs to be taken?"
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
          <input
            type="date"
            value={newActionItem.due_date || ''}
            onChange={e => setNewActionItem({ ...newActionItem, due_date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg outline-none transition"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          />
          <button
            type="button"
            onClick={addActionItem}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)'}
          >
            <Plus size={16} />
            Add Action Item
          </button>
        </div>
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
              Creating Check-In...
            </>
          ) : (
            <>
              <Calendar size={16} />
              Create Check-In
            </>
          )}
        </button>
      </div>
    </form>
  );
}

interface CheckInHistoryProps {
  caseId?: string;
  checkIns: Array<{
    _id?: string;
    check_in_type: string;
    contact_method: string;
    notes: string;
    created_at: string;
    outcome: string;
    duration_minutes?: number;
    next_check_in_date?: string;
  }>;
  isLoading?: boolean;
}

export function CheckInHistory({ checkIns, isLoading = false }: CheckInHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <Calendar className="mx-auto mb-3" size={32} style={{ color: 'var(--color-text-muted)' }} />
        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>No check-ins yet</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Create the first check-in to start tracking interactions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checkIns.map((checkIn, index) => (
        <div
          key={index}
          className="rounded-2xl p-4 transition"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {CHECK_IN_TYPES.find((t) => t.value === checkIn.check_in_type)
                  ?.label || checkIn.check_in_type}
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {new Date(checkIn.created_at).toLocaleDateString()} •{' '}
                {CONTACT_METHODS.find((m) => m.value === checkIn.contact_method)
                  ?.label || checkIn.contact_method}
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={
                checkIn.outcome === 'RESOLVED'
                  ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
                  : checkIn.outcome === 'REFERRED'
                  ? { background: 'var(--color-info-surface)', color: 'var(--color-info-text)' }
                  : checkIn.outcome === 'NEEDS_FOLLOWUP'
                  ? { background: 'var(--color-warning-surface)', color: 'var(--color-warning-text)' }
                  : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }
              }
            >
              {CHECK_IN_OUTCOMES.find((o) => o.value === checkIn.outcome)
                ?.label || checkIn.outcome}
            </span>
          </div>

          <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {checkIn.notes}
          </p>

          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {checkIn.duration_minutes && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                {checkIn.duration_minutes} minutes
              </div>
            )}
            {checkIn.next_check_in_date && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                Next: {new Date(checkIn.next_check_in_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface PendingCheckInsProps {
  checkIns: Array<{
    _id?: string;
    case_id: string;
    student_name?: string;
    client_status: string;
    check_in_type?: string;
    last_check_in_date?: string;
    days_since_last: number;
    is_overdue: boolean;
    next_check_in_date?: string;
  }>;
  isLoading?: boolean;
}

export function PendingCheckIns({ checkIns, isLoading = false }: PendingCheckInsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="rounded-lg p-8 text-center" style={{ background: 'var(--color-success-surface)', border: '1px solid var(--color-success)' }}>
        <CheckCircle className="mx-auto mb-3" size={32} style={{ color: 'var(--color-success)' }} />
        <p className="font-medium" style={{ color: 'var(--color-success-text)' }}>
          All check-ins up to date!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checkIns.map((checkIn, index) => (
        <div
          key={index}
          className="p-4 rounded-lg border transition"
          style={
            checkIn.is_overdue
              ? { background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }
              : { background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }
          }
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {checkIn.student_name || `Case ${checkIn.case_id}`}
              </h4>
              <p
                className="text-sm mt-1"
                style={{ color: checkIn.is_overdue ? 'var(--color-danger-text)' : 'var(--color-warning-text)' }}
              >
                {checkIn.is_overdue ? '⚠️ OVERDUE' : '⏰ DUE SOON'}:{' '}
                {checkIn.days_since_last} days since last check-in
              </p>
              {checkIn.next_check_in_date && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Scheduled: {new Date(checkIn.next_check_in_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              className="text-white px-3 py-1 rounded text-sm font-medium transition"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'}
            >
              Check In
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
