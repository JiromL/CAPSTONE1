/**
 * Role-Based Access Control (RBAC) utility
 * Defines which roles can access which features
 */

export type UserRole =
  | 'STUDENT'
  | 'IC'
  | 'COUNSELOR'
  | 'PSYCHOLOGIST'
  | 'STAFF'
  | 'CASE_MANAGER'
  | 'ADMIN'
  | 'DPO';

/**
 * Permission definitions for each page/feature
 * Maps page paths to required roles (any role in the array can access)
 */
export const pagePermissions: Record<string, UserRole[]> = {
  // Public authenticated pages
  '/dashboard': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/profile': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/resources': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/documentation': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Student pages
  '/counseling': ['STUDENT'],
  '/intake': ['STUDENT'],
  '/tasks': ['STUDENT', 'STAFF'],
  '/book-appointment': ['STUDENT'],
  '/my-appointments': ['STUDENT'],
  '/check-ins-student': ['STUDENT'],
  '/journal': ['STUDENT'],
  '/feedback': ['STUDENT'],

  // Intake Counselor pages
  '/new-intakes':         ['IC', 'ADMIN', 'DPO'],
  '/intake-management':   ['IC'],
  '/ic/intake/pending': ['IC', 'ADMIN', 'DPO'],
  '/reminders': ['IC', 'ADMIN', 'DPO'],

  // Case Manager pages
  '/case-manager/queue': ['CASE_MANAGER', 'ADMIN', 'DPO'],

  // Staff pages
  '/counselor-schedules': ['IC', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],
  '/appointment-requests': ['IC', 'STAFF', 'ADMIN', 'DPO'],
  '/walk-in-intake': ['STAFF', 'ADMIN', 'DPO'],
  '/staff/walkin-intake': ['STAFF', 'ADMIN', 'DPO'],
  '/check-in-tracking': ['STAFF', 'ADMIN', 'DPO'],
  '/reschedule-requests': ['STAFF', 'ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER'],
  '/staff-settings': ['STAFF', 'ADMIN', 'DPO'],
  '/waitlist': ['STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/recurring-appointments': ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN'],
  '/mhbot': ['STUDENT', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Counselor/Psychologist pages
  '/appointments': ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/assessments': ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/cases': ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/counseling-cases': ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/check-ins': ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/referrals': ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/my-referrals': ['COUNSELOR', 'PSYCHOLOGIST'],
  '/c2c-referrals': ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/counselor': ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],
  '/video-links': ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],

  // Psychologist pages
  '/high-risk': ['PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Admin pages
  '/admin/users':               ['ADMIN', 'DPO'],
  '/admin/users/create':        ['ADMIN', 'DPO'],
  '/admin/analytics':           ['ADMIN', 'DPO'],
  '/admin/audit-log':           ['ADMIN', 'DPO'],
  '/admin/holidays':            ['ADMIN', 'DPO'],
  '/admin/settings':            ['ADMIN', 'DPO'],
  '/admin/roles':               ['ADMIN', 'DPO'],
  '/admin/security':            ['ADMIN', 'DPO'],
  '/admin/permissions':         ['ADMIN', 'DPO'],
  '/admin/backup':              ['ADMIN', 'DPO'],
  '/admin/database':            ['ADMIN', 'DPO'],
  '/admin/health':              ['ADMIN', 'DPO'],
  '/admin/resources':           ['ADMIN', 'DPO'],
  '/admin/logs':                ['ADMIN', 'DPO'],
  '/admin/alerts':              ['ADMIN', 'DPO'],
  '/admin/reports/cases':       ['ADMIN', 'DPO'],
  '/admin/reports/export':      ['ADMIN', 'DPO'],
  '/admin/reports/compliance':  ['ADMIN', 'DPO'],
  '/admin/reports/users':       ['ADMIN', 'DPO'],
  '/availability': ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Announcements
  '/announcements': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Supervision
  '/supervision': ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],

  // Counselor schedule & emergency
  '/counselor/schedule':   ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],
  '/counselor/emergency':  ['COUNSELOR', 'PSYCHOLOGIST', 'ADMIN', 'DPO'],

  // IC sub-routes
  '/ic/intake/in-progress':   ['IC', 'ADMIN', 'DPO'],
  '/ic/intake/new':           ['IC', 'ADMIN', 'DPO'],
  '/ic/intake/completed':     ['IC', 'ADMIN', 'DPO'],
  '/ic/intake/overdue':       ['IC', 'ADMIN', 'DPO'],
  '/ic/intake/conduct/[id]':  ['IC', 'ADMIN', 'DPO'],
  '/ic/schedule':             ['IC', 'ADMIN', 'DPO'],
  '/ic/schedule/calendar':    ['IC', 'ADMIN', 'DPO'],
  '/ic/schedule/assign':      ['IC', 'ADMIN', 'DPO'],
  '/ic/schedule/counselors':  ['IC', 'ADMIN', 'DPO'],
  '/ic/contact/students':     ['IC', 'ADMIN', 'DPO'],

  // Staff sub-routes
  '/staff/batch-assign':             ['STAFF', 'ADMIN', 'DPO'],
  '/staff/workload-report':          ['STAFF', 'IC', 'ADMIN', 'DPO'],
  '/staff/non-counseling-clients':   ['STAFF', 'ADMIN', 'DPO'],
  '/staff/reassignment-suggestions': ['STAFF', 'ADMIN', 'DPO'],
  '/staff/check-in-management':      ['STAFF', 'ADMIN', 'DPO'],
  '/staff/appointments':             ['STAFF', 'IC', 'ADMIN', 'DPO'],
  '/walkin':                         ['STAFF', 'ADMIN', 'DPO'],
  '/office-assistant-settings':      ['STAFF', 'ADMIN', 'DPO'],

  // Appointment slip (printable, all clinical roles)
  '/appointment-slip/[id]': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Admin sub-routes not yet listed
  '/admin/availability': ['ADMIN', 'DPO'],

  // Schedule & leave management (counselors/IC manage their availability here)
  '/schedule': ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Case detail pages
  '/cases/[id]':       ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],
  '/cases/[id]/print': ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // Tasks detail (tasks index is STUDENT/STAFF)
  '/tasks/[id]': ['STUDENT', 'STAFF'],

  // EMA external tool
  '/ema': ['IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'],

  // PERMA send
  '/send-perma': ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CASE_MANAGER', 'ADMIN', 'DPO'],
};

