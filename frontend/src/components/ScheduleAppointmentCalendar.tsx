'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';

interface AvailableSlot {
  slot_id: string;
  slot_start: string;
  slot_end: string;
  duration_minutes: number;
  counselor_id: string;
  counselor_name: string;
}

interface ScheduleAppointmentProps {
  caseId: string;
  onScheduled?: () => void;
}

export function ScheduleAppointmentCalendar({ caseId, onScheduled }: ScheduleAppointmentProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [counselorId, setCounselorId] = useState<string>('');
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    fetchCounselors();
  }, [caseId]);

  useEffect(() => {
    if (counselorId) {
      fetchAvailableSlots();
    }
  }, [currentDate, counselorId]);

  const fetchCounselors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingError('No authentication token found');
        return;
      }

      console.log('[ScheduleCalendar] Fetching case with ID:', caseId?.substring(0, 8) + '...');

      // For now, we'll fetch the case to get the case's assigned counselor
      const response = await fetch(api(`/api/cases/${caseId}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[ScheduleCalendar] Case fetch response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[ScheduleCalendar] Case response keys:', Object.keys(data));
        
        // Handle both response formats: direct case object or { case: {...} }
        const caseData = data.case || data;
        
        console.log('[ScheduleCalendar] Case data keys:', Object.keys(caseData));
        console.log('[ScheduleCalendar] assigned_counselor_id:', caseData.assigned_counselor_id);
        
        // Try multiple field names
        const counselorId = caseData.assigned_counselor_id || caseData.counselor_id || caseData.counselorId;
        if (counselorId) {
          console.log('[ScheduleCalendar] Setting counselor ID:', counselorId.substring(0, 8) + '...');
          setCounselorId(counselorId);
          setLoadingError(null);
        } else {
          console.error('[ScheduleCalendar] No counselor ID found in case');
          setLoadingError('No counselor assigned to your case. Please contact support.');
        }
      } else {
        const errorText = await response.text();
        console.error('[ScheduleCalendar] Case fetch error:', response.status, errorText);
        setLoadingError(`Failed to load case information (${response.status})`);
      }
    } catch (error) {
      console.error('[ScheduleCalendar] Error fetching counselors:', error);
      setLoadingError('Error loading counselor information');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!counselorId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Get first and last day of current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const response = await fetch(
        api(`/api/availability/counselor/${counselorId}?start_date=${startDate}T00:00:00&end_date=${endDate}T23:59:59`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.available_slots || []);
      } else {
        setMessage({ text: 'Failed to fetch available slots', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setMessage({ text: 'Error fetching available slots', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!selectedSlot) return;

    setScheduling(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(api('/api/appointments/request'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: caseId,
          requested_start: selectedSlot.slot_start,
          requested_end: selectedSlot.slot_end,
          appointment_type: 'followup',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ text: 'Appointment scheduled successfully!', type: 'success' });
        setSelectedSlot(null);
        setTimeout(() => {
          onScheduled?.();
        }, 1500);
      } else {
        const error = await response.json();
        setMessage({ text: error.error || 'Failed to schedule appointment', type: 'error' });
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      setMessage({ text: 'Error scheduling appointment', type: 'error' });
    } finally {
      setScheduling(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availableSlots.filter((slot) => slot.slot_start.startsWith(dateStr));
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Schedule Appointment</h3>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {loadingError && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          {loadingError}
        </div>
      )}

      {!counselorId && !loadingError && (
        <div className="mb-6 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50 mb-3"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading available appointment times...</p>
        </div>
      )}

      {counselorId && (
        <>
          {/* Calendar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h4 className="text-base font-medium text-gray-900 dark:text-gray-50">{monthName}</h4>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const slots = day ? getSlotsForDate(day) : [];
            const isToday = day && new Date().toDateString() === day.toDateString();
            const isSelected = day && selectedSlot && selectedSlot.slot_start.startsWith(day.toISOString().split('T')[0]);

            return (
              <div
                key={index}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg border p-1 cursor-pointer transition ${
                  !day
                    ? 'bg-gray-50 dark:bg-gray-700/50 border-transparent'
                    : slots.length > 0
                    ? 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50'
                } ${isToday ? 'border-gray-900 dark:border-gray-300' : ''} ${
                  isSelected ? 'bg-gray-900 dark:bg-gray-700 border-gray-900 dark:border-gray-600' : ''
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : isToday ? 'text-gray-900 dark:text-gray-50' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {slots.length > 0 && (
                      <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {slots.length}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available slots for selected date */}
      {selectedSlot && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h5 className="font-medium text-gray-900 dark:text-gray-50 mb-2">Selected Slot:</h5>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Clock size={16} />
            <span>
              {new Date(selectedSlot.slot_start).toLocaleString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              - 
              {new Date(selectedSlot.slot_end).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Counselor: <span className="font-medium">{selectedSlot.counselor_name}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Duration: <span className="font-medium">{selectedSlot.duration_minutes} minutes</span>
          </p>
        </div>
      )}
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleScheduleAppointment}
          disabled={!selectedSlot || scheduling}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
            selectedSlot && !scheduling
              ? 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {scheduling ? 'Scheduling...' : 'Schedule Appointment'}
        </button>
      </div>
    </div>
  );
}
