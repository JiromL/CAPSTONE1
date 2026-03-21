'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface TimeSlot {
  time: string; // "HH:MM" format
  method: 'in-person' | 'online' | 'both'; // method for this time slot
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface WorkPreferences {
  default_session_duration: number;
  meeting_methods: ('in-person' | 'google-meet' | 'zoom')[];
  accepts_walk_ins: boolean;
  timezone: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = 7 + i; // 7 AM to 6 PM
  return `${hour.toString().padStart(2, '0')}:00`;
});

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Color mapping for methods
const METHOD_COLORS = {
  'in-person': { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
  'online': { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
  'both': { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' }
};

const METHOD_LABELS = {
  'in-person': 'In-Person',
  'online': 'Online',
  'both': 'Both'
};

// Helper to format time for display
const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minutes} ${ampm}`;
};

export default function AvailabilityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDay, setSelectedDay] = useState(1); // Monday
  const [selectedMethod, setSelectedMethod] = useState<'in-person' | 'online' | 'both'>('in-person'); // method being selected
  const [meetingMethods, setMeetingMethods] = useState<Array<'in-person' | 'google-meet' | 'zoom'>>(['in-person']); // staff's available methods
  const [weeklyAvailability, setWeeklyAvailability] = useState<Record<number, TimeSlot[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    fetchMeetingMethods(token);
  }, []);

  const fetchAvailability = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/availability/my-availability', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const availability: Record<number, TimeSlot[]> = {
          0: [],
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
          6: [],
        };

        // Convert slots to weekly format
        (data.slots || []).forEach((slot: any) => {
          const startDate = new Date(slot.slot_start);
          const dayOfWeek = startDate.getDay();
          const time = startDate.toTimeString().slice(0, 5); // "HH:MM"
          const method = slot.meeting_method || 'in-person';
          if (!availability[dayOfWeek].find(s => s.time === time && s.method === method)) {
            availability[dayOfWeek].push({ time, method });
          }
        });

        // Sort times
        Object.keys(availability).forEach((day) => {
          availability[parseInt(day)].sort((a, b) => a.time.localeCompare(b.time));
        });

        setWeeklyAvailability(availability);
      } else {
        showToast('Failed to fetch availability', 'error');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      showToast('Error fetching availability', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingMethods = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/staff/settings/my-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const methods = data.work_preferences?.meeting_methods || ['in-person'];
        setMeetingMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching meeting methods:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addTimeSlot = (time: string) => {
    setWeeklyAvailability((prev) => {
      const daySlots = [...(prev[selectedDay] || [])];
      // Check if this exact time+method combo already exists
      const exists = daySlots.some(slot => slot.time === time && slot.method === selectedMethod);
      if (!exists) {
        daySlots.push({ time, method: selectedMethod });
        daySlots.sort((a, b) => a.time.localeCompare(b.time));
      }
      return { ...prev, [selectedDay]: daySlots };
    });
  };

  const removeTimeSlot = (time: string, method: 'in-person' | 'online' | 'both') => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      [selectedDay]: prev[selectedDay].filter((slot) => !(slot.time === time && slot.method === method)),
    }));
  };

  const addAllTimesForDay = () => {
    setWeeklyAvailability((prev) => {
      const daySlots = [...(prev[selectedDay] || [])];
      // Add all hours with the selected method, avoiding duplicates
      HOURS.forEach((hour) => {
        const exists = daySlots.some(slot => slot.time === hour && slot.method === selectedMethod);
        if (!exists) {
          daySlots.push({ time: hour, method: selectedMethod });
        }
      });
      daySlots.sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [selectedDay]: daySlots };
    });
  };

  const toggleMeetingMethod = (method: 'in-person' | 'google-meet' | 'zoom') => {
    setMeetingMethods((prev: Array<'in-person' | 'google-meet' | 'zoom'>) => {
      const updated = prev.includes(method) ? prev.filter((m: string) => m !== method) : [...prev, method];
      // Ensure at least one method is selected
      return updated.length === 0 ? ['in-person'] : updated;
    });
  };

  const saveAvailability = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    try {
      // Convert weekly format to slots
      const slots: Array<{ start: string; end: string; meeting_method: 'in-person' | 'online' | 'both' }> = [];
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of week (Sunday)

      Object.entries(weeklyAvailability).forEach(([dayNum, timeSlots]) => {
        const day = parseInt(dayNum);
        timeSlots.forEach((timeSlot) => {
          const slotDate = new Date(baseDate);
          slotDate.setDate(slotDate.getDate() + day);
          const [hours, minutes] = timeSlot.time.split(':');
          slotDate.setHours(parseInt(hours), parseInt(minutes), 0);

          const nextHour = new Date(slotDate);
          nextHour.setHours(nextHour.getHours() + 1);

          slots.push({
            start: slotDate.toISOString(),
            end: nextHour.toISOString(),
            meeting_method: timeSlot.method,
          });
        });
      });

      if (slots.length === 0) {
        showToast('Please add at least one time slot', 'error');
        setSaving(false);
        return;
      }

      // Delete all existing slots first
      const existingResponse = await fetch('http://localhost:8000/api/availability/my-availability', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (existingResponse.ok) {
        const data = await existingResponse.json();
        for (const slot of data.slots || []) {
          await fetch(`http://localhost:8000/api/availability/${slot.slot_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }

      // Create new slots
      const response = await fetch('http://localhost:8000/api/availability/set-availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slots }),
      });

      if (response.ok) {
        showToast(`Saved ${slots.length} availability slots successfully`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to save availability', 'error');
      }

      // Also save meeting methods preferences
      await fetch('http://localhost:8000/api/staff/settings/my-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_preferences: {
            meeting_methods: meetingMethods,
          },
        }),
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      showToast('Error saving availability', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const menuItems = getMenuItemsByRole(user.role);
  const currentDaySlots = weeklyAvailability[selectedDay] || [];

  return (
    <DashboardLayout
      user={user}
      onLogout={() => {
        localStorage.removeItem('appointments_cache');
        localStorage.removeItem('cases_cache');
        localStorage.removeItem('assessments_cache');
        localStorage.removeItem('dashboard_cache');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }}
      menuItems={menuItems}
      title="Availability Settings"
      subtitle="Set your working hours for the week"
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

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Please Add the Availability for the Whole Week</h2>
          <p className="text-gray-600 dark:text-gray-400">Select each day and add your available time slots</p>
        </div>

        {/* Meeting Methods Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Meeting Methods</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select all meeting methods you can conduct. These will be used for automatic appointment assignment.</p>
          <div className="space-y-3">
            {(['in-person', 'google-meet', 'zoom'] as const).map((method) => (
              <label key={method} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meetingMethods.includes(method)}
                  onChange={() => toggleMeetingMethod(method)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {method === 'google-meet' ? 'Google Meet' : method === 'zoom' ? 'Zoom' : 'In-Person'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Day Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {DAYS.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`flex-1 px-4 py-3 text-center border-b-2 transition font-medium ${
                  selectedDay === index
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Content Area */}
          {!loading ? (
            <div className="grid grid-cols-2 gap-8 p-8">
              {/* Left Side: Available Times to Add */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Select Meeting Method & Times</h3>
                </div>

                {/* Method Selector */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">1. Choose Method</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['in-person', 'online', 'both'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setSelectedMethod(method)}
                        className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                          selectedMethod === method
                            ? `${METHOD_COLORS[method].bg} ${METHOD_COLORS[method].border} ${METHOD_COLORS[method].text} border-current`
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {METHOD_LABELS[method]}
                        {selectedMethod === method && <CheckCircle size={16} className="inline ml-2" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selector */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">2. Select Times for {METHOD_LABELS[selectedMethod]}</p>
                  <div className="flex flex-wrap gap-2">
                    {HOURS.map((hour) => {
                      const timeSlotExists = currentDaySlots.some(slot => slot.time === hour && slot.method === selectedMethod);
                      return (
                        <button
                          key={hour}
                          onClick={() => addTimeSlot(hour)}
                          disabled={timeSlotExists}
                          className={`px-3 py-2 rounded-lg border transition font-medium ${
                            timeSlotExists
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-blue-50 dark:active:bg-blue-900/30'
                          }`}
                        >
                          {formatTimeForDisplay(hour)} <Plus size={14} className="inline ml-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={addAllTimesForDay}
                  className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
                >
                  Add All Times for {METHOD_LABELS[selectedMethod]}
                </button>
              </div>

              {/* Right Side: Selected Times for This Day */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Availability for {DAYS[selectedDay]}</h3>
                {currentDaySlots.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 py-8">No times selected for {DAYS[selectedDay]}</p>
                ) : (
                  <div className="space-y-3">
                    {/* Group by method for better organization */}
                    {(['in-person', 'online', 'both'] as const).map((method) => {
                      const slotsForMethod = currentDaySlots.filter(slot => slot.method === method);
                      if (slotsForMethod.length === 0) return null;
                      
                      return (
                        <div key={method}>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">{METHOD_LABELS[method]}</p>
                          <div className="flex flex-wrap gap-2">
                            {slotsForMethod.map((slot) => (
                              <button
                                key={`${slot.time}-${slot.method}`}
                                onClick={() => removeTimeSlot(slot.time, slot.method)}
                                className={`px-3 py-2 rounded-lg transition font-medium flex items-center gap-2 ${METHOD_COLORS[method].bg} ${METHOD_COLORS[method].text} border ${METHOD_COLORS[method].border} hover:opacity-80 cursor-pointer`}
                              >
                                {formatTimeForDisplay(slot.time)} <X size={14} />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={saveAvailability}
            disabled={saving}
            className="px-6 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>

        {/* Summary */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            Total availability slots: {Object.values(weeklyAvailability).reduce((sum, slots) => sum + slots.length, 0)}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
