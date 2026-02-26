import Link from 'next/link';
import { TrendingUp, Clock, Users, AlertTriangle, FileText, MessageCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <TrendingUp size={20} /> },
    { label: 'Today\'s Sessions', href: '/counselor/sessions/today', icon: <Clock size={20} />, badge: 4 },
    { label: 'My Clients', href: '/counselor/clients', icon: <Users size={20} /> },
    { label: 'Session Notes', href: '/counselor/notes/pending', icon: <FileText size={20} />, badge: 2 },
    { label: 'High-Risk Clients', href: '/counselor/high-risk', icon: <AlertTriangle size={20} />, badge: 1 },
    { label: 'Messages', href: '/counselor/messages', icon: <MessageCircle size={20} /> },
    { label: 'My Schedule', href: '/counselor/schedule', icon: <Clock size={20} /> },
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Counselor Dashboard"
      subtitle="Session Management & Client Care"
    >
      {/* Today's Sessions */}
      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Today's Sessions</h2>
        <div className="space-y-2">
          <SessionItem time="10:00 AM" client="Sarah Johnson" room="Rm 201" status="next" />
          <SessionItem time="11:00 AM" client="Marcus Lee" room="Rm 203" status="upcoming" />
          <SessionItem time="1:00 PM" client="Emma Davis" room="Rm 205" status="upcoming" />
          <SessionItem time="2:30 PM" client="Alex Rodriguez" room="Rm 201" status="upcoming" />
        </div>
      </div>

      {/* Client Alerts */}
      <div className="border border-red-300 rounded-lg p-6 bg-red-50">
        <h2 className="text-base font-bold text-red-900 mb-2">High-Risk Alert</h2>
        <p className="text-red-800 text-xs mb-3">1 client requires follow-up</p>
        <Link href="/counselor/high-risk">
          <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium">
            Review Alert
          </button>
        </Link>
      </div>
    </DashboardLayout>
  );
}

function SessionItem({ time, client, room, status }: any) {
  const statusStyles = status === "next"
    ? "border border-gray-200 bg-white"
    : "border border-gray-200 bg-white";

  return (
    <div className={`${statusStyles} p-4 rounded-lg flex items-center justify-between`}>
      <div>
        <p className="text-gray-900 font-medium text-sm">{time} - {client}</p>
        <p className="text-gray-600 text-xs">{room}</p>
      </div>
      <span className="text-xs text-gray-600">
        {status === "next" ? "NEXT" : "Scheduled"}
      </span>
    </div>
  );
}
