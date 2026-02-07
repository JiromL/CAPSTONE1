'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  role: string;
  name: string;
  high_risk_count?: number;
  total_cases?: number;
  pending_appointments?: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Fetch dashboard data
    fetchDashboardData(token);
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              {user?.role.replace('_', ' ').toUpperCase()}
            </span>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-indigo-600 mb-2">8</div>
            <div className="text-gray-600">Total Epics</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-red-600 mb-2">0</div>
            <div className="text-gray-600">High Risk Cases</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-green-600 mb-2">0</div>
            <div className="text-gray-600">Pending Appointments</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
            <div className="text-gray-600">Active Cases</div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NavCard
            title="EPIC 1: RBAC"
            description="User Roles & Access Control"
            href="/rbac"
            color="from-purple-500 to-purple-600"
          />
          <NavCard
            title="EPIC 2: Triage"
            description="Early Detection & Assessment"
            href="/assessments"
            color="from-blue-500 to-blue-600"
          />
          <NavCard
            title="EPIC 3: Intake"
            description="Interview & Endorsement"
            href="/intake"
            color="from-green-500 to-green-600"
          />
          <NavCard
            title="EPIC 4: Booking"
            description="Scheduling & Appointments"
            href="/appointments"
            color="from-orange-500 to-orange-600"
          />
          <NavCard
            title="EPIC 5: Documentation"
            description="Centralized Hub"
            href="/documentation"
            color="from-red-500 to-red-600"
          />
          <NavCard
            title="EPIC 6: Counseling"
            description="Session Notes & Progress"
            href="/counseling"
            color="from-indigo-500 to-indigo-600"
          />
          <NavCard
            title="EPIC 7: High-Risk"
            description="Monitoring & Crisis"
            href="/high-risk"
            color="from-pink-500 to-pink-600"
          />
          <NavCard
            title="EPIC 8: Referrals"
            description="Warm Handoff & ROI"
            href="/referrals"
            color="from-cyan-500 to-cyan-600"
          />
        </div>
      </main>
    </div>
  );
}

interface NavCardProps {
  title: string;
  description: string;
  href: string;
  color: string;
}

function NavCard({ title, description, href, color }: NavCardProps) {
  return (
    <Link href={href}>
      <div className={`bg-gradient-to-br ${color} rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition cursor-pointer`}>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-white/90">{description}</p>
      </div>
    </Link>
  );
}
