/**
 * Role-based navigation menu generator
 * Ensures consistent navigation across all pages
 * 9-tier role hierarchy with granular feature access
 */

export interface MenuItem {
  label: string;
  href: string;
  id: string;
  badge?: number;
}

export function getMenuItemsByRole(role: string): MenuItem[] {
  // ============ STUDENT ============
  // Primary workflow: Intake → Appointments → Check-ins → Personal
  const studentItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    
    // Primary Workflow
    { label: 'Get Counseling', href: '/counseling', id: 'counseling' },
    { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
    { label: 'My Appointments', href: '/my-appointments', id: 'my-appointments' },
    
    // Engagement
    { label: 'Check-Ins', href: '/check-ins-student', id: 'check-ins' },
    { label: 'Journal', href: '/journal', id: 'journal' },
    { label: 'Feedback', href: '/feedback', id: 'feedback' },
    
    // Support
    { label: 'Wellness Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ IC (Intake Counselor) ============
  // Primary workflow: New Intakes → Assessments → Appointments → Reminders
  const icItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    
    // Primary Workflow
    { label: 'New Intakes', href: '/new-intakes', id: 'new-intakes' },
    { label: 'Assessments', href: '/assessments', id: 'assessments' },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'Reminders', href: '/reminders', id: 'reminders' },
    { label: 'MHBot / PERMA', href: '/mhbot', id: 'mhbot' },

    // Support
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ COUNSELOR ============
  // Primary workflow: Cases → Appointments → Check-ins → Assessments
  const counselorItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },

    // Primary Workflow
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Counseling Cases', href: '/counseling-cases', id: 'counseling-cases' },
    { label: 'Appointments', href: '/appointments', id: 'appointments' },
    { label: 'Check-Ins', href: '/check-ins', id: 'check-ins' },
    { label: 'Assessments', href: '/assessments', id: 'assessments' },

    // Clinical Tools
    { label: 'Recurring Sessions', href: '/recurring-appointments', id: 'recurring-appointments' },
    { label: 'MHBot / PERMA', href: '/mhbot', id: 'mhbot' },
    { label: 'Referrals', href: '/referrals', id: 'referrals' },
    { label: 'C2C Referrals', href: '/c2c-referrals', id: 'c2c-referrals' },
    { label: 'Video Links', href: '/video-links', id: 'video-links' },

    // Profile & Support
    { label: 'Counselor Profile', href: '/counselor', id: 'counselor-profile' },
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ PSYCHOLOGIST ============
  // Primary workflow: High-Risk → Cases → Appointments → Clinical Tools
  const psychologistItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    
    // Critical - Unique to Psychologist
    { label: 'High-Risk Monitoring', href: '/high-risk', id: 'high-risk' },
    
    // Primary Workflow
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Counseling Cases', href: '/counseling-cases', id: 'counseling-cases' },
    { label: 'Appointments', href: '/appointments', id: 'appointments' },
    { label: 'Check-Ins', href: '/check-ins', id: 'check-ins' },
    
    // Clinical Tools
    { label: 'Recurring Sessions', href: '/recurring-appointments', id: 'recurring-appointments' },
    { label: 'MHBot / PERMA', href: '/mhbot', id: 'mhbot' },
    { label: 'Assessments', href: '/assessments', id: 'assessments' },
    { label: 'Referrals', href: '/referrals', id: 'referrals' },
    { label: 'C2C Referrals', href: '/c2c-referrals', id: 'c2c-referrals' },
    { label: 'Video Links', href: '/video-links', id: 'video-links' },

    // Profile & Support
    { label: 'Counselor Profile', href: '/counselor', id: 'counselor-profile' },
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ CSC/CSP (Support Team) ============
  // Primary workflow: Supporting clinical team
  const supportTeamItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },

    // Primary Workflow
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Counseling Cases', href: '/counseling-cases', id: 'counseling-cases' },
    { label: 'Supervision', href: '/supervision', id: 'supervision' },
    { label: 'Appointments', href: '/appointments', id: 'appointments' },
    { label: 'Check-Ins', href: '/check-ins', id: 'check-ins' },

    // Clinical Tools
    { label: 'Recurring Sessions', href: '/recurring-appointments', id: 'recurring-appointments' },
    { label: 'MHBot / PERMA', href: '/mhbot', id: 'mhbot' },
    { label: 'Assessments', href: '/assessments', id: 'assessments' },
    { label: 'Referrals', href: '/referrals', id: 'referrals' },
    { label: 'C2C Referrals', href: '/c2c-referrals', id: 'c2c-referrals' },
    { label: 'Video Links', href: '/video-links', id: 'video-links' },

    // Support
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ STAFF (Office Assistant) ============
  // Primary workflow: Appointment management → Check-ins → Admin tasks
  const staffItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },

    // Primary Workflow
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'Walk-In Intake', href: '/walk-in-intake', id: 'walk-in-intake' },
    { label: 'Check-In Tracking', href: '/check-in-tracking', id: 'check-in-tracking' },
    { label: 'Reschedule Requests', href: '/reschedule-requests', id: 'reschedule-requests' },
    { label: 'Waitlist', href: '/waitlist', id: 'waitlist' },

    // Administrative
    { label: 'My Tasks', href: '/tasks', id: 'tasks' },
    { label: 'Settings', href: '/staff-settings', id: 'staff-settings' },
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ ADMIN ============
  // Primary workflow: System management → Analytics → User control
  const adminItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },

    // System Management (Critical)
    { label: 'User Management', href: '/admin/users', id: 'admin' },
    { label: 'Roles', href: '/admin/roles', id: 'roles' },
    { label: 'Permissions', href: '/admin/permissions', id: 'permissions' },
    { label: 'Availability', href: '/availability', id: 'availability' },

    // Analytics & Monitoring
    { label: 'Analytics', href: '/admin/analytics', id: 'analytics' },
    { label: 'Audit Logs', href: '/admin/audit-log', id: 'audit' },
    { label: 'System Health', href: '/admin/health', id: 'health' },
    { label: 'High-Risk Cases', href: '/high-risk', id: 'high-risk' },

    // Operational
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'Reminders', href: '/reminders', id: 'reminders' },
    { label: 'Data Export', href: '/admin/reports/export', id: 'export' },

    // Support
    { label: 'Resources', href: '/resources', id: 'resources' },
    { label: 'Settings', href: '/admin/settings', id: 'settings' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ DPO (Data Protection Officer) ============
  // Primary workflow: Audit & governance → Access control → Oversight
  const dpoItems: MenuItem[] = [
    // Core Navigation
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },

    // Governance (Critical - Unique to DPO)
    { label: 'Audit Logs', href: '/admin/audit-log', id: 'audit' },
    { label: 'User Management', href: '/admin/users', id: 'admin' },
    { label: 'Data Export', href: '/admin/reports/export', id: 'export' },

    // Oversight
    { label: 'High-Risk Cases', href: '/high-risk', id: 'high-risk' },
    { label: 'Cases', href: '/cases', id: 'cases' },
    { label: 'Appointments', href: '/appointment-requests', id: 'appointments' },

    // Analytics
    { label: 'Analytics', href: '/admin/analytics', id: 'analytics' },
    { label: 'Documentation', href: '/documentation', id: 'documentation' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // Route by role with organized structure
  switch (role?.toUpperCase()) {
    case 'STUDENT':
      return studentItems;
    case 'IC':
      return icItems;
    case 'COUNSELOR':
      return counselorItems;
    case 'PSYCHOLOGIST':
      return psychologistItems;
    case 'CSC':
    case 'CSP':
      return supportTeamItems;
    case 'STAFF':
      return staffItems;
    case 'ADMIN':
      return adminItems;
    case 'DPO':
      return dpoItems;
    default:
      return studentItems;
  }
}

export function getActiveSectionFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'dashboard';
  
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  
  const routeMap: { [key: string]: string } = {
    // Core
    'dashboard': 'dashboard',
    'profile': 'profile',
    'resources': 'resources',
    'documentation': 'documentation',

    // Student
    'counseling': 'counseling',
    'book-appointment': 'book-appointment',
    'my-appointments': 'my-appointments',
    'check-ins-student': 'check-ins',
    'journal': 'journal',
    'feedback': 'feedback',

    // Appointments
    'appointments': 'appointments',
    'appointment-requests': 'appointments',
    'reschedule-requests': 'reschedule-requests',
    'waitlist': 'waitlist',
    'availability': 'availability',
    'recurring-appointments': 'recurring-appointments',

    // Cases
    'cases': 'cases',
    'counseling-cases': 'counseling-cases',
    'high-risk': 'high-risk',

    // Clinical
    'assessments': 'assessments',
    'check-ins': 'check-ins',
    'check-in-tracking': 'check-in-tracking',
    'referrals': 'referrals',
    'c2c-referrals': 'c2c-referrals',
    'video-links': 'video-links',
    'mhbot': 'mhbot',
    'supervision': 'supervision',
    'counselor': 'counselor-profile',

    // IC / Staff
    'new-intakes': 'new-intakes',
    'reminders': 'reminders',
    'tasks': 'tasks',
    'staff-settings': 'staff-settings',

    // Admin / DPO
    'users': 'admin',
    'roles': 'roles',
    'permissions': 'permissions',
    'analytics': 'analytics',
    'audit-log': 'audit',
    'health': 'health',
    'export': 'export',
    'settings': 'settings',
  };
  
  return routeMap[lastSegment] || routeMap[firstSegment] || 'dashboard';
}
