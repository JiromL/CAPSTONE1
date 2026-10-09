'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { ymd } from '@/utils/dateUtils';

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


      // For now, we'll fetch the case to get the case's assigned counselor
      const response = await fetch(api(`/api/cases/${caseId}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });


      if (response.ok) {
        const data = await response.json();
        
        // Handle both response formats: direct case object or { case: {...} }
        const caseData = data.case || data;
        
        
        // Try multiple field names
        const counselorId = caseData.assigned_counselor_id || caseData.counselor_id || caseData.counselorId;
        if (counselorId) {
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

      const startDate = ymd(firstDay);
      const endDate = ymd(lastDay);

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
    const dateStr = ymd(date);
    return availableSlots.filter((slot) => slot.slot_start.startsWith(dateStr));
  };

  const monthName = currentDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' });
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
    <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Schedule Appointment</h3>

      {message && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={
          message.type === 'success'
            ? { background: 'var(--color-success-surface)', color: 'var(--color-success-text)' }
            : { background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }
        }>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {loadingError && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}>
          <AlertCircle size={18} />
          {loadingError}
        </div>
      )}

      {!counselorId && !loadingError && (
        <div className="mb-6 p-8 text-center">
          <Loader2 size={24} className="animate-spin mb-3" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading available appointment times...</p>
        </div>
      )}

      {counselorId && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={previousMonth} className="p-2 rounded-lg transition"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>{monthName}</h4>
              <button onClick={nextMonth} className="p-2 rounded-lg transition"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold py-2" style={{ color: 'var(--color-text-secondary)' }}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const slots = day ? getSlotsForDate(day) : [];
                const isToday = day && new Date().toDateString() === day.toDateString();
                const isSelected = day && selectedSlot && selectedSlot.slot_start.startsWith(ymd(day));

                const cellStyle: React.CSSProperties = !day
                  ? { background: 'transparent', border: '1px solid transparent' }
                  : isSelected
                  ? { background: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                  : isToday
                  ? { border: '1px solid var(--color-primary)', background: 'var(--color-primary-surface)' }
                  : slots.length > 0
                  ? { border: '1px solid var(--color-border)', background: 'var(--color-surface)' }
                  : { border: '1px solid var(--color-border)', background: 'var(--color-bg)', opacity: 0.5 };

                return (
                  <div key={index}
                    className="aspect-square flex flex-col items-center justify-center rounded-lg p-1 cursor-pointer transition"
                    style={cellStyle}
                    onClick={() => { if (day && slots.length > 0) { const slot = slots[0]; setSelectedSlot(slot); } }}
                  >
                    {day && (
                      <>
                        <span className="text-xs font-semibold" style={{ color: isSelected ? '#fff' : 'var(--color-text-primary)' }}>
                          {day.getDate()}
                        </span>
                        {slots.length > 0 && (
                          <span className="text-xs font-medium" style={{ color: isSelected ? '#fff' : 'var(--color-text-muted)' }}>
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

          {selectedSlot && (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <h5 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Selected Slot:</h5>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Clock size={16} />
                <span>
                  {new Date(selectedSlot.slot_start).toLocaleString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{' '}
                  - {new Date(selectedSlot.slot_end).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Counselor: <span className="font-medium">{selectedSlot.counselor_name}</span>
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Duration: <span className="font-medium">{selectedSlot.duration_minutes} minutes</span>
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleScheduleAppointment}
          disabled={!selectedSlot || scheduling}
          className="flex-1 px-4 py-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 text-white"
          style={{ background: selectedSlot && !scheduling ? 'var(--color-primary)' : 'var(--color-border-strong)' }}
          onMouseEnter={e => { if (selectedSlot && !scheduling) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-hover)'; }}
          onMouseLeave={e => { if (selectedSlot && !scheduling) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
        >
          {scheduling ? 'Scheduling...' : 'Schedule Appointment'}
        </button>
      </div>
    </div>
  );
}
