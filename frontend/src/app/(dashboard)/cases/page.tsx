"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function CasesPage() {
  const [user, setUser] = useState<any>(null);
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
      assignedTo: 'Dr. Sarah Johnson',
      intakeDate: '2024-01-10',
      nextSession: '2024-01-25',
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
      assignedTo: 'Dr. Michael Chen',
      intakeDate: '2024-01-05',
      nextSession: '2024-01-22',
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
      assignedTo: 'Dr. Patricia Williams',
      intakeDate: '2024-01-02',
      nextSession: '2024-01-28',
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
      assignedTo: 'Dr. James Brown',
      intakeDate: '2023-12-20',
      nextSession: null,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const filteredCases = cases.filter(
    (c) =>
      (filterStatus === 'all' || c.status === filterStatus) &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.studentId.includes(searchTerm))
  );

  const getRoleSpecificTitle = () => {
    if (!user) return 'Case Management';
    switch (user.role) {
      case 'COUNSELOR':
        return 'My Client Cases';
      case 'PSYCHOLOGIST':
        return 'Clinical Case Review';
      case 'ADMIN':
        return 'All Cases';
      case 'DPO':
        return 'Case Oversight';
      case 'IC':
        return 'New Intake Cases';
      case 'STAFF':
      case 'CSP':
      case 'CSC':
        return 'Case Support';
      default:
        return 'Case Management';
    }
  };

  const renderCasingTableHeaders = () => {
    if (!user) return null;

    const baseHeaders = [
      <th key="student" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Student</th>,
      <th key="status" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Status</th>,
      <th key="concerns" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Concerns</th>,
      <th key="riskLevel" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Risk Level</th>,
    ];

    switch (user.role) {
      case 'COUNSELOR':
        return [
          ...baseHeaders,
          <th key="nextSession" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Next Session</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      case 'PSYCHOLOGIST':
        return [
          ...baseHeaders,
          <th key="lastContact" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Last Contact</th>,
          <th key="assignedTo" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Assigned To</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      case 'DPO':
        return [
          ...baseHeaders,
          <th key="lastContact" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Last Contact</th>,
          <th key="assignedTo" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Assigned To</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      case 'IC':
        return [
          ...baseHeaders,
          <th key="intakeDate" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Intake Date</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      case 'ADMIN':
        return [
          ...baseHeaders,
          <th key="lastContact" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Last Contact</th>,
          <th key="assignedTo" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Assigned To</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      case 'STAFF':
      case 'CSP':
      case 'CSC':
        return [
          ...baseHeaders,
          <th key="assignedTo" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Assigned To</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
      default:
        return [
          ...baseHeaders,
          <th key="lastContact" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Last Contact</th>,
          <th key="action" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Action</th>,
        ];
    }
  };

  const renderCaseRow = (caseItem: any) => {
    if (!user) return null;

    const baseColumns = (
      <>
        <td className="px-6 py-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-50">{caseItem.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{caseItem.studentId}</p>
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              caseItem.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                : caseItem.status === 'followup'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            }`}
          >
            {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{caseItem.concerns.join(', ')}</td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {caseItem.riskLevel === 'high' && <AlertCircle className="text-red-600 dark:text-red-400" size={18} />}
            {caseItem.riskLevel === 'medium' && <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={18} />}
            {caseItem.riskLevel === 'low' && <CheckCircle className="text-green-600 dark:text-green-400" size={18} />}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{caseItem.riskLevel.toUpperCase()}</span>
          </div>
        </td>
      </>
    );

    const getActionButton = () => {
      switch (user.role) {
        case 'COUNSELOR':
          return `Schedule Session`;
        case 'PSYCHOLOGIST':
          return `Review Case`;
        case 'DPO':
          return `Monitor`;
        case 'IC':
          return `Complete Intake`;
        case 'ADMIN':
          return `Edit`;
        default:
          return `View Details`;
      }
    };

    switch (user.role) {
      case 'COUNSELOR':
        return (
          <>
            {baseColumns}
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {caseItem.nextSession ? new Date(caseItem.nextSession).toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-6 py-4">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition">
                {getActionButton()}
              </button>
            </td>
          </>
        );
      case 'PSYCHOLOGIST':
      case 'DPO':
      case 'ADMIN':
        return (
          <>
            {baseColumns}
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {new Date(caseItem.lastContact).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{caseItem.assignedTo}</td>
            <td className="px-6 py-4">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition">
                {getActionButton()}
              </button>
            </td>
          </>
        );
      case 'IC':
        return (
          <>
            {baseColumns}
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {new Date(caseItem.intakeDate).toLocaleDateString()}
            </td>
            <td className="px-6 py-4">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition">
                {getActionButton()}
              </button>
            </td>
          </>
        );
      case 'STAFF':
      case 'CSP':
      case 'CSC':
        return (
          <>
            {baseColumns}
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{caseItem.assignedTo}</td>
            <td className="px-6 py-4">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition">
                {getActionButton()}
              </button>
            </td>
          </>
        );
      default:
        return (
          <>
            {baseColumns}
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {new Date(caseItem.lastContact).toLocaleDateString()}
            </td>
            <td className="px-6 py-4">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition">
                View Details
              </button>
            </td>
          </>
        );
    }
  };

  return (
    <DashboardPageWrapper title={getRoleSpecificTitle()} subtitle="Manage and track student cases">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500 dark:text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="followup">Follow-up</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>{renderCasingTableHeaders()}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    {renderCaseRow(caseItem)}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                    No cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <StatCard label="Active Cases" value={cases.filter((c) => c.status === 'active').length} color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
        <StatCard label="Follow-ups" value={cases.filter((c) => c.status === 'followup').length} color="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" />
        <StatCard label="High Risk" value={cases.filter((c) => c.riskLevel === 'high').length} color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
        <StatCard label="Closed" value={cases.filter((c) => c.status === 'closed').length} color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" />
      </div>
    </DashboardPageWrapper>
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
