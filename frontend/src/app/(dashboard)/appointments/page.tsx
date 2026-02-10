'use client';

import React, { useState } from 'react';
import { Calendar, Clock, User, MapPin, Phone, CheckCircle, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} /> Back
              </button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Your Appointments</h1>
          <p className="text-gray-600 mt-1">Manage and schedule your counseling sessions</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Schedule New Appointment Button */}
        <div className="mb-8">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">
            Schedule New Appointment
          </button>
        </div>

        {/* Upcoming Appointments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Appointments</h2>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Calendar className="mx-auto text-gray-400 mb-3" size={32} />
              <p className="text-gray-900 font-medium mb-2">No upcoming appointments</p>
              <p className="text-gray-600">Schedule a session with our counseling team</p>
            </div>
          )}
        </section>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Appointments</h2>
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} isPast={true} />
              ))}
            </div>
          </section>
        )}

        {/* After Appointment Tips */}
        <section className="mt-12">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Before Your Appointment</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Allow 10 minutes for check-in before your appointment</li>
              <li>✓ Bring any relevant documents or notes</li>
              <li>✓ Have a quiet, private space for your session</li>
              <li>✓ Let us know if you need to reschedule</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function AppointmentCard({ appointment, isPast }: any) {
  const statusColor = appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{appointment.title}</h3>
          <p className="text-gray-600 text-sm">{appointment.counselor}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 text-gray-700">
          <Calendar size={18} />
          <span>
            {new Date(appointment.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <Clock size={18} />
          <span>{appointment.time}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <MapPin size={18} />
          <span>{appointment.location}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <Phone size={18} />
          <span>Available via Call/Video</span>
        </div>
      </div>

      {!isPast && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
            Reschedule
          </button>
          <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
