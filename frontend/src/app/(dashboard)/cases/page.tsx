"use client";

import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export default function CasesPage() {
  const [cases] = useState([
    {
      id: 1,
      studentId: 'STU-2024-001',
      name: 'John Smith',
      status: 'active',
      lastContact: '2024-01-20',
      concerns: ['Anxiety', 'Academic Stress'],
      riskLevel: 'low',
      counselor: 'Dr. Sarah Johnson',
    },
    {
      id: 2,
      studentId: 'STU-2024-002',
      name: 'Maria Garcia',
      status: 'active',
      lastContact: '2024-01-18',
      concerns: ['Depression', 'Family Issues'],
      riskLevel: 'medium',
      counselor: 'Dr. Michael Chen',
    },
    {
      id: 3,
      studentId: 'STU-2024-003',
      name: 'James Wilson',
      status: 'followup',
      lastContact: '2024-01-15',
      concerns: ['Substance Use'],
      riskLevel: 'high',
      counselor: 'Dr. Patricia Williams',
    },
    {
      id: 4,
      studentId: 'STU-2024-004',
      name: 'Emma Davis',
      status: 'closed',
      lastContact: '2024-01-10',
      concerns: ['Stress Management'],
      riskLevel: 'low',
      counselor: 'Dr. James Brown',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredCases = cases.filter(
    (c) =>
      (filterStatus === 'all' || c.status === filterStatus) &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.studentId.includes(searchTerm))
  );

  return (
    <PageShell title="Case Management" subtitle="View and manage student cases">
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="Search by name or student ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="followup">Follow-up</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Concerns</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Risk Level</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{caseItem.name}</p>
                        <p className="text-sm text-gray-600">{caseItem.studentId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${caseItem.status === 'active' ? 'bg-green-100 text-green-800' : caseItem.status === 'followup' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{caseItem.concerns.join(', ')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {caseItem.riskLevel === 'high' && <AlertCircle className="text-red-600" size={18} />}
                        {caseItem.riskLevel === 'medium' && <AlertCircle className="text-yellow-600" size={18} />}
                        {caseItem.riskLevel === 'low' && <CheckCircle className="text-green-600" size={18} />}
                        <span className="text-sm font-medium text-gray-900">{caseItem.riskLevel.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{new Date(caseItem.lastContact).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">View Details</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600">No cases found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <StatCard label="Active Cases" value={cases.filter((c) => c.status === 'active').length} color="bg-blue-50 text-blue-600" />
        <StatCard label="Follow-ups" value={cases.filter((c) => c.status === 'followup').length} color="bg-yellow-50 text-yellow-600" />
        <StatCard label="High Risk" value={cases.filter((c) => c.riskLevel === 'high').length} color="bg-red-50 text-red-600" />
        <StatCard label="Closed" value={cases.filter((c) => c.status === 'closed').length} color="bg-green-50 text-green-600" />
      </div>
    </PageShell>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className={`${color} rounded-lg p-6 text-center`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-2">{label}</p>
    </div>
  );
}
