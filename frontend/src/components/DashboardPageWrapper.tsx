'use client';

import { useEffect, useState, Component } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { getMenuItemsByRole, getActiveSectionFromPath } from '@/utils/navigation';
import { canAccessPage } from '@/utils/roleAccess';

/* ── Error Boundary ─────────────────────────────────────── */
interface EBState { hasError: boolean }
class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <AlertCircle size={32} style={{ color: 'var(--color-danger)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              This section is temporarily unavailable
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              An unexpected error occurred. Your other pages are unaffected.
            </p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface DashboardPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredRoles?: string[];
  backLink?: { href: string; label: string };
}

function FullPageLoader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated mark */}
        <div className="relative">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="text-[11px] font-extrabold text-white tracking-tighter select-none">CPS</span>
          </div>
          {/* Spinning ring */}
          <svg
            className="absolute -inset-2 w-16 h-16 animate-spin"
            style={{ animationDuration: '1.4s' }}
            viewBox="0 0 64 64"
            fill="none"
          >
            <circle
              cx="32" cy="32" r="28"
              stroke="var(--color-primary)"
              strokeOpacity="0.15"
              strokeWidth="3"
            />
            <path
              d="M32 4 A28 28 0 0 1 60 32"
              stroke="var(--color-primary)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 animate-scale-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-danger-surface)' }}
        >
          <AlertCircle size={28} style={{ color: 'var(--color-danger)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Access Restricted
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            You don't have permission to view this page.
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPageWrapper({ children, title, subtitle, requiredRoles, backLink }: DashboardPageWrapperProps) {
  const [user, setUser]               = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const pathname                      = usePathname();
  const router                        = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token    = localStorage.getItem('token');

    if (!userData || !token) {
      window.location.href = '/login';
      return;
    }

    const parsedUser = JSON.parse(userData);

    if (!canAccessPage(pathname, parsedUser.role)) {
      setAccessDenied(true);
      setTimeout(() => router.push('/dashboard'), 2000);
      return;
    }

    // Enforce page-level role gate declared by the calling page
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = (parsedUser.role || '').toUpperCase();
      if (!requiredRoles.map(r => r.toUpperCase()).includes(userRole)) {
        setAccessDenied(true);
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }
    }

    setUser(parsedUser);

    // Session timeout warning: alert 5 minutes before JWT expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        const warnAt = msUntilExpiry - 5 * 60 * 1000;
        if (warnAt > 0) {
          const t = setTimeout(() => setSessionWarning(true), warnAt);
          return () => clearTimeout(t);
        } else if (msUntilExpiry > 0) {
          setSessionWarning(true);
        }
      }
    } catch {}
  }, [pathname, router]);

  useEffect(() => {
    if (title) document.title = `${title} · CPS`;
    return () => { document.title = 'CPS'; };
  }, [title]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (!user && !accessDenied) return <FullPageLoader />;
  if (accessDenied)            return <AccessDenied />;

  const menuItems     = getMenuItemsByRole(user.role);
  const activeSection = getActiveSectionFromPath(pathname);

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      menuItems={menuItems}
      title={title}
      subtitle={subtitle}
      activeSection={activeSection}
    >
      {/* Session expiry warning */}
      {sessionWarning && (
        <div
          role="alert"
          className="mx-4 mt-3 mb-0 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--color-warning-surface)', border: '1px solid rgba(217,119,6,0.25)', color: 'var(--color-warning-text)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0" />
          <span className="flex-1">Your session expires soon.</span>
          <button
            className="text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            onClick={() => {
              // Silently extend: re-request a token refresh if the backend supports it,
              // otherwise redirect to login before expiry to avoid data loss.
              setSessionWarning(false);
              window.location.href = '/login';
            }}
          >
            Log in again
          </button>
          <button onClick={() => setSessionWarning(false)} aria-label="Dismiss" style={{ color: 'var(--color-warning-text)', opacity: 0.6 }}>✕</button>
        </div>
      )}
      {backLink && (
        <div className="px-4 pt-3 pb-0">
          <Link href={backLink.href}
            className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
            <ChevronLeft size={13} />
            {backLink.label}
          </Link>
        </div>
      )}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </DashboardLayout>
  );
}
