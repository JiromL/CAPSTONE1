'use client';

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
  title?: string;
  showAppointments?: boolean;
  appointments?: Array<{ date: Date; title: string; time: string }>;
}

export function DashboardCalendar({
  onDateSelect,
  selectedDate,
  title = 'Calendar',
  showAppointments = false,
  appointments = [],
}: CalendarProps) {
  const [date, setDate] = useState<Date | [Date, Date] | null>(selectedDate || new Date());

  const handleDateChange = (value: Date | [Date, Date] | null) => {
    setDate(value);
    if (value instanceof Date) {
      onDateSelect?.(value);
    }
  };

  const selectedDateObj = date instanceof Date ? date : null;
  const dayAppointments = selectedDateObj
    ? appointments.filter(apt => apt.date.toDateString() === selectedDateObj.toDateString())
    : [];

  return (
    <div className="rounded-lg p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        <style>{`
          .react-calendar { width: 100%; border: none; padding: 0; background: transparent; }
          .react-calendar__tile { padding: 6px; font-size: 12px; color: var(--color-text-primary); font-weight: 500; }
          .react-calendar__tile:hover { background-color: var(--color-bg); }
          .react-calendar__tile--active { background-color: var(--color-primary); color: white; }
          .react-calendar__tile--now { background-color: var(--color-primary-surface); color: var(--color-primary-text); }
          .react-calendar__navigation { margin-bottom: 12px; }
          .react-calendar__navigation button { font-size: 12px; padding: 4px 8px; color: var(--color-text-primary); font-weight: 600; }
          .react-calendar__month-view__days__day-names { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
        `}</style>
        <Calendar
          onChange={(value: any) => handleDateChange(value)}
          value={date}
          locale="en-US"
          tileClassName={({ date: tileDate }) => {
            if (selectedDateObj && tileDate.toDateString() === selectedDateObj.toDateString()) {
              return 'rounded';
            }
            const isToday = tileDate.toDateString() === new Date().toDateString();
            return isToday ? 'rounded' : '';
          }}
        />
      </div>

      {showAppointments && selectedDateObj && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Appointments for {selectedDateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
          </h3>
          {dayAppointments.length > 0 ? (
            <div className="space-y-2">
              {dayAppointments.map((apt, idx) => (
                <div key={idx} className="rounded p-2" style={{ background: 'var(--color-primary-surface)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{apt.title}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{apt.time}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No appointments scheduled</p>
          )}
        </div>
      )}
    </div>
  );
}
