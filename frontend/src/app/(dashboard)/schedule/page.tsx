'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import CalendarWeekView, { CalAppt } from '@/components/CalendarWeekView';
import { api } from '@/utils/api';

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [appointments, setAppointments] = useState<CalAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try { setRole(JSON.parse(raw).role ?? ''); } catch {}
    }
  }, []);

  const fetchAppts = useCallback(async (start: Date) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const from = start.toISOString();
      // end = start + 7 days
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const to = end.toISOString();

      const r = await fetch(api(`/api/appointments/dashboard/calendar?from=${from}&to=${to}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) throw new Error('Failed to fetch');
      const data = await r.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppts(weekStart); }, [weekStart, fetchAppts]);

  function prevWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }
  function goToday() {
    setWeekStart(getMondayOf(new Date()));
  }

  const isStaff = ['STAFF', 'ADMIN', 'DPO'].includes(role.toUpperCase());
  const title    = isStaff ? 'CPS Calendar' : 'My Schedule';
  const subtitle = isStaff
    ? 'All counselor appointments across the CPS this week'
    : 'Your upcoming sessions for the week';

  return (
    <DashboardPageWrapper title={title} subtitle={subtitle}>
      <CalendarWeekView
        appointments={appointments}
        loading={loading}
        colorBy={isStaff ? 'counselor' : 'status'}
        weekStart={weekStart}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        onToday={goToday}
      />
    </DashboardPageWrapper>
  );
}
