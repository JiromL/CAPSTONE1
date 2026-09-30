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

const IC = 'input resize-none';
const ICS: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg p-6 max-w-md w-full" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'}>
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 rounded" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Appointment</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{appointmentDate}</p>
          {counselorName && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>with {counselorName}</p>
          )}
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>

        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Reason {appointmentType === 'cancel' ? 'for cancellation' : 'for no show'}
            </label>
            <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
          </div>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setError(null); }}
            placeholder={appointmentType === 'cancel' ? "Tell us why you're cancelling..." : 'Provide details about the missed appointment...'}
            rows={4}
            className={IC}
            style={ICS}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'var(--color-danger-surface)', border: '1px solid var(--color-danger)' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded font-medium transition disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
            onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'; }}
            onMouseLeave={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Keep Appointment
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded font-medium text-white transition disabled:opacity-50"
            style={{ background: appointmentType === 'cancel' ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
            onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = appointmentType === 'cancel' ? 'var(--color-danger-hover)' : 'var(--color-text-primary)'; }}
            onMouseLeave={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = appointmentType === 'cancel' ? 'var(--color-danger)' : 'var(--color-text-secondary)'; }}
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
