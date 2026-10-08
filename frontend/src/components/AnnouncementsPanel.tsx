'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ExternalLink, X } from 'lucide-react';
import { api } from '@/utils/api';

interface Announcement {
  id: string;
  title: string;
  body?: string;
  event_type: 'webinar' | 'event' | 'notice' | 'info';
  event_date?: string;
  link?: string;
  pinned?: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { label: string; accent: string }> = {
  webinar: { label: 'Webinar', accent: '#3B82F6' },
  event:   { label: 'Event',   accent: '#10B981' },
  notice:  { label: 'Notice',  accent: '#F59E0B' },
  info:    { label: 'Info',    accent: '#6B7280' },
};

function fmtEventDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [open, setOpen] = useState<Announcement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(api('/api/announcements?limit=10'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAnnouncements(d.announcements || []); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>CPS Updates &amp; Events</p>
          {announcements.length > 3 && (
            <a href="/announcements" className="text-xs font-medium transition-opacity hover:opacity-75" style={{ color: 'var(--color-primary)' }}>
              View All →
            </a>
          )}
        </div>

        {announcements.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No announcements at this time.</p>
        ) : (
          <div className="space-y-1">
            {announcements.slice(0, 3).map((a, i) => {
              const meta = TYPE_META[a.event_type] || TYPE_META.info;
              return (
                <button
                  key={a.id}
                  onClick={() => setOpen(a)}
                  className="w-full text-left px-3 py-3 rounded-xl transition-colors group"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: meta.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: meta.accent }}>{meta.label}</span>
                        {a.pinned && <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>· Pinned</span>}
                      </div>
                      <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
                      {a.event_date && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{fmtEventDate(a.event_date)}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {open && (() => {
        const meta = TYPE_META[open.event_type] || TYPE_META.info;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
            <div className="relative rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in" style={{ background: 'var(--color-surface)' }}>
              <div className="h-1 w-full" style={{ background: meta.accent }} />
              <div className="p-7">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full tracking-wide uppercase" style={{ background: `${meta.accent}18`, color: meta.accent }}>
                        {meta.label}
                      </span>
                      {open.pinned && <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Pinned</span>}
                    </div>
                    <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{open.title}</h3>
                  </div>
                  <button onClick={() => setOpen(null)}
                    className="p-2 rounded-xl transition-colors flex-shrink-0"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
                {open.body && <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>{open.body}</p>}
                {open.event_date && (
                  <div className="text-sm mb-5 rounded-xl px-4 py-3 font-medium" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                    {fmtEventDate(open.event_date)}
                  </div>
                )}
                {open.link ? (
                  <a href={open.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}>
                    <ExternalLink size={15} /> Open Link
                  </a>
                ) : (
                  <button onClick={() => setOpen(null)}
                    className="w-full py-3 text-sm font-medium rounded-xl transition-colors"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
