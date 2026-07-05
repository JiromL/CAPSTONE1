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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        Create Check-In
      </h3>

      {/* Error Message */}
      {error && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <p className="font-medium text-red-900 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex gap-3 bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-blue-700 rounded-lg p-4">
          <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
          <p className="font-medium text-green-900 dark:text-green-200">
            Check-in created successfully!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-In Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
            Check-In Type <span className="text-red-500">*</span>
          </label>
          <select
            name="check_in_type"
            value={formData.check_in_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
            Contact Method <span className="text-red-500">*</span>
          </label>
          <select
            name="contact_method"
            value={formData.contact_method}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            min="5"
            step="5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
            Outcome <span className="text-red-500">*</span>
          </label>
          <select
            name="outcome"
            value={formData.outcome}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
          Check-In Notes <span className="text-red-500">*</span>
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          placeholder="Document how the client is doing, any updates, concerns, etc."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Next Check-In Date */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
          Next Check-In Date (Optional)
        </label>
        <input
          type="date"
          name="next_check_in_date"
          value={formData.next_check_in_date || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          When should the next check-in be scheduled? (Leave blank for 30-day default)
        </p>
      </div>

      {/* Action Items */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
          Action Items (Optional)
        </h4>
        
        {formData.action_items.length > 0 && (
          <div className="space-y-2 mb-4">
            {formData.action_items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-50 font-medium">
                    {item.action}
                  </p>
                  {item.due_date && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeActionItem(index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium ml-2"
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
            onChange={(e) =>
              setNewActionItem({ ...newActionItem, action: e.target.value })
            }
            placeholder="What action needs to be taken?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="date"
            value={newActionItem.due_date || ''}
            onChange={(e) =>
              setNewActionItem({ ...newActionItem, due_date: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={addActionItem}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            <Plus size={16} />
            Add Action Item
          </button>
        </div>
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
        <Loader size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Calendar className="mx-auto text-gray-400 dark:text-gray-500 mb-3" size={32} />
        <p className="text-gray-900 dark:text-gray-50 font-medium">No check-ins yet</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
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
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-50">
                {CHECK_IN_TYPES.find((t) => t.value === checkIn.check_in_type)
                  ?.label || checkIn.check_in_type}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(checkIn.created_at).toLocaleDateString()} •{' '}
                {CONTACT_METHODS.find((m) => m.value === checkIn.contact_method)
                  ?.label || checkIn.contact_method}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                checkIn.outcome === 'RESOLVED'
                  ? 'bg-green-100 dark:bg-blue-900/30 text-green-800 dark:text-green-300'
                  : checkIn.outcome === 'REFERRED'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  : checkIn.outcome === 'NEEDS_FOLLOWUP'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
              }`}
            >
              {CHECK_IN_OUTCOMES.find((o) => o.value === checkIn.outcome)
                ?.label || checkIn.outcome}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {checkIn.notes}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
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
        <Loader size={24} className="animate-spin text-[#2563eb] dark:text-blue-400" />
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-blue-900/20 rounded-lg border border-green-200 dark:border-blue-700 p-8 text-center">
        <CheckCircle className="mx-auto text-green-600 dark:text-green-400 mb-3" size={32} />
        <p className="text-green-900 dark:text-green-200 font-medium">
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
          className={`p-4 rounded-lg border transition ${
            checkIn.is_overdue
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-50">
                {checkIn.student_name || `Case ${checkIn.case_id}`}
              </h4>
              <p
                className={`text-sm mt-1 ${
                  checkIn.is_overdue
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {checkIn.is_overdue ? '⚠️ OVERDUE' : '⏰ DUE SOON'}:{' '}
                {checkIn.days_since_last} days since last check-in
              </p>
              {checkIn.next_check_in_date && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Scheduled: {new Date(checkIn.next_check_in_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <button className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-3 py-1 rounded text-sm font-medium transition">
              Check In
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
