/**
 * Role-based navigation menu generator
 * Ensures consistent navigation across all pages
 * 9-tier role hierarchy with granular feature access
 */

export interface MenuItem {
  label?: string;
  href?: string;
  id?: string;
  badge?: number;
  divider?: boolean;
  /** Section label shown above the items that follow it. */
  heading?: string;
}

const H = (heading: string): MenuItem => ({ heading });

export function getMenuItemsByRole(role: string): MenuItem[] {
  // ============ STUDENT ============
  const studentItems: MenuItem[] = [
    { label: 'Dashboard',         href: '/dashboard',        id: 'dashboard'       },
    H('Your care'),
    { label: 'Request a Session', href: '/book-appointment', id: 'book-appointment'},
    { label: 'My Appointments',   href: '/my-appointments',  id: 'my-appointments' },
    { label: 'Session History',   href: '/counseling',       id: 'counseling'      },
    H('Your space'),
    { label: 'Journal',           href: '/journal',          id: 'journal'         },
    { label: 'Wellness Resources',href: '/resources',        id: 'resources'       },
    H('Account'),
    { label: 'Profile',           href: '/profile',          id: 'profile'         },
  ];

  // ============ IC (Intake Counselor) ============
  const icItems: MenuItem[] = [
    { label: 'Dashboard',         href: '/dashboard',         id: 'dashboard'        },
    H('Clinical work'),
    { label: 'Intake Management', href: '/intake-management', id: 'intake-management'},
    { label: 'Cases',             href: '/cases',             id: 'cases'            },
    { label: 'My Schedule',       href: '/schedule',          id: 'schedule'         },
    { label: 'EMA Bot',           href: '/mhbot',             id: 'mhbot'            },
    H('Account'),
    { label: 'Profile',           href: '/profile',           id: 'profile'          },
  ];

  // ============ COUNSELOR ============
  const counselorItems: MenuItem[] = [
    { label: 'Dashboard',    href: '/dashboard',    id: 'dashboard'   },
    H('Clinical work'),
    { label: 'Cases',        href: '/cases',        id: 'cases'       },
    { label: 'Appointments', href: '/appointments', id: 'appointments'},
    { label: 'My Schedule',  href: '/schedule',     id: 'schedule'    },
    { label: 'EMA Bot',      href: '/mhbot',        id: 'mhbot'       },
    H('Account'),
    { label: 'Profile',      href: '/profile',      id: 'profile'     },
  ];

  // ============ PSYCHOLOGIST ============
  const psychologistItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',   id: 'dashboard'   },
    H('Clinical work'),
    { label: 'Cases',                href: '/cases',       id: 'cases'       },
    { label: 'Appointments',         href: '/appointments',id: 'appointments'},
    { label: 'My Schedule',          href: '/schedule',    id: 'schedule'    },
    { label: 'EMA Bot',              href: '/mhbot',       id: 'mhbot'       },
    H('Account'),
    { label: 'Profile',              href: '/profile',     id: 'profile'     },
  ];

  // ============ CASE MANAGER ============
  const caseManagerItems: MenuItem[] = [
    { label: 'Dashboard',    href: '/dashboard',          id: 'dashboard'    },
    H('Case management'),
    { label: 'CM Queue',     href: '/case-manager/queue', id: 'cm-queue'     },
    { label: 'Cases',        href: '/cases',              id: 'cases'        },
    { label: 'Appointments', href: '/appointments',       id: 'appointments' },
    H('Account'),
    { label: 'Profile',      href: '/profile',            id: 'profile'      },
  ];

  // ============ STAFF (Office Assistant) ============
  const staffItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',             id: 'dashboard'          },
    H('Front desk'),
    { label: 'Appointment Requests', href: '/appointment-requests',  id: 'appointments'       },
    { label: 'CPS Calendar',         href: '/schedule',              id: 'schedule'           },
    { label: 'Walk-In Intake',       href: '/staff/walkin-intake',   id: 'walk-in-intake'     },
    H('Account'),
    { label: 'Profile',              href: '/profile',               id: 'profile'            },
  ];

  // ============ ADMIN ============
  const adminItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'       },
    H('Operations'),
    { label: 'User Management',      href: '/admin/users',          id: 'admin'           },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments'    },
    { label: 'Cases',                href: '/cases',                id: 'cases'           },
    H('Insights & settings'),
    { label: 'Analytics',            href: '/admin/analytics',      id: 'analytics'       },
    { label: 'System Settings',      href: '/admin/settings',       id: 'admin-settings'  },
    H('Account'),
    { label: 'Profile',              href: '/profile',              id: 'profile'         },
  ];

  // ============ DPO (Data Protection Officer) ============
  const dpoItems: MenuItem[] = [
    { label: 'Dashboard',           href: '/dashboard',       id: 'dashboard'   },
    H('Oversight'),
    { label: 'Audit Logs',          href: '/admin/audit-log', id: 'audit'       },
    { label: 'User Management',     href: '/admin/users',     id: 'admin'       },
    { label: 'NC Client Tracker',   href: '/new-intakes',     id: 'new-intakes' },
    { label: 'Cases',               href: '/cases',           id: 'cases'       },
    H('Account'),
    { label: 'Profile',             href: '/profile',         id: 'profile'     },
  ];

  switch (role?.toUpperCase()) {
    case 'STUDENT':
      return studentItems;
    case 'IC':
      return icItems;
    case 'COUNSELOR':
      return counselorItems;
    case 'PSYCHOLOGIST':
      return psychologistItems;
    case 'CASE_MANAGER':
      return caseManagerItems;
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
    'dashboard':           'dashboard',
    'profile':             'profile',
    'resources':           'resources',

    // Student
    'book-appointment':    'book-appointment',
    'my-appointments':     'my-appointments',
    'counseling':          'counseling',
    'journal':             'journal',

    // Appointments
    'appointments':         'appointments',
    'appointment-requests': 'appointments',
    'reschedule-requests':  'appointments',
    'walk-in-intake':       'walk-in-intake',
    'walkin-intake':        'walk-in-intake',

    // Intakes
    'new-intakes':          'new-intakes',
    'intake-management':    'intake-management',


    // Cases / Clinical
    'cases':                'cases',
    'high-risk':            'high-risk',
    'mhbot':                'mhbot',
    'ema':                  'ema',
    'queue':                'cm-queue',

    // Admin / DPO
    'users':                'admin',
    'analytics':            'analytics',
    'audit-log':            'audit',
    'settings':             'admin-settings',

    // Schedules
    'counselor-schedules':  'counselor-schedules',
    'schedule':             'schedule',

    // Availability now lives at /schedule?tab=availability
    'availability':         'schedule',

    // Announcements
    'announcements':        'announcements',
  };

  return routeMap[lastSegment] || routeMap[firstSegment] || 'dashboard';
}
