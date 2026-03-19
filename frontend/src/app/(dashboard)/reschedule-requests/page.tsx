'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { Check, X, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '@/utils/api';

interface RescheduleRequest {
  _id: string;
  appointment_id: string;
  student_id: string;
  student_name?: string;
  current_time?: string;
  requested_start: string;
  requested_end: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  appointment_type?: string;
}

export default function RescheduleRequestsPage() {
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<RescheduleRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRescheduleRequests();
  }, []);

  const loadRescheduleRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(api('/api/appointments/reschedule-requests'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reschedule requests: ${response.status}`);
      }

      const data = await response.json();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reschedule requests';
      console.error('Error loading reschedule requests:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/appointments/reschedule-requests/${requestId}/approve`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      await loadRescheduleRequests();
      setSelectedRequest(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve request';
      console.error('Error approving request:', err);
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (requestId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/appointments/reschedule-requests/${requestId}/deny`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to deny request');
      }

      await loadRescheduleRequests();
      setSelectedRequest(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deny request';
      console.error('Error denying request:', err);
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => req.status === activeTab);
  const pendingCount = requests.filter(req => req.status === 'pending').length;

  if (loading) {
    return (
      <DashboardPageWrapper title="Reschedule Requests" subtitle="Review and manage appointment reschedule requests">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Reschedule Requests" subtitle={`${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}`}>
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/30 rounded p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {(['pending', 'approved', 'denied'] as const).map((tab) => {
              const count = requests.filter(req => req.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition font-medium ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {tab === 'pending' && <Clock size={16} />}
                  {tab === 'approved' && <Check size={16} />}
                  {tab === 'denied' && <X size={16} />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {count > 0 && <span className="ml-1 px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 rounded-full">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Requests List */}
        <div>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto mb-3 text-gray-400" size={40} />
              <p className="text-gray-500 dark:text-gray-400 mb-1">No {activeTab} requests</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request._id}
                  className={`border rounded-lg p-4 transition cursor-pointer ${
                    activeTab === 'pending'
                      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      : activeTab === 'approved'
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  }`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50">{request.student_name || 'Unknown Student'}</h3>
                        {activeTab === 'pending' && <AlertCircle size={16} className="text-yellow-600" />}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{request.appointment_type || 'General'} Appointment</p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-gray-500">Current Time</p>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {new Date(request.current_time || '').toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-500">Requested Time</p>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {new Date(request.requested_start).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 dark:text-gray-500">Reason</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">{request.reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        activeTab === 'pending'
                          ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100'
                          : activeTab === 'approved'
                          ? 'bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-100'
                          : 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100'
                      }`}>
                        {activeTab.toUpperCase()}
                      </span>
                      <ChevronRight size={16} className="text-gray-400 ml-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{selectedRequest.student_name || 'Student Reschedule Request'}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {selectedRequest._id}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Current Appointment</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{new Date(selectedRequest.current_time || '').toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Requested New Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{new Date(selectedRequest.requested_start).toLocaleString()}</p>
                </div>
                {selectedRequest.reason && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Reason</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{selectedRequest.reason}</p>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleDeny(selectedRequest._id)}
                    disabled={actionLoading}
                    className="flex-1 px-3 py-2 rounded font-medium text-sm bg-red-100 dark:bg-red-700 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    <X size={14} className="inline mr-1" />
                    Deny
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={actionLoading}
                    className="flex-1 px-3 py-2 rounded font-medium text-sm bg-green-100 dark:bg-green-700 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-600 disabled:opacity-50 transition"
                  >
                    <Check size={14} className="inline mr-1" />
                    Approve
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full px-3 py-2 rounded font-medium text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}

function CheckCircle({ className, size }: any) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
