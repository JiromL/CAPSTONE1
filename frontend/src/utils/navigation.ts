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
    { label: 'Book Appointment', href: '/book-appointment', id: 'book-appointment' },
    { label: 'My Appointments', href: '/my-appointments', id: 'my-appointments' },
    
    // Engagement
    { label: 'Journal', href: '/journal', id: 'journal' },
    
    // Support
    { label: 'Wellness Resources', href: '/resources', id: 'resources' },
    { label: 'Profile', href: '/profile', id: 'profile' },
  ];

  // ============ IC (Intake Counselor) ============
  // Processes new student intakes and assigns counselors to appointment requests
  const icItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'    },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'My Availability',      href: '/availability',         id: 'availability' },
    { label: 'Announcements',        href: '/announcements',        id: 'announcements'},
    { label: 'Profile',              href: '/profile',              id: 'profile'      },
  ];

  // ============ COUNSELOR ============
  // Conducts sessions, manages their assigned student cases
  const counselorItems: MenuItem[] = [
    { label: 'Dashboard',        href: '/dashboard',    id: 'dashboard'    },
    { label: 'My Sessions',      href: '/appointments', id: 'appointments' },
    { label: 'Cases',            href: '/cases',        id: 'cases'        },
    { label: 'My Availability',  href: '/availability', id: 'availability' },
    { label: 'Announcements',    href: '/announcements',id: 'announcements'},
    { label: 'Profile',          href: '/profile',      id: 'profile'      },
  ];

  // ============ PSYCHOLOGIST ============
  // Same as counselor plus high-risk clinical oversight
  const psychologistItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',    id: 'dashboard'    },
    { label: 'High-Risk Monitoring', href: '/high-risk',    id: 'high-risk'    },
    { label: 'My Sessions',          href: '/appointments', id: 'appointments' },
    { label: 'Cases',                href: '/cases',        id: 'cases'        },
    { label: 'Announcements',        href: '/announcements',id: 'announcements'},
    { label: 'Profile',              href: '/profile',      id: 'profile'      },
  ];

  // ============ STAFF (Office Assistant) ============
  // Routes appointment requests, handles reschedules and walk-ins
  const staffItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'          },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments'       },
    { label: 'Reschedule Requests',  href: '/reschedule-requests',  id: 'reschedule-requests'},
    { label: 'Walk-In Intake',       href: '/staff/walkin-intake',  id: 'walk-in-intake'     },
    { label: 'Announcements',        href: '/announcements',        id: 'announcements'      },
    { label: 'Profile',              href: '/profile',              id: 'profile'            },
  ];

  // ============ ADMIN ============
  // User management and system oversight
  const adminItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'    },
    { label: 'User Management',      href: '/admin/users',          id: 'admin'        },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'Analytics',            href: '/admin/analytics',      id: 'analytics'    },
    { label: 'Announcements',        href: '/announcements',        id: 'announcements'},
    { label: 'Profile',              href: '/profile',              id: 'profile'      },
  ];

  // ============ DPO (Data Protection Officer) ============
  // Audit, governance, and user data oversight
  const dpoItems: MenuItem[] = [
    { label: 'Dashboard',       href: '/dashboard',       id: 'dashboard'    },
    { label: 'Audit Logs',      href: '/admin/audit-log', id: 'audit'        },
    { label: 'User Management', href: '/admin/users',     id: 'admin'        },
    { label: 'Announcements',   href: '/announcements',   id: 'announcements'},
    { label: 'Profile',         href: '/profile',         id: 'profile'      },
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
    'dashboard':          'dashboard',
    'profile':            'profile',
    'resources':          'resources',

    // Student
    'book-appointment':   'book-appointment',
    'my-appointments':    'my-appointments',
    'journal':            'journal',

    // Appointments (all route to 'appointments' for highlight)
    'appointments':        'appointments',
    'appointment-requests':'appointments',
    'reschedule-requests': 'reschedule-requests',
    'walk-in-intake':      'walk-in-intake',
    'walkin-intake':       'walk-in-intake',

    // Staff intakes
    'new-intakes':         'new-intakes',

    // Cases / Clinical
    'cases':               'cases',
    'high-risk':           'high-risk',

    // Admin / DPO
    'users':               'admin',
    'analytics':           'analytics',
    'audit-log':           'audit',

    // Announcements
    'announcements':       'announcements',
  };
  
  return routeMap[lastSegment] || routeMap[firstSegment] || 'dashboard';
}
