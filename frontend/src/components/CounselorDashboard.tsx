import Link from 'next/link';
import { TrendingUp, Clock, Users, AlertTriangle, FileText, MessageCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardCalendar } from './Calendar';
import { useState } from 'react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function CounselorDashboard({ user, onLogout }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
      {/* Today's Sessions & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Today's Sessions */}
        <div className="lg:col-span-2 border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Today's Sessions</h2>
          <div className="space-y-1">
            <SessionItem time="10:00 AM" client="Sarah Johnson" room="Rm 201" status="next" />
            <SessionItem time="11:00 AM" client="Marcus Lee" room="Rm 203" status="upcoming" />
            <SessionItem time="1:00 PM" client="Emma Davis" room="Rm 205" status="upcoming" />
            <SessionItem time="2:30 PM" client="Alex Rodriguez" room="Rm 201" status="upcoming" />
          </div>
        </div>

        {/* Calendar */}
        <DashboardCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          title="Session Calendar"
          showAppointments={true}
          appointments={[
            {
              date: new Date(2026, 2, 6),
              title: 'Sarah Johnson',
              time: '10:00 AM',
            },
            {
              date: new Date(2026, 2, 6),
              title: 'Marcus Lee',
              time: '11:00 AM',
            },
            {
              date: new Date(2026, 2, 8),
              title: 'Emma Davis',
              time: '2:00 PM',
            },
          ]}
        />
      </div>

      {/* Client Alerts */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">High-Risk Alert</h2>
        <p className="text-gray-700 dark:text-gray-300 text-xs mb-2">1 client requires follow-up</p>
        <Link href="/counselor/high-risk">
          <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-medium">
            Review Alert
          </button>
        </Link>
      </div>
    </DashboardLayout>
  );
}

function SessionItem({ time, client, room, status }: any) {
  const statusStyles = "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900";

  return (
    <div className={`${statusStyles} p-3 rounded flex items-center justify-between`}>
      <div>
        <p className="text-gray-900 dark:text-gray-50 font-medium text-xs">{time} - {client}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs">{room}</p>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {status === "next" ? "NEXT" : "Scheduled"}
      </span>
    </div>
  );
}
