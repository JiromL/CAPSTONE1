'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMenuItemsByRole } from '@/utils/navigation';

interface CounselorAvailability {
  counselor_id: string;
  counselor_name: string;
  total_slots: number;
  slots: Array<{
    slot_id: string;
    slot_start: string;
    slot_end: string;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminAvailabilityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  const [counselorAvailability, setCounselorAvailability] = useState<CounselorAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Check if user is admin
    if (parsedUser.role?.toUpperCase() !== 'ADMIN') {
      window.location.href = '/dashboard';
      return;
    }

    setUser(parsedUser);
    fetchCounselors(token);
  }, []);

  useEffect(() => {
    if (selectedCounselor) {
      const token = localStorage.getItem('token');
      if (token) {
        fetchCounselorAvailability(token, selectedCounselor);
      }
    }
  }, [selectedCounselor]);

  const fetchCounselors = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/users?role=COUNSELOR,PSYCHOLOGIST,CSC,CSP', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const counselorList = data.users || [];
        setCounselors(counselorList);
        if (counselorList.length > 0) {
          setSelectedCounselor(counselorList[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching counselors:', error);
      showToast('Error fetching counselors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselorAvailability = async (token: string, counselorId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/availability/counselor/${counselorId}?start_date=2026-01-01T00:00:00&end_date=2026-12-31T23:59:59`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCounselorAvailability({
          counselor_id: data.counselor_id,
          counselor_name: data.counselor_name,
          total_slots: data.total_available,
          slots: data.available_slots || [],
        });
      } else {
        setCounselorAvailability(null);
        showToast('Failed to fetch availability', 'error');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      showToast('Error fetching availability', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSlot = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedCounselor) return;

    if (!formData.date || !formData.startTime || !formData.endTime) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const startDateTime = `${formData.date}T${formData.startTime}:00`;
    const endDateTime = `${formData.date}T${formData.endTime}:00`;

    try {
      // Note: This uses the counselor's own endpoint
      // In a real implementation, you might want to create an admin-only endpoint
      const response = await fetch('http://localhost:8000/api/availability/set-availability', {
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
        setFormData({ date: '', startTime: '', endTime: '' });
        setShowForm(false);
        fetchCounselorAvailability(token, selectedCounselor);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to add slot', 'error');
      }
    } catch (error) {
      console.error('Error adding slot:', error);
      showToast('Error adding availability slot', 'error');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('Are you sure you want to delete this slot?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/availability/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showToast('Slot deleted successfully', 'success');
        if (selectedCounselor) {
          fetchCounselorAvailability(token, selectedCounselor);
        }
      } else {
        showToast('Failed to delete slot', 'error');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      showToast('Error deleting slot', 'error');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const menuItems = getMenuItemsByRole(user.role);

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
      title="Counselor Availability Management"
      subtitle="Manage availability slots for all counselors"
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Counselor Selector */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Counselor</label>
              <select
                value={selectedCounselor}
                onChange={(e) => setSelectedCounselor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 font-medium"
              >
                <option value="">Choose a counselor...</option>
                {counselors.map((counselor) => (
                  <option key={counselor._id} value={counselor._id}>
                    {counselor.name || `${counselor.first_name} ${counselor.last_name}`} - {counselor.role}
                  </option>
                ))}
              </select>
            </div>

            {selectedCounselor && counselorAvailability && (
              <>
                {/* Counselor Info Card */}
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{counselorAvailability.counselor_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total available slots: {counselorAvailability.total_slots}</p>
                    </div>
                    {!showForm && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
                      >
                        <Plus size={20} />
                        Add Slot
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Form */}
                {showForm && (
                  <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Create New Slot</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                          <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleAddSlot}
                          className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition font-medium"
                        >
                          Add Slot
                        </button>
                        <button
                          onClick={() => {
                            setShowForm(false);
                            setFormData({ date: '', startTime: '', endTime: '' });
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slots List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Available Slots</h4>
                  </div>

                  {counselorAvailability.slots.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">No availability slots</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {counselorAvailability.slots.map((slot) => {
                        const startDate = new Date(slot.slot_start);
                        const endDate = new Date(slot.slot_end);
                        const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div key={slot.slot_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-50">{dateStr}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {startTimeStr} - {endTimeStr}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSlot(slot.slot_id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
