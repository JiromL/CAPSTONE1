/**
 * Icon mapping for dashboard menu items
 * Uses lucide-react icons to provide visual indicators for navigation
 */

import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckCircle2,
  Book,
  MessageSquare,
  AlertCircle,
  Users,
  Settings,
  Briefcase,
  ClipboardList,
  Video,
  BookOpen,
  TrendingUp,
  History,
} from 'lucide-react';

export const menuIconMap: Record<string, React.ReactNode> = {
  // Common
  'dashboard': <LayoutDashboard size={18} />,
  'profile': <Users size={18} />,
  'settings': <Settings size={18} />,
  'staff-settings': <Settings size={18} />,

  // Student workflow
  'intake': <FileText size={18} />,
  'book-appointment': <Calendar size={18} />,
  'counseling': <History size={18} />,
  'tasks': <CheckCircle2 size={18} />,
  'check-ins': <CheckCircle2 size={18} />,
  'check-ins-student': <CheckCircle2 size={18} />,
  'journal': <Book size={18} />,
  'feedback': <MessageSquare size={18} />,
  'resources': <BookOpen size={18} />,

  // IC workflow
  'new-intakes': <FileText size={18} />,
  'assessments': <ClipboardList size={18} />,
  'appointments': <Calendar size={18} />,
  'reminders': <AlertCircle size={18} />,

  // Clinical workflow
  'cases': <Briefcase size={18} />,
  'counseling-cases': <Briefcase size={18} />,
  'high-risk': <AlertCircle size={18} />,
  'referrals': <FileText size={18} />,
  'video-links': <Video size={18} />,

  // Admin/Operational
  'admin': <Users size={18} />,
  'availability': <Calendar size={18} />,
  'analytics': <TrendingUp size={18} />,
  'documentation': <BookOpen size={18} />,
  'audit': <ClipboardList size={18} />,
  'check-in-tracking': <CheckCircle2 size={18} />,
  'reschedule-requests': <Calendar size={18} />,
  'counselor-profile': <Users size={18} />,
};

export function getMenuIcon(id: string): React.ReactNode {
  return menuIconMap[id] || <LayoutDashboard size={18} />;
}
