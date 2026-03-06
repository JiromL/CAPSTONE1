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

  const handleDateChange = (value: Date | [Date, Date]) => {
    setDate(value);
    if (value instanceof Date) {
      onDateSelect?.(value);
    }
  };

  // Get appointments for the selected date
  const selectedDateObj = date instanceof Date ? date : null;
  const dayAppointments = selectedDateObj
    ? appointments.filter(
        (apt) =>
          apt.date.toDateString() === selectedDateObj.toDateString()
      )
    : [];

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">{title}</h2>
        <style>{`
          .react-calendar {
            width: 100%;
            border: none;
            padding: 0;
          }
          .react-calendar__tile {
            padding: 6px;
            font-size: 12px;
            color: #1f2937;
            font-weight: 500;
          }
          .react-calendar__tile:hover {
            background-color: #f3f4f6;
          }
          .react-calendar__tile--active {
            background-color: #3b82f6;
            color: white;
          }
          .react-calendar__tile--now {
            background-color: #dbeafe;
            color: #1f2937;
          }
          .react-calendar__navigation {
            margin-bottom: 12px;
          }
          .react-calendar__navigation button {
            font-size: 12px;
            padding: 4px 8px;
            color: #1f2937;
            font-weight: 600;
          }
          .react-calendar__month-view__days__day-names {
            font-size: 11px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
        `}</style>
        <Calendar
          onChange={handleDateChange}
          value={date}
          locale="en-US"
          tileClassName={({ date: tileDate }) => {
            if (selectedDateObj && tileDate.toDateString() === selectedDateObj.toDateString()) {
              return 'bg-blue-500 text-white rounded';
            }
            const isToday = tileDate.toDateString() === new Date().toDateString();
            return isToday ? 'bg-blue-100 rounded' : '';
          }}
        />
      </div>

      {/* Appointments for selected date */}
      {showAppointments && selectedDateObj && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-900 mb-2">
            Appointments for {selectedDateObj.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </h3>
          {dayAppointments.length > 0 ? (
            <div className="space-y-2">
              {dayAppointments.map((apt, idx) => (
                <div key={idx} className="bg-blue-50 rounded p-2">
                  <p className="text-xs font-medium text-gray-900">{apt.title}</p>
                  <p className="text-xs text-gray-600">{apt.time}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No appointments scheduled</p>
          )}
        </div>
      )}
    </div>
  );
}
