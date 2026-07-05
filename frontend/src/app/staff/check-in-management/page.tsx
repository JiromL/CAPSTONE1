'use client';

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Calendar, Edit, Save, X, AlertCircle, Check } from 'lucide-react';
import { api } from '@/utils/api';

interface CheckInClient {
  _id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  check_in_frequency_days: number;
  last_check_in?: string;
  next_check_in_due?: string;
  status: 'active' | 'overdue' | 'paused';
  notes?: string;
  created_at: string;
}

const FREQUENCY_OPTIONS = [
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Bi-weekly' },
  { value: 30, label: 'Monthly' },
  { value: 60, label: 'Every 2 months' },
  { value: 90, label: 'Quarterly' },
];

export default function CheckInManagementPage() {
  const [clients, setClients] = useState<CheckInClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrequency, setEditFrequency] = useState<number>(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'paused'>('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/cases/check-in-clients'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch check-in clients: ${response.status}`);
      }

      const data = await response.json();
      setClients(Array.isArray(data.clients) ? data.clients : []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load check-in clients';
      console.error('Error loading clients:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFrequency = async (clientId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/cases/${clientId}/check-in-frequency`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ check_in_frequency_days: editFrequency }),
      });

      if (!response.ok) {
        throw new Error('Failed to update frequency');
      }

      await loadClients();
      setEditingId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update frequency';
      console.error('Error saving frequency:', err);
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchSearch = 
      client.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    active: clients.filter(c => c.status === 'active').length,
    overdue: clients.filter(c => c.status === 'overdue').length,
    paused: clients.filter(c => c.status === 'paused').length,
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Check-In Management" subtitle="Configure check-in frequencies for non-counseling clients">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Check-In Management" subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} in system`}>
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-4 flex gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-green-200 dark:border-blue-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-xs text-green-600 dark:text-green-400">Active Clients</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{statusCounts.active}</p>
          </div>
          <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Overdue Check-Ins</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{statusCounts.overdue}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">Paused</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statusCounts.paused}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400"
          />
          
          <div className="flex gap-2">
            {(['all', 'active', 'overdue', 'paused'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-3 text-gray-400" size={40} />
            <p className="text-gray-500 dark:text-gray-400 mb-1">No clients found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Check-in clients will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClients.map(client => (
              <div
                key={client._id}
                className={`border rounded-lg p-4 transition ${
                  client.status === 'overdue'
                    ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                    : client.status === 'active'
                    ? 'border-green-200 dark:border-blue-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">{client.student_name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        client.status === 'overdue'
                          ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100'
                          : client.status === 'active'
                          ? 'bg-green-200 dark:bg-blue-700 text-green-900 dark:text-green-100'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}>
                        {client.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{client.student_email}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-500">Last Check-In</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {client.last_check_in ? new Date(client.last_check_in).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-500">Next Due</p>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {client.next_check_in_due ? new Date(client.next_check_in_due).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    {editingId === client._id ? (
                      <div className="space-y-2">
                        <select
                          value={editFrequency}
                          onChange={(e) => setEditFrequency(parseInt(e.target.value))}
                          className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                        >
                          {FREQUENCY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveFrequency(client._id)}
                            disabled={actionLoading}
                            className="flex-1 px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Save size={14} className="inline mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 px-3 py-1 rounded text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            <X size={14} className="inline mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                          Every {client.check_in_frequency_days} days
                        </p>
                        <button
                          onClick={() => {
                            setEditingId(client._id);
                            setEditFrequency(client.check_in_frequency_days);
                          }}
                          className="w-full px-3 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-600"
                        >
                          <Edit size={14} className="inline mr-1" />
                          Update
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
