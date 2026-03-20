/**
 * Role-based navigation menu generator
 * Ensures consistent navigation across all pages
 */

export interface MenuItem {
  label: string;
  href: string;
  id: string;
}

export function getMenuItemsByRole(role: string): MenuItem[] {
  const studentItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'My Tasks', href: '/tasks', id: 'tasks' },
    { label: 'Intake Form', href: '/intake', id: 'intake' },
    { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
    { label: 'Wellness Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  const staffItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'Appointments', href: '/appointment-requests', id: 'appointments' },
    { label: 'Settings', href: '/staff-settings', id: 'staff-settings' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  const adminItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { label: 'Appointments', href: '/appointment-requests', id: 'appointments' },
    { label: 'Users', href: '/admin/users', id: 'users' },
    { label: 'Analytics', href: '/admin/analytics', id: 'analytics' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // Determine role type
  const staffRoles = ['COUNSELOR', 'PSYCHOLOGIST', 'IC', 'CSC', 'CSP', 'DPO'];
  const adminRoles = ['ADMIN'];

  if (adminRoles.includes(role)) {
    return adminItems;
  } else if (staffRoles.includes(role)) {
    return staffItems;
  } else {
    // Default to student items
    return studentItems;
  }
}

export function getActiveSectionFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'dashboard';
  
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  
  const routeMap: { [key: string]: string } = {
    'appointments': 'appointments',
    'appointment-requests': 'appointments',
    'availability': 'availability',
    'cases': 'cases',
    'assessments': 'assessments',
    'referrals': 'referrals',
    'documentation': 'documentation',
    'profile': 'profile',
    'tasks': 'tasks',
    'intake': 'intake',
    'book-appointment': 'book-appointment',
    'resources': 'resources',
    'high-risk': 'high-risk',
    'users': 'users',
    'analytics': 'analytics',
    'staff-settings': 'staff-settings',
    'dashboard': 'dashboard',
  };
  
  return routeMap[lastSegment] || routeMap[firstSegment] || 'dashboard';
}