/**
 * Check if a user has access to a specific page
 * @param pathname - The page path to check
 * @param userRole - The user's role
 * @returns true if user can access the page, false otherwise
 */
export function canAccessPage(pathname: string, userRole: UserRole): boolean {
  const basePath = pathname.split('?')[0];
  const normalizedRole = userRole?.toUpperCase() as UserRole;

  // Exact match first
  const exact = pagePermissions[basePath];
  if (exact) return exact.includes(normalizedRole);

  // Pattern match: replace each path segment with [id] and retry.
  // Handles dynamic routes like /cases/abc123 → /cases/[id]
  // and /cases/abc123/print → /cases/[id]/print
  const segments = basePath.split('/');
  for (let i = 1; i < segments.length; i++) {
    const pattern = segments
      .map((seg, idx) => (idx === i ? '[id]' : seg))
      .join('/');
    const patternRoles = pagePermissions[pattern];
    if (patternRoles) return patternRoles.includes(normalizedRole);
  }

  // Not listed → deny. All routes must be explicitly registered above.
  return false;
}

/**
 * Get a friendly label for a role
 */
export function getRoleLabel(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    'STUDENT': 'Student',
    'IC': 'Intake Counselor',
    'COUNSELOR': 'Counselor',
    'PSYCHOLOGIST': 'Psychologist',
    'STAFF': 'Staff',
    'CASE_MANAGER': 'Case Manager',
    'ADMIN': 'Administrator',
    'DPO': 'Data Protection Officer',
  };
  return roleLabels[role] || role;
}

/**
 * Feature-level access checks
 */
export const featureAccess = {
  canEditCases: (role: UserRole) => ['COUNSELOR', 'PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'].includes(role),
  canViewHighRisk: (role: UserRole) => ['PSYCHOLOGIST', 'CASE_MANAGER', 'ADMIN', 'DPO'].includes(role),
  canManageUsers: (role: UserRole) => ['ADMIN', 'DPO'].includes(role),
  canEndorseIntakes: (role: UserRole) => ['IC', 'ADMIN', 'DPO'].includes(role),
  canScheduleAppointments: (role: UserRole) => ['STUDENT', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'CASE_MANAGER', 'ADMIN', 'DPO'].includes(role),
  canViewAllCases: (role: UserRole) => ['ADMIN', 'DPO', 'PSYCHOLOGIST', 'CASE_MANAGER'].includes(role),
};
