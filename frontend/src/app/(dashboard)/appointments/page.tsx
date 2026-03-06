"use client";

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function AppointmentsPage() {
  const [appointments] = useState([
    {
      id: 1,
      title: 'Initial Consultation',
      counselor: 'Dr. Sarah Johnson',
      date: '2024-01-25',
      time: '10:00 AM',
      location: 'Psychology Center - Room 206',
      status: 'confirmed',
    },
    {
      id: 2,
      title: 'Follow-up Session',
      counselor: 'Dr. Michael Chen',
      date: '2024-01-29',
      time: '2:30 PM',
      location: 'Psychology Center - Room 312',
      status: 'confirmed',
    },
    {
      id: 3,
      title: 'Group Therapy',
      counselor: 'Dr. Patricia Williams & Dr. James Brown',
      date: '2024-02-01',
      time: '4:00 PM',
      location: 'Psychology Center - Conference Room A',
      status: 'pending',
    },
  ]);

  const [upcomingAppointments, pastAppointments] = [
    appointments.filter(a => new Date(a.date) > new Date()),
    appointments.filter(a => new Date(a.date) <= new Date()),
  ];

  return (
    <DashboardPageWrapper title="Your Appointments" subtitle="Manage and schedule your counseling sessions">
      <div className="mb-8 flex items-center gap-4">
        <button className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium transition">Schedule New Appointment</button>
        <Link href="/appointments/validate">
          <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-50 px-4 py-2 rounded-lg transition">Validate Slot</button>
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Upcoming Appointments</h2>
        {upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center border border-gray-200 dark:border-gray-700">
            <Calendar className="mx-auto text-gray-400 dark:text-gray-500 mb-3" size={32} />
            <p className="text-gray-900 dark:text-gray-50 font-medium mb-2">No upcoming appointments</p>
            <p className="text-gray-600 dark:text-gray-400">Schedule a session with our counseling team</p>
          </div>
        )}
      </section>

      {pastAppointments.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Past Appointments</h2>
          <div className="space-y-4">
            {pastAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} isPast={true} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-3">Before Your Appointment</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>✓ Allow 10 minutes for check-in before your appointment</li>
            <li>✓ Bring any relevant documents or notes</li>
            <li>✓ Have a quiet, private space for your session</li>
            <li>✓ Let us know if you need to reschedule</li>
          </ul>
        </div>
      </section>
    </DashboardPageWrapper>
  );
}

function AppointmentCard({ appointment, isPast }: any) {
  const statusColor = appointment.status === 'confirmed' 
    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{appointment.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{appointment.counselor}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <Calendar size={18} />
          <span>
            {new Date(appointment.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <Clock size={18} />
          <span>{appointment.time}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <MapPin size={18} />
          <span>{appointment.location}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <Phone size={18} />
          <span>Available via Call/Video</span>
        </div>
      </div>

      {!isPast && (
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="flex-1 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white py-2 rounded-lg font-medium transition">
            Reschedule
          </button>
          <button className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-50 py-2 rounded-lg font-medium transition">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
