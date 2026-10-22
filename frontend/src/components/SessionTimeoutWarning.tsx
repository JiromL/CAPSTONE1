"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { api, apiFetch } from '@/utils/api';

const WARN_AFTER_MS = 25 * 60 * 1000;   // 25 min inactivity → show warning
const LOGOUT_AFTER_MS = 30 * 60 * 1000; // 30 min inactivity → auto-logout

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

export default function SessionTimeoutWarning() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // seconds remaining when warning shown
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.replace('/login?expired=true');
  }, [router]);

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.round((LOGOUT_AFTER_MS - WARN_AFTER_MS) / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, WARN_AFTER_MS);

    logoutTimer.current = setTimeout(logout, LOGOUT_AFTER_MS);
  }, [logout]);

  const stayLoggedIn = useCallback(async () => {
    // Try to silently refresh the access token so the new session is valid
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const res = await apiFetch(api('/api/auth/refresh'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        if (res.ok) {
          const { access_token } = await res.json();
          localStorage.setItem('token', access_token);
        }
      } catch { /* ignore — user stays on page */ }
    }
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    const handler = () => resetTimers();
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    resetTimers();
    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers]);

  if (!showWarning) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = mins > 0
    ? `${mins}m ${secs.toString().padStart(2, '0')}s`
    : `${countdown}s`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="card w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ background: 'var(--color-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-warning-bg, #fef3c7)', color: 'var(--color-warning, #d97706)' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Session expiring soon
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              You will be logged out in <strong>{timeStr}</strong>
            </p>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          You&apos;ve been inactive for a while. Do you want to stay logged in?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <LogOut size={14} /> Log out
          </button>
          <button
            onClick={stayLoggedIn}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <RefreshCw size={14} /> Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}
