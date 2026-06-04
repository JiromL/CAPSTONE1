'use client';

import { useRouter } from 'next/navigation';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function CounselingPage() {
  const router = useRouter();

  return (
    <DashboardPageWrapper title="Book Appointment" requiredRoles={['STUDENT']}>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Book Appointment</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Select the option that best describes your situation.
        </p>

        <div className="space-y-4">
          {/* First time */}
          <button
            onClick={() => router.push('/intake')}
            className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md rounded-xl p-6 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-900/60 transition-colors">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">
                  First time visiting CPS
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete a short intake assessment so we can match you with the right counselor.
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-green-500 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Returning */}
          <button
            onClick={() => router.push('/book-appointment')}
            className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md rounded-xl p-6 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">
                  Returning student
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You've been seen by CPS before. Book your next session directly.
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-green-500 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center">
          Not sure? Choose "First time" — the intake form only takes 10–15 minutes.
        </p>
      </div>
    </DashboardPageWrapper>
  );
}
