/**
 * Role-Based Access Control (RBAC) utility
 * Defines which roles can access which features
 */

export type UserRole = 
  | 'STUDENT' 
  | 'IC' 
  | 'COUNSELOR' 
  | 'PSYCHOLOGIST' 
  | 'CSC' 
  | 'CSP' 
  | 'STAFF' 
  | 'ADMIN' 
  | 'DPO';

/**
 * Permission definitions for each page/feature
 * Maps page paths to required roles (any role in the array can access)
 */
export const pagePermissions: Record<string, UserRole[]> = {
  // Public authenticated pages
  '/dashboard': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'STAFF', 'ADMIN', 'DPO'],
  '/profile': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'STAFF', 'ADMIN', 'DPO'],
  '/resources': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'STAFF', 'ADMIN', 'DPO'],
  '/documentation': ['STUDENT', 'IC', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'STAFF', 'ADMIN', 'DPO'],

  // Student pages
  '/intake': ['STUDENT'],
  '/tasks': ['STUDENT', 'STAFF'],
  '/book-appointment': ['STUDENT'],
  '/check-ins-student': ['STUDENT'],
  '/journal': ['STUDENT'],
  '/feedback': ['STUDENT'],

  // Intake Counselor pages
  '/new-intakes': ['IC', 'ADMIN', 'DPO'],
  '/reminders': ['IC', 'ADMIN', 'DPO'],

  // Staff pages
  '/appointment-requests': ['IC', 'STAFF', 'COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/check-in-tracking': ['STAFF', 'ADMIN', 'DPO'],
  '/reschedule-requests': ['STAFF', 'ADMIN', 'DPO'],
  '/staff-settings': ['STAFF', 'ADMIN', 'DPO'],

  // Counselor/Psychologist pages
  '/appointments': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/assessments': ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/cases': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/counseling-cases': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/check-ins': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/referrals': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/counselor': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],
  '/video-links': ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'],

  // Psychologist pages
  '/high-risk': ['PSYCHOLOGIST', 'ADMIN', 'DPO'],

  // Admin pages
  '/admin/users': ['ADMIN', 'DPO'],
  '/admin/analytics': ['ADMIN', 'DPO'],
  '/availability': ['ADMIN', 'DPO'],
};

/**
 * Check if a user has access to a specific page
 * @param pathname - The page path to check
 * @param userRole - The user's role
 * @returns true if user can access the page, false otherwise
 */
export function canAccessPage(pathname: string, userRole: UserRole): boolean {
  // Extract the base path (remove query params)
  const basePath = pathname.split('?')[0];
  
  // Get required roles for this page
  const requiredRoles = pagePermissions[basePath];
  
  // If page is not in permissions list, allow access (public)
  if (!requiredRoles) {
    return true;
  }
  
  // Normalize user role to uppercase for comparison
  const normalizedRole = userRole?.toUpperCase() as UserRole;
  
  // Check if user role is in required roles
  return requiredRoles.includes(normalizedRole);
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
    'CSC': 'Supporting Counselor (Case)',
    'CSP': 'Supporting Psychologist',
    'STAFF': 'Staff',
    'ADMIN': 'Administrator',
    'DPO': 'Data Protection Officer',
  };
  return roleLabels[role] || role;
}

/**
 * Feature-level access checks
 */
export const featureAccess = {
  canEditCases: (role: UserRole) => ['COUNSELOR', 'PSYCHOLOGIST', 'CSC', 'CSP', 'ADMIN', 'DPO'].includes(role),
  canViewHighRisk: (role: UserRole) => ['PSYCHOLOGIST', 'ADMIN', 'DPO'].includes(role),
  canManageUsers: (role: UserRole) => ['ADMIN', 'DPO'].includes(role),
  canEndorseIntakes: (role: UserRole) => ['IC', 'ADMIN', 'DPO'].includes(role),
  canScheduleAppointments: (role: UserRole) => ['STUDENT', 'COUNSELOR', 'PSYCHOLOGIST', 'STAFF', 'ADMIN', 'DPO'].includes(role),
  canViewAllCases: (role: UserRole) => ['ADMIN', 'DPO', 'PSYCHOLOGIST'].includes(role),
};
