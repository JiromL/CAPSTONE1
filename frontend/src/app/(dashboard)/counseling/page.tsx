'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { api } from '@/utils/api';

interface CounselingStatus {
  has_active_appointment: boolean;
  appointment: { id: string; status: string; scheduled_at: string | null } | null;
  has_pending_intake: boolean;
  pending_intake_status: string | null;
  has_completed_intake: boolean;
  has_draft: boolean;
  draft_id: string | null;
}

export default function CounselingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CounselingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }

    fetch(api('/api/intake/my-status'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(() => { setError('Failed to load your status. Please try again.'); setLoading(false); });
  }, [router]);

  if (loading) {
    return (
      <DashboardPageWrapper title="Get Counseling" requiredRoles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Get Counseling" requiredRoles={['STUDENT']}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Get Counseling</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
          We'll guide you to the right next step based on your current status.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {status && <StatusCard status={status} router={router} />}
      </div>
    </DashboardPageWrapper>
  );
}

function StatusCard({ status, router }: { status: CounselingStatus; router: ReturnType<typeof useRouter> }) {
  // Case 1: active appointment in progress
  if (status.has_active_appointment && status.appointment) {
    const apptStatus = status.appointment.status;
    const scheduledAt = status.appointment.scheduled_at
      ? new Date(status.appointment.scheduled_at).toLocaleString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : null;

    return (
      <Card
        icon={<CalendarIcon className="text-green-500" />}
        title="You have an upcoming appointment"
        description={
          scheduledAt
            ? `Your appointment is confirmed for ${scheduledAt}.`
            : `Your appointment request is currently ${apptStatus.toLowerCase().replace(/_/g, ' ')}.`
        }
        badge={{ label: apptStatus.replace(/_/g, ' '), color: 'green' }}
      >
        <button
          onClick={() => router.push('/my-appointments')}
          className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View My Appointments
        </button>
      </Card>
    );
  }

  // Case 2: intake submitted, awaiting review
  if (status.has_pending_intake) {
    return (
      <Card
        icon={<ClockIcon className="text-amber-500" />}
        title="Your intake is being reviewed"
        description="A counselor is reviewing your intake assessment. You'll be notified once an appointment is scheduled for you."
        badge={{ label: status.pending_intake_status ?? 'In Review', color: 'amber' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </Card>
    );
  }

  // Case 3: returning student — has completed intake before, no active appointment
  if (status.has_completed_intake) {
    return (
      <Card
        icon={<RefreshIcon className="text-green-500" />}
        title="Book your next session"
        description="You've already been seen by CPS (walk-in or prior intake). You can book your next appointment directly."
      >
        <button
          onClick={() => router.push('/book-appointment')}
          className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Book Appointment
        </button>
        <button
          onClick={() => router.push('/intake')}
          className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
        >
          Start New Intake Instead
        </button>
      </Card>
    );
  }

  // Case 4: has a saved draft
  if (status.has_draft) {
    return (
      <Card
        icon={<DocumentIcon className="text-blue-500" />}
        title="You have a saved intake draft"
        description="You started an intake form but didn't finish. Pick up where you left off or start fresh."
      >
        <button
          onClick={() => router.push('/intake')}
          className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Resume Draft
        </button>
      </Card>
    );
  }

  // Case 5: first time — no history
  return (
    <Card
      icon={<SparkleIcon className="text-green-500" />}
      title="Start your counseling journey"
      description="To book your first appointment, you'll complete a short intake assessment. It helps us match you with the right counselor and schedule appropriately."
    >
      <div className="mt-4 mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <Step n={1} text="Fill out the intake form (10–15 min)" />
        <Step n={2} text="A counselor reviews your responses" />
        <Step n={3} text="Your appointment is scheduled" />
      </div>
      <button
        onClick={() => router.push('/intake')}
        className="btn-primary"
      >
        Start Intake Assessment
      </button>
    </Card>
  );
}

function Card({
  icon, title, description, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: { label: string; color: 'green' | 'amber' | 'green' };
  children?: React.ReactNode;
}) {
  const badgeColors = {
    indigo: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {badge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColors[badge.color]}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      {children && <div className="flex flex-col">{children}</div>}
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <span>{text}</span>
    </div>
  );
}

// Inline icons
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
