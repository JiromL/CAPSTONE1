'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CancelNoShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  appointmentType: 'cancel' | 'no-show';
  appointmentDate: string;
  counselorName?: string;
}

export function CancelNoShowModal({
  isOpen,
  onClose,
  onSubmit,
  appointmentType,
  appointmentDate,
  counselorName,
}: CancelNoShowModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason);
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const title = appointmentType === 'cancel' ? 'Cancel Appointment' : 'Mark as No Show';
  const submitLabel = appointmentType === 'cancel' ? 'Cancel Appointment' : 'Submit No Show';
  const description = appointmentType === 'cancel'
    ? 'Are you sure you want to cancel this appointment?'
    : 'Are you sure you want to mark this appointment as no show?';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Appointment Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Appointment</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{appointmentDate}</p>
          {counselorName && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">with {counselorName}</p>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

        {/* Reason Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason {appointmentType === 'cancel' ? 'for cancellation' : 'for no show'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Please explain why you're cancelling..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 rounded font-medium text-white transition-colors disabled:opacity-50 ${
              appointmentType === 'cancel'
                ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600'
                : 'bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600'
            }`}
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
