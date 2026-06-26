'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

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
        `/api/intake/available-slots?risk_level=${riskLevel}&count=8`,
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

      const response = await fetch('/api/intake/select-appointment-time', {
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

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'RED':
        return 'bg-red-50 border-red-300';
      case 'YELLOW':
        return 'bg-yellow-50 border-yellow-300';
      case 'GREEN':
        return 'bg-green-50 border-green-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getRiskTextColor = () => {
    switch (riskLevel) {
      case 'RED':
        return 'text-red-900';
      case 'YELLOW':
        return 'text-yellow-900';
      case 'GREEN':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'RED':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'YELLOW':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'GREEN':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
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
      <div className="p-6 bg-blue-50 border border-blue-300 rounded-lg">
        <p className="text-blue-700 flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          Loading available appointment times...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Level Badge */}
      <div className={`p-4 border-2 rounded-lg ${getRiskColor()}`}>
        <div className="flex items-center gap-2 mb-2">
          {getRiskIcon()}
          <h3 className={`font-bold text-lg ${getRiskTextColor()}`}>{getRiskLabel()}</h3>
        </div>
        <p className={`text-sm ${getRiskTextColor()}`}>{choiceMessage}</p>
      </div>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{queueStats.urgent_red || 0}</p>
            <p className="text-xs text-gray-600">Urgent Cases</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{queueStats.high_priority_yellow || 0}</p>
            <p className="text-xs text-gray-600">High Priority</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{queueStats.standard_green || 0}</p>
            <p className="text-xs text-gray-600">Standard Cases</p>
          </div>
        </div>
      )}

      {/* Counselor Availability */}
      {counselorsAvailable > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            ✓ <strong>{counselorsAvailable} intake counselor{counselorsAvailable !== 1 ? 's' : ''}</strong> available for appointment
          </p>
        </div>
      )}

      {/* Available Time Slots - For RED: auto-assignment display, For YELLOW/GREEN: selectable */}
      {availableSlots.length > 0 && (
        <div className="space-y-2">
          {riskLevel === 'RED' ? (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-red-800 mb-2 font-semibold">✓ Your appointment is assigned:</p>
              <div className="bg-white p-3 rounded border border-red-200">
                <p className="text-lg font-bold text-red-700">
                  {availableSlots[0]?.time}
                </p>
                <p className="text-sm text-red-600">{availableSlots[0]?.date}</p>
              </div>
              <p className="text-sm text-red-700 mt-3">
                A counselor will be assigned immediately. You will receive a confirmation email shortly.
              </p>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-gray-800">Select Your Appointment Time:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={submitting}
                    className={`w-full p-3 text-left rounded border-2 transition ${
                      selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{slot.time}</p>
                        <p className="text-sm text-gray-600">{slot.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 text-blue-800 text-xs font-semibold rounded">
                            RECOMMENDED
                          </span>
                        )}
                        {selectedSlot === slot && <ChevronRight className="w-5 h-5 text-blue-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Submit Selection Button */}
              {isUserChoice && (
                <button
                  onClick={handleSubmitSelection}
                  disabled={!selectedSlot || submitting}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {submitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* No slots available */}
      {availableSlots.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-yellow-800">
            ⚠️ No appointments currently available. Please try again in a few minutes.
          </p>
        </div>
      )}
    </div>
  );
}
