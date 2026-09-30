/**
 * Icon mapping for dashboard menu items
 * Uses lucide-react icons to provide visual indicators for navigation.
 * Every id in utils/navigation.ts has its own entry so no two menu items
 * in the same role share an icon.
 */

import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  History,
  NotebookPen,
  HeartHandshake,
  CircleUser,
  Users,
  Settings2,
  ChartLine,
  ScrollText,
  FolderHeart,
  ListChecks,
  ClipboardList,
  ClipboardCheck,
  Bot,
  Inbox,
  UserRoundSearch,
  DoorOpen,
  BellRing,
  ShieldAlert,
  Share2,
  Video,
  FileText,
  MessageSquareText,
  Activity,
} from 'lucide-react';

const I = (Icon: typeof LayoutDashboard) => <Icon size={18} strokeWidth={1.75} aria-hidden="true" />;

export const menuIconMap: Record<string, React.ReactNode> = {
  // Common
  'dashboard':           I(LayoutDashboard),
  'profile':             I(CircleUser),
  'settings':            I(Settings2),
  'staff-settings':      I(Settings2),
  'admin-settings':      I(Settings2),

  // Student
  'book-appointment':    I(CalendarPlus),
  'my-appointments':     I(CalendarCheck),
  'counseling':          I(History),
  'journal':             I(NotebookPen),
  'resources':           I(HeartHandshake),
  'intake':              I(FileText),
  'tasks':               I(ListChecks),
  'check-ins':           I(Activity),
  'check-ins-student':   I(Activity),
  'feedback':            I(MessageSquareText),

  // Intake / clinical
  'intake-management':   I(ClipboardCheck),
  'new-intakes':         I(UserRoundSearch),
  'walk-in-intake':      I(DoorOpen),
  'assessments':         I(ClipboardList),
  'appointments':        I(Inbox),
  'schedule':            I(CalendarDays),
  'availability':        I(CalendarClock),
  'reschedule-requests': I(CalendarRange),
  'reminders':           I(BellRing),
  'cases':               I(FolderHeart),
  'counseling-cases':    I(FolderHeart),
  'cm-queue':            I(ListChecks),
  'high-risk':           I(ShieldAlert),
  'referrals':           I(Share2),
  'video-links':         I(Video),
  'mhbot':               I(Bot),

  // Admin / operational
  'admin':               I(Users),
  'analytics':           I(ChartLine),
  'audit':               I(ScrollText),
  'documentation':       I(FileText),
  'check-in-tracking':   I(Activity),
  'counselor-profile':   I(CircleUser),
};

export function getMenuIcon(id: string): React.ReactNode {
  return menuIconMap[id] || I(LayoutDashboard);
}
