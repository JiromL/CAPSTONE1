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
  const studentItems: MenuItem[] = [
    { label: 'Dashboard',         href: '/dashboard',       id: 'dashboard'      },
    { label: 'Book Appointment',  href: '/book-appointment',id: 'book-appointment'},
    { label: 'My Appointments',   href: '/my-appointments', id: 'my-appointments' },
{ label: 'Journal',           href: '/journal',         id: 'journal'         },
    { label: 'Wellness Resources',href: '/resources',       id: 'resources'       },
    { label: 'Profile',           href: '/profile',         id: 'profile'         },
  ];

  // ============ IC (Intake Counselor) ============
  // Most frequent: Appointment Requests (confirm+conduct) → Intake Tracker (history) → Availability → EMA
  const icItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'    },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'Intake Tracker',       href: '/new-intakes',          id: 'new-intakes'  },
    { label: 'My Availability',      href: '/availability',         id: 'availability' },
    { label: 'EMA',                  href: '/mhbot',                id: 'mhbot'        },
    { label: 'Announcements',        href: '/announcements',        id: 'announcements'},
    { label: 'Profile',              href: '/profile',              id: 'profile'      },
  ];

  // ============ COUNSELOR ============
  // Most frequent: Cases (daily notes) → Sessions (schedule) → Availability → EMA
  const counselorItems: MenuItem[] = [
    { label: 'Dashboard',       href: '/dashboard',    id: 'dashboard'    },
    { label: 'Cases',           href: '/cases',        id: 'cases'        },
    { label: 'My Sessions',     href: '/appointments', id: 'appointments' },
    { label: 'My Availability', href: '/availability', id: 'availability' },
    { label: 'EMA',             href: '/mhbot',        id: 'mhbot'        },
    { label: 'Announcements',   href: '/announcements',id: 'announcements'},
    { label: 'Profile',         href: '/profile',      id: 'profile'      },
  ];

  // ============ PSYCHOLOGIST ============
  // Most frequent: High-Risk (unique role) → Cases → Sessions → Availability → EMA
  const psychologistItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',    id: 'dashboard'    },
    { label: 'High-Risk Monitoring', href: '/high-risk',    id: 'high-risk'    },
    { label: 'Cases',                href: '/cases',        id: 'cases'        },
    { label: 'My Sessions',          href: '/appointments', id: 'appointments' },
    { label: 'My Availability',      href: '/availability', id: 'availability' },
    { label: 'EMA',                  href: '/mhbot',        id: 'mhbot'        },
    { label: 'Announcements',        href: '/announcements',id: 'announcements'},
    { label: 'Profile',              href: '/profile',      id: 'profile'      },
  ];

  // ============ CASE MANAGER ============
  // Most frequent: CM Queue (primary task) → Cases → High-Risk → EMA → Appointments
  const caseManagerItems: MenuItem[] = [
    { label: 'Dashboard',       href: '/dashboard',           id: 'dashboard'     },
    { label: 'CM Queue',        href: '/case-manager/queue',  id: 'cm-queue'      },
    { label: 'Cases',           href: '/cases',               id: 'cases'         },
    { label: 'High-Risk',       href: '/high-risk',           id: 'high-risk'     },
    { label: 'Appointments',    href: '/appointments',        id: 'appointments'  },
    { label: 'EMA',             href: '/mhbot',               id: 'mhbot'         },
    { label: 'Announcements',   href: '/announcements',       id: 'announcements' },
    { label: 'Profile',         href: '/profile',             id: 'profile'       },
  ];

  // ============ STAFF (Office Assistant) ============
  // Most frequent: Appointment Requests → Walk-In (daily) → Reschedule (occasional)
  const staffItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',             id: 'dashboard'          },
    { label: 'Appointment Requests', href: '/appointment-requests',  id: 'appointments'       },
    { label: 'Counselor Schedules',  href: '/counselor-schedules',   id: 'counselor-schedules'},
    { label: 'Walk-In Intake',       href: '/staff/walkin-intake',   id: 'walk-in-intake'     },
    { label: 'Reschedule Requests',  href: '/reschedule-requests',   id: 'reschedule-requests'},
    { label: 'Announcements',        href: '/announcements',         id: 'announcements'      },
    { label: 'Profile',              href: '/profile',               id: 'profile'            },
  ];

  // ============ ADMIN ============
  // Most frequent: User Mgmt → Appointment Requests → New Intakes → Cases → Analytics
  const adminItems: MenuItem[] = [
    { label: 'Dashboard',            href: '/dashboard',            id: 'dashboard'    },
    { label: 'User Management',      href: '/admin/users',          id: 'admin'        },
    { label: 'Appointment Requests', href: '/appointment-requests', id: 'appointments' },
    { label: 'New Intakes',          href: '/new-intakes',          id: 'new-intakes'  },
    { label: 'Cases',                href: '/cases',                id: 'cases'        },
    { label: 'Analytics',            href: '/admin/analytics',      id: 'analytics'    },
    { label: 'Announcements',        href: '/announcements',        id: 'announcements'},
    { label: 'Profile',              href: '/profile',              id: 'profile'      },
  ];

  // ============ DPO (Data Protection Officer) ============
  const dpoItems: MenuItem[] = [
    { label: 'Dashboard',       href: '/dashboard',       id: 'dashboard'    },
    { label: 'Audit Logs',      href: '/admin/audit-log', id: 'audit'        },
    { label: 'User Management', href: '/admin/users',     id: 'admin'        },
    { label: 'New Intakes',     href: '/new-intakes',     id: 'new-intakes'  },
    { label: 'Cases',           href: '/cases',           id: 'cases'        },
    { label: 'Announcements',   href: '/announcements',   id: 'announcements'},
    { label: 'Profile',         href: '/profile',         id: 'profile'      },
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
    'journal':             'journal',

    // Appointments
    'appointments':         'appointments',
    'appointment-requests': 'appointments',
    'reschedule-requests':  'reschedule-requests',
    'walk-in-intake':       'walk-in-intake',
    'walkin-intake':        'walk-in-intake',

    // Intakes
    'new-intakes':          'new-intakes',

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

    // Availability
    'availability':         'availability',

    // Announcements
    'announcements':        'announcements',
  };

  return routeMap[lastSegment] || routeMap[firstSegment] || 'dashboard';
}
