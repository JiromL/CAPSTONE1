'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { api } from '@/utils/api';

interface TimeSlot {
  date: string;
  time: string;
  day_of_week?: string;
  is_today?: boolean;
  is_tomorrow?: boolean;
}

interface UrgencySchedulerProps {
  riskLevel: 'RED' | 'YELLOW' | 'GREEN';
  onSlotSelected?: (dateTime: string) => void;
  onError?: (error: string) => void;
}

export default function UrgencyScheduler({ riskLevel, onSlotSelected, onError }: UrgencySchedulerProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [counselorsAvailable, setCounsellorsAvailable] = useState(0);
  const [choiceMessage, setChoiceMessage] = useState('');
  const [isUserChoice, setIsUserChoice] = useState(false);

  useEffect(() => {
    fetchAvailableSlots();
  }, [riskLevel]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        api(`/api/intake/available-slots?risk_level=${riskLevel}&count=8`),
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.available_slots || []);
        setQueueStats(data.priority_queues || {});
        setCounsellorsAvailable(data.counselors_available || 0);
        setChoiceMessage(data.choice_message || '');
        setIsUserChoice(data.is_user_choice !== false);
        
        // For RED risk, auto-select first slot
        if (riskLevel === 'RED' && data.available_slots?.length > 0) {
          setSelectedSlot(data.available_slots[0]);
        }
      } else {
        const error = await response.json();
        if (onError) onError(error.error || 'Failed to fetch available slots');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      if (onError) onError('Failed to load appointment slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleSubmitSelection = async () => {
    if (!selectedSlot) {
      if (onError) onError('Please select a time slot');
      return;
    }

    try {
      setSubmitting(true);
      
      // Construct appointment datetime from date and time
      const [year, month, day] = selectedSlot.date.split('-');
      const [hours, minutes] = selectedSlot.time.split(':');
      const appointmentDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      ).toISOString();

      const response = await fetch(api('/api/intake/select-appointment-time'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          appointment_datetime: appointmentDateTime,
          risk_level: riskLevel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onSlotSelected) {
          onSlotSelected(data.selected_appointment.datetime);
        }
      } else {
        const error = await response.json();
        if (onError) onError(error.error || 'Failed to select appointment time');
      }
    } catch (error) {
      console.error('Error selecting appointment:', error);
      if (onError) onError('Failed to select appointment time');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskStyle = (): React.CSSProperties => {
    switch (riskLevel) {
      case 'RED':    return { background: '#FEF2F2', border: '2px solid #FCA5A5' };
      case 'YELLOW': return { background: '#FFFBEB', border: '2px solid #FCD34D' };
      case 'GREEN':  return { background: 'var(--color-success-surface)', border: '2px solid var(--color-success)' };
      default:       return { background: 'var(--color-bg)', border: '2px solid var(--color-border-strong)' };
    }
  };

  const getRiskTextColor = (): string => {
    switch (riskLevel) {
      case 'RED':    return '#7F1D1D';
      case 'YELLOW': return '#78350F';
      case 'GREEN':  return 'var(--color-success-text)';
      default:       return 'var(--color-text-primary)';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'RED':    return <AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />;
      case 'YELLOW': return <AlertTriangle className="w-5 h-5" style={{ color: '#D97706' }} />;
      case 'GREEN':  return <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
      default:       return <Clock className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'RED':
        return '🔴 URGENT - High Risk Assessment';
      case 'YELLOW':
        return '🟡 HIGH PRIORITY - Moderate Risk';
      case 'GREEN':
        return '🟢 STANDARD - Low Risk';
      default:
        return 'Risk Level Unknown';
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-lg" style={{ background: 'var(--color-info-surface)', border: '1px solid var(--color-info)' }}>
        <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-info-text)' }}>
          <Clock className="w-4 h-4 animate-spin" />
          Loading available appointment times...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Level Badge */}
      <div className="p-4 rounded-lg" style={getRiskStyle()}>
        <div className="flex items-center gap-2 mb-2">
          {getRiskIcon()}
          <h3 className="font-bold text-lg" style={{ color: getRiskTextColor() }}>{getRiskLabel()}</h3>
        </div>
        <p className="text-sm" style={{ color: getRiskTextColor() }}>{choiceMessage}</p>
      </div>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{queueStats.urgent_red || 0}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Urgent Cases</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#D97706' }}>{queueStats.high_priority_yellow || 0}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>High Priority</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{queueStats.standard_green || 0}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Standard Cases</p>
          </div>
        </div>
      )}

      {/* Counselor Availability */}
      {counselorsAvailable > 0 && (
        <div className="p-3 rounded-lg" style={{ background: 'var(--color-info-surface)', border: '1px solid var(--color-info)' }}>
          <p className="text-sm" style={{ color: 'var(--color-info-text)' }}>
            <Check size={14} aria-hidden="true" className="inline -mt-0.5" /> <strong>{counselorsAvailable} intake counselor{counselorsAvailable !== 1 ? 's' : ''}</strong> available for appointment
          </p>
        </div>
      )}

      {/* Available Time Slots */}
      {availableSlots.length > 0 && (
        <div className="space-y-2">
          {riskLevel === 'RED' ? (
            <div className="p-4 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <p className="mb-2 font-semibold" style={{ color: '#991B1B' }}>Your appointment is assigned:</p>
              <div className="p-3 rounded" style={{ background: 'var(--color-surface)', border: '1px solid #FCA5A5' }}>
                <p className="text-lg font-bold" style={{ color: '#B91C1C' }}>{availableSlots[0]?.time}</p>
                <p className="text-sm" style={{ color: '#DC2626' }}>{availableSlots[0]?.date}</p>
              </div>
              <p className="text-sm mt-3" style={{ color: '#991B1B' }}>
                A counselor will be assigned immediately. You will receive a confirmation email shortly.
              </p>
            </div>
          ) : (
            <>
              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Select Your Appointment Time:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={submitting}
                    className="w-full p-3 text-left rounded transition disabled:opacity-50"
                    style={
                      selectedSlot === slot
                        ? { border: '2px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                        : { border: '2px solid var(--color-border)', background: 'var(--color-surface)' }
                    }
                    onMouseEnter={e => { if (selectedSlot !== slot) { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.background = 'var(--color-bg)'; } }}
                    onMouseLeave={e => { if (selectedSlot !== slot) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; } }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{slot.time}</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{slot.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }}>
                            RECOMMENDED
                          </span>
                        )}
                        {selectedSlot === slot && <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {isUserChoice && (
                <button
                  onClick={handleSubmitSelection}
                  disabled={!selectedSlot || submitting}
                  className="w-full mt-4 px-4 py-2 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  style={{ background: selectedSlot && !submitting ? 'var(--color-primary)' : 'var(--color-border-strong)' }}
                  onMouseEnter={e => { if (selectedSlot && !submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
                  onMouseLeave={e => { if (selectedSlot && !submitting) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
                >
                  {submitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {availableSlots.length === 0 && (
        <div className="p-4 rounded-lg" style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)' }}>
          <p className="text-sm" style={{ color: 'var(--color-warning-text)' }}>
            ⚠️ No appointments currently available. Please try again in a few minutes.
          </p>
        </div>
      )}
    </div>
  );
}
