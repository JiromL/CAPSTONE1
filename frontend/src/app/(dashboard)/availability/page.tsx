'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface AvailabilitySlot {
  slot_id: string;
  slot_start: string;
  slot_end: string;
  is_available: boolean;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AvailabilityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'single' | 'recurring'>('single');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Single slot form
  const [singleSlot, setSingleSlot] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  // Recurring slots form
  const [recurringSlots, setRecurringSlots] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [1, 3, 5], // Default: Mon, Wed, Fri
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchAvailability(token);
  }, []);

  const fetchAvailability = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/availability/my-availability', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        showToast('Failed to fetch availability slots', 'error');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      showToast('Error fetching availability', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSingleSlot = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!singleSlot.date || !singleSlot.startTime || !singleSlot.endTime) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const startDateTime = `${singleSlot.date}T${singleSlot.startTime}:00`;
    const endDateTime = `${singleSlot.date}T${singleSlot.endTime}:00`;

    try {
      const response = await fetch('http://localhost:5001/api/availability/set-availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slots: [
            {
              start: startDateTime,
              end: endDateTime,
            },
          ],
        }),
      });

      if (response.ok) {
        showToast('Availability slot added successfully', 'success');
        setSingleSlot({ date: '', startTime: '', endTime: '' });
        setShowForm(false);
        fetchAvailability(token);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add slot', 'error');
      }
    } catch (error) {
      console.error('Error adding slot:', error);
      showToast('Error adding availability slot', 'error');
    }
  };

  const handleAddRecurringSlots = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!recurringSlots.startDate || !recurringSlots.endDate || !recurringSlots.startTime || !recurringSlots.endTime) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/availability/bulk-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: recurringSlots.startDate,
          end_date: recurringSlots.endDate,
          slot_start_time: recurringSlots.startTime,
          slot_end_time: recurringSlots.endTime,
          days_of_week: recurringSlots.daysOfWeek,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`Created ${data.total_slots} availability slots successfully`, 'success');
        setRecurringSlots({
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          daysOfWeek: [1, 3, 5],
        });
        setShowForm(false);
        fetchAvailability(token);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create slots', 'error');
      }
    } catch (error) {
      console.error('Error creating slots:', error);
      showToast('Error creating availability slots', 'error');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('Are you sure you want to delete this slot?')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/availability/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showToast('Slot deleted successfully', 'success');
        fetchAvailability(token);
      } else {
        showToast('Failed to delete slot', 'error');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      showToast('Error deleting slot', 'error');
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setRecurringSlots((prev) => {
      const daysOfWeek = prev.daysOfWeek;
      if (daysOfWeek.includes(day)) {
        return { ...prev, daysOfWeek: daysOfWeek.filter((d) => d !== day) };
      } else {
        return { ...prev, daysOfWeek: [...daysOfWeek, day].sort() };
      }
    });
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!user) {
    return <div>Loading...</div>;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'Appointments', href: '/appointments', id: 'appointments' },
    { label: 'Availability', href: '/availability', id: 'availability' },
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Referrals', href: '/referrals', id: 'referrals' },
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={() => {
        // Clear all caches before logout
        localStorage.removeItem('appointments_cache');
        localStorage.removeItem('cases_cache');
        localStorage.removeItem('assessments_cache');
        localStorage.removeItem('dashboard_cache');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }}
      menuItems={menuItems}
      title="Availability Management"
      subtitle="Set your available time slots for appointments"
      activeSection="availability"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg flex items-center gap-2 z-50 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Add Slot Button */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
            >
              <Plus size={20} />
              Add Availability
            </button>
          ) : null}
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Add Availability</h3>

            {/* Form Type Toggle */}
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formType"
                  value="single"
                  checked={formType === 'single'}
                  onChange={(e) => setFormType(e.target.value as 'single' | 'recurring')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">Single Slot</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formType"
                  value="recurring"
                  checked={formType === 'recurring'}
                  onChange={(e) => setFormType(e.target.value as 'single' | 'recurring')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">Recurring</span>
              </label>
            </div>

            {/* Single Slot Form */}
            {formType === 'single' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={singleSlot.date}
                    onChange={(e) => setSingleSlot({ ...singleSlot, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={singleSlot.startTime}
                      onChange={(e) => setSingleSlot({ ...singleSlot, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                    <input
                      type="time"
                      value={singleSlot.endTime}
                      onChange={(e) => setSingleSlot({ ...singleSlot, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddSingleSlot}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
                  >
                    Add Slot
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recurring Slots Form */}
            {formType === 'recurring' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={recurringSlots.startDate}
                      onChange={(e) => setRecurringSlots({ ...recurringSlots, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                    <input
                      type="date"
                      value={recurringSlots.endDate}
                      onChange={(e) => setRecurringSlots({ ...recurringSlots, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={recurringSlots.startTime}
                      onChange={(e) => setRecurringSlots({ ...recurringSlots, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                    <input
                      type="time"
                      value={recurringSlots.endTime}
                      onChange={(e) => setRecurringSlots({ ...recurringSlots, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDayOfWeek(index)}
                        className={`px-3 py-2 rounded-lg border transition ${
                          recurringSlots.daysOfWeek.includes(index)
                            ? 'bg-gray-900 dark:bg-gray-700 text-white border-gray-900 dark:border-gray-700'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {dayShortNames[index]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddRecurringSlots}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
                  >
                    Create Recurring Slots
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Availability Slots List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Your Availability Slots</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total: {slots.length} slot{slots.length !== 1 ? 's' : ''}</p>
          </div>

          {slots.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No availability slots yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
              >
                <Plus size={18} />
                Add Your First Slot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {slots.map((slot) => {
                const startDate = new Date(slot.slot_start);
                const endDate = new Date(slot.slot_end);
                const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={slot.slot_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-50">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock size={16} />
                        <span>
                          {startTimeStr} - {endTimeStr}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.slot_id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete slot"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
